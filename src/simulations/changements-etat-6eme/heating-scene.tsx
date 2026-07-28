'use client';

import { useMemo, useRef } from 'react';
import type { Mesh, Vector3Tuple } from 'three';
import {
  Animate,
  Arrow3D,
  Beaker,
  DataPoints,
  GraphPaper,
  LabBench,
  LabScene,
  PolyLine,
  Readout,
  SceneLabel,
  Tag3D,
} from '@/components/lab3d';

/**
 * Scène 3D — courbe de chauffage de l'eau (changements d'état, 6ème).
 *
 * À gauche : un bécher de 100 g de glace posé sur un trépied, chauffé par un
 * bec de gaz. Les glaçons fondent, l'eau monte, puis bout (bulles + vapeur).
 * À droite : la VRAIE courbe T(t) tracée en <PolyLine>, avec ses deux
 * **paliers** (0 °C fusion, 100 °C ébullition) surlignés, un point courant
 * animé et un <Readout> du thermomètre.
 *
 * Physique exacte (pression normale, plaque de puissance constante P) :
 *   Q = m·c·ΔT hors palier   et   Q = m·L pendant un palier.
 * Chargée via next/dynamic({ ssr: false }) depuis module.tsx.
 */

export type HeatingSceneProps = {
  /** Temps de chauffage écoulé, en secondes (0 → 300). */
  time: number;
  /** Mesures relevées par l'élève : couples (temps en s, température en °C). */
  marks?: Array<[number, number]>;
};

// ── Constantes physiques (SI) ─────────────────────────────────────────
const M = 0.1; // kg de glace
const P = 500; // W (plaque chauffante)
const C_ICE = 2100; // J·kg⁻¹·K⁻¹
const C_WATER = 4185; // J·kg⁻¹·K⁻¹
const LF = 334_000; // J·kg⁻¹ (fusion)
const LV = 2_256_000; // J·kg⁻¹ (vaporisation)
const T_ICE = -20; // °C au départ

const T1 = (M * C_ICE * 20) / P; // 8,4 s — la glace atteint 0 °C
const T2 = T1 + (M * LF) / P; // 75,2 s — fin de la fusion
const T3 = T2 + (M * C_WATER * 100) / P; // 158,9 s — l'eau atteint 100 °C
const T_VAP = T3 + (M * LV) / P; // 610,1 s — vaporisation complète
const T_OBS = 300; // fin de l'observation

type Phase = 'glace' | 'fusion' | 'liquide' | 'ebullition';

function heating(t: number): { temp: number; phase: Phase; liquid: number; vapor: number } {
  if (t <= T1) return { temp: T_ICE + (P * t) / (M * C_ICE), phase: 'glace', liquid: 0, vapor: 0 };
  if (t <= T2) return { temp: 0, phase: 'fusion', liquid: (t - T1) / (T2 - T1), vapor: 0 };
  if (t <= T3) return { temp: (P * (t - T2)) / (M * C_WATER), phase: 'liquide', liquid: 1, vapor: 0 };
  return { temp: 100, phase: 'ebullition', liquid: 1, vapor: (t - T3) / (T_VAP - T3) };
}

// ── Repère du graphe (unités scène) ───────────────────────────────────
const GX = 0.3; // abscisse de l'axe des températures
const GY = -1.6; // ordonnée de la ligne T = −20 °C
const SX = 4.6 / T_OBS;
const SY = 2.9 / 120;
const px = (t: number) => GX + t * SX;
const py = (temp: number) => GY + (temp - T_ICE) * SY;

// ── Géométrie du bécher ───────────────────────────────────────────────
const BX = -3.5;
const B_R = 0.9;
const B_H = 2.0;
const B_CY = -0.5;
const IN_BOTTOM = B_CY - B_H / 2 + 0.06;
const BENCH_Y = -2.2;

const ICE_SLOTS: Vector3Tuple[] = [
  [-0.34, 0.16, 0.2],
  [0.3, 0.14, -0.18],
  [-0.05, 0.2, -0.34],
  [0.36, 0.5, 0.24],
  [-0.28, 0.52, -0.2],
  [0.06, 0.56, 0.36],
  [0.02, 0.86, -0.02],
];

export default function HeatingScene({ time, marks = [] }: HeatingSceneProps) {
  const { temp, phase, liquid, vapor } = heating(time);

  const flame = useRef<Mesh>(null);
  const point = useRef<Mesh>(null);
  const bubbles = useRef<Array<Mesh | null>>([]);
  const steam = useRef<Array<Mesh | null>>([]);

  const jitter = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        x: Math.cos(i * 2.1) * 0.45,
        z: Math.sin(i * 1.7) * 0.45,
        phase: (i * 0.11) % 1,
      })),
    [],
  );

  const fill = phase === 'ebullition' ? 0.52 - 0.16 * Math.min(1, vapor * 3) : 0.1 + 0.42 * liquid;
  const surfaceY = IN_BOTTOM + fill * (B_H - 0.12);
  const nIce = phase === 'glace' ? 7 : phase === 'fusion' ? Math.max(0, Math.round(7 * (1 - liquid))) : 0;
  const boiling = phase === 'ebullition';

  // Courbe exacte : 4 segments, sommets sur les points de changement d'état.
  const curve: Vector3Tuple[] = [
    [px(0), py(T_ICE), 0],
    [px(T1), py(0), 0],
    [px(T2), py(0), 0],
    [px(T3), py(100), 0],
    [px(T_OBS), py(100), 0],
  ];

  const label =
    phase === 'glace'
      ? 'Glace (solide)'
      : phase === 'fusion'
        ? 'Fusion en cours'
        : phase === 'liquide'
          ? 'Eau liquide'
          : 'Ébullition';

  return (
    <LabScene cameraPosition={[0.4, 0.8, 8.6]} background="#FFF7ED" minDistance={5} maxDistance={15} groundY={BENCH_Y}>
      <LabBench y={BENCH_Y} color="#E7DCC8" size={26} />

      {/* ── Paillasse : trépied + bec de gaz + bécher ── */}
      <group position={[BX, 0, 0]}>
        {/* trépied */}
        <mesh position={[0, B_CY - B_H / 2 - 0.05, 0]}>
          <torusGeometry args={[B_R * 1.05, 0.035, 8, 32]} />
          <meshStandardMaterial color="#8A939F" metalness={0.85} roughness={0.35} />
        </mesh>
        {[0, 2.094, 4.189].map((a) => (
          <mesh key={a} position={[Math.cos(a) * B_R, (BENCH_Y + B_CY - B_H / 2) / 2, Math.sin(a) * B_R]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, B_CY - B_H / 2 - BENCH_Y, 10]} />
            <meshStandardMaterial color="#8A939F" metalness={0.85} roughness={0.35} />
          </mesh>
        ))}
        {/* bec de gaz */}
        <mesh position={[0, BENCH_Y + 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.28, 0.24, 20]} />
          <meshStandardMaterial color="#4B5563" metalness={0.7} roughness={0.45} />
        </mesh>
        <mesh ref={flame} position={[0, BENCH_Y + 0.5, 0]}>
          <coneGeometry args={[0.22, 0.62, 16]} />
          <meshStandardMaterial color="#FB923C" emissive="#EA580C" emissiveIntensity={1.1} transparent opacity={0.85} />
        </mesh>
        <mesh position={[0, BENCH_Y + 0.38, 0]}>
          <coneGeometry args={[0.13, 0.3, 16]} />
          <meshStandardMaterial color="#93C5FD" emissive="#3B82F6" emissiveIntensity={0.9} transparent opacity={0.7} />
        </mesh>

        {/* bécher + eau */}
        <Beaker position={[0, B_CY, 0]} radius={B_R} height={B_H} fill={fill} liquidColor="#6EB6FF" />

        {/* glaçons restants */}
        {ICE_SLOTS.slice(0, nIce).map((s, i) => (
          <mesh key={i} position={[s[0], IN_BOTTOM + s[1], s[2]]} rotation={[i * 0.4, i * 0.7, i * 0.23]} castShadow>
            <boxGeometry args={[0.34, 0.3, 0.32]} />
            <meshStandardMaterial color="#E4F1FF" roughness={0.12} metalness={0.05} transparent opacity={0.88} />
          </mesh>
        ))}

        {/* bulles d'ébullition */}
        {jitter.map((_, i) => (
          <mesh
            key={`b${i}`}
            visible={false}
            ref={(el) => {
              bubbles.current[i] = el;
            }}
          >
            <sphereGeometry args={[0.075, 12, 10]} />
            <meshStandardMaterial color="#DBEAFE" transparent opacity={0.55} roughness={0.1} />
          </mesh>
        ))}

        {/* vapeur au-dessus du bécher */}
        {jitter.slice(0, 6).map((_, i) => (
          <mesh
            key={`s${i}`}
            visible={false}
            ref={(el) => {
              steam.current[i] = el;
            }}
          >
            <sphereGeometry args={[0.22, 12, 10]} />
            <meshStandardMaterial color="#F1F5F9" transparent opacity={0.28} roughness={1} />
          </mesh>
        ))}

        {/* thermomètre plongé dans le bécher */}
        <mesh position={[0.42, B_CY + 0.45, 0.1]}>
          <cylinderGeometry args={[0.045, 0.045, 2.1, 14]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.15} transparent opacity={0.85} />
        </mesh>
        <mesh position={[0.42, IN_BOTTOM + 0.12, 0.1]}>
          <sphereGeometry args={[0.08, 16, 12]} />
          <meshStandardMaterial color="#DC2626" emissive="#991B1B" emissiveIntensity={0.35} />
        </mesh>

        <Tag3D position={[0, B_CY + B_H / 2 + 0.45, 0]} label={label} tone="chimie" />
      </group>

      {/* ── Graphe T = f(temps) ── */}
      <group position={[GX + 2.3, GY + 1.45, -0.12]}>
        <GraphPaper width={5.3} height={3.5} step={0.4} color="#D8DEE9" />
      </group>

      <Arrow3D from={[GX - 0.15, GY, 0]} to={[px(T_OBS) + 0.45, GY, 0]} color="#475569" radius={0.02} headLength={0.2} />
      <Arrow3D from={[GX, GY - 0.2, 0]} to={[GX, py(100) + 0.5, 0]} color="#475569" radius={0.02} headLength={0.2} />

      {/* lignes repères des deux paliers */}
      <PolyLine points={[[GX, py(0), -0.02], [px(T_OBS), py(0), -0.02]]} color="#94A3B8" width={1.5} dashed />
      <PolyLine points={[[GX, py(100), -0.02], [px(T_OBS), py(100), -0.02]]} color="#94A3B8" width={1.5} dashed />

      {/* la courbe de chauffage */}
      <PolyLine points={curve} color="#EA580C" width={3.5} />
      {/* paliers surlignés */}
      <PolyLine points={[[px(T1), py(0), 0.03], [px(T2), py(0), 0.03]]} color="#2563EB" width={7} />
      <PolyLine points={[[px(T3), py(100), 0.03], [px(T_OBS), py(100), 0.03]]} color="#DC2626" width={7} />

      {/* mesures relevées par l'élève */}
      <DataPoints points={marks.map(([mt, mT]) => [px(mt), py(mT), 0.04] as Vector3Tuple)} color="#7C3AED" size={0.07} />

      {/* point courant animé */}
      <mesh ref={point} position={[px(time), py(temp), 0.06]}>
        <sphereGeometry args={[0.11, 20, 16]} />
        <meshStandardMaterial color="#111827" emissive="#F97316" emissiveIntensity={0.55} />
      </mesh>

      <Tag3D position={[GX - 0.42, py(0), 0]} label="0 °C" tone="physique" />
      <Tag3D position={[GX - 0.48, py(100), 0]} label="100 °C" tone="physique" />
      <Tag3D position={[px((T1 + T2) / 2), py(0) - 0.42, 0]} label="palier de fusion" tone="physique" />
      <Tag3D position={[px((T3 + T_OBS) / 2), py(100) + 0.4, 0]} label="palier d'ébullition" tone="chimie" />
      <Tag3D position={[px(T_OBS) + 0.3, GY - 0.3, 0]} label="temps (s)" tone="neutral" />

      <Readout position={[px(time), py(temp) + 0.55, 0.1]} value={temp.toFixed(0)} unit="°C" caption="thermomètre" />
      <SceneLabel
        position={[1.2, 2.2, 0]}
        title={`t = ${time.toFixed(0)} s · θ = ${temp.toFixed(0)} °C`}
        subtitle="100 g de glace · plaque 500 W · pression normale"
        tone="chimie"
      />

      <Animate
        fn={(state) => {
          const el = state.clock.elapsedTime;
          flame.current?.scale.setY(1 + Math.sin(el * 7) * 0.18);
          point.current?.scale.setScalar(1 + Math.sin(el * 4) * 0.14);

          const span = Math.max(0.2, surfaceY - IN_BOTTOM);
          bubbles.current.forEach((m, i) => {
            if (!m) return;
            m.visible = boiling;
            if (!boiling) return;
            const j = jitter[i];
            const prog = (el * 0.8 + j.phase) % 1;
            m.position.set(j.x, IN_BOTTOM + 0.05 + prog * span, j.z);
            m.scale.setScalar(0.5 + prog * 0.9);
          });

          steam.current.forEach((m, i) => {
            if (!m) return;
            m.visible = boiling;
            if (!boiling) return;
            const j = jitter[i];
            const prog = (el * 0.35 + j.phase) % 1;
            m.position.set(j.x * 1.4, B_CY + B_H / 2 + 0.2 + prog * 1.7, j.z * 1.4);
            m.scale.setScalar(0.45 + prog * 1.2);
          });
        }}
      />
    </LabScene>
  );
}
