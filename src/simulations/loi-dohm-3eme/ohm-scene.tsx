'use client';

import { useMemo, useRef, useState } from 'react';
import { Group, Mesh, type Vector3Tuple } from 'three';
import {
  Animate,
  Arrow3D,
  Battery,
  Callout,
  CompareCard,
  DataPoints,
  DimGroup,
  FocusHalo,
  GhostState,
  GraphPaper,
  LabBench,
  LabScene,
  LegendCard,
  Meter,
  ObservationCue,
  PolyLine,
  Readout,
  Resistor,
  Rheostat,
  SceneLabel,
  Segment,
  Spring,
  SpringTo,
  SPRING_PRESETS,
  StepNarration,
  Tag3D,
  ValueTrail,
  Wire,
} from '@/components/lab3d';

/**
 * Scène 3D — loi d'Ohm : caractéristique U = f(I) d'un conducteur ohmique
 * (Physique-Chimie, 3ème).
 *
 * À gauche : un vrai montage de paillasse en BOUCLE FERMÉE —
 *   générateur réglable (E) → rhéostat (fait varier I) → conducteur ohmique R
 *   → ampèremètre EN SÉRIE → retour au générateur ;
 *   le voltmètre est branché EN DÉRIVATION aux bornes du conducteur ohmique.
 * Des porteurs de charge circulent le long du fil, d'autant plus vite que I
 * est grande, et les deux aiguilles bougent comme de vraies aiguilles
 * d'appareil analogique : ressort amorti `SPRING_PRESETS.needle` (elles
 * dépassent un peu la valeur, puis se stabilisent).
 *
 * À droite : la caractéristique U = f(I) se construit point par point.
 * Les couples déjà relevés restent affichés en <GhostState> (plus pâles),
 * le point courant est vif, bat, et laisse derrière lui la <ValueTrail> du
 * chemin qu'il a suivi quand l'élève change ses réglages. Dès 2 points, la
 * droite de régression passant par l'origine est tracée, et une <CompareCard>
 * confronte la pente mesurée à la vraie valeur de R.
 *
 * Le prop `focus` sert la misconception centrale du TP : il atténue
 * (<DimGroup>) tout ce qui n'est pas concerné pour isoler soit l'ampèremètre
 * (dans la boucle → en série), soit le voltmètre (à côté → en dérivation),
 * avec <FocusHalo> et <Callout> sur les bornes de branchement.
 *
 * Physique : U = R × I (U en volts, I en ampères, R en ohms),
 * I = E / (R + R_rhéostat).
 */

/** Élément du circuit mis en avant par la consigne. */
export type OhmFocus = 'none' | 'amperemetre' | 'voltmetre';

export type OhmSceneProps = {
  /** Tension réglée sur le générateur (V). */
  e: number;
  /** Résistance introduite par le rhéostat (Ω). */
  rh: number;
  /** Intensité dans le circuit (A). */
  i: number;
  /** Tension aux bornes du conducteur ohmique (V). */
  u: number;
  /** Pente de la droite de régression (Ω), null tant qu'il y a < 2 points. */
  slope: number | null;
  /** Couples (I, U) déjà relevés par l'élève. */
  points: { i: number; u: number }[];
  /** Coup de projecteur sur un appareil (isole le branchement). */
  focus?: OhmFocus;
  /** Vraie résistance du conducteur ohmique (Ω) — pour la carte de comparaison. */
  trueR?: number;
  /** Nombre de points attendus avant l'exploitation. */
  minPoints?: number;
};

const GROUND_Y = -2.9;
const I_CAL = 1; // calibre ampèremètre (A)
const U_CAL = 15; // calibre voltmètre (V)
const RH_MAX = 30; // course du rhéostat (Ω)

// Échelles du graphe : 0,6 A → 3,0 unités ; 12 V → 3,0 unités
const KX = 5; // unités par ampère
const KY = 0.25; // unités par volt

const WIRE = '#B45309';
const WIRE_V = '#2563EB';
const C_POINTS = '#DC2626';
const C_LIVE = '#F59E0B';
const C_FIT = '#0EA5E9';

// ── Boucle principale (fermée) : + du générateur → rhéostat → R → ampèremètre → −
const S1: Vector3Tuple[] = [[-4.6, 0.62, 0], [-4.6, 1.5, 0], [-3.75, 1.5, 0]];
const S2: Vector3Tuple[] = [[-1.95, 1.5, 0], [-1.1, 1.5, 0], [-1.1, 0.85, 0]];
const S3: Vector3Tuple[] = [[-1.1, -1.2, 0], [-1.1, -1.9, 0], [-1.75, -1.9, 0]];
const S4: Vector3Tuple[] = [[-3.05, -1.9, 0], [-4.6, -1.9, 0], [-4.6, -0.95, 0]];

// ── Dérivation du voltmètre, aux bornes du conducteur ohmique
const D1: Vector3Tuple[] = [[-1.1, 0.8, 0], [-0.1, 0.8, 0], [-0.1, 0.6, 0]];
const D2: Vector3Tuple[] = [[-0.1, -0.6, 0], [-0.1, -1.2, 0], [-1.1, -1.2, 0]];

// Chemin suivi par les porteurs de charge (sens conventionnel : + → −)
const LOOP: Vector3Tuple[] = [
  [-4.6, 0.62, 0],
  [-4.6, 1.5, 0],
  [-1.1, 1.5, 0],
  [-1.1, -1.9, 0],
  [-4.6, -1.9, 0],
  [-4.6, 0.62, 0],
];

const N_CHARGES = 12;

/** Repères d'avancement affichés dans la scène (<StepNarration>). */
const GUIDE = [
  { label: 'Fais tes réglages', detail: 'Choisis E, puis la position du rhéostat.' },
  { label: 'Premier couple relevé', detail: 'Un seul point ne prouve rien : il en faut d’autres.' },
  { label: 'D’autres couples relevés', detail: 'La droite de régression apparaît déjà.' },
  { label: 'Assez de points', detail: 'La droite passe par l’origine : sa pente vaut R.' },
];

/**
 * Appareil analogique dont l'aiguille a de l'INERTIE : elle dépasse un peu la
 * valeur lue, revient, puis se stabilise (`SPRING_PRESETS.needle`).
 *
 * Le composant est isolé exprès : le ressort ne fait re-rendre que lui (six
 * mailles), jamais toute la paillasse. Et l'affichage n'est rafraîchi que
 * lorsque l'aiguille a bougé d'au moins 1/260 de calibre.
 */
function NeedleMeter({
  position,
  kind,
  value,
  max,
  color,
}: {
  position: Vector3Tuple;
  kind: 'A' | 'V';
  value: number;
  max: number;
  color?: string;
}) {
  const [shown, setShown] = useState(0);
  const last = useRef(0);
  const quantum = max / 260;

  return (
    <>
      <Meter position={position} kind={kind} value={shown} max={max} color={color} />
      <Spring
        target={value}
        initial={0}
        config={SPRING_PRESETS.needle}
        onFrame={(v) => {
          if (Math.abs(v - last.current) < quantum) return;
          last.current = v;
          setShown(v);
        }}
      />
    </>
  );
}

export default function OhmScene({
  e,
  rh,
  i,
  u,
  slope,
  points,
  focus = 'none',
  trueR = 20,
  minPoints = 4,
}: OhmSceneProps) {
  const charges = useRef<Group>(null);
  const live = useRef<Mesh>(null);

  // Longueurs cumulées de la boucle (pour faire défiler les porteurs)
  const path = useMemo(() => {
    const segs: { a: Vector3Tuple; b: Vector3Tuple; len: number }[] = [];
    let total = 0;
    for (let k = 0; k < LOOP.length - 1; k++) {
      const a = LOOP[k];
      const b = LOOP[k + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      segs.push({ a, b, len });
      total += len;
    }
    return { segs, total };
  }, []);

  const ticks = useMemo(() => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let k = 1; k <= 7; k++) xs.push(k * 0.5);
    for (let k = 1; k <= 6; k++) ys.push(k * 0.5);
    return { xs, ys };
  }, []);

  const cloud = useMemo<Vector3Tuple[]>(
    () => points.map((p) => [p.i * KX, p.u * KY, 0.02]),
    [points],
  );

  // Droite de régression passant par l'origine : U = pente × I
  const fit = useMemo<Vector3Tuple[]>(() => {
    if (slope === null) return [];
    const iMax = Math.max(0.12, ...points.map((p) => p.i));
    return [
      [0, 0, 0],
      [iMax * KX * 1.05, slope * iMax * KY * 1.05, 0],
    ];
  }, [slope, points]);

  const guide =
    points.length >= minPoints ? 3 : points.length >= 2 ? 2 : points.length === 1 ? 1 : 0;

  const focused = focus !== 'none';

  return (
    <LabScene cameraPosition={[0.4, 0.1, 10.8]} background="#FEF3C7" minDistance={6} maxDistance={18} groundY={GROUND_Y}>
      <LabBench y={GROUND_Y} color="#E7D8B8" size={28} />

      {/* ─────────── Boucle principale : générateur, rhéostat, ampèremètre ───────────
          Atténuée quand la consigne parle du voltmètre : l'élève voit alors que
          le voltmètre n'est PAS dans la boucle. */}
      <DimGroup dimmed={focus === 'voltmetre'} opacity={0.13}>
        <Battery position={[-4.6, -0.2, 0]} voltage={e} />
        <Rheostat position={[-2.85, 1.5, 0]} cursor={1 - rh / RH_MAX} />

        {/* Ampèremètre — EN SÉRIE dans la boucle, aiguille à ressort */}
        <NeedleMeter position={[-2.4, -1.9, 0]} kind="A" value={i} max={I_CAL} />

        <Wire points={S1} color={WIRE} radius={0.05} />
        <Wire points={S2} color={WIRE} radius={0.05} />
        <Wire points={S3} color={WIRE} radius={0.05} />
        <Wire points={S4} color={WIRE} radius={0.05} />

        {/* Porteurs de charge : vitesse proportionnelle à I */}
        <group ref={charges}>
          {Array.from({ length: N_CHARGES }).map((_, k) => (
            <mesh key={k}>
              <sphereGeometry args={[0.07, 12, 10]} />
              <meshStandardMaterial color="#FBBF24" emissive="#F59E0B" emissiveIntensity={0.9} />
            </mesh>
          ))}
        </group>
      </DimGroup>

      {/* ─────────── Dérivation du voltmètre ───────────
          Atténuée quand la consigne parle de l'ampèremètre. */}
      <DimGroup dimmed={focus === 'amperemetre'} opacity={0.13}>
        <NeedleMeter position={[-0.1, 0, 0]} kind="V" value={u} max={U_CAL} color="#1D4ED8" />
        <Wire points={D1} color={WIRE_V} radius={0.04} />
        <Wire points={D2} color={WIRE_V} radius={0.04} />
      </DimGroup>

      {/* Conducteur ohmique : dipôle commun aux deux montages, jamais atténué.
          Anneaux rouge-noir-noir = 20 Ω. */}
      <Resistor position={[-1.1, -0.2, 0]} rotation={[0, 0, 0]} bands={['#DC2626', '#000000', '#000000']} />

      {/* Étiquettes du montage : escamotées pendant un coup de projecteur,
          où ce sont les <Callout> qui nomment les bornes. */}
      {!focused && (
        <>
          <Tag3D position={[-4.6, -1.35, 0]} label={`Générateur ${e.toFixed(0)} V`} tone="physique" />
          <Tag3D position={[-2.85, 2.05, 0]} label={`Rhéostat ${rh.toFixed(0)} Ω`} tone="physique" />
          <Tag3D position={[-1.95, -0.2, 0]} label="Conducteur ohmique R" tone="physique" />
          <Tag3D position={[-2.4, -1.15, 0]} label="Ampèremètre · en série" tone="physique" />
          <Tag3D position={[0.62, 1.15, 0]} label="Voltmètre · en dérivation" tone="physique" />
        </>
      )}
      <Readout position={[-2.4, -2.6, 0]} value={i.toFixed(3)} unit="A" caption="intensité I" />
      <Readout position={[0.75, -1.05, 0]} value={u.toFixed(1)} unit="V" caption="tension U" />

      {/* ─────────── Coup de projecteur « ampèremètre EN SÉRIE » ─────────── */}
      {focus === 'amperemetre' && (
        <>
          <FocusHalo position={[-2.4, -1.9, 0]} radius={1.05} tone="physique" label="Ampèremètre : en série" />
          <Callout
            at={[-3.05, -1.9, 0]}
            to={[-4.6, -3.6, 0]}
            label="Borne COM (−)"
            detail="Le fil qui revient du générateur entre ici."
            tone="physique"
            width={180}
          />
          <Callout
            at={[-1.75, -1.9, 0]}
            to={[0.9, -3.4, 0]}
            label="Borne A (+)"
            detail="Le courant ressort vers le conducteur ohmique. L’ampèremètre est DANS la boucle : tout le courant le traverse."
            tone="physique"
            width={210}
          />
        </>
      )}

      {/* ─────────── Coup de projecteur « voltmètre EN DÉRIVATION » ─────────── */}
      {focus === 'voltmetre' && (
        <>
          <FocusHalo position={[-0.1, 0, 0]} radius={0.95} tone="physique" label="Voltmètre : en dérivation" />
          <Callout
            at={[-1.1, 0.8, 0]}
            to={[1.9, 2.6, 0]}
            label="Borne V (+)"
            detail="Premier fil bleu posé sur la borne haute du conducteur ohmique."
            tone="physique"
            width={200}
          />
          <Callout
            at={[-1.1, -1.2, 0]}
            to={[2.1, -3.1, 0]}
            label="Borne COM (−)"
            detail="Second fil bleu sur l’autre borne. Le voltmètre est monté À CÔTÉ du dipôle, pas dans la boucle."
            tone="physique"
            width={210}
          />
        </>
      )}

      {/* ─────────── Bandeau haut : avancement, ou consigne d'observation ─────────── */}
      {focused ? (
        <ObservationCue
          position={[-2.2, 3.4, 0]}
          tone="physique"
          badge={focus === 'amperemetre' ? 'En série' : 'En dérivation'}
          text={
            focus === 'amperemetre'
              ? 'Suis le fil orange : il entre par une borne de l’ampèremètre et ressort par l’autre. Tout le courant du circuit le traverse.'
              : 'Les deux fils bleus du voltmètre sont posés aux bornes du conducteur ohmique. Il n’est pas dans la boucle du courant.'
          }
          question={
            focus === 'amperemetre'
              ? 'Si tu retires l’ampèremètre, le circuit est-il encore fermé ?'
              : 'Le courant qui traverse le conducteur ohmique passe-t-il aussi par le voltmètre ?'
          }
          width={260}
          distanceFactor={9}
        />
      ) : (
        <>
          <StepNarration
            position={[-3.9, 3.3, 0]}
            tone="physique"
            title="Où tu en es"
            steps={GUIDE}
            current={guide}
            width={170}
            distanceFactor={7}
          />
          <SceneLabel
            position={[0.1, 3.45, 0]}
            title={`U = ${u.toFixed(1)} V · I = ${i.toFixed(3)} A`}
            subtitle="Montage de paillasse · loi d'Ohm"
            tone="physique"
          />
          <LegendCard
            position={[-4.3, -3.5, 0]}
            tone="physique"
            title="Sur le graphe"
            items={[
              { label: 'Couples déjà relevés', color: C_POINTS, shape: 'dot', note: 'plus pâles' },
              { label: 'Point courant', color: C_LIVE, shape: 'ring', note: 'il bat et laisse une trace' },
              { label: 'Droite U = R × I', color: C_FIT, shape: 'dash' },
            ]}
            width={170}
            distanceFactor={6.5}
          />
        </>
      )}

      {/* ─────────── La caractéristique U = f(I) ─────────── */}
      <DimGroup dimmed={focused} opacity={0.12}>
        <group position={[1.95, -1.8, 0]}>
          {/* papier millimétré (centré) recadré sur le premier quadrant */}
          <group position={[1.75, 1.65, 0]}>
            <GraphPaper width={3.9} height={3.7} step={0.5} z={-0.08} />
          </group>

          <Arrow3D from={[-0.2, 0, 0]} to={[3.85, 0, 0]} color="#475569" radius={0.018} headLength={0.18} />
          <Arrow3D from={[0, -0.2, 0]} to={[0, 3.65, 0]} color="#475569" radius={0.018} headLength={0.18} />
          {ticks.xs.map((x) => (
            <Segment key={`x${x}`} a={[x, -0.09, 0]} b={[x, 0.09, 0]} color="#475569" width={0.014} />
          ))}
          {ticks.ys.map((y) => (
            <Segment key={`y${y}`} a={[-0.09, y, 0]} b={[0.09, y, 0]} color="#475569" width={0.014} />
          ))}

          {/* Droite de régression passant par l'origine — sa pente vaut R */}
          {fit.length === 2 && <PolyLine points={fit} color={C_FIT} width={3} />}

          {/* Couples (I ; U) déjà relevés : ils restent visibles, en retrait.
              (GhostState possède ses propres matériaux : il suit lui-même
              l'atténuation du graphe pendant un coup de projecteur.) */}
          <GhostState opacity={focused ? 0.1 : 0.55}>
            <DataPoints points={cloud} color={C_POINTS} size={0.085} />
          </GhostState>

          {/* Point courant : vif, il bat et rejoint sa place par un ressort */}
          <mesh ref={live}>
            <sphereGeometry args={[0.1, 16, 12]} />
            <meshStandardMaterial color={C_LIVE} emissive={C_LIVE} emissiveIntensity={0.7} />
          </mesh>
          <SpringTo objectRef={live} to={[i * KX, u * KY, 0.06]} config={SPRING_PRESETS.gentle} />

          <Tag3D position={[3.85, -0.32, 0]} label="I (A)" tone="physique" />
          <Tag3D position={[-0.42, 3.6, 0]} label="U (V)" tone="physique" />
          <Tag3D position={[3.0, -0.32, 0]} label="0,6" tone="neutral" />
          <Tag3D position={[-0.36, 3.0, 0]} label="12" tone="neutral" />
          <SceneLabel
            position={[1.85, 4.05, 0]}
            title="Caractéristique U = f(I)"
            subtitle={`${points.length} point(s) relevé(s)`}
            tone="physique"
          />
          {slope !== null && (
            <Readout position={[2.55, 2.05, 0]} value={slope.toFixed(1)} unit="Ω" caption="pente = R" />
          )}
        </group>
      </DimGroup>

      {/* Trace du point courant : posée à la racine, elle travaille en coordonnées
          MONDE (le point vit dans le repère décalé du graphe). */}
      <ValueTrail target={live} color={C_LIVE} width={2.5} maxPoints={70} sampleEvery={0.06} />

      {/* Pente mesurée vs vraie valeur de R : l'écart est LA information. */}
      {slope !== null && !focused && (
        <CompareCard
          position={[3.9, -2.85, 0]}
          tone="physique"
          title="Ta pente et la vraie résistance"
          left={{ label: 'Pente mesurée', value: slope, unit: 'Ω' }}
          right={{ label: 'Résistance réelle', value: trueR, unit: 'Ω' }}
          precision={1}
          deltaLabel="Écart"
          tolerance={1}
          width={220}
          distanceFactor={8}
        />
      )}

      <Animate
        fn={(state) => {
          // 1) porteurs de charge : plus I est grande, plus ils défilent vite
          const g = charges.current;
          if (g) {
            const speed = 0.25 + i * 4.5;
            const base = (state.clock.elapsedTime * speed) % path.total;
            for (let k = 0; k < g.children.length; k++) {
              let rem = (base + (k / N_CHARGES) * path.total) % path.total;
              for (const seg of path.segs) {
                if (rem <= seg.len) {
                  const t = rem / seg.len;
                  g.children[k].position.set(
                    seg.a[0] + (seg.b[0] - seg.a[0]) * t,
                    seg.a[1] + (seg.b[1] - seg.a[1]) * t,
                    0.09,
                  );
                  break;
                }
                rem -= seg.len;
              }
            }
          }

          // 2) point courant : léger battement (sa POSITION est pilotée par <SpringTo>)
          if (live.current) {
            live.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3.2) * 0.18);
          }
        }}
      />
    </LabScene>
  );
}
