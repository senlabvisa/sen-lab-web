'use client';

import { useMemo, useRef, useState } from 'react';
import type { Mesh, Vector3Tuple } from 'three';
import {
  LabScene,
  LabBench,
  Segment,
  PolyLine,
  Bar,
  Marker,
  SceneLabel,
  Tag3D,
  Readout,
  Animate,
} from '@/components/lab3d';

/**
 * Scène 3D — conservation de l'énergie mécanique (1ère S).
 *
 * Une bille est lâchée sans vitesse initiale sur un toboggan parabolique
 * y(x) = K·x² (K = hMax / xMax²). Le mouvement est intégré à partir de
 * l'ÉNERGIE : à chaque pas on connaît E (énergie mécanique courante), donc
 *   Epp = m·g·y(x),  Ec = E − Epp,  v = √(2·Ec/m)
 * et on avance de dx = ±v·dt / √(1 + y'²) le long du rail.
 *
 * Le travail des frottements sur un déplacement ds vaut −μ·N·ds avec
 * N = m·g·cosθ et ds = |dx|/cosθ, donc ΔE = −μ·m·g·|dx| : exact, et nul
 * quand μ = 0. C'est pourquoi la barre Em ne bouge PAS sans frottement.
 *
 * Les trois barres (Ec, Epp, Em) et les afficheurs lisent directement l'état
 * simulé — aucune valeur n'est approximée.
 */

export type EnergieSceneProps = {
  /** Hauteur de lâcher (m). */
  h0: number;
  /** Masse de la bille (kg). */
  mass: number;
  /** Coefficient de frottement (sans unité). */
  mu: number;
  /** Intensité de la pesanteur (m/s²). */
  g: number;
  /** Hauteur du toboggan à son extrémité (m). */
  hMax: number;
  /** Demi-largeur du toboggan (m). */
  xMax: number;
  /** Incrémenté par le bouton « relâcher » pour rejouer la descente. */
  runId: number;
};

const SX = 0.55; // unités de scène par mètre (horizontal)
const SY = 0.55; // unités de scène par mètre (vertical)
const GROUND_Y = -1.5;
const BASE_Y = GROUND_Y + 0.09; // bas du rail
const TRACK_X = -1.95; // le toboggan est décalé à gauche, les barres à droite
const BALL_R = 0.13;
const BAR_X = [1.05, 2.0, 2.95];
const BAR_TOP = 1.75; // hauteur (unités) de la barre Em au départ
const RAIL_Z = 0.22;

type Sample = { ec: number; epp: number; em: number; v: number };

export default function EnergieScene({ h0, mass, mu, g, hMax, xMax, runId }: EnergieSceneProps) {
  const ball = useRef<Mesh>(null);
  const sim = useRef({ x: 0, dir: 1, E: 0, key: '' });
  const acc = useRef(0);

  const K = hMax / (xMax * xMax);
  const em0 = mass * g * h0;
  const barScale = em0 > 0 ? BAR_TOP / em0 : 0;
  const key = `${h0}|${mass}|${mu}|${runId}`;

  const [s, setS] = useState<Sample>(() => ({ ec: 0, epp: mass * g * h0, em: mass * g * h0, v: 0 }));

  /** Profil du rail (deux longerons + traverses). */
  const { profile, ties, posts, xStart } = useMemo(() => {
    const pts: Vector3Tuple[] = [];
    const N = 90;
    for (let i = 0; i <= N; i++) {
      const xm = -xMax + (2 * xMax * i) / N;
      pts.push([TRACK_X + xm * SX, BASE_Y + K * xm * xm * SY, 0]);
    }
    const tie: Vector3Tuple[][] = [];
    const post: Vector3Tuple[][] = [];
    for (let xm = -xMax; xm <= xMax + 1e-6; xm += 0.5) {
      const px = TRACK_X + xm * SX;
      const py = BASE_Y + K * xm * xm * SY;
      tie.push([
        [px, py, -RAIL_Z],
        [px, py, RAIL_Z],
      ]);
      if (Math.abs(Math.abs(xm) - Math.round(Math.abs(xm))) < 1e-6 && Math.abs(xm) >= 1) {
        post.push([
          [px, GROUND_Y, 0],
          [px, py, 0],
        ]);
      }
    }
    return { profile: pts, ties: tie, posts: post, xStart: -Math.sqrt(Math.min(h0, hMax) / K) };
  }, [K, xMax, hMax, h0]);

  const releaseY = BASE_Y + h0 * SY;
  const startX = TRACK_X + xStart * SX;

  return (
    <LabScene cameraPosition={[0, 0.5, 8]} background="#EAF2FF" minDistance={4} maxDistance={16} groundY={GROUND_Y}>
      <LabBench y={GROUND_Y} color="#E8DFCC" size={26} />

      {/* ── Toboggan : deux longerons acier + traverses + poteaux ───────── */}
      {[-RAIL_Z, RAIL_Z].map((z) => (
        <PolyLine key={z} points={profile.map((p) => [p[0], p[1], z] as Vector3Tuple)} color="#64748B" width={5} />
      ))}
      {ties.map((t, i) => (
        <Segment key={`t${i}`} a={t[0]} b={t[1]} color="#94A3B8" width={0.022} />
      ))}
      {posts.map((p, i) => (
        <Segment key={`p${i}`} a={p[0]} b={p[1]} color="#8B7355" width={0.05} />
      ))}

      {/* Repère du lâcher : trait pointillé à la hauteur h₀ + point de départ */}
      <PolyLine
        points={[
          [TRACK_X - xMax * SX - 0.25, releaseY, 0],
          [TRACK_X + 0.35, releaseY, 0],
        ]}
        color="#F59E0B"
        width={2}
        dashed
      />
      <Marker position={[startX, releaseY, 0]} color="#F59E0B" size={0.07} />
      <Tag3D position={[TRACK_X - xMax * SX - 0.15, releaseY + 0.28, 0]} label={`h₀ = ${h0.toFixed(1)} m`} tone="physique" />

      {/* ── La bille (position mise à jour par <Animate>) ────────────────── */}
      <mesh ref={ball} castShadow position={[startX, releaseY + BALL_R, 0]}>
        <sphereGeometry args={[BALL_R, 24, 18]} />
        <meshStandardMaterial color="#B91C1C" roughness={0.25} metalness={0.45} emissive="#7F1D1D" emissiveIntensity={0.15} />
      </mesh>

      {/* ── Les trois barres d'énergie (base posée sur la paillasse) ─────── */}
      <group position={[0, GROUND_Y, 0]}>
        <Bar x={BAR_X[0]} height={Math.min(2.1, s.ec * barScale)} width={0.68} depth={0.68} color="#2563EB" />
        <Bar x={BAR_X[1]} height={Math.min(2.1, s.epp * barScale)} width={0.68} depth={0.68} color="#16A34A" />
        <Bar x={BAR_X[2]} height={Math.min(2.1, s.em * barScale)} width={0.68} depth={0.68} color="#F59E0B" />
      </group>

      {/* Niveau de l'énergie mécanique de départ : la barre Em doit y rester */}
      <PolyLine
        points={[
          [BAR_X[0] - 0.55, GROUND_Y + BAR_TOP, 0],
          [BAR_X[2] + 0.55, GROUND_Y + BAR_TOP, 0],
        ]}
        color="#D97706"
        width={2}
        dashed
      />
      <Tag3D position={[BAR_X[2] + 0.55, GROUND_Y + BAR_TOP + 0.24, 0]} label={`Em de départ = ${em0.toFixed(2)} J`} tone="physique" />

      {/* ── Afficheurs ───────────────────────────────────────────────────── */}
      <Readout position={[BAR_X[0], GROUND_Y + 2.35, 0]} value={s.ec.toFixed(2)} unit="J" caption="Ec = ½mv²" />
      <Readout position={[BAR_X[1], GROUND_Y + 2.35, 0]} value={s.epp.toFixed(2)} unit="J" caption="Epp = mgh" />
      <Readout position={[BAR_X[2], GROUND_Y + 2.35, 0]} value={s.em.toFixed(2)} unit="J" caption="Em = Ec + Epp" />
      <Readout position={[TRACK_X, GROUND_Y + 2.35, 0]} value={s.v.toFixed(2)} unit="m/s" caption="vitesse de la bille" />

      <SceneLabel
        position={[TRACK_X, GROUND_Y + 1.7, 0]}
        title={`m = ${mass.toFixed(2)} kg · μ = ${mu.toFixed(2)}`}
        subtitle={`Toboggan · g = ${g.toFixed(2)} m/s² (Dakar)`}
        tone="physique"
      />

      {/* ── Moteur physique (énergie) ────────────────────────────────────── */}
      <Animate
        fn={(_state, delta) => {
          const sm = sim.current;
          if (sm.key !== key) {
            sm.key = key;
            sm.x = -Math.sqrt(Math.min(h0, hMax) / K);
            sm.dir = 1;
            sm.E = mass * g * h0;
          }
          const dt = Math.min(delta, 0.05);
          const sub = 6;
          const dtSub = dt / sub;
          for (let i = 0; i < sub; i++) {
            const y = K * sm.x * sm.x;
            const ec = Math.max(0, sm.E - mass * g * y);
            const v = Math.sqrt((2 * ec) / mass);
            if (v < 0.02) {
              // Point de rebroussement : on repart vers le bas du toboggan.
              if (sm.E > 1e-3 && Math.abs(sm.x) > 2e-3) {
                sm.dir = sm.x > 0 ? -1 : 1;
                sm.x += sm.dir * 0.003;
              }
              continue;
            }
            const slope = 2 * K * sm.x;
            const dx = (sm.dir * v * dtSub) / Math.sqrt(1 + slope * slope);
            // Travail des frottements : ΔE = −μ·m·g·|dx| (exact, nul si μ = 0)
            if (mu > 0) sm.E = Math.max(0, sm.E - mu * mass * g * Math.abs(dx));
            const xt = Math.sqrt(Math.max(0, sm.E / (mass * g * K)));
            let nx = sm.x + dx;
            if (Math.abs(nx) > xt) {
              nx = Math.sign(nx) * xt;
              sm.dir = -sm.dir;
            }
            sm.x = Math.max(-xMax, Math.min(xMax, nx));
          }
          const y = K * sm.x * sm.x;
          ball.current?.position.set(TRACK_X + sm.x * SX, BASE_Y + y * SY + BALL_R, 0);

          acc.current += delta;
          if (acc.current >= 0.08) {
            acc.current = 0;
            const epp = mass * g * y;
            const ec = Math.max(0, sm.E - epp);
            setS({ ec, epp, em: ec + epp, v: Math.sqrt((2 * ec) / mass) });
          }
        }}
      />
    </LabScene>
  );
}
