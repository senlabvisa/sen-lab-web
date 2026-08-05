'use client';

import { useMemo, useRef } from 'react';
import type { Group, Mesh, MeshStandardMaterial, Vector3Tuple } from 'three';
import {
  Animate,
  Arrow3D,
  AutoNarration,
  Beaker,
  Callout,
  clamp01,
  CompareCard,
  damp,
  DataPoints,
  Float,
  FocusHalo,
  goldenPhase,
  GraphPaper,
  hash01,
  LabBench,
  LabScene,
  LegendCard,
  noise1D,
  PolyLine,
  Readout,
  SceneLabel,
  Spring,
  SPRING_PRESETS,
  StepNarration,
  Tag3D,
  ValueTrail,
} from '@/components/lab3d';

/**
 * Scène 3D — courbe de chauffage de l'eau (changements d'état, 6ème).
 *
 * À gauche : un bécher de 100 g de glace posé sur un trépied, chauffé par un
 * bec de gaz. Les glaçons FONDENT en rétrécissant en douceur (`damp`), l'eau
 * monte, puis bout (bulles déterministes `noise1D`/`goldenPhase`, vapeur qui
 * ondule avec `<Float>`). Le thermomètre rejoint sa valeur avec inertie
 * (`<Spring>` réglage `needle`).
 *
 * À droite : la courbe T(t) **n'est PAS tracée d'avance**. Elle se construit
 * sous les yeux de l'élève : un point courant suit un temps lissé et laisse
 * derrière lui sa trace (`<ValueTrail>`). Les deux **paliers** (0 °C fusion,
 * 100 °C ébullition) s'épaississent au fur et à mesure qu'on les traverse et
 * portent un `<FocusHalo>` tant qu'on y est.
 *
 * Pédagogie : `<StepNarration>` suit les 4 phases (contrôlée par le temps de
 * l'élève, pas par une horloge murale), `<CompareCard>` oppose la température
 * de l'eau à celle de la plaque — c'est LA difficulté du chapitre : la plaque
 * chauffe toujours pendant un palier, et pourtant l'eau ne monte plus.
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
  /**
   * Change de valeur quand l'élève recommence ou revient en arrière : la trace
   * de la courbe est effacée et le point repart d'ici (pas de fausse corde).
   */
  runId?: number;
};

// ── Constantes physiques (SI) ─────────────────────────────────────────
const M = 0.1; // kg de glace
const P = 500; // W (plaque chauffante)
const C_ICE = 2100; // J·kg⁻¹·K⁻¹
const C_WATER = 4185; // J·kg⁻¹·K⁻¹
const LF = 334_000; // J·kg⁻¹ (fusion)
const LV = 2_256_000; // J·kg⁻¹ (vaporisation)
const T_ICE = -20; // °C au départ
const T_PLATE = 400; // °C — température de service de la plaque (constante)

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

/** Avancement 0→1 à l'intérieur de la phase courante (pour la barre de narration). */
function phaseProgress(t: number): number {
  if (t <= T1) return clamp01(t / T1);
  if (t <= T2) return clamp01((t - T1) / (T2 - T1));
  if (t <= T3) return clamp01((t - T2) / (T3 - T2));
  return clamp01((t - T3) / (T_OBS - T3));
}

const PHASE_INDEX: Record<Phase, number> = { glace: 0, fusion: 1, liquide: 2, ebullition: 3 };

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

// ── Thermomètre : colonne de « mercure » pilotée par un ressort ───────
const COL_BOTTOM = -1.06;
const COL_H = 1.95;

const ICE_SLOTS: Vector3Tuple[] = [
  [-0.34, 0.16, 0.2],
  [0.3, 0.14, -0.18],
  [-0.05, 0.2, -0.34],
  [0.36, 0.5, 0.24],
  [-0.28, 0.52, -0.2],
  [0.06, 0.56, 0.36],
  [0.02, 0.86, -0.02],
];

const N_BUBBLES = 9;
const N_STEAM = 6;

/** Narration des 4 phases : le POURQUOI du palier est dans le `detail`. */
const PHASE_STEPS = [
  {
    label: 'La glace se réchauffe',
    detail: 'De −20 °C à 0 °C. Elle reste solide : la température monte vite.',
  },
  {
    label: 'Palier à 0 °C : la glace fond',
    detail: 'Le feu chauffe toujours, mais toute l’énergie sert à FONDRE la glace. Le thermomètre ne bouge plus.',
  },
  {
    label: 'L’eau liquide se réchauffe',
    detail: 'Plus de glace : la température repart de 0 °C jusqu’à 100 °C.',
  },
  {
    label: 'Palier à 100 °C : l’eau bout',
    detail: 'L’énergie sert à transformer l’eau en vapeur. Elle reste à 100 °C tant qu’il reste de l’eau.',
  },
];

export default function HeatingScene({ time, marks = [], runId = 0 }: HeatingSceneProps) {
  const { temp, phase, liquid, vapor } = heating(time);

  const flame = useRef<Mesh>(null);
  const point = useRef<Mesh>(null);
  const mercury = useRef<Mesh>(null);
  const ice = useRef<Array<Mesh | null>>([]);
  const bubbles = useRef<Array<Mesh | null>>([]);
  const steamRise = useRef<Array<Group | null>>([]);

  // Un objet-ref stable par bouffée de vapeur : <Float> pilote sa position locale.
  const steamPuff = useMemo(
    () => Array.from({ length: N_STEAM }, () => ({ current: null as Mesh | null })),
    [],
  );

  // Temps lissé : le point courant (donc la courbe) rejoint la valeur avec
  // inertie. Bonus décisif : quand l'élève tire le curseur, le point GLISSE le
  // long de la vraie courbe T(t) au lieu de sauter → la trace reste juste.
  const tSmooth = useRef(time);
  const lastRun = useRef(runId);
  // Échelle courante de chaque glaçon (amortie vers sa cible par `damp`).
  const iceScale = useMemo(() => ICE_SLOTS.map(() => 1), []);

  // Variations déterministes (aucun Math.random au rendu).
  const bubbleSpec = useMemo(
    () =>
      Array.from({ length: N_BUBBLES }, (_, i) => ({
        phase: goldenPhase(i),
        x: (hash01(i, 11) - 0.5) * 1.1,
        z: (hash01(i, 29) - 0.5) * 1.1,
        speed: 0.55 + hash01(i, 41) * 0.55,
        size: 0.65 + hash01(i, 53) * 0.6,
      })),
    [],
  );
  const steamSpec = useMemo(
    () =>
      Array.from({ length: N_STEAM }, (_, i) => ({
        phase: goldenPhase(i),
        x: (hash01(i, 67) - 0.5) * 1.2,
        z: (hash01(i, 83) - 0.5) * 1.2,
        speed: 0.28 + hash01(i, 97) * 0.18,
      })),
    [],
  );

  const fill = phase === 'ebullition' ? 0.52 - 0.16 * Math.min(1, vapor * 3) : 0.1 + 0.42 * liquid;
  const surfaceY = IN_BOTTOM + fill * (B_H - 0.12);
  const boiling = phase === 'ebullition';
  const plateau = phase === 'fusion' || phase === 'ebullition';

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

        {/* glaçons : présents en permanence, ils RÉTRÉCISSENT en fondant (damp) */}
        {ICE_SLOTS.map((s, i) => (
          <mesh
            key={i}
            position={[s[0], IN_BOTTOM + s[1], s[2]]}
            rotation={[i * 0.4, i * 0.7, i * 0.23]}
            castShadow
            ref={(el) => {
              ice.current[i] = el;
            }}
          >
            <boxGeometry args={[0.34, 0.3, 0.32]} />
            <meshStandardMaterial color="#E4F1FF" roughness={0.12} metalness={0.05} transparent opacity={0.88} />
          </mesh>
        ))}

        {/* bulles d'ébullition */}
        {bubbleSpec.map((_, i) => (
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

        {/* vapeur : le groupe MONTE, la bouffée ONDULE dedans (<Float>) */}
        {steamSpec.map((_, i) => (
          <group
            key={`s${i}`}
            visible={false}
            ref={(el) => {
              steamRise.current[i] = el;
            }}
          >
            <mesh
              ref={(el) => {
                steamPuff[i].current = el;
              }}
            >
              <sphereGeometry args={[0.22, 12, 10]} />
              <meshStandardMaterial color="#F1F5F9" transparent opacity={0.28} roughness={1} />
            </mesh>
          </group>
        ))}
        {boiling &&
          steamSpec.map((_, i) => (
            <Float
              key={`f${i}`}
              objectRef={steamPuff[i]}
              base={[0, 0, 0]}
              amplitude={0.13}
              speed={0.45}
              seed={i}
              rotation={0.2}
              octaves={2}
            />
          ))}

        {/* thermomètre plongé dans le bécher */}
        <mesh position={[0.42, B_CY + 0.45, 0.1]}>
          <cylinderGeometry args={[0.045, 0.045, 2.1, 14]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.15} transparent opacity={0.85} />
        </mesh>
        <mesh ref={mercury} position={[0.42, COL_BOTTOM, 0.1]}>
          <cylinderGeometry args={[0.022, 0.022, COL_H, 10]} />
          <meshStandardMaterial color="#DC2626" emissive="#991B1B" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0.42, IN_BOTTOM + 0.12, 0.1]}>
          <sphereGeometry args={[0.08, 16, 12]} />
          <meshStandardMaterial color="#DC2626" emissive="#991B1B" emissiveIntensity={0.35} />
        </mesh>

        <Tag3D position={[0, B_CY + B_H / 2 + 0.45, 0]} label={label} tone="chimie" />
      </group>

      {/* Pendant un palier : on dit POURQUOI ça ne monte plus. */}
      {plateau && (
        <Callout
          at={[BX + 0.1, B_CY + 0.35, 0.3]}
          to={[BX + 0.1, 3.1, 0]}
          label={boiling ? 'Le feu chauffe… et pourtant 100 °C !' : 'Le feu chauffe… et pourtant 0 °C !'}
          detail={
            boiling
              ? 'Toute l’énergie sert à transformer l’eau en vapeur. Le thermomètre reste bloqué à 100 °C.'
              : 'Toute l’énergie sert à faire fondre la glace. Le thermomètre reste bloqué à 0 °C.'
          }
          tone={boiling ? 'chimie' : 'physique'}
          width={190}
          distanceFactor={6.5}
        />
      )}

      {/* ── Narration des 4 phases, pilotée par le temps de l'élève ── */}
      <StepNarration
        position={[-1.32, 1.55, 0]}
        tone="chimie"
        title="Ce que tu observes"
        steps={PHASE_STEPS}
        current={PHASE_INDEX[phase]}
        progress={phaseProgress(time)}
        width={224}
        distanceFactor={7}
      />

      {/* Chauffer ≠ faire monter la température : la preuve en deux colonnes. */}
      <CompareCard
        position={[-1.32, -0.62, 0]}
        title="Eau ou plaque ?"
        left={{ label: 'Eau (thermomètre)', value: Math.round(temp), unit: '°C' }}
        right={{ label: 'Plaque (500 W)', value: T_PLATE, unit: '°C' }}
        precision={0}
        deltaLabel="Écart"
        showPercent={false}
        verdict={
          plateau
            ? 'La plaque reste brûlante et donne toujours 500 W… et pourtant l’eau ne monte plus : elle CHANGE D’ÉTAT.'
            : 'La plaque donne 500 W et l’eau se réchauffe : sa température monte.'
        }
        tone="physique"
        width={210}
        distanceFactor={6.5}
      />

      {/* ── Graphe T = f(temps) ── */}
      <group position={[GX + 2.3, GY + 1.45, -0.12]}>
        <GraphPaper width={5.3} height={3.5} step={0.4} color="#D8DEE9" />
      </group>

      <Arrow3D from={[GX - 0.15, GY, 0]} to={[px(T_OBS) + 0.45, GY, 0]} color="#475569" radius={0.02} headLength={0.2} />
      <Arrow3D from={[GX, GY - 0.2, 0]} to={[GX, py(100) + 0.5, 0]} color="#475569" radius={0.02} headLength={0.2} />

      {/* lignes repères des deux paliers */}
      <PolyLine points={[[GX, py(0), -0.02], [px(T_OBS), py(0), -0.02]]} color="#94A3B8" width={1.5} dashed />
      <PolyLine points={[[GX, py(100), -0.02], [px(T_OBS), py(100), -0.02]]} color="#94A3B8" width={1.5} dashed />

      {/*
        LA COURBE. Elle n'est PAS dessinée d'avance : c'est la trace du point
        courant, qui se construit pendant que l'eau chauffe.
      */}
      <ValueTrail
        target={point}
        color="#EA580C"
        width={4}
        maxPoints={520}
        sampleEvery={0.04}
        resetKey={runId}
      />

      {/* paliers surlignés — ils s'épaississent seulement une fois traversés */}
      {time > T1 + 1 && (
        <PolyLine
          points={[[px(T1), py(0), 0.03], [px(Math.min(time, T2)), py(0), 0.03]]}
          color="#2563EB"
          width={7}
        />
      )}
      {time > T3 + 1 && (
        <PolyLine
          points={[[px(T3), py(100), 0.03], [px(Math.min(time, T_OBS)), py(100), 0.03]]}
          color="#DC2626"
          width={7}
        />
      )}

      {/* halo sur le palier EN COURS */}
      {phase === 'fusion' && (
        <FocusHalo
          position={[px((T1 + T2) / 2), py(0), 0.12]}
          radius={0.55}
          tone="physique"
          label="Palier : ça ne monte plus"
          labelOffset={0.3}
          distanceFactor={6.5}
        />
      )}
      {phase === 'ebullition' && (
        <FocusHalo
          position={[px((T3 + T_OBS) / 2), py(100), 0.12]}
          radius={0.75}
          tone="chimie"
          label="Palier : ça ne monte plus"
          labelOffset={0.3}
          distanceFactor={6.5}
        />
      )}

      {/* mesures relevées par l'élève */}
      <DataPoints points={marks.map(([mt, mT]) => [px(mt), py(mT), 0.04] as Vector3Tuple)} color="#7C3AED" size={0.07} />

      {/*
        Point courant. Sa position est mutée par <Animate> (temps lissé) — on ne
        la repasse JAMAIS en prop React, sinon le point sauterait à chaque tick
        et la trace prendrait des points parasites.
      */}
      <mesh ref={point} position={[px(0), py(T_ICE), 0.06]}>
        <sphereGeometry args={[0.11, 20, 16]} />
        <meshStandardMaterial color="#111827" emissive="#F97316" emissiveIntensity={0.55} />
      </mesh>

      <Tag3D position={[GX - 0.42, py(0), 0]} label="0 °C" tone="physique" />
      <Tag3D position={[GX - 0.48, py(100), 0]} label="100 °C" tone="physique" />
      {time >= (T1 + T2) / 2 && (
        <Tag3D position={[px((T1 + T2) / 2), py(0) - 0.42, 0]} label="palier de fusion" tone="physique" />
      )}
      {time >= (T3 + T_OBS) / 2 && (
        <Tag3D position={[px((T3 + T_OBS) / 2), py(100) + 0.4, 0]} label="palier d'ébullition" tone="chimie" />
      )}
      <Tag3D position={[px(T_OBS) + 0.3, GY - 0.3, 0]} label="temps (s)" tone="neutral" />

      <LegendCard
        position={[1.45, -2.45, 0]}
        title="Le graphe"
        tone="chimie"
        items={[
          { label: 'Courbe en train de se tracer', color: '#EA580C', shape: 'dash' },
          { label: 'Palier de fusion (0 °C)', color: '#2563EB', shape: 'square' },
          { label: 'Palier d’ébullition (100 °C)', color: '#DC2626', shape: 'square' },
          { label: 'Tes mesures notées', color: '#7C3AED', shape: 'dot' },
        ]}
        width={186}
        distanceFactor={6}
      />

      <Readout position={[px(time), py(temp) + 0.55, 0.1]} value={temp.toFixed(0)} unit="°C" caption="thermomètre" />
      <SceneLabel
        position={[1.8, 3.15, 0]}
        title={`t = ${time.toFixed(0)} s · θ = ${temp.toFixed(0)} °C`}
        subtitle="100 g de glace · plaque 500 W · pression normale"
        tone="chimie"
      />

      {/* Avant de chauffer : petite boucle qui dit où regarder. */}
      {time < 1 && (
        <AutoNarration
          position={[2.7, 0.35, 0.2]}
          tone="physique"
          title="Avant de chauffer"
          hold={4}
          steps={[
            'Appuie sur « Chauffer » : le feu réchauffe la glace.',
            'Regarde le bécher : les glaçons vont fondre.',
            'Regarde le point noir : il dessine la courbe tout seul.',
            'Cherche les moments où la courbe devient PLATE.',
          ]}
          width={214}
          distanceFactor={7}
        />
      )}

      {/* Le thermomètre rejoint sa valeur avec inertie (ressort « aiguille »). */}
      <Spring
        target={temp}
        initial={T_ICE}
        config={SPRING_PRESETS.needle}
        restartKey={runId}
        onFrame={(v) => {
          const m = mercury.current;
          if (!m) return;
          const frac = Math.max(0.05, clamp01((v - T_ICE) / 120));
          m.scale.setY(frac);
          m.position.setY(COL_BOTTOM + (COL_H * frac) / 2);
        }}
      />

      <Animate
        fn={(state, delta) => {
          const el = state.clock.elapsedTime;
          const dt = delta;

          // Temps lissé → le point (et la trace) rejoignent la valeur avec inertie.
          const snap = lastRun.current !== runId;
          if (snap) lastRun.current = runId;
          tSmooth.current = snap ? time : damp(tSmooth.current, time, 8, dt);
          const ts = tSmooth.current;
          const now = heating(ts);
          const p = point.current;
          if (p) {
            p.position.set(px(ts), py(now.temp), 0.06);
            p.scale.setScalar(1 + Math.sin(el * 4) * 0.12);
          }

          // Flamme : frémissement déterministe (plus vivant qu'un sinus pur).
          const f = flame.current;
          if (f) {
            f.scale.set(
              1 + noise1D(el * 3.1, 3) * 0.08,
              1 + noise1D(el * 2.4, 5) * 0.18,
              1 + noise1D(el * 3.7, 9) * 0.08,
            );
          }

          // Glaçons : la cible dépend de l'avancement de la fusion, l'échelle
          // réelle la rejoint en douceur (damp) → ils fondent, ils ne disparaissent pas.
          const u = liquid * ICE_SLOTS.length;
          for (let i = 0; i < ICE_SLOTS.length; i++) {
            const m = ice.current[i];
            if (!m) continue;
            const target = clamp01(i + 1 - u);
            iceScale[i] = snap ? target : damp(iceScale[i], target, 3.5, dt);
            const sc = iceScale[i];
            m.visible = sc > 0.03;
            if (!m.visible) continue;
            const s = ICE_SLOTS[i];
            m.scale.setScalar(sc);
            const bob = noise1D(el * 0.6 + goldenPhase(i) * 6, 17 + i) * 0.035 * sc;
            m.position.set(s[0], IN_BOTTOM + (0.16 + s[1]) * sc + bob, s[2]);
            m.rotation.x = i * 0.4 + noise1D(el * 0.25, 31 + i) * 0.2;
          }

          // Bulles d'ébullition : montée déterministe, chacune sa cadence.
          const span = Math.max(0.2, surfaceY - IN_BOTTOM);
          for (let i = 0; i < N_BUBBLES; i++) {
            const m = bubbles.current[i];
            if (!m) continue;
            m.visible = boiling;
            if (!boiling) continue;
            const b = bubbleSpec[i];
            const prog = (el * b.speed + b.phase) % 1;
            m.position.set(
              b.x + noise1D(el * 1.4 + b.phase * 10, 101 + i) * 0.07,
              IN_BOTTOM + 0.05 + prog * span,
              b.z + noise1D(el * 1.2 + b.phase * 10, 211 + i) * 0.07,
            );
            m.scale.setScalar((0.5 + prog * 0.9) * b.size);
          }

          // Vapeur : le groupe monte et grossit, <Float> fait onduler la bouffée.
          for (let i = 0; i < N_STEAM; i++) {
            const g = steamRise.current[i];
            if (!g) continue;
            g.visible = boiling;
            if (!boiling) continue;
            const sp = steamSpec[i];
            const prog = (el * sp.speed + sp.phase) % 1;
            g.position.set(sp.x * 1.2, B_CY + B_H / 2 + 0.2 + prog * 1.7, sp.z * 1.2);
            g.scale.setScalar(0.45 + prog * 1.2);
            const puff = steamPuff[i].current;
            if (puff) {
              const mat = puff.material as MeshStandardMaterial;
              mat.opacity = 0.32 * (1 - prog) * (1 - prog);
            }
          }
        }}
      />
    </LabScene>
  );
}
