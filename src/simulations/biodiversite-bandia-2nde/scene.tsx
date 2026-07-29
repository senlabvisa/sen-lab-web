'use client';

import { useMemo, useRef } from 'react';
import { DoubleSide, Group, Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench, GraphPaper } from '@/components/lab3d/environment';
import { Arrow3D, Bar, DataPoints, PolyLine } from '@/components/lab3d/plot';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — mesure de la biodiversité ligneuse de la Réserve de Bandia (SVT, 2nde).
 *
 * On ne dessine PAS d'animaux : on montre le **protocole** et les **données**.
 *  - au premier plan : le transect matérialisé par un décamètre déroulé et la
 *    grille des 10 quadrats (25 m × 25 m). Un quadrat « posé » est un cadre
 *    orange contenant un jalon coloré par pied d'arbre relevé (couleur = espèce) ;
 *  - au centre : l'histogramme des abondances (un bâton par espèce, échelle fixe
 *    pour comparer les zones) ;
 *  - au fond : la courbe d'accumulation des espèces S = f(nombre de quadrats),
 *    tracée sur papier millimétré — elle monte puis sature.
 *
 * Toutes les valeurs viennent du module (comptages réels du tirage), la scène
 * ne fait que les mettre en espace.
 */

export type BandiaSceneProps = {
  zoneName: string;
  zoneSub: string;
  background: string;
  patch: string;
  /** Espèces relevées quadrat par quadrat (indices dans `colors`/`names`). */
  draws: number[][];
  /** Abondance cumulée par espèce. */
  counts: number[];
  /** Richesse cumulée après le 1er, 2e… quadrat. */
  accumulation: number[];
  colors: string[];
  names: string[];
  richness: number;
  shannon: number;
  total: number;
};

const GROUND = -1.7;
const COLS = 5;
const PITCH = 0.94;
const CELL = 0.86;
const MAX_Q = 10;
const Z0 = 1.9;

/** Position [x, z] du quadrat n° i de la grille (5 colonnes × 2 rangées). */
function cellXZ(i: number): [number, number] {
  return [((i % COLS) - (COLS - 1) / 2) * PITCH, Z0 + Math.floor(i / COLS) * PITCH];
}

/** Dispersion pseudo-aléatoire mais stable d'un jalon dans son quadrat. */
function fract(n: number) {
  return n - Math.floor(n);
}

export default function BandiaScene({
  zoneName,
  zoneSub,
  background,
  patch,
  draws,
  counts,
  accumulation,
  colors,
  names,
  richness,
  shannon,
  total,
}: BandiaSceneProps) {
  const lastQuad = useRef<Group>(null);
  const tip = useRef<Mesh>(null);

  const nSpecies = colors.length;

  // ── Courbe d'accumulation : repère local du panneau du fond ──
  const gx = (i: number) => -2.35 + ((i + 1) / MAX_Q) * 4.5;
  const gy = (s: number) => -1.3 + (s / nSpecies) * 2.4;

  const curve: [number, number, number][] = accumulation.map((s, i) => [gx(i), gy(s), 0.04]);
  const tipY = curve.length ? curve[curve.length - 1][1] : gy(0);
  const tipX = curve.length ? curve[curve.length - 1][0] : gx(0);

  // ── Jalons de relevé posés dans chaque quadrat ──
  const pegs = useMemo(() => {
    const out: { x: number; y: number; z: number; c: string }[] = [];
    draws.forEach((list, q) => {
      const [cx, cz] = cellXZ(q);
      list.forEach((sp, j) => {
        const u = fract(Math.sin((q + 1) * 12.9898 + (j + 1) * 78.233) * 43758.5453);
        const v = fract(Math.sin((q + 1) * 39.3468 + (j + 1) * 11.135) * 24634.6345);
        out.push({
          x: cx + (u - 0.5) * (CELL - 0.16),
          y: GROUND + 0.11,
          z: cz + (v - 0.5) * (CELL - 0.16),
          c: colors[sp] ?? '#64748B',
        });
      });
    });
    return out;
  }, [draws, colors]);

  // ── Les 4 espèces les plus abondantes reçoivent une étiquette ──
  const topSpecies = useMemo(
    () =>
      counts
        .map((n, i) => ({ n, i }))
        .filter((d) => d.n > 0)
        .sort((a, b) => b.n - a.n)
        .slice(0, 4)
        .map((d) => d.i),
    [counts],
  );

  return (
    <LabScene cameraPosition={[0.2, 2.6, 7.6]} background={background} minDistance={5} maxDistance={15} groundY={GROUND}>
      <LabBench y={GROUND} color="#DCC9A0" size={26} />

      {/* ── Transect : décamètre déroulé entre les deux rangées de quadrats ── */}
      <mesh position={[0, GROUND + 0.03, Z0 + PITCH / 2]} castShadow>
        <boxGeometry args={[5.3, 0.03, 0.1]} />
        <meshStandardMaterial color="#FACC15" roughness={0.6} />
      </mesh>
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={`tick${i}`} position={[-2.5 + i * 0.5, GROUND + 0.05, Z0 + PITCH / 2]}>
          <boxGeometry args={[0.02, 0.02, 0.1]} />
          <meshStandardMaterial color="#3F3F46" />
        </mesh>
      ))}

      {/* ── Grille des quadrats (10 emplacements du transect) ── */}
      {Array.from({ length: MAX_Q }, (_, i) => {
        const [cx, cz] = cellXZ(i);
        const posed = i < draws.length;
        const bar = posed ? '#EA580C' : '#B7AC93';
        const th = posed ? 0.055 : 0.03;
        return (
          <group key={`q${i}`} position={[cx, 0, cz]}>
            {posed && (
              <mesh position={[0, GROUND + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[CELL, CELL]} />
                <meshStandardMaterial color={patch} roughness={0.95} side={DoubleSide} />
              </mesh>
            )}
            {[-1, 1].map((s) => (
              <mesh key={`a${s}`} position={[0, GROUND + 0.04, (s * CELL) / 2]} castShadow>
                <boxGeometry args={[CELL + th, th, th]} />
                <meshStandardMaterial color={bar} roughness={0.55} />
              </mesh>
            ))}
            {[-1, 1].map((s) => (
              <mesh key={`b${s}`} position={[(s * CELL) / 2, GROUND + 0.04, 0]} castShadow>
                <boxGeometry args={[th, th, CELL + th]} />
                <meshStandardMaterial color={bar} roughness={0.55} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* ── Anneau lumineux sur le dernier quadrat posé ── */}
      {draws.length > 0 && (
        <group ref={lastQuad} position={[cellXZ(draws.length - 1)[0], GROUND + 0.02, cellXZ(draws.length - 1)[1]]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[CELL * 0.6, CELL * 0.68, 40]} />
            <meshStandardMaterial color="#FB923C" emissive="#EA580C" emissiveIntensity={0.55} side={DoubleSide} />
          </mesh>
        </group>
      )}

      {/* ── Un jalon coloré par pied d'arbre relevé (couleur = espèce) ── */}
      {pegs.map((p, i) => (
        <mesh key={`p${i}`} position={[p.x, p.y, p.z]} castShadow>
          <cylinderGeometry args={[0.045, 0.018, 0.19, 6]} />
          <meshStandardMaterial color={p.c} roughness={0.45} />
        </mesh>
      ))}

      {/* ── Histogramme des abondances (échelle fixe : 1 pied = 0,045 unité) ── */}
      <group position={[0, GROUND + 0.02, 0.35]}>
        {counts.map((n, i) => (
          <Bar key={`bar${i}`} x={(i - (nSpecies - 1) / 2) * 0.66} height={Math.max(0.004, n * 0.045)} width={0.42} depth={0.42} color={colors[i]} />
        ))}
      </group>
      {topSpecies.map((i) => (
        <Tag3D
          key={`lab${i}`}
          position={[(i - (nSpecies - 1) / 2) * 0.66, GROUND + 0.12 + counts[i] * 0.045, 0.35]}
          label={`${names[i]} · ${counts[i]}`}
          tone="svt"
        />
      ))}

      {/* ── Panneau du fond : courbe d'accumulation des espèces ── */}
      <group position={[0, 0.4, -1.95]}>
        <GraphPaper width={5.1} height={3} step={0.3} color="#D9E4D6" />
        <Arrow3D from={[-2.35, -1.3, 0.03]} to={[2.45, -1.3, 0.03]} color="#475569" radius={0.016} headLength={0.16} />
        <Arrow3D from={[-2.35, -1.3, 0.03]} to={[-2.35, 1.4, 0.03]} color="#475569" radius={0.016} headLength={0.16} />
        <PolyLine points={curve} color="#16A34A" width={4} />
        <DataPoints points={curve} color="#065F46" size={0.055} />
        <mesh ref={tip} position={[tipX, tipY, 0.06]}>
          <sphereGeometry args={[0.09, 18, 14]} />
          <meshStandardMaterial color="#F97316" emissive="#EA580C" emissiveIntensity={0.45} />
        </mesh>
        <Tag3D position={[-1.35, 1.55, 0]} label="Courbe d'accumulation : S = f(nb de quadrats)" tone="svt" />
        <Tag3D position={[2.5, -1.55, 0]} label="quadrats posés" tone="neutral" />
        <Tag3D position={[-2.75, 1.15, 0]} label="S" tone="neutral" />
      </group>

      <Animate
        fn={(state) => {
          const k = 1 + 0.09 * Math.sin(state.clock.elapsedTime * 3.2);
          lastQuad.current?.scale.set(k, 1, k);
          if (tip.current) tip.current.scale.setScalar(1 + 0.18 * Math.sin(state.clock.elapsedTime * 2.4));
        }}
      />

      <SceneLabel position={[0, 2.75, -1.6]} title={zoneName} subtitle={zoneSub} tone="svt" />
      <Readout position={[-3.1, 1.2, -0.6]} value={richness} caption="richesse spécifique S" />
      <Readout position={[3.1, 1.2, -0.6]} value={shannon.toFixed(2)} caption="indice de Shannon H'" />
      <Readout position={[3.1, 0.35, 1.4]} value={total} unit="pieds" caption={`${draws.length} quadrat(s)`} />
      <Tag3D position={[-2.9, GROUND + 0.4, Z0 + PITCH / 2]} label="quadrat 25 m × 25 m" tone="svt" />
    </LabScene>
  );
}
