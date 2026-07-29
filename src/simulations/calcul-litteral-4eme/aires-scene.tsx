'use client';

import { useMemo, useRef } from 'react';
import type { Group, Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';
import { HotspotCoach } from '@/components/lab/hotspot-coach';
import { Segment } from '@/components/lab3d/environment';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — démonstration par les aires de la double distributivité
 * (calcul littéral, 4ème).
 *
 * Un champ rectangulaire de (a + b) mètres sur (c + d) mètres est dallé par
 * quatre parcelles rectangulaires : a×c, a×d, b×c et b×d. Chaque dalle est
 * gravée d'un quadrillage au mètre : on peut compter les carrés de 1 m².
 *
 * Les quatre parcelles s'écartent puis se recollent (<Animate>) : l'aire
 * totale (a+b)(c+d) et la somme ac + ad + bc + bd restent égales, ce qui se
 * lit directement sur les deux afficheurs.
 *
 * Doit être chargée via next/dynamic({ ssr: false }).
 */

export type AiresSceneProps = {
  a: number;
  b: number;
  c: number;
  d: number;
  /** true = les 4 parcelles sont écartées, false = elles sont recollées. */
  spread: boolean;
  mode: 'developper' | 'factoriser';
};

const S = 0.36; // 1 mètre → unités de scène
const TH = 0.16; // épaisseur d'une dalle
const GAP_X = 0.62; // écartement horizontal maximal
const GAP_Y = 0.42; // écartement vertical maximal

type PieceKey = 'ac' | 'ad' | 'bc' | 'bd';

type Piece = {
  key: PieceKey;
  /** dimensions en mètres */
  w: number;
  h: number;
  /** centre (position recollée) en unités de scène */
  cx: number;
  cy: number;
  /** direction d'écartement */
  ox: number;
  oy: number;
  color: string;
  label: string;
};

/** Une parcelle : dalle colorée, liseré sombre et quadrillage au mètre gravé. */
function Tile({ piece, tileRef }: { piece: Piece; tileRef: (g: Group | null) => void }) {
  const w = piece.w * S;
  const h = piece.h * S;
  const vLines = Array.from({ length: Math.max(0, Math.round(piece.w) - 1) }, (_, i) => -w / 2 + (i + 1) * S);
  const hLines = Array.from({ length: Math.max(0, Math.round(piece.h) - 1) }, (_, i) => -h / 2 + (i + 1) * S);

  return (
    <group ref={tileRef} position={[piece.cx, piece.cy, 0]}>
      {/* liseré sombre : donne une arête nette à la dalle */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[w + 0.05, h + 0.05, TH * 0.8]} />
        <meshStandardMaterial color="#0F172A" roughness={0.9} />
      </mesh>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, TH]} />
        <meshStandardMaterial color={piece.color} roughness={0.45} metalness={0.06} />
      </mesh>
      {/* quadrillage au mètre : chaque case vaut 1 m² */}
      {vLines.map((x) => (
        <mesh key={`v${x.toFixed(3)}`} position={[x, 0, TH / 2 + 0.004]}>
          <boxGeometry args={[0.012, h, 0.008]} />
          <meshStandardMaterial color="#FFFFFF" transparent opacity={0.5} />
        </mesh>
      ))}
      {hLines.map((y) => (
        <mesh key={`h${y.toFixed(3)}`} position={[0, y, TH / 2 + 0.004]}>
          <boxGeometry args={[w, 0.012, 0.008]} />
          <meshStandardMaterial color="#FFFFFF" transparent opacity={0.5} />
        </mesh>
      ))}
      <Tag3D position={[0, 0, TH / 2 + 0.18]} label={piece.label} tone="maths" distanceFactor={9} />
    </group>
  );
}

export default function AiresScene({ a, b, c, d, spread, mode }: AiresSceneProps) {
  const tiles = useRef<Record<string, Group | null>>({});
  const anim = useRef(0);

  const { pieces, x0, y0, wU, hU } = useMemo(() => {
    const W = a + b;
    const H = c + d;
    const left = -(W * S) / 2;
    const bottom = -(H * S) / 2;
    const all: Piece[] = [
      { key: 'ac', w: a, h: c, cx: left + (a / 2) * S, cy: bottom + (c / 2) * S, ox: -1, oy: -1, color: '#16A34A', label: `a×c = ${a * c}` },
      { key: 'bc', w: b, h: c, cx: left + (a + b / 2) * S, cy: bottom + (c / 2) * S, ox: 1, oy: -1, color: '#F59E0B', label: `b×c = ${b * c}` },
      { key: 'ad', w: a, h: d, cx: left + (a / 2) * S, cy: bottom + (c + d / 2) * S, ox: -1, oy: 1, color: '#0EA5E9', label: `a×d = ${a * d}` },
      { key: 'bd', w: b, h: d, cx: left + (a + b / 2) * S, cy: bottom + (c + d / 2) * S, ox: 1, oy: 1, color: '#7C3AED', label: `b×d = ${b * d}` },
    ];
    return { pieces: all.filter((p) => p.w > 0 && p.h > 0), x0: left, y0: bottom, wU: W * S, hU: H * S };
  }, [a, b, c, d]);

  const total = (a + b) * (c + d);
  const somme = a * c + a * d + b * c + b * d;
  const yRead = hU / 2 + 0.66;
  const yTitle = yRead + 0.68;

  // contour du champ assemblé (repère de « d'où viennent les morceaux »)
  const frame: [Vector3Tuple, Vector3Tuple][] = [
    [[x0, y0, -0.28], [x0 + wU, y0, -0.28]],
    [[x0 + wU, y0, -0.28], [x0 + wU, y0 + hU, -0.28]],
    [[x0 + wU, y0 + hU, -0.28], [x0, y0 + hU, -0.28]],
    [[x0, y0 + hU, -0.28], [x0, y0, -0.28]],
  ];

  return (
    <LabScene cameraPosition={[0, 0.35, 9.5]} background="#EEF2FF" minDistance={5} maxDistance={17} groundY={null}>
      {frame.map((s, i) => (
        <Segment key={`f${i}`} a={s[0]} b={s[1]} color="#A5B4FC" width={0.018} />
      ))}

      {pieces.map((p) => (
        <Tile
          key={p.key}
          piece={p}
          tileRef={(g) => {
            tiles.current[p.key] = g;
          }}
        />
      ))}

      <Animate
        fn={(state, delta) => {
          const target = spread ? 1 : 0;
          anim.current += (target - anim.current) * Math.min(1, delta * 4.5);
          const wob = spread ? Math.sin(state.clock.elapsedTime * 1.7) * 0.025 : 0;
          for (const p of pieces) {
            const g = tiles.current[p.key];
            if (!g) continue;
            g.position.set(
              p.cx + p.ox * GAP_X * anim.current,
              p.cy + p.oy * (GAP_Y + wob) * anim.current,
              p.ox * p.oy * 0.05 * anim.current,
            );
          }
        }}
      />

      {/* cotes du champ */}
      <Tag3D position={[x0 + (a / 2) * S, y0 - 0.34, 0]} label={`a = ${a} m`} tone="neutral" distanceFactor={8} />
      {b > 0 && <Tag3D position={[x0 + (a + b / 2) * S, y0 - 0.34, 0]} label={`b = ${b} m`} tone="neutral" distanceFactor={8} />}
      <Tag3D position={[x0 - 0.46, y0 + (c / 2) * S, 0]} label={`c = ${c} m`} tone="neutral" distanceFactor={8} />
      {d > 0 && <Tag3D position={[x0 - 0.46, y0 + (c + d / 2) * S, 0]} label={`d = ${d} m`} tone="neutral" distanceFactor={8} />}

      <Readout position={[-1.55, yRead, 0]} value={total} unit="m²" caption={`(${a}+${b}) × (${c}+${d})`} />
      <Readout position={[1.55, yRead, 0]} value={somme} unit="m²" caption="ac + ad + bc + bd" />

      <SceneLabel
        position={[0, yTitle, 0]}
        title={mode === 'developper' ? '(a + b)(c + d) = ac + ad + bc + bd' : `${a * c} + ${a * d} + ${b * c} + ${b * d} = (a + b)(c + d)`}
        subtitle={mode === 'developper' ? 'Développer : un rectangle → quatre morceaux' : 'Factoriser : quatre morceaux → un rectangle'}
        tone="maths"
      />

      {mode === 'factoriser' && spread && (
        <HotspotCoach position={[0, 0, 0.6]} label="Recolle les 4 parcelles" tone="action" />
      )}
      {mode === 'developper' && !spread && (
        <HotspotCoach position={[0, 0, 0.6]} label="Écarte les 4 parcelles" tone="violet" />
      )}
    </LabScene>
  );
}
