'use client';

import { useRef } from 'react';
import { Mesh, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Arrow3D, PolyLine } from '@/components/lab3d/plot';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — de la fraction à l'écriture décimale (Maths, 5ème).
 *
 * Une droite graduée « zoomable » empilée sur 3 niveaux :
 *   niveau 0 — les UNITÉS      (fenêtre 0 → 10, pas de 1)
 *   niveau 1 — les DIXIÈMES    (fenêtre u → u+1, pas de 0,1)
 *   niveau 2 — les CENTIÈMES   (fenêtre u,d → u,(d+1), pas de 0,01)
 * Des traits en pointillés relient l'intervalle surligné d'un niveau aux deux
 * extrémités du niveau suivant : c'est l'effet « loupe ». L'élève voit que
 * 3,25 se construit en descendant de rang en rang.
 *
 * En bas, deux réglettes de la MÊME longueur (1 unité) : l'une découpée en 10,
 * l'autre en 100. Elles font le pont entre les fractions décimales et
 * l'écriture à virgule : d/10 = 0,d et (10d+c)/100 = 0,dc.
 *
 * Tous les calculs sont faits en centièmes ENTIERS (cents) : aucune erreur de
 * virgule flottante ne peut décaler une graduation.
 */

export type DecimalSceneProps = {
  /** Chiffre des unités (0..9). */
  u: number;
  /** Chiffre des dixièmes (0..9). */
  d: number;
  /** Chiffre des centièmes (0..9). */
  c: number;
  /** Niveau de zoom affiché : 0 = unités, 1 = dixièmes, 2 = centièmes. */
  zoom: number;
};

type Level = { fromC: number; toC: number; dec: number; hi?: [number, number] };

const XL = -4;
const XR = 4;
const LINE_Y = [2.35, 0.35, -1.65];
const RANG = ['unités', 'dixièmes', 'centièmes'];
const RULER_Y = -3.3;

const ON = '#EA7C22'; // orange « mil grillé » : ce qui est pris
const OFF = '#FDE8C8'; // reste de la réglette
const INK = '#334155';
const DOT = '#DC2626';

/** Écriture française d'un décimal (virgule, pas de point). */
function fr(v: number, dec: number) {
  return v.toFixed(dec).replace('.', ',');
}

/** Abscisse scène d'une valeur (en centièmes) dans la fenêtre [fromC, toC]. */
function xAt(cents: number, fromC: number, toC: number) {
  return XL + ((cents - fromC) / (toC - fromC)) * (XR - XL);
}

/** Une droite graduée en 10 intervalles égaux, avec intervalle surligné. */
function GradLine({
  y,
  fromC,
  toC,
  dec,
  highlight,
}: {
  y: number;
  fromC: number;
  toC: number;
  dec: number;
  highlight?: [number, number];
}) {
  const step = (toC - fromC) / 10;
  const seg: Vector3Tuple[] = highlight
    ? [
        [xAt(highlight[0], fromC, toC), y + 0.13, 0.06],
        [xAt(highlight[1], fromC, toC), y + 0.13, 0.06],
      ]
    : [];
  return (
    <group>
      <Arrow3D from={[XL - 0.5, y, 0]} to={[XR + 0.8, y, 0]} color={INK} radius={0.022} headLength={0.22} />
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={i} position={[XL + (i / 10) * (XR - XL), y, 0.02]}>
          <boxGeometry args={[0.032, i % 5 === 0 ? 0.44 : 0.24, 0.032]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      ))}
      <PolyLine points={seg} color={ON} width={7} />
      <Tag3D position={[XL, y - 0.47, 0.05]} label={fr(fromC / 100, dec)} tone="neutral" />
      <Tag3D position={[(XL + XR) / 2, y - 0.47, 0.05]} label={fr((fromC + 5 * step) / 100, dec)} tone="neutral" />
      <Tag3D position={[XR, y - 0.47, 0.05]} label={fr(toC / 100, dec)} tone="neutral" />
    </group>
  );
}

/** Réglette de 1 unité découpée en `cells` parts égales, `filled` coloriées. */
function Ruler({ x0, width, cells, filled }: { x0: number; width: number; cells: number; filled: number }) {
  const w = width / cells;
  return (
    <group>
      <mesh position={[x0 + width / 2, RULER_Y, -0.18]}>
        <boxGeometry args={[width + 0.14, 0.64, 0.12]} />
        <meshStandardMaterial color="#8A5A34" roughness={0.92} />
      </mesh>
      {Array.from({ length: cells }, (_, i) => (
        <mesh key={i} position={[x0 + (i + 0.5) * w, RULER_Y, 0]} castShadow>
          <boxGeometry args={[w * 0.82, 0.46, 0.24]} />
          <meshStandardMaterial color={i < filled ? ON : OFF} roughness={0.72} metalness={0.02} />
        </mesh>
      ))}
    </group>
  );
}

export default function DecimalScene({ u, d, c, zoom }: DecimalSceneProps) {
  const dot = useRef<Mesh>(null);

  const z = Math.max(0, Math.min(2, Math.round(zoom)));
  const cents = u * 100 + d * 10 + c;
  const uC = u * 100;
  const dC = uC + d * 10;

  const levels: Level[] = [
    { fromC: 0, toC: 1000, dec: 0, hi: [uC, uC + 100] },
    { fromC: uC, toC: uC + 100, dec: 1, hi: [dC, dC + 10] },
    { fromC: dC, toC: dC + 10, dec: 2 },
  ];

  const cur = levels[z];
  const xm = xAt(cents, cur.fromC, cur.toC);
  const drop: Vector3Tuple[] = [
    [xm, LINE_Y[z], 0.08],
    [xm, LINE_Y[z] - 0.62, 0.08],
  ];

  return (
    <LabScene cameraPosition={[0, -0.3, 12.5]} background="#FFF6E9" minDistance={7} maxDistance={18} groundY={null}>
      {/* ── Droites graduées empilées (zoom progressif) ─────────────── */}
      {levels.slice(0, z + 1).map((lv, i) => (
        <group key={i}>
          <GradLine y={LINE_Y[i]} fromC={lv.fromC} toC={lv.toC} dec={lv.dec} highlight={i < z || z === 0 ? lv.hi : undefined} />
          <Tag3D
            position={[XR + 1.7, LINE_Y[i], 0.05]}
            label={RANG[i]}
            tone={i === 0 ? 'maths' : i === 1 ? 'physique' : 'chimie'}
          />
        </group>
      ))}

      {/* ── Effet loupe : l'intervalle surligné devient la droite du dessous ── */}
      {Array.from({ length: z }, (_, i) => {
        const hi = levels[i].hi;
        if (!hi) return null;
        const left: Vector3Tuple[] = [
          [xAt(hi[0], levels[i].fromC, levels[i].toC), LINE_Y[i] - 0.05, 0.04],
          [XL, LINE_Y[i + 1] + 0.55, 0.04],
        ];
        const right: Vector3Tuple[] = [
          [xAt(hi[1], levels[i].fromC, levels[i].toC), LINE_Y[i] - 0.05, 0.04],
          [XR, LINE_Y[i + 1] + 0.55, 0.04],
        ];
        return (
          <group key={`loupe-${i}`}>
            <PolyLine points={left} color={ON} width={2} dashed />
            <PolyLine points={right} color={ON} width={2} dashed />
          </group>
        );
      })}

      {/* ── Le nombre, placé sur la droite la plus fine affichée ─────── */}
      <mesh ref={dot} position={[xm, LINE_Y[z], 0.12]}>
        <sphereGeometry args={[0.15, 20, 16]} />
        <meshStandardMaterial color={DOT} emissive={DOT} emissiveIntensity={0.35} roughness={0.35} />
      </mesh>
      <PolyLine points={drop} color={DOT} width={2} dashed />
      <Readout position={[xm, LINE_Y[z] + 0.72, 0.12]} value={fr(cents / 100, 2)} unit="kg" caption="écriture décimale" />
      <Animate
        fn={(state) => {
          dot.current?.scale.setScalar(1 + 0.18 * Math.sin(state.clock.elapsedTime * 3.2));
        }}
      />

      {/* ── Réglettes : 1 unité en 10 parts, puis en 100 parts ───────── */}
      <Ruler x0={XL} width={3.7} cells={10} filled={d} />
      <Tag3D position={[XL + 1.85, RULER_Y + 0.66, 0.1]} label={`${d}/10 = ${fr(d / 10, 1)}`} tone="physique" />
      <Tag3D position={[XL + 1.85, RULER_Y - 0.62, 0.1]} label="1 unité = 10 dixièmes" tone="neutral" />

      <Ruler x0={0.3} width={3.7} cells={100} filled={d * 10 + c} />
      <Tag3D
        position={[2.15, RULER_Y + 0.66, 0.1]}
        label={`${d * 10 + c}/100 = ${fr((d * 10 + c) / 100, 2)}`}
        tone="chimie"
      />
      <Tag3D position={[2.15, RULER_Y - 0.62, 0.1]} label="1 unité = 100 centièmes" tone="neutral" />

      <SceneLabel
        position={[0, 3.6, 0]}
        title={`${fr(cents / 100, 2)} kg`}
        subtitle={`${u} unité${u > 1 ? 's' : ''} · ${d} dixième${d > 1 ? 's' : ''} · ${c} centième${c > 1 ? 's' : ''}`}
        tone="maths"
      />
    </LabScene>
  );
}
