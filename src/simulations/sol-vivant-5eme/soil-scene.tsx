'use client';

import { useRef } from 'react';
import { DoubleSide } from 'three';
import type { Group, Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench } from '@/components/lab3d/environment';
import { GraduatedCylinder } from '@/components/lab3d/glassware';
import { Readout, SceneLabel, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — le sol est vivant (SVT, 5ème).
 *
 * Deux modes sur la même coupe de sol (profil pédologique) :
 *  - `coupe` : les quatre horizons empilés (litière, humus, horizon minéral,
 *    roche mère latéritique), étiquetés par des <Tag3D>. La litière se
 *    décompose en continu : les feuilles descendent, rétrécissent et
 *    s'assombrissent jusqu'à rejoindre l'humus. Vers de terre, racines et
 *    champignons sont visibles sur la face de la coupe.
 *  - `eau` : test de perméabilité / rétention. On verse 100 mL d'eau sur la
 *    colonne, l'eau percole et est recueillie dans une éprouvette graduée.
 *    La vitesse des gouttes qui sortent est proportionnelle à la perméabilité
 *    réelle du sol (durée d'écoulement `duree`), le niveau de l'éprouvette
 *    correspond au volume recueilli `percole`.
 */

export type Horizon = 'litiere' | 'humus' | 'mineral' | 'roche';
export type SoilKey = 'dior' | 'deck' | 'jachere';

export type SoilSceneProps = {
  mode: 'coupe' | 'eau';
  soil: SoilKey;
  title: string;
  subtitle: string;
  horizon?: Horizon | null;
  /** Eau recueillie sous la colonne, en mL (sur 100 mL versés). */
  percole?: number;
  /** Durée de l'écoulement complet, en secondes (indice de perméabilité). */
  duree?: number;
};

// Géométrie de la colonne de sol (unités scène)
const W = 2.0;
const D = 1.3;
const BASE = -0.4;
const H_ROCHE = 0.5;
const H_MIN = 0.8;
const H_LIT = 0.12;

/** Épaisseur d'humus et teintes propres à chaque sol du bassin arachidier. */
const PROFILE: Record<SoilKey, { humus: number; mineral: string; roche: string; humusColor: string }> = {
  dior: { humus: 0.13, mineral: '#E2C08C', roche: '#B45309', humusColor: '#6B4B2A' },
  deck: { humus: 0.24, mineral: '#9C7B57', roche: '#7C2D12', humusColor: '#4A3218' },
  jachere: { humus: 0.42, mineral: '#D8B27E', roche: '#B45309', humusColor: '#372414' },
};

const LEAF_POS: [number, number][] = [
  [-0.72, 0.32],
  [-0.2, -0.3],
  [0.28, 0.36],
  [0.74, -0.18],
  [-0.45, -0.05],
  [0.55, 0.1],
];
const LEAF_COLORS = ['#B45309', '#A16207', '#7C6218'];

function Layer({ y0, y1, color, on }: { y0: number; y1: number; color: string; on: boolean }) {
  const h = Math.max(0.02, y1 - y0);
  return (
    <mesh position={[0, y0 + h / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[W, h, D]} />
      <meshStandardMaterial
        color={color}
        roughness={0.96}
        emissive={on ? color : '#000000'}
        emissiveIntensity={on ? 0.55 : 0}
      />
    </mesh>
  );
}

export default function SoilScene({
  mode,
  soil,
  title,
  subtitle,
  horizon = null,
  percole = 0,
  duree = 60,
}: SoilSceneProps) {
  const p = PROFILE[soil];
  const isEau = mode === 'eau';

  const yRoche = BASE + H_ROCHE; // sommet de la roche mère
  const yMin = yRoche + H_MIN; // sommet de l'horizon minéral
  const yHum = yMin + p.humus; // sommet de l'humus
  const yTop = yHum + H_LIT; // surface (litière)

  const tipY = BASE - 0.52; // pointe de l'entonnoir de récupération
  const cylH = 1.4;
  const cylY = -1.65; // centre de l'éprouvette
  const liqTop = cylY - cylH / 2 + 0.06 + (percole / 100) * (cylH - 0.3);
  const benchY = isEau ? -2.45 : BASE - 0.03;

  const leaves = useRef<(Group | null)[]>([]);
  const worms = useRef<(Group | null)[]>([]);
  const rain = useRef<(Mesh | null)[]>([]);
  const perc = useRef<(Mesh | null)[]>([]);

  return (
    <LabScene
      cameraPosition={isEau ? [0.8, -0.1, 7.2] : [2.1, 1.0, 5.2]}
      background="#EAF7E4"
      minDistance={isEau ? 4.5 : 3}
      maxDistance={isEau ? 14 : 10}
      groundY={benchY}
    >
      <LabBench y={benchY} color="#D8CDB6" size={20} />

      {/* ── Colonne de sol : les quatre horizons ─────────────────────── */}
      <Layer y0={BASE} y1={yRoche} color={p.roche} on={horizon === 'roche'} />
      <Layer y0={yRoche} y1={yMin} color={p.mineral} on={horizon === 'mineral'} />
      <Layer y0={yMin} y1={yHum} color={p.humusColor} on={horizon === 'humus'} />
      <Layer y0={yHum} y1={yTop} color="#7A5A2C" on={horizon === 'litiere'} />

      {/* Cailloux de latérite dans la roche mère */}
      {([[-0.6, 0.16], [0.15, 0.3], [0.72, 0.22]] as [number, number][]).map(([x, dy], i) => (
        <mesh key={`lat-${i}`} position={[x, BASE + dy, D / 2 + 0.02]} castShadow>
          <dodecahedronGeometry args={[0.1 + i * 0.02, 0]} />
          <meshStandardMaterial color="#8A2E12" roughness={0.9} />
        </mesh>
      ))}

      {/* Racines qui plongent de l'humus vers l'horizon minéral */}
      {[-0.62, 0.02, 0.6].map((x, i) => (
        <mesh
          key={`rac-${x}`}
          position={[x, yMin - 0.22 - i * 0.06, D / 2 + 0.02]}
          rotation={[0, 0, (i - 1) * 0.38]}
          castShadow
        >
          <cylinderGeometry args={[0.045, 0.012, 0.5 + i * 0.14, 8]} />
          <meshStandardMaterial color="#EBDCBB" roughness={0.75} />
        </mesh>
      ))}

      {/* Vers de terre (décomposeurs) dans la coupe */}
      {([[-0.68, yMin - 0.3], [0.52, yRoche + 0.42]] as [number, number][]).map(([x, y], i) => (
        <group key={`ver-${i}`} ref={(el) => { worms.current[i] = el; }} position={[x, y, D / 2 + 0.03]}>
          <mesh rotation={[0, 0, 0.5]} castShadow>
            <torusGeometry args={[0.15, 0.042, 10, 24, Math.PI * 1.25]} />
            <meshStandardMaterial color="#E8A08C" roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* Champignons décomposeurs sur la litière */}
      {[-0.5, 0.05, 0.42].map((x, i) => (
        <group key={`ch-${x}`} position={[x, yTop, 0.18 - i * 0.22]}>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.022, 0.028, 0.12, 8]} />
            <meshStandardMaterial color="#F5EEDC" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.13, 0]} castShadow>
            <sphereGeometry args={[0.07, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#C2410C" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Litière en décomposition : les feuilles descendent et rétrécissent */}
      {LEAF_POS.map(([x, z], i) => (
        <group key={`f-${i}`} ref={(el) => { leaves.current[i] = el; }} position={[x, yTop + 0.07, z]}>
          <mesh scale={[1, 0.2, 0.6]} castShadow>
            <sphereGeometry args={[0.17, 14, 10]} />
            <meshStandardMaterial color={LEAF_COLORS[i % LEAF_COLORS.length]} roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* ── Mode « test de l'eau » ───────────────────────────────────── */}
      {isEau && (
        <>
          {/* Entonnoir de récupération sous la colonne */}
          <mesh position={[0, BASE - 0.26, 0]}>
            <cylinderGeometry args={[0.98, 0.12, 0.52, 28, 1, true]} />
            <meshStandardMaterial color="#94A3B8" roughness={0.4} metalness={0.35} side={DoubleSide} />
          </mesh>
          <GraduatedCylinder position={[0, cylY, 0]} height={cylH} radius={0.34} fill={percole / 100} liquidColor="#7CB9E8" />

          {/* Pluie versée sur la surface (100 mL) */}
          {[-0.55, -0.1, 0.35, 0.7].map((x, i) => (
            <mesh key={`p-${x}`} ref={(el) => { rain.current[i] = el; }} position={[x, yTop + 1.2, 0]}>
              <sphereGeometry args={[0.055, 12, 10]} />
              <meshStandardMaterial color="#38BDF8" roughness={0.15} metalness={0.1} />
            </mesh>
          ))}

          {/* Gouttes percolées : vitesse ∝ perméabilité du sol */}
          {[0, 1, 2].map((i) => (
            <mesh key={`g-${i}`} ref={(el) => { perc.current[i] = el; }} position={[0, tipY, 0]}>
              <sphereGeometry args={[0.05, 12, 10]} />
              <meshStandardMaterial color="#60A5FA" roughness={0.15} />
            </mesh>
          ))}

          <Tag3D position={[-1.55, yTop + 0.85, 0]} label="100 mL versés" tone="maths" />
          <Readout position={[-1.75, yMin, 0]} value={100 - percole} unit="mL" caption="eau retenue" />
          <Readout position={[1.5, cylY + 0.2, 0]} value={percole} unit="mL" caption="eau recueillie" />
          <Readout position={[1.6, BASE - 0.3, 0]} value={duree} unit="s" caption="durée d'écoulement" />
        </>
      )}

      {/* ── Étiquettes des horizons ──────────────────────────────────── */}
      <Tag3D position={[1.45, (yHum + yTop) / 2 + 0.12, 0]} label="Litière · feuilles mortes" tone="svt" />
      <Tag3D position={[1.45, yMin + p.humus / 2, 0]} label="Humus · matière organique" tone="svt" />
      <Tag3D position={[1.62, yRoche + H_MIN / 2, 0]} label="Horizon minéral · sable & argile" tone="neutral" />
      <Tag3D position={[1.52, BASE + H_ROCHE / 2, 0]} label="Roche mère · latérite" tone="physique" />

      <SceneLabel position={[0, yTop + 1.55, 0]} title={title} subtitle={subtitle} tone="svt" />

      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime;
          const yEnd = yMin + p.humus * 0.35; // les feuilles finissent dans l'humus
          leaves.current.forEach((g, i) => {
            if (!g) return;
            const k = (t * 0.13 + i * 0.17) % 1;
            g.position.y = yTop + 0.07 - k * (yTop + 0.07 - yEnd);
            const s = 1 - 0.82 * k;
            g.scale.set(s, s, s);
            g.rotation.z = 0.45 * Math.sin(t * 0.7 + i);
          });
          worms.current.forEach((g, i) => {
            if (g) g.rotation.z = 0.4 * Math.sin(t * 1.2 + i * 2.1);
          });
          if (!isEau) return;
          rain.current.forEach((m, i) => {
            if (!m) return;
            const k = (t * 1.4 + i * 0.25) % 1;
            m.position.y = yTop + 1.2 - k * 1.2;
          });
          const speed = Math.max(0.12, 45 / duree); // sol argileux = gouttes lentes
          perc.current.forEach((m, i) => {
            if (!m) return;
            const k = (t * speed + i * 0.34) % 1;
            m.position.y = tipY - k * (tipY - liqTop);
          });
        }}
      />
    </LabScene>
  );
}
