'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BackSide,
  CatmullRomCurve3,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type Vector3Tuple,
} from 'three';
import {
  AlongPath,
  Animate,
  AutoNarration,
  Callout,
  clamp01,
  CompareCard,
  damp,
  DimGroup,
  Drop,
  easeInOut,
  easeOut,
  FocusHalo,
  GhostState,
  LabBench,
  LabScene,
  ObservationCue,
  PolyLine,
  Readout,
  SceneLabel,
  StepNarration,
  Tag3D,
  TestTube,
  Timeline,
  ValueTrail,
  Wire,
  fallWithBounces,
  oscillate,
  type NarrationStep,
} from '@/components/lab3d';

/**
 * Scènes 3D — TP « Digestion » (SVT, 5ème).
 *
 * Deux vues dans un même fichier (une seule montée à la fois) :
 *  - view="tube"   : l'appareil digestif en volume (bouche → œsophage →
 *                    estomac → intestin grêle → gros intestin). Le bol
 *                    alimentaire parcourt la ligne moyenne du tube avec
 *                    <AlongPath> (vitesse maîtrisée : la courbe est
 *                    reparamétrée par la longueur d'arc, donc le bol ne
 *                    ralentit pas dans les virages), il est brassé par le
 *                    péristaltisme (oscillate) et fond au fil de la digestion.
 *                    <DimGroup> atténue tous les organes sauf celui qu'on
 *                    étudie, <FocusHalo> le cercle, <StepNarration> déroule
 *                    le trajet avec le TEMPS DE SÉJOUR réel de chaque organe.
 *  - view="enzyme" : l'expérience de digestion enzymatique — deux tubes à
 *                    essai (amidon + salive / amidon + eau) testés à l'eau
 *                    iodée après incubation à 37 °C. La décroissance de
 *                    l'amidon est TRACÉE (<ValueTrail>) au lieu d'être
 *                    seulement dite, les deux tubes sont comparés chiffres en
 *                    main (<CompareCard>), le virage de couleur de l'eau iodée
 *                    est amorti (damp) et les gouttes tombent avec une vraie
 *                    accélération (fallWithBounces).
 *
 * Le tube digestif est modelé avec <Wire> (kit lab3d) : c'est le primitif
 * « tube le long d'une polyligne » (tubeGeometry sur CatmullRomCurve3).
 * Aucune silhouette humaine : on recadre sur l'organe.
 *
 * Perf : rien ne re-render par frame. Tout ce qui bouge est écrit dans des
 * refs (positions, échelles, couleurs de matériaux) depuis <Animate>,
 * <AlongPath> et <Timeline>.
 */

export type DigestiveSceneProps = {
  view?: 'tube' | 'enzyme';
  /** Index d'organe visité (0 = bouche … 4 = gros intestin). */
  organ?: number;
  /** Durée d'incubation à 37 °C, en minutes (vue enzyme). */
  minutes?: number;
  /** Eau iodée versée dans les deux tubes (vue enzyme). */
  iodine?: boolean;
};

/** Rapproche les 3 composantes d'une couleur de leur cible, sans dépendre du framerate. */
function dampColor(current: Color, target: Color, lambda: number, dt: number) {
  current.r = damp(current.r, target.r, lambda, dt);
  current.g = damp(current.g, target.g, lambda, dt);
  current.b = damp(current.b, target.b, lambda, dt);
}

// ──────────────────────────────────────────────────────────────────────
// Anatomie : ligne moyenne du tube digestif (38 points)
// ──────────────────────────────────────────────────────────────────────

const PATH: Vector3Tuple[] = [
  // bouche → pharynx (0-1)
  [0, 2.42, 0.26], [0, 2.16, 0.06],
  // œsophage (2-5)
  [0.02, 1.9, 0], [0.02, 1.58, 0], [0.02, 1.26, 0], [0, 1.0, 0],
  // estomac, en J (6-10)
  [-0.26, 0.92, 0.05], [-0.58, 0.72, 0.07], [-0.68, 0.42, 0.07], [-0.44, 0.22, 0.04], [-0.06, 0.26, 0.01],
  // duodénum + intestin grêle pelotonné (11-25)
  [0.3, 0.18, 0], [0.5, -0.08, 0.02],
  [0.62, -0.42, 0.06], [0.18, -0.52, 0.14], [-0.32, -0.44, 0.06], [-0.64, -0.58, -0.04],
  [-0.34, -0.8, -0.1], [0.16, -0.72, -0.02], [0.6, -0.84, 0.06],
  [0.34, -1.06, 0.12], [-0.14, -0.98, 0.1], [-0.58, -1.1, 0.02],
  [-0.22, -1.3, -0.06], [0.28, -1.24, -0.02], [0.62, -1.36, 0.02],
  // gros intestin : cæcum → côlon ascendant, transverse, descendant → rectum (26-37)
  [0.88, -1.52, -0.16], [1.04, -1.12, -0.22], [1.08, -0.62, -0.22], [1.0, -0.22, -0.22],
  [0.5, -0.08, -0.22], [-0.2, -0.08, -0.22], [-0.9, -0.2, -0.22],
  [-1.06, -0.7, -0.22], [-1.02, -1.2, -0.22], [-0.78, -1.56, -0.18],
  [-0.34, -1.8, -0.08], [0, -2.0, 0],
];

// Tranches figées au niveau module : identité stable → <Wire> ne reconstruit
// pas sa tubeGeometry à chaque rendu (elle est mémorisée sur `points`).
const SEG_OESOPHAGE = PATH.slice(1, 6);
const SEG_ESTOMAC = PATH.slice(5, 11);
const SEG_GRELE = PATH.slice(10, 26);
const SEG_COLON = PATH.slice(25, 38);

type OrganSpec = {
  name: string;
  /** t ∈ [0,1] du bol alimentaire sur la ligne moyenne. */
  t: number;
  /** Couleur du bol dans cet organe (il brunit puis s'éclaircit en chyme). */
  bolus: string;
  /** Temps de séjour réel (physiologie). */
  stay: string;
  /** Point d'accroche du halo de focus (coordonnées locales de l'anatomie). */
  anchor: Vector3Tuple;
  halo: number;
};

const ORGANS: OrganSpec[] = [
  { name: 'Bouche', t: 0.02, bolus: '#8B5E34', stay: '≈ 1 min', anchor: [0, 2.36, 0.28], halo: 0.55 },
  { name: 'Œsophage', t: 0.1, bolus: '#8B5E34', stay: '≈ 5 s', anchor: [0.02, 1.45, 0], halo: 0.45 },
  { name: 'Estomac', t: 0.225, bolus: '#A97142', stay: '≈ 4 h', anchor: [-0.48, 0.6, 0.06], halo: 0.75 },
  { name: 'Intestin grêle', t: 0.58, bolus: '#D9A441', stay: '≈ 5 h', anchor: [0.04, -0.78, 0.02], halo: 1.05 },
  { name: 'Gros intestin', t: 0.96, bolus: '#6B4423', stay: '≈ 20 h', anchor: [0, -0.8, -0.24], halo: 1.35 },
];

/** Le trajet raconté étape par étape, avec le temps de séjour réel. */
const TRAJET: NarrationStep[] = [
  {
    label: 'Bouche',
    detail: 'Séjour ≈ 1 min. Les dents broient, la salive humidifie et son amylase attaque déjà l’amidon du riz.',
  },
  {
    label: 'Œsophage',
    detail: 'Séjour ≈ 5 s. Ses muscles se contractent par vagues et poussent le bol : c’est le péristaltisme.',
  },
  {
    label: 'Estomac',
    detail: 'Séjour ≈ 4 h. Le suc gastrique (acide + pepsine) brasse le bol et le transforme en bouillie.',
  },
  {
    label: 'Intestin grêle',
    detail: 'Séjour ≈ 5 h. Fin de la digestion, puis ABSORPTION : les nutriments passent dans le sang.',
  },
  {
    label: 'Gros intestin',
    detail: 'Séjour ≈ 20 h. Il récupère l’eau ; ce qui reste forme les selles.',
  },
];

function Mouth({ position }: { position: Vector3Tuple }) {
  return (
    <group position={position}>
      {/* cavité buccale : sphère rendue par l'intérieur (BackSide) — on voit
          dedans sans avoir besoin de transparence, donc l'atténuation de
          <DimGroup> reste fidèle. */}
      <mesh>
        <sphereGeometry args={[0.36, 28, 22]} />
        <meshStandardMaterial color="#F6C9C4" roughness={0.55} side={BackSide} />
      </mesh>
      {/* langue */}
      <mesh position={[0, -0.08, 0.07]} scale={[0.85, 0.42, 1.3]}>
        <sphereGeometry args={[0.2, 20, 16]} />
        <meshStandardMaterial color="#D9544D" roughness={0.5} />
      </mesh>
      {/* arcade dentaire (mastication) */}
      {Array.from({ length: 9 }, (_, i) => {
        const a = -Math.PI * 0.44 + (i * Math.PI * 0.88) / 8;
        return (
          <mesh key={i} position={[Math.sin(a) * 0.29, 0.03, Math.cos(a) * 0.27]} rotation={[0, a, 0]} castShadow>
            <boxGeometry args={[0.075, 0.11, 0.055]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.25} />
          </mesh>
        );
      })}
    </group>
  );
}

function TubeView({ organ }: { organ: number }) {
  const idx = Math.max(0, Math.min(ORGANS.length - 1, Math.round(organ)));

  const bolus = useRef<Mesh>(null);
  const bolusMat = useRef<MeshStandardMaterial>(null);
  const nutri = useRef<Group>(null);
  /** Avancement du bol sur TOUTE la ligne moyenne (0 = bouche, 1 = rectum). */
  const travel = useRef(ORGANS[0].t);

  const curve = useMemo(
    () => new CatmullRomCurve3(PATH.map((p) => new Vector3(...p)), false, 'catmullrom', 0.25),
    [],
  );

  // Étape courante = un TRAJET (d'où le bol vient → où il va), pas un saut.
  const [leg, setLeg] = useState(() => ({
    from: Math.max(0, ORGANS[idx].t - 0.03),
    to: ORGANS[idx].t,
    run: 0,
  }));
  const lastIdx = useRef(idx);
  useEffect(() => {
    if (lastIdx.current === idx) return; // idempotent (StrictMode monte deux fois)
    lastIdx.current = idx;
    setLeg((prev) => ({ from: prev.to, to: ORGANS[idx].t, run: prev.run + 1 }));
  }, [idx]);

  // Points de passage du trajet courant, relevés sur la ligne moyenne.
  const legPoints = useMemo(() => {
    const v = new Vector3();
    const pts: Vector3Tuple[] = [];
    for (let i = 0; i <= 30; i++) {
      curve.getPoint(leg.from + (leg.to - leg.from) * (i / 30), v);
      pts.push([v.x, v.y, v.z]);
    }
    return pts;
  }, [curve, leg.from, leg.to]);

  // Vitesse maîtrisée : plus l'organe est loin, plus le voyage dure.
  const legDuration = 0.7 + 3 * Math.abs(leg.to - leg.from);
  const bolusColor = useMemo(() => new Color(ORGANS[idx].bolus), [idx]);

  return (
    <LabScene cameraPosition={[0.4, 0.15, 6.4]} background="#FFF1F2" minDistance={3.5} maxDistance={12} groundY={null}>
      <group position={[0, -0.2, 0]} scale={0.86}>
        {/* Un organe = un groupe atténuable : on isole celui qu'on étudie. */}
        <DimGroup dimmed={idx !== 0} opacity={0.2}>
          <Mouth position={PATH[0]} />
        </DimGroup>

        {/* Œsophage — tube fin et musculeux */}
        <DimGroup dimmed={idx !== 1} opacity={0.2}>
          <Wire points={SEG_OESOPHAGE} color="#E9A0A0" radius={0.1} />
        </DimGroup>

        {/* Estomac — poche en J + grosse tubérosité */}
        <DimGroup dimmed={idx !== 2} opacity={0.2}>
          <Wire points={SEG_ESTOMAC} color="#E4736A" radius={0.26} />
          <mesh position={[-0.52, 0.8, 0.06]} scale={[1, 0.85, 0.8]} castShadow>
            <sphereGeometry args={[0.34, 26, 20]} />
            <meshStandardMaterial color="#E4736A" roughness={0.45} metalness={0.05} />
          </mesh>
        </DimGroup>

        {/* Intestin grêle — 6 m repliés en anses */}
        <DimGroup dimmed={idx !== 3} opacity={0.2}>
          <Wire points={SEG_GRELE} color="#EFA184" radius={0.125} />
        </DimGroup>

        {/* Gros intestin — cadre colique, plus large */}
        <DimGroup dimmed={idx !== 4} opacity={0.2}>
          <Wire points={SEG_COLON} color="#C98B6B" radius={0.185} />
        </DimGroup>

        {/* Taille du bol AU DÉPART, laissée en trace dans la bouche : c'est la
            référence qui rend le rétrécissement lisible. */}
        {idx > 0 && (
          <GhostState
            opacity={0.2}
            wireframe
            caption="Taille au départ"
            captionPosition={[-0.62, 2.42, 0.26]}
            tone="neutral"
            distanceFactor={6}
          >
            <mesh position={PATH[0]}>
              <sphereGeometry args={[0.165, 14, 10]} />
              <meshStandardMaterial color="#7C2D12" />
            </mesh>
          </GhostState>
        )}

        {/* Bol alimentaire animé */}
        <mesh ref={bolus} castShadow>
          <sphereGeometry args={[0.16, 20, 16]} />
          <meshStandardMaterial
            ref={bolusMat}
            color={ORGANS[0].bolus}
            emissive={ORGANS[0].bolus}
            emissiveIntensity={0.25}
            roughness={0.7}
          />
        </mesh>

        {/* Nutriments qui franchissent la paroi du grêle et passent dans le sang */}
        {idx >= 3 && (
          <group ref={nutri}>
            {([[-0.16, 0, 0.04], [0.04, 0.09, -0.05], [0.15, -0.07, 0.08]] as Vector3Tuple[]).map((p, i) => (
              <mesh key={i} position={p}>
                <sphereGeometry args={[0.055, 12, 10]} />
                <meshStandardMaterial color="#F59E0B" emissive="#B45309" emissiveIntensity={0.6} />
              </mesh>
            ))}
          </group>
        )}

        {/* Le bol suit la ligne moyenne à vitesse constante (reparamétrage par
            la longueur d'arc), avec démarrage et freinage doux. */}
        <AlongPath
          objectRef={bolus}
          points={legPoints}
          duration={legDuration}
          easing={easeInOut}
          restartKey={leg.run}
          onFrame={(u) => {
            travel.current = leg.from + (leg.to - leg.from) * u;
          }}
        />

        <Animate
          fn={(state, delta) => {
            const t = state.clock.elapsedTime;
            // le bol fond au fur et à mesure qu'il est digéré
            const digere = 1 - 0.5 * clamp01(travel.current);
            // péristaltisme : le bol est pressé puis relâché, à volume ~constant
            const { value } = oscillate(t, { amplitude: 0.16, period: 0.8, damping: 0, center: 1 });
            const sy = digere * value;
            const sxz = digere / Math.sqrt(value);
            bolus.current?.scale.set(sxz, sy, sxz);

            // la couleur du bol REJOINT celle de l'organe, elle ne saute pas
            const m = bolusMat.current;
            if (m) {
              dampColor(m.color, bolusColor, 2.2, delta);
              dampColor(m.emissive, bolusColor, 2.2, delta);
            }

            if (nutri.current) {
              const k = (t % 2.4) / 2.4;
              const e = easeOut(k);
              nutri.current.position.set(0.2 + e * 1.0, -0.9 + e * 0.55, 0.3 + e * 0.5);
              nutri.current.scale.setScalar(0.3 + Math.sin(Math.PI * k) * 0.9);
            }
          }}
        />

        <FocusHalo position={ORGANS[idx].anchor} radius={ORGANS[idx].halo} tone="svt" />

        <Tag3D position={[0.95, 2.45, 0.2]} label="Bouche · dents + salive" tone="svt" />
        <Tag3D position={[0.85, 1.6, 0]} label="Œsophage" tone="svt" />
        <Tag3D position={[-1.05, 1.3, 0]} label="Estomac" tone="svt" />
        <Tag3D position={[0, -0.68, 0.85]} label="Intestin grêle" tone="svt" />
        <Tag3D position={[1.85, -0.9, -0.2]} label="Gros intestin" tone="svt" />
      </group>

      <SceneLabel position={[0.4, 2.5, 0]} title={ORGANS[idx].name} subtitle="Trajet du bol alimentaire" tone="svt" />

      <StepNarration
        position={[-2.3, 0.8, 0]}
        title="Où en est le bol ?"
        tone="svt"
        steps={TRAJET}
        current={idx}
        width={168}
        distanceFactor={5.6}
      />

      <Readout position={[2.85, 1.95, 0]} value={ORGANS[idx].stay} caption="temps de séjour" distanceFactor={7} />

      {idx >= 3 && (
        <Callout
          at={[0.3, -0.85, 0.45]}
          to={[2.5, 0.45, 0]}
          label="L’absorption"
          detail="Les nutriments traversent la paroi très fine du grêle et passent dans le sang."
          tone="physique"
          width={172}
          distanceFactor={5.6}
        />
      )}
    </LabScene>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Vue « expérience » : amidon + salive vs amidon + eau, révélés à l'eau iodée
// ──────────────────────────────────────────────────────────────────────

const BLEU_NOIR = '#1E1B4B'; // eau iodée + amidon
const ORANGE = '#C2410C'; // eau iodée seule (plus d'amidon)
const LAITEUX = '#F3EFE2'; // empois d'amidon avant le test
const VERT = '#059669'; // courbe « amidon restant »

// Géométrie du tube à essai du kit (radius 0.36, height 2.5, fill 0.55) :
// on redessine SON liquide pour pouvoir amortir la couleur frame par frame.
const TUBE_Y = -0.25;
const LIQ_R = 0.36 * 0.88;
const LIQ_H = 0.55 * (2.5 - 0.36 - 0.1);
const LIQ_Y = TUBE_Y + (-(2.5 - 0.36) / 2 + 0.36 / 2 + LIQ_H / 2);
/** Surface du liquide : c'est là que la goutte d'eau iodée arrive. */
const SURFACE_Y = LIQ_Y + LIQ_H / 2;
const DROP_TOP = 0.95;

// Mini-graphe « amidon restant = f(temps) », en bas à gauche de la paillasse.
const GX0 = -3.0;
const GX1 = -1.6;
const GW = GX1 - GX0;
const GY0 = -1.3;
const GY1 = -0.25;
const GH = GY1 - GY0;
const AXES: Vector3Tuple[] = [
  [GX0, GY1 + 0.14, 0],
  [GX0, GY0, 0],
  [GX1 + 0.14, GY0, 0],
];
const LIGNE_TEMOIN: Vector3Tuple[] = [
  [GX0, GY1, 0],
  [GX1, GY1, 0],
];

const ENZYME_STEPS: NarrationStep[] = [
  {
    label: 'Tu prépares deux tubes d’empois d’amidon de mil',
    detail: 'Salive dans l’un, eau dans l’autre : le témoin prouve que c’est bien la salive qui agit.',
    hold: 4,
  },
  {
    label: 'À 37 °C, l’amylase de la salive coupe l’amidon',
    detail: 'Il en reste e^(−0,15·t) : la moitié a déjà disparu au bout de ≈ 4,6 min.',
    hold: 4.5,
  },
  {
    label: 'Tu verses l’eau iodée dans les deux tubes',
    detail: 'Deux gouttes, une par tube : on teste exactement de la même façon.',
    hold: 3.5,
  },
  {
    label: 'Tu lis le résultat à la couleur',
    detail: 'Bleu-noir = amidon présent. Jaune-orangé = il n’y a plus d’amidon.',
    hold: 4,
  },
];

function Pipette({ x }: { x: number }) {
  return (
    <group position={[x, 1.55, 0]}>
      <mesh>
        <cylinderGeometry args={[0.075, 0.075, 0.6, 20, 1, true]} />
        <meshStandardMaterial color="#DCEBFF" roughness={0.1} transparent opacity={0.4} />
      </mesh>
      <mesh position={[0, -0.42, 0]}>
        <cylinderGeometry args={[0.02, 0.055, 0.28, 16, 1, true]} />
        <meshStandardMaterial color="#DCEBFF" roughness={0.1} transparent opacity={0.45} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <sphereGeometry args={[0.14, 20, 16]} />
        <meshStandardMaterial color="#E8843F" roughness={0.6} />
      </mesh>
    </group>
  );
}

function EnzymeView({ minutes, iodine }: { minutes: number; iodine: boolean }) {
  const dropA = useRef<Group>(null);
  const dropB = useRef<Group>(null);
  const matSalive = useRef<MeshStandardMaterial>(null);
  const matTemoin = useRef<MeshStandardMaterial>(null);
  const probe = useRef<Mesh>(null);

  // amylase salivaire : hydrolyse de l'amidon, k ≈ 0,15 min⁻¹ à 37 °C
  const starch = Math.exp(-0.15 * minutes);
  const pct = Math.round(starch * 100);

  // Couleurs VISÉES ; le matériau les rejoint en douceur (damp), il ne saute pas.
  const cible = useMemo(() => {
    const salive = iodine ? new Color(ORANGE).lerp(new Color(BLEU_NOIR), starch) : new Color(LAITEUX);
    const temoin = new Color(iodine ? BLEU_NOIR : LAITEUX);
    return { salive, temoin };
  }, [iodine, starch]);

  // Le balayage qui DESSINE la décroissance de l'amidon, de 0 min à `minutes`.
  const sweep = useMemo(() => [{ name: 'trace', duration: 0.55 + minutes * 0.05, easing: easeInOut }], [minutes]);

  const verdict =
    starch < 0.2
      ? 'La salive a fait disparaître presque tout l’amidon.'
      : starch < 0.55
        ? 'L’amidon diminue déjà : laisse incuber plus longtemps.'
        : 'Trop court : l’amylase n’a pas encore eu le temps d’agir.';

  return (
    <LabScene cameraPosition={[0, 0.2, 6.2]} background="#ECFDF5" minDistance={3.5} maxDistance={11} groundY={-1.5}>
      <LabBench y={-1.5} color="#E6E9DC" size={20} />

      {/* Portoir en bois */}
      <mesh position={[0, -1.32, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 0.3, 0.8]} />
        <meshStandardMaterial color="#B98A5A" roughness={0.85} />
      </mesh>

      {/* Verrerie seule (fill = 0) : le liquide est dessiné juste après pour
          que sa couleur soit pilotée frame par frame. */}
      <TestTube position={[-0.9, TUBE_Y, 0]} fill={0} radius={0.36} height={2.5} />
      <TestTube position={[0.9, TUBE_Y, 0]} fill={0} radius={0.36} height={2.5} />

      <mesh position={[-0.9, LIQ_Y, 0]}>
        <cylinderGeometry args={[LIQ_R, LIQ_R, LIQ_H, 32]} />
        <meshStandardMaterial ref={matSalive} color={LAITEUX} roughness={0.22} transparent opacity={0.93} />
      </mesh>
      <mesh position={[0.9, LIQ_Y, 0]}>
        <cylinderGeometry args={[LIQ_R, LIQ_R, LIQ_H, 32]} />
        <meshStandardMaterial ref={matTemoin} color={LAITEUX} roughness={0.22} transparent opacity={0.93} />
      </mesh>

      {iodine && (
        <>
          <Pipette x={-0.9} />
          <Pipette x={0.9} />
          <group ref={dropA}>
            <Drop position={[-0.9, 0, 0]} color="#B45309" size={0.075} />
          </group>
          <group ref={dropB}>
            <Drop position={[0.9, 0, 0]} color="#B45309" size={0.075} />
          </group>
          <FocusHalo position={[-0.9, -0.5, 0.62]} radius={0.5} tone="svt" />
        </>
      )}

      <Animate
        fn={(state, delta) => {
          // Virage de couleur AMORTI : l'eau iodée met ~1 s à révéler le résultat.
          if (matSalive.current) dampColor(matSalive.current.color, cible.salive, 2.4, delta);
          if (matTemoin.current) dampColor(matTemoin.current.color, cible.temoin, 2.4, delta);

          // Gouttes : vraie chute accélérée (g), pas une descente linéaire.
          const period = 1.4;
          const t = state.clock.elapsedTime;
          const chute = (phase: number) =>
            fallWithBounces((t + phase) % period, {
              height: DROP_TOP - SURFACE_Y,
              gravity: 9.81,
              restitution: 0,
              floor: SURFACE_Y,
            });
          const a = chute(0);
          if (dropA.current) {
            dropA.current.position.setY(a.y);
            dropA.current.scale.setScalar(a.resting ? 0.001 : 1);
          }
          const b = chute(period / 2);
          if (dropB.current) {
            dropB.current.position.setY(b.y);
            dropB.current.scale.setScalar(b.resting ? 0.001 : 1);
          }
        }}
      />

      {/* ── Mini-graphe : la décroissance de l'amidon se TRACE sous les yeux ── */}
      <PolyLine points={AXES} color="#94A3B8" width={2} />
      <PolyLine points={LIGNE_TEMOIN} color={BLEU_NOIR} width={2} dashed />
      <mesh ref={probe} position={[GX0, GY1, 0.02]}>
        <sphereGeometry args={[0.055, 16, 12]} />
        <meshStandardMaterial color={VERT} emissive={VERT} emissiveIntensity={0.4} />
      </mesh>
      <ValueTrail target={probe} color={VERT} width={3} maxPoints={160} sampleEvery={0.03} resetKey={minutes} />
      <Timeline
        phases={sweep}
        restartKey={minutes}
        onFrame={(f) => {
          const t = f.t * minutes;
          probe.current?.position.set(GX0 + (t / 30) * GW, GY0 + Math.exp(-0.15 * t) * GH, 0.02);
        }}
      />
      <Tag3D position={[(GX0 + GX1) / 2, GY1 + 0.32, 0]} label="Amidon restant (%)" tone="svt" distanceFactor={6} />
      <Tag3D position={[GX1 - 0.12, GY1 + 0.17, 0]} label="témoin" tone="neutral" distanceFactor={6} />
      <Tag3D position={[(GX0 + GX1) / 2, GY0 - 0.26, 0]} label="0 → 30 min" tone="neutral" distanceFactor={6} />

      <Tag3D position={[-0.9, 1.25, 0]} label="Amidon + salive" tone="svt" distanceFactor={6} />
      <Tag3D position={[0.9, 1.25, 0]} label="Amidon + eau (témoin)" tone="neutral" distanceFactor={6} />

      {iodine && (
        <>
          <Tag3D
            position={[-0.85, -2.0, 0]}
            label={starch < 0.2 ? 'Jaune-orangé : plus d’amidon' : 'Encore bleu : amidon restant'}
            tone={starch < 0.2 ? 'svt' : 'chimie'}
            distanceFactor={6}
          />
          <Tag3D position={[1.0, -2.3, 0]} label="Bleu-noir : amidon intact" tone="chimie" distanceFactor={6} />
        </>
      )}

      <AutoNarration
        position={[-2.35, 1.35, 0]}
        title="La manipulation"
        tone="svt"
        steps={ENZYME_STEPS}
        resetKey={`${minutes}-${iodine}`}
        width={160}
        distanceFactor={5.6}
      />

      <CompareCard
        position={[2.2, 1.4, 0]}
        title="Amidon restant"
        left={{ label: 'Avec salive', value: pct, unit: '%' }}
        right={{ label: 'Témoin (eau)', value: 100, unit: '%' }}
        precision={0}
        deltaLabel="Écart"
        showPercent={false}
        verdict={verdict}
        tone="svt"
        width={176}
        distanceFactor={5.6}
      />

      <Readout position={[2.35, 0.35, 0]} value={minutes} unit="min" caption="incubation 37 °C" distanceFactor={7} />

      <ObservationCue
        position={[2.25, -0.95, 0]}
        tone="svt"
        badge="À observer"
        text="Suis le point vert : il descend vite au début, puis de moins en moins."
        question="Après 20 min, reste-t-il encore de l’amidon dans le tube avec la salive ?"
        width={176}
        distanceFactor={5.6}
      />

      <SceneLabel
        position={[0, 2.35, 0]}
        title={iodine ? 'Test à l’eau iodée' : 'Incubation à 37 °C'}
        subtitle="Empois d’amidon de mil"
        tone="svt"
      />
    </LabScene>
  );
}

export default function DigestiveScene({ view = 'tube', organ = 0, minutes = 0, iodine = false }: DigestiveSceneProps) {
  return view === 'enzyme' ? <EnzymeView minutes={minutes} iodine={iodine} /> : <TubeView organ={organ} />;
}
