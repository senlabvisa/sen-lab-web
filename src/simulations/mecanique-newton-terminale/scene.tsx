'use client';

import { useMemo, useRef, useState } from 'react';
import type { Group, Mesh, Vector3Tuple } from 'three';
import {
  // environnement & tracé
  LabScene,
  LabBench,
  Arrow3D,
  PolyLine,
  // étiquettes
  SceneLabel,
  Readout,
  Tag3D,
  // mouvement
  Animate,
  Timeline,
  SpringTo,
  SPRING_PRESETS,
  Float,
  damp3,
  dampAngle,
  clamp01,
  linear,
  easeInOut,
  easeOutBack,
  easeOutElastic,
  // pédagogie
  AutoNarration,
  GhostState,
  DimGroup,
  ValueTrail,
  FocusHalo,
  CompareCard,
  LegendCard,
  type NarrationStep,
  type LegendItem,
} from '@/components/lab3d';

/**
 * Scène 3D — tir d'un projectile (mécanique de Newton, Terminale S, Bac).
 *
 * Physique réelle, g = 9,78 m/s² (Dakar). Deux trajectoires sont confrontées :
 *  - le MODÈLE sans frottement (parabole exacte, en pointillés pâles) ;
 *  - le TRAJET RÉEL de la mangue, que le projectile DESSINE au fur et à mesure
 *    (<ValueTrail>) — avec frottement de l'air si l'élève l'active (intégration
 *    numérique d'une traînée quadratique).
 *
 * Pédagogie câblée sur le kit lab3d :
 *  - <AutoNarration>  : « 2/4 — La mangue monte de moins en moins vite »,
 *                       les durées d'étape sont calées sur les phases du tir.
 *  - <ValueTrail>     : la trajectoire se construit au lieu d'apparaître d'un bloc.
 *  - <GhostState>     : l'essai précédent reste en trace estompée → comparaison d'angles.
 *  - <CompareCard>    : portée mesurée vs portée prévue par le modèle (+ écart).
 *  - <FocusHalo>/<DimGroup> : au moment où l'on parle du sommet, le décor s'efface
 *                       et un halo désigne la flèche.
 *  - Mouvement non linéaire : <Timeline> (armer → vol → repos) avec easeOutBack /
 *    easeOutElastic, <SpringTo> pour la cible au sol, damp3/dampAngle pour le
 *    sommet et l'orientation du lanceur, <Float> (bruit déterministe) pour le feuillage.
 */

export type ProjSceneProps = {
  v0: number;
  angle: number;
  g?: number;
  /** Ajoute la traînée de l'air : la mangue tombe plus court que le modèle. */
  frottement?: boolean;
  /** Dernier essai enregistré, affiché en fantôme pour comparer. */
  ghost?: { v0: number; angle: number } | null;
};

const SCALE = 0.18; // m → unités scène
const X0 = -3; // origine du tir (gauche)
const GROUND_Y = -1.5;
const LAUNCH: Vector3Tuple = [X0, GROUND_Y, 0];

/**
 * Coefficient de traînée quadratique ramené à la masse : k = ½·ρ·Cx·A / m.
 * Mangue de 300 g (rayon 5 cm → A = 7,9·10⁻³ m²), Cx = 0,47, air ρ = 1,2 kg/m³.
 */
const K_DRAG = 0.0074; // m⁻¹

const AIM = 1.1; // durée de la phase « armer » (s)
const REST = 1.3; // pause avant le tir suivant (s)
const SWING = 0.5; // débattement du bras de lancement (rad)

const C_REAL = '#EA580C'; // trajet réellement suivi
const C_MODEL = '#FDBA74'; // modèle sans frottement
const C_GHOST = '#94A3B8'; // essai précédent
const C_TARGET = '#DC2626'; // portée prévue
const C_V = '#2563EB'; // vecteur vitesse

/** Format « manuel sénégalais » : virgule décimale. */
function nf(n: number, d = 1): string {
  return n.toFixed(d).replace('.', ',');
}

function toScene(x: number, y: number): Vector3Tuple {
  return [X0 + x * SCALE, GROUND_Y + y * SCALE, 0];
}

type Traj = {
  /** Portée au sol (m). */
  range: number;
  /** Flèche = hauteur maximale (m). */
  height: number;
  /** Abscisse du sommet (m). */
  apexX: number;
  /** Durée de vol (s). */
  flight: number;
  /** Points de la courbe, en unités de scène. */
  points: Vector3Tuple[];
  /** Position (x, y) en mètres à l'instant t. */
  posAt: (t: number) => [number, number];
};

/** Modèle du cours : chute libre, aucune force autre que le poids. */
function idealTraj(v0: number, aRad: number, g: number): Traj {
  const T = (2 * v0 * Math.sin(aRad)) / g;
  const R = (v0 * v0 * Math.sin(2 * aRad)) / g;
  const H = (v0 * Math.sin(aRad)) ** 2 / (2 * g);
  const vx = v0 * Math.cos(aRad);
  const vy = v0 * Math.sin(aRad);
  const points: Vector3Tuple[] = [];
  const N = 64;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * T;
    points.push(toScene(vx * t, Math.max(0, vy * t - 0.5 * g * t * t)));
  }
  return {
    range: R,
    height: H,
    apexX: R / 2,
    flight: T,
    points,
    posAt: (t) => {
      const tt = Math.min(Math.max(0, t), T);
      return [vx * tt, Math.max(0, vy * tt - 0.5 * g * tt * tt)];
    },
  };
}

const DT = 0.004; // pas d'intégration (s)

/**
 * Trajectoire avec frottement de l'air : a⃗ = −g·ȷ⃗ − k·‖v⃗‖·v⃗.
 * Intégration semi-implicite d'Euler à pas fin, résultat mémorisé.
 */
function dragTraj(v0: number, aRad: number, g: number, k: number): Traj {
  const xs: number[] = [0];
  const ys: number[] = [0];
  let x = 0;
  let y = 0;
  let vx = v0 * Math.cos(aRad);
  let vy = v0 * Math.sin(aRad);
  let height = 0;
  let apexX = 0;
  let flight = DT;

  for (let i = 1; i <= 5000; i++) {
    const v = Math.hypot(vx, vy);
    vx += -k * v * vx * DT;
    vy += (-g - k * v * vy) * DT;
    const nx = x + vx * DT;
    const ny = y + vy * DT;
    if (ny <= 0 && i > 1) {
      // interpolation linéaire du dernier pas jusqu'au sol
      const f = y - ny > 1e-9 ? y / (y - ny) : 1;
      x += (nx - x) * f;
      flight = (i - 1 + f) * DT;
      xs.push(x);
      ys.push(0);
      break;
    }
    x = nx;
    y = ny;
    flight = i * DT;
    if (y > height) {
      height = y;
      apexX = x;
    }
    xs.push(x);
    ys.push(y);
  }

  const n = xs.length;
  const points: Vector3Tuple[] = [];
  const stride = Math.max(1, Math.floor(n / 70));
  for (let i = 0; i < n; i += stride) points.push(toScene(xs[i], ys[i]));
  if ((n - 1) % stride !== 0) points.push(toScene(xs[n - 1], ys[n - 1]));

  return {
    range: x,
    height,
    apexX,
    flight,
    points,
    posAt: (t) => {
      const u = clamp01(t / Math.max(1e-6, flight)) * (n - 1);
      const i = Math.max(0, Math.min(n - 2, Math.floor(u)));
      const f = u - i;
      return [xs[i] + (xs[i + 1] - xs[i]) * f, ys[i] + (ys[i + 1] - ys[i]) * f];
    },
  };
}

export default function ProjScene({
  v0,
  angle,
  g = 9.78,
  frottement = false,
  ghost = null,
}: ProjSceneProps) {
  const ball = useRef<Mesh>(null);
  const aimRef = useRef<Group>(null); // oriente le lanceur vers l'angle α
  const armRef = useRef<Group>(null); // débattement du bras (armer / fouetter)
  const apexRef = useRef<Group>(null); // sommet : halo, vecteur v⃗, flèche
  const targetRef = useRef<Group>(null); // cible au sol = portée prévue
  const foliage = useRef<Group>(null); // couronne du baobab
  const apexReady = useRef(false);

  /** Incrémenté à la fin de chaque tir : relance la timeline, la narration et la trace. */
  const [runId, setRunId] = useState(0);
  /** Étape de narration en cours (≈ 4 changements d'état par tir, pas par frame). */
  const [stepIdx, setStepIdx] = useState(0);

  const aRad = (angle * Math.PI) / 180;

  const model = useMemo(() => idealTraj(v0, aRad, g), [v0, aRad, g]);
  const real = useMemo(
    () => (frottement ? dragTraj(v0, aRad, g, K_DRAG) : model),
    [frottement, v0, aRad, g, model],
  );

  const ghostV0 = ghost?.v0 ?? 0;
  const ghostAngle = ghost?.angle ?? 0;
  const ghostTraj = useMemo(
    () => (ghostV0 > 0 ? idealTraj(ghostV0, (ghostAngle * Math.PI) / 180, g) : null),
    [ghostV0, ghostAngle, g],
  );

  /** Durée d'affichage du vol : jamais moins de 2 s, sinon l'élève ne voit rien. */
  const show = Math.max(2, real.flight);
  const slowed = show > real.flight + 0.05;

  const phases = useMemo(
    () => [
      { name: 'armer', duration: AIM, easing: easeOutBack },
      { name: 'vol', duration: show, easing: linear },
      { name: 'repos', duration: REST, easing: easeInOut },
    ],
    [show],
  );

  // Les durées d'étape sont calées sur les phases : l'étape « sommet » tombe
  // exactement quand la mangue passe au point le plus haut.
  const narration = useMemo<NarrationStep[]>(
    () => [
      {
        label: 'On arme le tir au pied du baobab',
        detail: `v₀ = ${v0} m/s et α = ${angle}° : tout est joué à l'instant du lâcher. Vol réel : ${nf(real.flight)} s${slowed ? ' (montré au ralenti)' : ''}.`,
        hold: AIM,
      },
      {
        label: 'La mangue monte de moins en moins vite',
        detail: `Seul le poids agit : la vitesse verticale perd ${nf(g, 2)} m/s chaque seconde.`,
        hold: show * 0.45,
      },
      {
        label: 'Au sommet, la vitesse est horizontale',
        detail: `La vitesse verticale s'annule : c'est la flèche h = ${nf(real.height)} m.`,
        hold: show * 0.14,
      },
      {
        label: 'Elle retombe : la trace dessine la portée',
        detail: `Elle touche le sol à ${nf(real.range)} m du baobab.`,
        hold: show * 0.41 + REST,
      },
    ],
    [v0, angle, g, show, slowed, real],
  );

  const apexTarget = useMemo<Vector3Tuple>(
    () => toScene(real.apexX, real.height),
    [real],
  );

  const legend = useMemo<LegendItem[]>(() => {
    const items: LegendItem[] = [
      { label: 'Trajet réellement suivi', color: C_REAL, shape: 'dot' },
      { label: 'Modèle sans frottement', color: C_MODEL, shape: 'dashed' },
      { label: 'Portée prévue par le modèle', color: C_TARGET, shape: 'ring' },
    ];
    if (ghostTraj) {
      items.push({
        label: `Essai précédent (${ghostAngle}°)`,
        color: C_GHOST,
        shape: 'dash',
        note: 'fantôme',
      });
    }
    return items;
  }, [ghostTraj, ghostAngle]);

  const onApex = stepIdx === 2; // l'étape « sommet » est en cours
  const ecart = model.range - real.range;

  return (
    <LabScene
      cameraPosition={[0, 0.6, 8.8]}
      background="#FFF4E0"
      minDistance={5}
      maxDistance={15}
      groundY={GROUND_Y}
    >
      {/* ── Décor : atténué pendant qu'on parle du sommet ─────────────── */}
      <DimGroup dimmed={onApex} opacity={0.18}>
        <LabBench y={GROUND_Y} color="#E7D8B8" size={26} />

        {/* Baobab : tronc trapu + couronne en trois masses */}
        <group position={[X0 - 0.75, GROUND_Y, -0.95]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.34, 1, 14]} />
            <meshStandardMaterial color="#6B4A2B" roughness={0.85} />
          </mesh>
          <group ref={foliage} position={[0, 1.15, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.52, 22, 16]} />
              <meshStandardMaterial color="#3E8E41" roughness={0.75} />
            </mesh>
            <mesh position={[0.42, -0.12, 0.16]} castShadow>
              <sphereGeometry args={[0.32, 18, 14]} />
              <meshStandardMaterial color="#357C39" roughness={0.75} />
            </mesh>
            <mesh position={[-0.38, -0.08, -0.14]} castShadow>
              <sphereGeometry args={[0.29, 18, 14]} />
              <meshStandardMaterial color="#46A04A" roughness={0.75} />
            </mesh>
          </group>
        </group>

        {/* Lanceur : socle + bras pivotant qui s'arme puis fouette */}
        <group position={[LAUNCH[0], LAUNCH[1] + 0.3, 0]}>
          <group ref={aimRef}>
            <mesh position={[0, -0.24, 0]} castShadow>
              <cylinderGeometry args={[0.13, 0.19, 0.14, 12]} />
              <meshStandardMaterial color="#7C5A38" roughness={0.9} />
            </mesh>
            <group ref={armRef}>
              <mesh position={[0.3, 0, 0]} castShadow>
                <boxGeometry args={[0.62, 0.06, 0.09]} />
                <meshStandardMaterial color="#8B5E34" roughness={0.8} />
              </mesh>
              <mesh position={[0.62, 0.05, 0]} castShadow>
                <cylinderGeometry args={[0.1, 0.07, 0.1, 14]} />
                <meshStandardMaterial color="#5B4126" roughness={0.9} />
              </mesh>
            </group>
          </group>
        </group>
      </DimGroup>

      {/* ── Essai précédent, en trace estompée ────────────────────────── */}
      {ghostTraj && (
        <GhostState
          opacity={0.34}
          tone="physique"
          caption={`Essai précédent · ${ghostAngle}° · ${nf(ghostTraj.range)} m`}
          captionPosition={[X0 + ghostTraj.range * SCALE, GROUND_Y - 0.78, 0]}
          distanceFactor={6}
        >
          <PolyLine points={ghostTraj.points} color={C_GHOST} width={4} />
          <mesh position={toScene(ghostTraj.range, 0)}>
            <sphereGeometry args={[0.1, 16, 12]} />
            <meshStandardMaterial color={C_GHOST} />
          </mesh>
        </GhostState>
      )}

      {/* ── Modèle du cours : la parabole attendue, en pointillés ─────── */}
      <PolyLine points={model.points} color={C_MODEL} width={2.5} dashed />

      {/* ── Cible au sol : rejoint sa nouvelle place au ressort ───────── */}
      <group ref={targetRef} position={LAUNCH}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <ringGeometry args={[0.15, 0.21, 36]} />
          <meshStandardMaterial color={C_TARGET} emissive={C_TARGET} emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, 0.17, 0]}>
          <cylinderGeometry args={[0.013, 0.013, 0.34, 8]} />
          <meshStandardMaterial color={C_TARGET} roughness={0.5} />
        </mesh>
        <Tag3D position={[0, -0.36, 0]} label={`Portée ${nf(model.range)} m`} tone="physique" distanceFactor={6} />
      </group>
      <SpringTo objectRef={targetRef} to={[X0 + model.range * SCALE, GROUND_Y, 0]} config={SPRING_PRESETS.gentle} />

      {/* ── Sommet : glisse en douceur (damp3) vers sa nouvelle place ─── */}
      <group ref={apexRef} position={LAUNCH}>
        <mesh>
          <sphereGeometry args={[0.055, 16, 12]} />
          <meshStandardMaterial color={C_V} emissive={C_V} emissiveIntensity={0.3} />
        </mesh>
        <Arrow3D from={[0, 0, 0]} to={[0.85, 0, 0]} color={C_V} radius={0.028} headLength={0.2} />
        <Tag3D position={[0.62, 0.28, 0]} label="v⃗ horizontale" tone="physique" distanceFactor={6} />
        {onApex ? (
          <FocusHalo
            position={[0, 0, 0]}
            radius={0.48}
            tone="physique"
            label={`Sommet · flèche h = ${nf(real.height)} m`}
            distanceFactor={6}
          />
        ) : (
          <Readout position={[0, 0.62, 0]} value={nf(real.height, 2)} unit="m" caption="flèche (h max)" distanceFactor={6} />
        )}
      </group>

      {/* ── La mangue : elle DESSINE sa trajectoire au lieu de l'afficher ── */}
      <mesh ref={ball} position={LAUNCH} castShadow>
        <sphereGeometry args={[0.13, 20, 16]} />
        <meshStandardMaterial color="#B91C1C" roughness={0.3} metalness={0.2} emissive="#7F1D1D" emissiveIntensity={0.2} />
      </mesh>
      <ValueTrail
        target={ball}
        color={C_REAL}
        width={4}
        maxPoints={150}
        sampleEvery={0.03}
        resetKey={`${runId}-${v0}-${angle}-${frottement ? 1 : 0}`}
      />

      {/* ── Séquence du tir : armer (élan) → vol (physique) → repos ───── */}
      <Timeline
        phases={phases}
        restartKey={runId}
        onDone={() => setRunId((n) => n + 1)}
        onFrame={(f, _state, dt) => {
          const b = ball.current;
          const arm = armRef.current;
          if (f.name === 'armer') {
            b?.position.set(LAUNCH[0], LAUNCH[1], 0);
            // easeOutBack : le bras dépasse puis se cale — c'est l'élan.
            if (arm) arm.rotation.z = -SWING * f.t;
          } else if (f.name === 'vol') {
            const [px, py] = real.posAt(f.raw * real.flight);
            b?.position.set(X0 + px * SCALE, GROUND_Y + py * SCALE, 0);
            if (b) b.rotation.z -= dt * 4;
            // easeOutElastic : le bras fouette puis vibre au relâchement.
            if (arm) arm.rotation.z = -SWING * (1 - easeOutElastic(clamp01((f.raw * show) / 0.5)));
          } else {
            b?.position.set(X0 + real.range * SCALE, GROUND_Y, 0);
            if (arm) arm.rotation.z = 0;
          }
        }}
      />

      {/* ── Amortissements indépendants du framerate ──────────────────── */}
      <Animate
        fn={(_state, dt) => {
          const aim = aimRef.current;
          if (aim) aim.rotation.z = dampAngle(aim.rotation.z, aRad, 7, dt);
          const apex = apexRef.current;
          if (apex) {
            if (!apexReady.current) {
              apexReady.current = true;
              apex.position.set(apexTarget[0], apexTarget[1], apexTarget[2]);
            }
            damp3(apex.position, apexTarget, 6, dt);
          }
        }}
      />

      {/* Feuillage : micro-mouvement déterministe (bruit, jamais Math.random). */}
      <Float objectRef={foliage} amplitude={0.035} speed={0.3} seed={3} rotation={0.05} />

      {/* ── Narration synchronisée avec le tir ────────────────────────── */}
      <AutoNarration
        position={[-3.3, 1.85, 0]}
        tone="physique"
        title="Ce que tu observes"
        steps={narration}
        loop={false}
        resetKey={runId}
        onStepChange={setStepIdx}
        width={200}
        distanceFactor={7}
      />

      <SceneLabel
        position={[0, 3, 0]}
        title={`v₀ = ${v0} m/s · α = ${angle}°`}
        subtitle={frottement ? 'Tir avec frottement de l’air · g = 9,78 (Dakar)' : 'Tir parabolique · g = 9,78 (Dakar)'}
        tone="physique"
        distanceFactor={6.5}
      />

      {/* ── Mesure vs modèle : l'écart est la vraie information ───────── */}
      <CompareCard
        position={[3.45, 1.6, 0]}
        title="Portée : mesure et modèle"
        left={{ label: 'Mesurée', value: real.range, unit: 'm' }}
        right={{ label: 'Modèle sans air', value: model.range, unit: 'm' }}
        tone="physique"
        precision={1}
        tolerance={0.2}
        verdict={
          frottement
            ? `L’air freine la mangue : elle tombe ${nf(ecart)} m plus court que le modèle.`
            : 'Sans frottement, la mesure colle exactement au modèle du cours.'
        }
        width={190}
        distanceFactor={6.5}
      />

      <LegendCard position={[0, -2.6, 0]} items={legend} tone="physique" width={175} distanceFactor={6} />
    </LabScene>
  );
}
