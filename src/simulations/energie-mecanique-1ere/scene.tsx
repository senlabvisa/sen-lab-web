'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { Mesh, Vector3Tuple } from 'three';
import {
  LabScene,
  LabBench,
  Segment,
  PolyLine,
  SceneLabel,
  Tag3D,
  Readout,
  Animate,
  damp,
  ValueTrail,
  GhostState,
  FocusHalo,
  CompareCard,
  LegendCard,
  type LegendItem,
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
 * simulé — aucune valeur n'est approximée. Les barres ne SAUTENT pas : leur
 * hauteur rejoint la valeur exacte par amortissement exponentiel (`damp`),
 * indépendant du framerate.
 *
 * Lecture pédagogique câblée sur le kit lab3d :
 *  - <ValueTrail>  : la bille écrit sa trajectoire sur le rail.
 *  - <GhostState>  : deux billes fantômes figent la hauteur de lâcher h₀.
 *                    Sans frottement la bille les rejoint exactement ; avec
 *                    frottement elle reste dessous. C'est LE point du TP.
 *  - <CompareCard> : Em au départ vs Em maintenant → l'écart = énergie dissipée.
 *  - <FocusHalo>   : l'œil est amené sur la bille au moment du lâcher.
 *  - <LegendCard>  : chaque énergie a une FORME (carré / triangle / anneau),
 *                    pas seulement une couleur — rappelée par une pastille 3D
 *                    posée devant chaque barre.
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
const BAR_MAX = 2.1; // plafond visuel des barres
const BAR_LAMBDA = 9; // vitesse de rattrapage des barres (s⁻¹)
const RAIL_Z = 0.22;
const CHIP_Z = 0.44; // pastilles de forme, devant la face avant des barres

const C_EC = '#2563EB';
const C_EPP = '#16A34A';
const C_EM = '#F59E0B';
const C_BALL = '#B91C1C';
const C_TRAIL = '#DC2626';

/** Positions figées (littéraux hissés : R3F ne réapplique rien au re-render). */
const BAR_POS: Vector3Tuple[] = [
  [BAR_X[0], 0, 0],
  [BAR_X[1], 0, 0],
  [BAR_X[2], 0, 0],
];
const BAR_SCALE0: Vector3Tuple = [1, 0.001, 1];
const BARS_ORIGIN: Vector3Tuple = [0, GROUND_Y, 0];

const LEGEND: LegendItem[] = [
  { label: 'Ec — cinétique (½mv²)', color: C_EC, shape: 'square' },
  { label: 'Epp — potentielle (mgh)', color: C_EPP, shape: 'triangle' },
  { label: 'Em = Ec + Epp', color: C_EM, shape: 'ring' },
  { label: 'Trace de la bille', color: C_TRAIL, shape: 'dash' },
  { label: 'Hauteur de lâcher h₀', color: C_EM, shape: 'dashed', note: 'fantômes' },
];

/**
 * Élément hissé au module : sa référence ne change jamais, donc React saute
 * son rendu à chaque tick d'afficheur (~10 par seconde). La légende est fixe.
 */
const ENERGY_LEGEND = (
  <LegendCard
    position={[-3.05, GROUND_Y + 3.85, 0]}
    title="Les trois énergies"
    items={LEGEND}
    width={188}
    distanceFactor={7}
    tone="physique"
  />
);

type Sample = { ec: number; epp: number; em: number; v: number };

/**
 * Rejoint la hauteur cible par amortissement exponentiel, en mutant le mesh :
 * aucun re-render, et le résultat ne dépend que du temps écoulé (pas du fps).
 */
function relaxBar(m: Mesh | null, target: number, dt: number) {
  if (!m) return;
  const h = Math.max(0.001, damp(m.scale.y, Math.max(0.001, target), BAR_LAMBDA, dt));
  m.scale.y = h;
  m.position.y = h / 2;
}

/**
 * Les deux billes fantômes à la hauteur de lâcher. Mémoïsé sur des NOMBRES :
 * la scène se re-rend ~10 fois par seconde pour les afficheurs, mais le voile
 * de matériaux de <GhostState> ne doit être recalculé que si h₀ change.
 */
const ReleaseGhosts = memo(function ReleaseGhosts({
  xLeft,
  xRight,
  y,
  capY,
}: {
  xLeft: number;
  xRight: number;
  y: number;
  capY: number;
}) {
  const r = BALL_R * 1.15;
  return (
    <GhostState
      opacity={0.3}
      wireframe
      tone="physique"
      caption="Hauteur de lâcher h₀"
      captionPosition={[xRight, capY, 0]}
    >
      <mesh position={[xLeft, y, 0]}>
        <sphereGeometry args={[r, 20, 14]} />
        <meshStandardMaterial color={C_BALL} />
      </mesh>
      <mesh position={[xRight, y, 0]}>
        <sphereGeometry args={[r, 20, 14]} />
        <meshStandardMaterial color={C_BALL} />
      </mesh>
    </GhostState>
  );
});

export default function EnergieScene({ h0, mass, mu, g, hMax, xMax, runId }: EnergieSceneProps) {
  const ball = useRef<Mesh>(null);
  const barEc = useRef<Mesh>(null);
  const barEpp = useRef<Mesh>(null);
  const barEm = useRef<Mesh>(null);
  const sim = useRef({ x: 0, dir: 1, E: 0, key: '' });
  const acc = useRef(0);

  const K = hMax / (xMax * xMax);
  const em0 = mass * g * h0;
  const barScale = em0 > 0 ? BAR_TOP / em0 : 0;
  const key = `${h0}|${mass}|${mu}|${runId}`;

  const [s, setS] = useState<Sample>(() => ({ ec: 0, epp: mass * g * h0, em: mass * g * h0, v: 0 }));

  /** Halo de départ : visible les premières secondes de chaque lâcher. */
  const [releasing, setReleasing] = useState(true);
  useEffect(() => {
    setReleasing(true);
    const t = window.setTimeout(() => setReleasing(false), 2600);
    return () => window.clearTimeout(t);
  }, [key]);

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
  const mirrorX = TRACK_X - xStart * SX; // point symétrique : la bille doit y remonter
  const dissipee = Math.max(0, em0 - s.em);

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

      {/* Repère du lâcher : trait pointillé tendu d'un fantôme à l'autre */}
      <PolyLine
        points={[
          [TRACK_X - xMax * SX - 0.25, releaseY, 0],
          [mirrorX + 0.35, releaseY, 0],
        ]}
        color={C_EM}
        width={2}
        dashed
      />
      <Tag3D position={[TRACK_X - xMax * SX - 0.1, releaseY + 0.3, 0]} label={`h₀ = ${h0.toFixed(1)} m`} tone="physique" />

      {/* ── Mémoire de la hauteur de lâcher (le cœur du TP) ──────────────── */}
      <ReleaseGhosts xLeft={startX} xRight={mirrorX} y={releaseY + BALL_R} capY={releaseY + 0.52} />

      {/* ── La bille (position mise à jour par <Animate>) ────────────────── */}
      <mesh ref={ball} castShadow position={[startX, releaseY + BALL_R, 0]}>
        <sphereGeometry args={[BALL_R, 24, 18]} />
        <meshStandardMaterial color={C_BALL} roughness={0.25} metalness={0.45} emissive="#7F1D1D" emissiveIntensity={0.15} />
      </mesh>

      {/* La bille écrit sa trajectoire : l'élève voit l'HISTOIRE du mouvement. */}
      <ValueTrail target={ball} color={C_TRAIL} width={3} maxPoints={170} sampleEvery={0.045} resetKey={key} />

      {/* Au moment du lâcher, l'œil est amené sur la bille. */}
      {releasing && (
        <FocusHalo
          position={[startX, releaseY + BALL_R, 0]}
          radius={0.4}
          labelOffset={0.3}
          tone="physique"
          color={C_TRAIL}
          label="Lâchée sans vitesse"
        />
      )}

      {/* ── Les trois barres d'énergie (base posée sur la paillasse) ─────── */}
      <group position={BARS_ORIGIN}>
        <mesh ref={barEc} position={BAR_POS[0]} scale={BAR_SCALE0} castShadow>
          <boxGeometry args={[0.68, 1, 0.68]} />
          <meshStandardMaterial color={C_EC} roughness={0.5} />
        </mesh>
        <mesh ref={barEpp} position={BAR_POS[1]} scale={BAR_SCALE0} castShadow>
          <boxGeometry args={[0.68, 1, 0.68]} />
          <meshStandardMaterial color={C_EPP} roughness={0.5} />
        </mesh>
        <mesh ref={barEm} position={BAR_POS[2]} scale={BAR_SCALE0} castShadow>
          <boxGeometry args={[0.68, 1, 0.68]} />
          <meshStandardMaterial color={C_EM} roughness={0.5} />
        </mesh>

        {/* Pastilles de FORME : carré / triangle / anneau — repère non coloriel */}
        <mesh position={[BAR_X[0], 0.15, CHIP_Z]}>
          <boxGeometry args={[0.19, 0.19, 0.06]} />
          <meshStandardMaterial color={C_EC} roughness={0.4} />
        </mesh>
        <mesh position={[BAR_X[1], 0.15, CHIP_Z]}>
          <coneGeometry args={[0.13, 0.22, 24]} />
          <meshStandardMaterial color={C_EPP} roughness={0.4} />
        </mesh>
        <mesh position={[BAR_X[2], 0.15, CHIP_Z]}>
          <torusGeometry args={[0.11, 0.035, 10, 28]} />
          <meshStandardMaterial color={C_EM} roughness={0.4} />
        </mesh>
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

      {/* ── Afficheurs ───────────────────────────────────────────────────── */}
      <Readout position={[BAR_X[0], GROUND_Y + 2.35, 0]} value={s.ec.toFixed(2)} unit="J" caption="Ec = ½mv²" />
      <Readout position={[BAR_X[1], GROUND_Y + 2.35, 0]} value={s.epp.toFixed(2)} unit="J" caption="Epp = mgh" />
      <Readout position={[BAR_X[2], GROUND_Y + 2.35, 0]} value={s.em.toFixed(2)} unit="J" caption="Em = Ec + Epp" />
      <Readout position={[TRACK_X, GROUND_Y + 2.35, 0]} value={s.v.toFixed(2)} unit="m/s" caption="vitesse de la bille" />

      {/* Em au départ vs Em maintenant : l'écart EST l'énergie dissipée. */}
      <CompareCard
        position={[2.85, GROUND_Y + 4.2, 0]}
        title="Énergie mécanique"
        left={{ label: 'Au départ', value: em0, unit: 'J' }}
        right={{ label: 'Maintenant', value: s.em, unit: 'J' }}
        deltaLabel="Dissipé"
        precision={2}
        width={200}
        distanceFactor={7}
        tolerance={Math.max(0.005, em0 * 0.005)}
        tone="physique"
        verdict={
          mu === 0
            ? 'μ = 0 : rien ne se dissipe. La bille remonte pile à h₀.'
            : `Frottement : ${dissipee.toFixed(2)} J partis en chaleur. La bille reste sous h₀.`
        }
      />

      {ENERGY_LEGEND}

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

          // Les barres visent la valeur EXACTE de l'instant, mais l'atteignent
          // en douceur : on lit une énergie, pas un clignotement.
          const eppNow = mass * g * y;
          const ecNow = Math.max(0, sm.E - eppNow);
          relaxBar(barEc.current, Math.min(BAR_MAX, ecNow * barScale), delta);
          relaxBar(barEpp.current, Math.min(BAR_MAX, eppNow * barScale), delta);
          relaxBar(barEm.current, Math.min(BAR_MAX, (ecNow + eppNow) * barScale), delta);

          acc.current += delta;
          if (acc.current >= 0.1) {
            acc.current = 0;
            setS({ ec: ecNow, epp: eppNow, em: ecNow + eppNow, v: Math.sqrt((2 * ecNow) / mass) });
          }
        }}
      />
    </LabScene>
  );
}
