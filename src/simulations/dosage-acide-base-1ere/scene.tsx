'use client';

import { useMemo, useRef } from 'react';
import {
  Color,
  DoubleSide,
  type Mesh,
  type MeshBasicMaterial,
  type MeshPhysicalMaterial,
  type Vector3Tuple,
} from 'three';
import {
  // scène & décor
  LabScene,
  LabBench,
  Stand,
  Burette,
  Erlenmeyer,
  // tracé
  Arrow3D,
  PolyLine,
  // étiquettes
  SceneLabel,
  Tag3D,
  Readout,
  // pédagogie
  StepNarration,
  ObservationCue,
  LegendCard,
  CompareCard,
  ValueTrail,
  FocusHalo,
  Callout,
  // mouvement
  Animate,
  Float,
  clamp01,
  damp,
  easeOut,
  fallWithBounces,
  noise1D,
} from '@/components/lab3d';

/**
 * Scène 3D — dosage acido-basique (titrage), Première S.
 *
 * Montage réel : burette (NaOH, robinet) tenue par un statif au-dessus d'un
 * erlenmeyer (jus de bissap acide + phénolphtaléine). On verse un volume Vb :
 * le niveau de la burette baisse, les gouttes tombent en ACCÉLÉRANT (chute
 * libre + petit rebond à l'impact), la surface du jus frémit au moment où la
 * goutte arrive, et à l'ÉQUIVALENCE (Vb = Veq) la solution vire de l'incolore
 * au rose — virage AMORTI (`damp`), pas un saut brutal de couleur.
 *
 * La courbe pH = f(Vb) n'est pas tracée d'avance : elle se CONSTRUIT point par
 * point (`ValueTrail`) au fur et à mesure du versement, comme un vrai relevé.
 * Au moment du saut de pH, `FocusHalo` + `Callout` désignent le point
 * d'équivalence et donnent le volume équivalent lu.
 */

export type DosageSceneProps = {
  vb: number; // volume de base versé (mL)
  vbMax: number; // capacité de la burette (mL)
  vbEq: number; // volume à l'équivalence (mL)
  ph: number; // pH courant
  /** pH atteint au volume d'équivalence (repère du saut). Défaut 6,5. */
  phEq?: number;
  /** Volume d'acide dosé (mL) — sert à afficher Ca lue. Défaut 20. */
  va?: number;
  /** Concentration de la base titrante (mol/L). Défaut 0,1. */
  cb?: number;
  /**
   * @deprecated La courbe n'est plus fournie par le module : elle est
   * construite point par point dans la scène par <ValueTrail>. Prop conservée
   * pour ne pas casser les appels existants (galerie de vérification).
   */
  curve?: [number, number, number][];
};

/* ── Géométrie du montage (tout est calé sur la paillasse) ───────────────── */

const BENCH_Y = -2.6;
const X_MONTAGE = -0.9; // axe commun burette / erlenmeyer

const STAND_H = 5.2;
const STAND_X = -0.75; // la pince du statif vient pincer la burette
const STAND_Y = BENCH_Y + STAND_H / 2 + 0.01;
const PLATE_TOP = STAND_Y - STAND_H / 2 + 0.11; // dessus du pied du statif

// Erlenmeyer posé sur le pied du statif (comme en TP)
const ERLEN_H = 2.4;
const ERLEN_Y = PLATE_TOP + ERLEN_H / 2;
const ERLEN_FILL = 0.5;
const ERLEN_BASE_R = 0.95; // rayon du corps conique du kit
const BODY_H = ERLEN_H * 0.62;
const LIQ_H = ERLEN_FILL * BODY_H * 0.9;
const LIQ_CY = -ERLEN_H / 2 + 0.04 + LIQ_H / 2; // centre du liquide (local)
const LIQ_TOP = -ERLEN_H / 2 + 0.04 + LIQ_H; // surface du liquide (local)
const LIQ_R_TOP = ERLEN_BASE_R * 0.6;
const LIQ_R_BOT = ERLEN_BASE_R * 0.92;
const SURFACE_Y = ERLEN_Y + LIQ_TOP; // surface du jus, en coordonnées scène

// Burette : hauteur 3,4 dans le kit, pointe 0,455 sous le robinet
const BURETTE_Y = 1.4;
const TIP_Y = BURETTE_Y - 3.4 / 2 - 0.455;

// Chute de la goutte
const DROP_R = 0.06;
const DROP_START = TIP_Y - 0.03;
const FALL_H = DROP_START - SURFACE_Y;
const GRAVITY = 9.81;
const T_IMPACT = Math.sqrt((2 * FALL_H) / GRAVITY); // instant de l'impact dans le cycle
const DROP_CYCLE = 0.95; // une goutte toutes les 0,95 s

/* ── Graphe pH = f(Vb) ───────────────────────────────────────────────────── */

const GRAPH_X = 2.8;
const GRAPH_Y = -1.6;
const GRAPH_W = 1.9;
const GRAPH_H = 2.6;
const PH_MIN = 2;
const PH_MAX = 13;

/** Ordonnée scène d'un pH dans le repère du graphe. */
function gy(p: number): number {
  return ((p - PH_MIN) / (PH_MAX - PH_MIN)) * GRAPH_H;
}

const NEUTRAL_LINE: Vector3Tuple[] = [
  [0, gy(7), 0],
  [GRAPH_W, gy(7), 0],
];

/* ── Couleurs de l'indicateur coloré ─────────────────────────────────────── */

const PALE = '#F7EFC9'; // jus de bissap + phénolphtaléine incolore
const ROSE = '#EC4899'; // après le virage
const C_PALE = new Color(PALE);
const C_ROSE = new Color(ROSE);

/* ── Narration : les trois temps d'un titrage ────────────────────────────── */

const PHASES = [
  {
    label: 'Tu ouvres le robinet',
    detail: 'La soude tombe goutte à goutte dans le jus de bissap.',
  },
  {
    label: "Avant l'équivalence",
    detail: "L'acide est en excès : le pH monte doucement, le jus reste incolore.",
  },
  {
    label: 'Le saut de pH',
    detail: "Une goutte de plus et le pH bondit : la phénolphtaléine vire au rose. C'est l'équivalence.",
  },
  {
    label: "Après l'équivalence",
    detail: 'La base est en excès : le pH plafonne et le rose reste installé.',
  },
];

const LEGEND = [
  { label: "Incolore : l'acide est en excès", color: '#B79B3F', shape: 'ring' as const },
  { label: 'Rose : la base est en excès', color: ROSE, shape: 'dot' as const },
  { label: 'Ta courbe pH = f(Vb)', color: '#7C3AED', shape: 'dash' as const },
];

/** Écriture des nombres à la française (virgule décimale). */
function fr(n: number, decimals = 2): string {
  return n.toFixed(decimals).replace('.', ',');
}

export default function DosageScene({
  vb,
  vbMax,
  vbEq,
  ph,
  phEq = 6.5,
  va = 20,
  cb = 0.1,
}: DosageSceneProps) {
  const drop = useRef<Mesh>(null);
  const splash = useRef<Mesh>(null);
  const splashMat = useRef<MeshBasicMaterial>(null);
  const pending = useRef<Mesh>(null);
  const surface = useRef<Mesh>(null);
  const liquidMat = useRef<MeshPhysicalMaterial>(null);
  const surfaceMat = useRef<MeshPhysicalMaterial>(null);
  const point = useRef<Mesh>(null);

  // état de l'animation, hors React (aucun re-render par frame)
  const tint = useRef(0); // avancement amorti du virage : 0 incolore → 1 rose
  const started = useRef(false);

  const turned = vb >= vbEq; // le virage a eu lieu
  const revealed = vb >= vbEq; // on ne dévoile l'équivalence qu'une fois atteinte
  const pouring = vb > 0.05 && vb < vbMax;
  const buretteFill = Math.max(0.05, 1 - vb / vbMax);

  // Cible du point courant sur le graphe (coordonnées locales du repère)
  const tx = (vb / vbMax) * GRAPH_W;
  const ty = gy(ph);
  const xEq = (vbEq / vbMax) * GRAPH_W;

  // Phase du titrage + avancement dans la phase (narration pilotée par l'élève)
  const { phase, progress } = useMemo(() => {
    if (vb < 0.5) return { phase: 0, progress: clamp01(vb / 0.5) };
    if (vb < vbEq - 0.5) return { phase: 1, progress: clamp01((vb - 0.5) / Math.max(0.1, vbEq - 1)) };
    if (vb <= vbEq + 0.5) return { phase: 2, progress: clamp01((vb - vbEq + 0.5) / 1) };
    return { phase: 3, progress: clamp01((vb - vbEq - 0.5) / Math.max(0.1, vbMax - vbEq - 0.5)) };
  }, [vb, vbEq, vbMax]);

  const eqLine = useMemo<Vector3Tuple[]>(
    () => [
      [xEq, 0, 0],
      [xEq, gy(phEq), 0],
    ],
    [xEq, phEq],
  );

  // Concentration que l'élève déduirait de SA lecture, et valeur exacte
  const caLue = (cb * vb) / va;
  const caExacte = (cb * vbEq) / va;
  const bonneLecture = Math.abs(vb - vbEq) <= 0.5;

  return (
    <LabScene
      cameraPosition={[0.75, 0.5, 8.2]}
      background="#F5F0FF"
      minDistance={5}
      maxDistance={14}
      groundY={BENCH_Y}
    >
      <LabBench y={BENCH_Y} color="#E4DFD2" size={24} />

      {/* ── Narration : l'élève sait à tout instant ce qu'il observe ───── */}
      <StepNarration
        position={[-2.6, 1.55, 0]}
        title="Ce que tu observes"
        tone="chimie"
        steps={PHASES}
        current={phase}
        progress={progress}
        width={228}
        distanceFactor={13}
      />

      <LegendCard position={[-2.72, -1.45, 0]} title="Légende" tone="chimie" items={LEGEND} width={202} distanceFactor={12} />

      {/* ── Statif + burette (NaOH) ───────────────────────────────────── */}
      <Stand position={[STAND_X, STAND_Y, 0]} height={STAND_H} />
      <Burette position={[X_MONTAGE, BURETTE_Y, 0]} fill={buretteFill} liquidColor="#BFD8FF" open={pouring} />
      <Tag3D position={[X_MONTAGE, 3.35, 0]} label="NaOH (base, Cb connue)" tone="chimie" />

      {/* Goutte suspendue à la pointe quand le robinet est fermé (elle frémit) */}
      {!pouring && (
        <>
          <mesh ref={pending} position={[X_MONTAGE, TIP_Y - 0.02, 0]}>
            <sphereGeometry args={[0.05, 14, 12]} />
            <meshPhysicalMaterial
              color="#BFD8FF"
              transparent
              opacity={0.85}
              transmission={0.8}
              roughness={0.05}
              ior={1.34}
              thickness={0.4}
              clearcoat={0.4}
              depthWrite={false}
            />
          </mesh>
          <Float objectRef={pending} amplitude={0.008} speed={0.9} seed={3} />
        </>
      )}

      {/* Goutte en chute libre : elle ACCÉLÈRE puis rebondit à l'impact */}
      <mesh ref={drop} position={[X_MONTAGE, DROP_START, 0]} visible={false}>
        <sphereGeometry args={[DROP_R, 16, 12]} />
        <meshPhysicalMaterial
          color="#BFD8FF"
          transparent
          opacity={0.9}
          transmission={0.8}
          roughness={0.05}
          ior={1.34}
          thickness={0.5}
          clearcoat={0.45}
          depthWrite={false}
        />
      </mesh>

      {/* Onde de choc à la surface du jus */}
      <mesh ref={splash} position={[X_MONTAGE, SURFACE_Y + 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.55, 0.74, 40]} />
        <meshBasicMaterial
          ref={splashMat}
          color="#CFE0FF"
          transparent
          opacity={0}
          side={DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* ── Erlenmeyer : verrerie du kit, liquide piloté par la scène ──── */}
      <Erlenmeyer position={[X_MONTAGE, ERLEN_Y, 0]} fill={0} height={ERLEN_H} />
      <group position={[X_MONTAGE, ERLEN_Y, 0]}>
        <mesh position={[0, LIQ_CY, 0]}>
          <cylinderGeometry args={[LIQ_R_TOP, LIQ_R_BOT, LIQ_H, 48]} />
          <meshPhysicalMaterial
            ref={liquidMat}
            color={PALE}
            transparent
            opacity={0.8}
            transmission={0.8}
            roughness={0.06}
            ior={1.34}
            thickness={1.1}
            attenuationColor={PALE}
            attenuationDistance={1.3}
            clearcoat={0.35}
            clearcoatRoughness={0.1}
            envMapIntensity={1.1}
            depthWrite={false}
          />
        </mesh>
        {/* ménisque : il frémit quand la goutte arrive et que ça se mélange */}
        <mesh ref={surface} position={[0, LIQ_TOP, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[LIQ_R_TOP, 48]} />
          <meshPhysicalMaterial
            ref={surfaceMat}
            color={PALE}
            transparent
            opacity={0.62}
            roughness={0.04}
            clearcoat={0.7}
            clearcoatRoughness={0.06}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>
      <Tag3D position={[X_MONTAGE, ERLEN_Y - 1.55, 0]} label="jus de bissap + phénolphtaléine" tone="chimie" />

      {/* ── Afficheurs ────────────────────────────────────────────────── */}
      <Readout position={[1.05, 2.6, 0]} value={fr(vb, 1)} unit="mL" caption="Vb versé" />
      <Readout position={[1.05, 1.9, 0]} value={fr(ph, 1)} caption="pH" />

      <SceneLabel
        position={[0.9, 3.55, 0]}
        title={revealed ? 'Équivalence : Ca·Va = Cb·Vb' : 'Ouvre le robinet et verse la base'}
        subtitle="Dosage acido-basique"
        tone="chimie"
      />

      {/* Consigne d'observation avant de verser, bilan de lecture après le virage */}
      {vb < 0.5 && (
        <ObservationCue
          position={[1.2, -1.5, 0]}
          tone="chimie"
          text="Surveille la couleur du jus au moment où chaque goutte tombe, et la courbe qui se construit à droite."
          question="Combien de millilitres faudra-t-il verser avant que le rose apparaisse ?"
          width={250}
        />
      )}
      {revealed && (
        <CompareCard
          position={[1.2, -1.5, 0]}
          title="Ta lecture et l'équivalence"
          left={{ label: 'Vb versé (ta lecture)', value: vb, unit: 'mL' }}
          right={{ label: "Vb à l'équivalence", value: vbEq, unit: 'mL' }}
          precision={1}
          showPercent={false}
          tolerance={0.5}
          tone="chimie"
          width={244}
          verdict={
            bonneLecture
              ? `Bien visé : Ca = Cb·Vb/Va = ${fr(caLue, 3)} mol/L.`
              : `Tu as dépassé le virage : tu lirais Ca = ${fr(caLue, 3)} mol/L au lieu de ${fr(caExacte, 3)} mol/L.`
          }
        />
      )}

      {/* ── Graphe pH = f(Vb), construit point par point ───────────────── */}
      <group position={[GRAPH_X, GRAPH_Y, 0]}>
        <Arrow3D from={[-0.18, 0, 0]} to={[GRAPH_W + 0.35, 0, 0]} color="#7C3AED" radius={0.018} headLength={0.18} />
        <Arrow3D from={[0, -0.18, 0]} to={[0, GRAPH_H + 0.35, 0]} color="#7C3AED" radius={0.018} headLength={0.18} />
        {/* repère pH = 7 (solution neutre) */}
        <PolyLine points={NEUTRAL_LINE} color="#94A3B8" width={1.6} dashed />
        {/* lecture du volume équivalent, seulement une fois le virage atteint */}
        {revealed && <PolyLine points={eqLine} color="#EC4899" width={2} dashed />}

        {/* point courant : c'est lui que ValueTrail suit pour tracer la courbe */}
        <mesh ref={point}>
          <sphereGeometry args={[0.075, 20, 16]} />
          <meshStandardMaterial color="#EC4899" emissive="#EC4899" emissiveIntensity={0.35} />
        </mesh>

        {revealed && (
          <>
            <FocusHalo position={[xEq, gy(phEq), 0.03]} radius={0.24} tone="chimie" color="#EC4899" label="Équivalence" labelOffset={0.22} />
            <Callout
              at={[xEq, gy(phEq), 0]}
              to={[0.55, GRAPH_H + 1.0, 0]}
              label={`Vb(éq) = ${fr(vbEq, 1)} mL`}
              detail="Le pH saute d'un coup : tout l'acide a réagi avec la base versée."
              tone="chimie"
              width={192}
            />
          </>
        )}

        <Tag3D position={[GRAPH_W + 0.45, -0.28, 0]} label="Vb (mL)" tone="chimie" />
        <Tag3D position={[-0.34, GRAPH_H + 0.42, 0]} label="pH" tone="chimie" />
      </group>

      {/* La courbe n'est pas dessinée d'avance : elle est le RELEVÉ du point courant. */}
      <ValueTrail
        target={point}
        color="#7C3AED"
        width={3}
        maxPoints={480}
        sampleEvery={0.05}
        resetKey={vb < 0.05 ? 'zero' : 'run'}
      />

      {/* ── Toute l'animation : une seule boucle, aucune allocation ────── */}
      <Animate
        fn={(state, delta) => {
          const t = state.clock.elapsedTime;
          const tc = t % DROP_CYCLE;

          // 1. Chute de la goutte : accélération réelle + petit rebond à l'impact
          const f = fallWithBounces(tc, {
            height: FALL_H,
            floor: SURFACE_Y,
            restitution: 0.14,
            gravity: GRAVITY,
          });
          const d = drop.current;
          if (d) {
            d.visible = pouring && f.impacts < 2;
            d.position.y = f.y + DROP_R;
            // une goutte réelle s'étire quand elle prend de la vitesse
            const stretch = 1 + Math.min(0.5, Math.abs(f.velocity) * 0.05);
            const shrink = f.impacts >= 1 ? 0.45 : 1; // gouttelette secondaire
            d.scale.set(shrink / Math.sqrt(stretch), shrink * stretch, shrink / Math.sqrt(stretch));
          }

          // 2. Onde de choc à la surface (elle s'ouvre vite puis s'efface)
          const since = tc - T_IMPACT;
          const s = clamp01(since / 0.42);
          const sp = splash.current;
          const spm = splashMat.current;
          if (sp && spm) {
            const on = pouring && since > 0 && s < 1;
            sp.visible = on;
            if (on) {
              sp.scale.setScalar(0.16 + easeOut(s) * 0.6);
              spm.opacity = 0.5 * (1 - s) * (1 - s);
            }
          }

          // 3. Frémissement du jus : bruit déterministe, renforcé après l'impact
          const burst = pouring && since > 0 ? Math.exp(-5 * since) : 0;
          const amp = 0.005 + burst * 0.028;
          const sf = surface.current;
          if (sf) {
            sf.position.y = LIQ_TOP + noise1D(t * 2.6, 17) * amp;
            sf.rotation.x = -Math.PI / 2 + noise1D(t * 1.9, 41) * amp * 0.9;
            sf.rotation.y = noise1D(t * 1.5, 73) * amp * 0.9;
          }

          // 4. Virage de l'indicateur : transition AMORTIE, jamais un saut
          const k = damp(tint.current, turned ? 1 : 0, 3.6, delta);
          tint.current = k;
          const lm = liquidMat.current;
          if (lm) {
            lm.color.copy(C_PALE).lerp(C_ROSE, k);
            lm.attenuationColor.copy(C_PALE).lerp(C_ROSE, k);
          }
          const sm = surfaceMat.current;
          if (sm) sm.color.copy(C_PALE).lerp(C_ROSE, k);

          // 5. Point courant du graphe : il rejoint sa cible, ValueTrail l'enregistre
          const p = point.current;
          if (p) {
            if (!started.current) {
              started.current = true;
              p.position.set(tx, ty, 0.02);
            } else {
              let nx = damp(p.position.x, tx, 9, delta);
              let ny = damp(p.position.y, ty, 9, delta);
              // on « pose » le point net : la trace cesse alors de consommer des points
              if (Math.abs(nx - tx) < 0.003) nx = tx;
              if (Math.abs(ny - ty) < 0.003) ny = ty;
              p.position.set(nx, ny, 0.02);
            }
          }
        }}
      />
    </LabScene>
  );
}
