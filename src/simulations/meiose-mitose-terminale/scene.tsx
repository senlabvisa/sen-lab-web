'use client';

import { useMemo, useRef } from 'react';
import { DoubleSide, Group, type Vector3Tuple } from 'three';
import {
  Animate,
  CompareCard,
  FocusHalo,
  Float,
  GhostState,
  LabScene,
  LegendCard,
  Readout,
  SceneLabel,
  Segment,
  StepNarration,
  Tag3D,
  easeInOut,
  easeOut,
  easeOutBack,
  mix,
  type EasingFn,
  type LegendItem,
  type NarrationStep,
} from '@/components/lab3d';

/**
 * Scène 3D — les divisions cellulaires (SVT, Terminale S, Bac).
 *
 * Chromosomes en volume : deux chromatides sœurs (capsules) reliées par un
 * centromère, bleu = homologue d'origine paternelle, rouge = maternelle.
 * Le bout de chaque bras porte un repère de FORME (cube = paternel, pointe =
 * maternel) : la couleur n'est jamais la seule information.
 *
 * Le curseur de phase déplace réellement les chromosomes (condensation →
 * plaque équatoriale → migration aux pôles → cellules filles) ; le fuseau
 * achromatique est tracé en <Segment> entre les centrosomes et les
 * centromères.
 *
 * Mouvement (kit lab3d) :
 *  - migration vers les pôles : `easeInOut` → les chromosomes accélèrent puis
 *    DÉCÉLÈRENT en arrivant au pôle (au lieu d'une interpolation linéaire) ;
 *  - alignement sur la plaque : `easeOutBack` → ils se posent fermement,
 *    comme tirés des deux côtés à la fois ;
 *  - chromosomes libres (interphase, télophase) : <Float> — flottement
 *    déterministe (bruit fbm, jamais Math.random).
 *
 * Pédagogie (kit lab3d) : <StepNarration> (où en est la division),
 * <GhostState> (trace de la plaque équatoriale pendant l'anaphase),
 * <FocusHalo> (point de crossing-over), <CompareCard> (mitose vs méiose),
 * <LegendCard> (forme + couleur).
 *
 * Mitose (2n = 4) : 1 division → 2 cellules à 2n = 4.
 * Méiose (2n = 4) : 2 divisions → 4 cellules à n = 2, avec crossing-over en
 * prophase I et brassage interchromosomique en métaphase I.
 *
 * Quantité d'ADN exprimée en Q = ADN d'un lot haploïde (n chromosomes à une
 * chromatide). Cellule 2n en G1 = 2Q, après la phase S = 4Q, gamète = Q.
 */

export type DivisionMode = 'mitose' | 'meiose';
export type DivisionSceneProps = { mode: DivisionMode; phase: number };

type Arm = [string, string]; // [bras supérieur, bras inférieur]
type Chromo = {
  id: string;
  pos: Vector3Tuple;
  /** Position de départ au montage (donne l'illusion de la migration). */
  from?: Vector3Tuple;
  rotZ: number;
  len: number;
  arms: Arm[];
  thin?: boolean;
};
type Cell = { c: Vector3Tuple; r: number; nucleus?: boolean };
type Fiber = [Vector3Tuple, Vector3Tuple];
type Stage = {
  cells: Cell[];
  chromos: Chromo[];
  poles: Vector3Tuple[];
  fibers: Fiber[];
  plates: { x: number; r: number }[];
  tags: { pos: Vector3Tuple; label: string }[];
  title: string;
  nChr: number;
  adn: number;
  /** Détail que l'élève rate : mis en évidence par un halo qui respire. */
  focus?: { pos: Vector3Tuple; radius: number; label: string };
};

const PAT = '#2563EB'; // homologue d'origine paternelle
const MAT = '#DC2626'; // homologue d'origine maternelle
const CROSS = '#7C3AED'; // jonction créée par le crossing-over
const LONG = 0.22;
const SHORT = 0.13;
const R1 = 1.5; // cellule mère
const R2 = 1.1; // cellules filles (2)
const R4 = 0.72; // cellules filles (4)
const POLE = 1.35;

const duo = (c: string): Arm[] => [
  [c, c],
  [c, c],
];
const solo = (c: string): Arm[] => [[c, c]];

/** Les 4 chromosomes du caryotype simplifié : 2 paires d'homologues. */
const SEEDS = [
  { id: 'c0', len: LONG, col: PAT, y: 0.88, z: 0.16 },
  { id: 'c1', len: LONG, col: MAT, y: 0.3, z: -0.18 },
  { id: 'c2', len: SHORT, col: PAT, y: -0.3, z: 0.18 },
  { id: 'c3', len: SHORT, col: MAT, y: -0.88, z: -0.16 },
];

/** Positions (en fraction du rayon) des tirets du repère de plaque. */
const DASHES = [-0.98, -0.6, -0.22, 0.16, 0.54, 0.78];

const SCATTER: Vector3Tuple[] = [
  [-0.48, 0.42, 0.2],
  [0.46, 0.36, -0.24],
  [-0.42, -0.44, -0.18],
  [0.44, -0.4, 0.22],
];
const SCATTER_ROT = [0.7, -0.9, 1.15, -0.5];

/** Chromatides recombinées après le crossing-over de la prophase I. */
const REC_PAT: Arm[] = [
  [PAT, PAT],
  [MAT, PAT],
];
const REC_MAT: Arm[] = [
  [MAT, MAT],
  [PAT, MAT],
];

/** Fil des phases affiché dans la scène (<StepNarration>). */
const NARRATION: Record<DivisionMode, NarrationStep[]> = {
  mitose: [
    { label: 'Interphase', detail: "L'ADN est répliqué : chaque chromosome a 2 chromatides sœurs." },
    { label: 'Prophase', detail: 'Les chromosomes se condensent, le fuseau achromatique se construit.' },
    { label: 'Métaphase', detail: 'Les chromosomes s’alignent sur la plaque équatoriale.' },
    { label: 'Anaphase', detail: 'Les centromères se clivent : les chromatides sœurs migrent aux pôles.' },
    { label: 'Télophase & cytodiérèse', detail: '2 cellules filles à 2n = 4 : des copies conformes.' },
  ],
  meiose: [
    { label: 'Interphase', detail: 'Une seule réplication de l’ADN pour les deux divisions.' },
    { label: 'Prophase I', detail: 'Les homologues s’apparient : c’est le crossing-over.' },
    { label: 'Métaphase I', detail: 'Les bivalents s’alignent, orientés au hasard.' },
    { label: 'Anaphase I', detail: 'Les homologues ENTIERS migrent : les centromères restent intacts.' },
    { label: 'Télophase I', detail: '2 cellules à n = 2 : la réduction chromatique est faite.' },
    { label: 'Métaphase II', detail: 'Deux nouvelles plaques, sans nouvelle réplication.' },
    { label: 'Ana/télophase II', detail: 'Les centromères se clivent : 4 gamètes tous différents.' },
  ],
};

function asters(px: number): Fiber[] {
  return [
    [[px, 0, 0], [px * 0.45, 0.6, 0.2]],
    [[px, 0, 0], [px * 0.45, -0.6, -0.2]],
    [[px, 0, 0], [px * 0.4, 0.05, 0.55]],
  ];
}

function interphase(): Chromo[] {
  return SEEDS.map((s, i) => ({
    id: s.id,
    pos: SCATTER[i],
    rotZ: SCATTER_ROT[i],
    len: s.len,
    arms: duo(s.col),
    thin: true,
  }));
}

function buildMitose(phase: number): Stage {
  const mother: Cell[] = [{ c: [0, 0, 0], r: R1 }];
  if (phase === 0) {
    return {
      cells: [{ c: [0, 0, 0], r: R1, nucleus: true }],
      chromos: interphase(),
      poles: [],
      fibers: [],
      plates: [],
      tags: [{ pos: [0, -1.05, 0], label: 'Noyau' }],
      title: 'Interphase — après la phase S',
      nChr: 4,
      adn: 4,
    };
  }
  if (phase === 1) {
    return {
      cells: mother,
      chromos: SEEDS.map((s, i) => ({ id: s.id, pos: SCATTER[i], rotZ: SCATTER_ROT[i], len: s.len, arms: duo(s.col) })),
      poles: [[-POLE, 0, 0], [POLE, 0, 0]],
      fibers: [...asters(-POLE), ...asters(POLE)],
      plates: [],
      tags: [{ pos: [-POLE, 0.55, 0], label: 'Centrosome' }],
      title: 'Prophase',
      nChr: 4,
      adn: 4,
    };
  }
  if (phase === 2) {
    const chromos: Chromo[] = SEEDS.map((s) => ({
      id: s.id,
      pos: [0, s.y, s.z],
      rotZ: 0,
      len: s.len,
      arms: duo(s.col),
    }));
    return {
      cells: mother,
      chromos,
      poles: [[-POLE, 0, 0], [POLE, 0, 0]],
      fibers: chromos.flatMap<Fiber>((c) => [
        [[-POLE, 0, 0], c.pos],
        [[POLE, 0, 0], c.pos],
      ]),
      plates: [{ x: 0, r: 1.08 }],
      tags: [{ pos: [0, 1.22, 0], label: 'Plaque équatoriale' }],
      title: 'Métaphase',
      nChr: 4,
      adn: 4,
    };
  }
  // Anaphase & télophase : les chromatides sœurs deviennent des chromosomes.
  const split: Chromo[] = SEEDS.flatMap<Chromo>((s) => [
    { id: `${s.id}L`, pos: [-0.72, s.y, s.z], from: [0, s.y, s.z], rotZ: 0, len: s.len, arms: solo(s.col) },
    { id: `${s.id}R`, pos: [0.72, s.y, s.z], from: [0, s.y, s.z], rotZ: 0, len: s.len, arms: solo(s.col) },
  ]);

  if (phase === 3) {
    return {
      cells: mother,
      chromos: split,
      poles: [[-POLE, 0, 0], [POLE, 0, 0]],
      fibers: split.map<Fiber>((c) => [[c.pos[0] < 0 ? -POLE : POLE, 0, 0], c.pos]),
      plates: [],
      tags: [{ pos: [0, -1.15, 0], label: 'Centromères clivés' }],
      title: 'Anaphase',
      nChr: 8,
      adn: 4,
    };
  }
  const daughters: Cell[] = [
    { c: [-1.55, 0, 0], r: R2, nucleus: true },
    { c: [1.55, 0, 0], r: R2, nucleus: true },
  ];
  return {
    cells: daughters,
    chromos: SEEDS.flatMap<Chromo>((s, i) => [
      {
        id: `${s.id}L`,
        pos: [-1.55 + SCATTER[i][0] * 0.72, SCATTER[i][1] * 0.72, SCATTER[i][2]],
        rotZ: SCATTER_ROT[i],
        len: s.len,
        arms: solo(s.col),
        thin: true,
      },
      {
        id: `${s.id}R`,
        pos: [1.55 + SCATTER[i][0] * 0.72, SCATTER[i][1] * 0.72, SCATTER[i][2]],
        rotZ: SCATTER_ROT[i],
        len: s.len,
        arms: solo(s.col),
        thin: true,
      },
    ]),
    poles: [],
    fibers: [],
    plates: [],
    tags: [
      { pos: [-1.55, -1.35, 0], label: '2n = 4' },
      { pos: [1.55, -1.35, 0], label: '2n = 4' },
    ],
    title: 'Télophase & cytodiérèse',
    nChr: 4,
    adn: 2,
  };
}

function buildMeiose(phase: number): Stage {
  const mother: Cell[] = [{ c: [0, 0, 0], r: R1 }];
  if (phase === 0) {
    return {
      cells: [{ c: [0, 0, 0], r: R1, nucleus: true }],
      chromos: interphase(),
      poles: [],
      fibers: [],
      plates: [],
      tags: [{ pos: [0, -1.05, 0], label: 'Cellule mère 2n = 4' }],
      title: 'Interphase — après la phase S',
      nChr: 4,
      adn: 4,
    };
  }
  if (phase === 1) {
    return {
      cells: mother,
      chromos: [
        { id: 'c0', pos: [-0.62, 0.38, 0.14], rotZ: 0.1, len: LONG, arms: REC_PAT },
        { id: 'c1', pos: [-0.3, 0.38, 0.14], rotZ: -0.1, len: LONG, arms: REC_MAT },
        { id: 'c2', pos: [0.34, -0.36, -0.14], rotZ: 0.12, len: SHORT, arms: duo(PAT) },
        { id: 'c3', pos: [0.64, -0.36, -0.14], rotZ: -0.12, len: SHORT, arms: duo(MAT) },
      ],
      poles: [[-POLE, 0, 0], [POLE, 0, 0]],
      fibers: [...asters(-POLE), ...asters(POLE)],
      plates: [],
      tags: [{ pos: [0.49, -0.92, -0.14], label: 'Bivalent (paire d’homologues)' }],
      title: 'Prophase I — appariement & crossing-over',
      nChr: 4,
      adn: 4,
      focus: { pos: [-0.46, 0.38, 0.16], radius: 0.44, label: 'Crossing-over' },
    };
  }
  // Orientation au hasard des bivalents = brassage interchromosomique.
  const METAI: Chromo[] = [
    { id: 'c0', pos: [-0.26, 0.55, 0.22], rotZ: 0, len: LONG, arms: REC_PAT },
    { id: 'c1', pos: [0.26, 0.55, 0.22], rotZ: 0, len: LONG, arms: REC_MAT },
    { id: 'c2', pos: [0.26, -0.55, -0.22], rotZ: 0, len: SHORT, arms: duo(PAT) },
    { id: 'c3', pos: [-0.26, -0.55, -0.22], rotZ: 0, len: SHORT, arms: duo(MAT) },
  ];
  if (phase === 2) {
    return {
      cells: mother,
      chromos: METAI,
      poles: [[-POLE, 0, 0], [POLE, 0, 0]],
      fibers: METAI.map<Fiber>((c) => [[c.pos[0] < 0 ? -POLE : POLE, 0, 0], c.pos]),
      plates: [{ x: 0, r: 1.08 }],
      tags: [{ pos: [0, 1.22, 0], label: 'Orientation au hasard des bivalents' }],
      title: 'Métaphase I',
      nChr: 4,
      adn: 4,
    };
  }
  if (phase === 3) {
    const chromos: Chromo[] = METAI.map((c) => ({
      ...c,
      pos: [c.pos[0] < 0 ? -0.92 : 0.92, c.pos[1], c.pos[2]] as Vector3Tuple,
    }));
    return {
      cells: mother,
      chromos,
      poles: [[-POLE, 0, 0], [POLE, 0, 0]],
      fibers: chromos.map<Fiber>((c) => [[c.pos[0] < 0 ? -POLE : POLE, 0, 0], c.pos]),
      plates: [],
      tags: [{ pos: [0, -1.15, 0], label: 'Homologues entiers séparés' }],
      title: 'Anaphase I',
      nChr: 4,
      adn: 4,
    };
  }
  const two: Cell[] = [
    { c: [-1.55, 0, 0], r: R2, nucleus: phase === 4 },
    { c: [1.55, 0, 0], r: R2, nucleus: phase === 4 },
  ];
  if (phase === 4) {
    return {
      cells: two,
      chromos: [
        { id: 'c0', pos: [-1.8, 0.3, 0.14], rotZ: 0.5, len: LONG, arms: REC_PAT, thin: true },
        { id: 'c3', pos: [-1.28, -0.32, -0.14], rotZ: -0.6, len: SHORT, arms: duo(MAT), thin: true },
        { id: 'c1', pos: [1.3, 0.3, 0.14], rotZ: -0.5, len: LONG, arms: REC_MAT, thin: true },
        { id: 'c2', pos: [1.82, -0.32, -0.14], rotZ: 0.6, len: SHORT, arms: duo(PAT), thin: true },
      ],
      poles: [],
      fibers: [],
      plates: [],
      tags: [
        { pos: [-1.55, -1.35, 0], label: 'n = 2' },
        { pos: [1.55, -1.35, 0], label: 'n = 2' },
      ],
      title: 'Télophase I — réduction chromatique',
      nChr: 2,
      adn: 2,
    };
  }
  const METAII: Chromo[] = [
    { id: 'c0', pos: [-1.55, 0.4, 0.16], rotZ: 0, len: LONG, arms: REC_PAT },
    { id: 'c3', pos: [-1.55, -0.4, -0.16], rotZ: 0, len: SHORT, arms: duo(MAT) },
    { id: 'c1', pos: [1.55, 0.4, 0.16], rotZ: 0, len: LONG, arms: REC_MAT },
    { id: 'c2', pos: [1.55, -0.4, -0.16], rotZ: 0, len: SHORT, arms: duo(PAT) },
  ];
  if (phase === 5) {
    const p: Vector3Tuple[] = [[-2.42, 0, 0], [-0.68, 0, 0], [0.68, 0, 0], [2.42, 0, 0]];
    return {
      cells: two,
      chromos: METAII,
      poles: p,
      fibers: METAII.flatMap<Fiber>((c) =>
        (c.pos[0] < 0 ? [p[0], p[1]] : [p[2], p[3]]).map<Fiber>((pole) => [pole, c.pos]),
      ),
      plates: [
        { x: -1.55, r: 0.78 },
        { x: 1.55, r: 0.78 },
      ],
      tags: [{ pos: [0, 1.35, 0], label: '2 nouvelles plaques équatoriales' }],
      title: 'Métaphase II',
      nChr: 2,
      adn: 2,
    };
  }
  // Anaphase II & télophase II : 4 cellules, toutes génétiquement différentes.
  const CX = [-2.35, -0.85, 0.85, 2.35];
  const gam = (id: string, cx: number, arms: Arm[], len: number, up: boolean, from: Vector3Tuple): Chromo => ({
    id,
    pos: [cx, up ? 0.3 : -0.34, up ? 0.1 : -0.1],
    from,
    rotZ: 0,
    len,
    arms,
  });
  return {
    cells: CX.map((x) => ({ c: [x, 0, 0] as Vector3Tuple, r: R4, nucleus: true })),
    chromos: [
      gam('c0a', CX[0], [[PAT, PAT]], LONG, true, [-1.55, 0.4, 0.16]),
      gam('c3a', CX[0], [[MAT, MAT]], SHORT, false, [-1.55, -0.4, -0.16]),
      gam('c0b', CX[1], [[MAT, PAT]], LONG, true, [-1.55, 0.4, 0.16]),
      gam('c3b', CX[1], [[MAT, MAT]], SHORT, false, [-1.55, -0.4, -0.16]),
      gam('c1a', CX[2], [[MAT, MAT]], LONG, true, [1.55, 0.4, 0.16]),
      gam('c2a', CX[2], [[PAT, PAT]], SHORT, false, [1.55, -0.4, -0.16]),
      gam('c1b', CX[3], [[PAT, MAT]], LONG, true, [1.55, 0.4, 0.16]),
      gam('c2b', CX[3], [[PAT, PAT]], SHORT, false, [1.55, -0.4, -0.16]),
    ],
    poles: [],
    fibers: [],
    plates: [],
    tags: [{ pos: [0, -1.15, 0], label: '4 cellules à n = 2, toutes différentes' }],
    title: 'Anaphase II & télophase II',
    nChr: 2,
    adn: 1,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Corps 3D                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Télomère repère : la FORME dit l'origine du bras (cube = paternel,
 * pointe = maternel). Un élève daltonien lit la scène sans la couleur.
 */
function Telomere({ color, y, r, down }: { color: string; y: number; r: number; down: boolean }) {
  if (color === PAT) {
    return (
      <mesh position={[0, y, 0]}>
        <boxGeometry args={[r * 1.7, r * 1.7, r * 1.7]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.05} />
      </mesh>
    );
  }
  return (
    <mesh position={[0, y, 0]} rotation={[down ? Math.PI : 0, 0, 0]}>
      <coneGeometry args={[r * 1.25, r * 2.2, 6]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.05} />
    </mesh>
  );
}

/** Un chromosome : 1 ou 2 chromatides (capsules) + centromère. */
function ChromoBody({ arms, len, thin }: { arms: Arm[]; len: number; thin?: boolean }) {
  const r = thin ? 0.026 : 0.055;
  const dx = arms.length === 2 ? (thin ? 0.034 : 0.068) : 0;
  const gap = 0.045;
  const tip = len + gap + r * 0.95;
  return (
    <group>
      {arms.map((arm, i) => (
        <group key={i} position={[arms.length === 2 ? (i === 0 ? -dx : dx) : 0, 0, 0]}>
          <mesh position={[0, len / 2 + gap, 0]} castShadow>
            <capsuleGeometry args={[r, len, 6, 12]} />
            <meshStandardMaterial color={arm[0]} roughness={0.35} metalness={0.05} />
          </mesh>
          <mesh position={[0, -(len / 2 + gap), 0]} castShadow>
            <capsuleGeometry args={[r, len, 6, 12]} />
            <meshStandardMaterial color={arm[1]} roughness={0.35} metalness={0.05} />
          </mesh>
          <Telomere color={arm[0]} y={tip} r={r} down={false} />
          <Telomere color={arm[1]} y={-tip} r={r} down />
          {/* Bras de deux origines = chromatide recombinée : on marque la jonction. */}
          {arm[0] !== arm[1] && (
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[r * 1.55, r * 0.5, 6, 16]} />
              <meshStandardMaterial color={CROSS} roughness={0.3} emissive={CROSS} emissiveIntensity={0.25} />
            </mesh>
          )}
        </group>
      ))}
      <mesh>
        <sphereGeometry args={[thin ? 0.045 : 0.075, 16, 12]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.5} emissive="#CBD5E1" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

/**
 * Chromosome décondensé, non accroché au fuseau : il flotte doucement dans le
 * nucléoplasme. Bruit déterministe (<Float>) → jamais de Math.random au rendu.
 * Le flottement est porté par un groupe INTERNE : la migration pilote le
 * groupe externe, personne n'écrit deux fois la même position.
 */
function FloatingChromo({ chromo, seed }: { chromo: Chromo; seed: number }) {
  const inner = useRef<Group>(null);
  return (
    <>
      <group ref={inner}>
        <ChromoBody arms={chromo.arms} len={chromo.len} thin={chromo.thin} />
      </group>
      <Float objectRef={inner} amplitude={0.026} speed={0.28} seed={seed} rotation={0.07} base={[0, 0, 0]} octaves={2} />
    </>
  );
}

/** Centrosome (paire de centrioles) : point d'ancrage du fuseau. */
function Centrosome({ p }: { p: Vector3Tuple }) {
  return (
    <group position={p}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.17, 12]} />
        <meshStandardMaterial color="#F59E0B" roughness={0.35} emissive="#B45309" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0.1, 0.1]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.17, 12]} />
        <meshStandardMaterial color="#F59E0B" roughness={0.35} emissive="#B45309" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Mouvement                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

/** Anaphases : c'est là que la décélération à l'arrivée au pôle se voit. */
const isAnaphase = (mode: DivisionMode, phase: number) =>
  mode === 'mitose' ? phase === 3 : phase === 3 || phase === 6;
/** Métaphases : mise en place ferme sur la plaque équatoriale. */
const isMetaphase = (mode: DivisionMode, phase: number) =>
  mode === 'mitose' ? phase === 2 : phase === 2 || phase === 5;

/** Durée du déplacement, en secondes. */
const DUR_ANA = 1.5;
const DUR_STD = 0.95;

export default function DivisionScene({ mode, phase }: DivisionSceneProps) {
  const stage = useMemo(() => (mode === 'mitose' ? buildMitose(phase) : buildMeiose(phase)), [mode, phase]);

  /** Phase précédente gardée en trace pendant l'anaphase (<GhostState>). */
  const ghost = useMemo(() => {
    if (!isAnaphase(mode, phase)) return null;
    return mode === 'mitose' ? buildMitose(phase - 1) : buildMeiose(phase - 1);
  }, [mode, phase]);

  const ana = isAnaphase(mode, phase);
  const meta = isMetaphase(mode, phase);
  // Migration : élan puis DÉCÉLÉRATION à l'arrivée au pôle (jamais linéaire).
  // Plaque équatoriale : léger dépassement puis calage, comme tiré des 2 côtés.
  const easing: EasingFn = ana ? easeInOut : meta ? easeOutBack : easeOut;
  const dur = ana ? DUR_ANA : DUR_STD;

  const refs = useRef<Map<string, Group>>(new Map());
  const starts = useRef<Map<string, [number, number, number, number]>>(new Map());
  const elapsed = useRef(0);
  const lastKey = useRef('');
  const stageKey = `${mode}:${phase}`;

  const legend = useMemo<LegendItem[]>(() => {
    const base: LegendItem[] = [
      { label: 'Origine paternelle', color: PAT, shape: 'square', note: 'bouts carrés' },
      { label: 'Origine maternelle', color: MAT, shape: 'triangle', note: 'bouts pointus' },
    ];
    if (mode === 'meiose') {
      base.push({ label: 'Point de crossing-over', color: CROSS, shape: 'ring', note: 'chromatide recombinée' });
    }
    return base;
  }, [mode]);

  return (
    <LabScene cameraPosition={[0, 0.9, 7.6]} background="#FCE7F3" minDistance={4} maxDistance={14} groundY={null}>
      {/* Membranes cellulaires (+ enveloppe nucléaire quand elle existe) */}
      {stage.cells.map((cell, i) => (
        <group key={`cell-${i}`} position={cell.c}>
          <mesh>
            <sphereGeometry args={[cell.r, 40, 28]} />
            <meshStandardMaterial color="#F472B6" transparent opacity={0.15} roughness={0.2} depthWrite={false} />
          </mesh>
          {cell.nucleus && (
            <mesh>
              <sphereGeometry args={[cell.r * 0.62, 32, 22]} />
              <meshStandardMaterial color="#A78BFA" transparent opacity={0.2} roughness={0.3} depthWrite={false} />
            </mesh>
          )}
        </group>
      ))}

      {/* Trace de la phase précédente : d'où viennent les chromosomes ? */}
      {ghost && (
        <GhostState
          opacity={0.3}
          wireframe
          tone="svt"
          caption={`Trace : ${ghost.title}`}
          captionPosition={[0, 1.62, 0]}
          distanceFactor={6}
        >
          {ghost.chromos.map((c) => (
            <group key={`gc-${c.id}`} position={c.pos} rotation={[0, 0, c.rotZ]}>
              <ChromoBody arms={c.arms} len={c.len} thin={c.thin} />
            </group>
          ))}
          {ghost.plates.map((pl, i) => (
            <mesh key={`gp-${i}`} position={[pl.x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <ringGeometry args={[pl.r, pl.r + 0.035, 40]} />
              <meshStandardMaterial color="#0EA5E9" side={DoubleSide} />
            </mesh>
          ))}
        </GhostState>
      )}

      {/* Plaque équatoriale : anneau (vu de biais) + repère pointillé derrière */}
      {stage.plates.map((pl, i) => (
        <group key={`plate-${i}`}>
          <mesh position={[pl.x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <ringGeometry args={[pl.r, pl.r + 0.035, 56]} />
            <meshStandardMaterial color="#0EA5E9" side={DoubleSide} transparent opacity={0.7} />
          </mesh>
          {DASHES.map((t, j) => (
            <Segment
              key={j}
              a={[pl.x, t * pl.r, -pl.r * 0.62]}
              b={[pl.x, (t + 0.22) * pl.r, -pl.r * 0.62]}
              color="#0EA5E9"
              width={0.016}
            />
          ))}
        </group>
      ))}

      {/* Fuseau achromatique */}
      {stage.fibers.map((f, i) => (
        <Segment key={`fib-${i}`} a={f[0]} b={f[1]} color="#C4B5FD" width={0.011} />
      ))}
      {stage.poles.map((p, i) => (
        <Centrosome key={`pole-${i}`} p={p} />
      ))}

      {/* Chromosomes — position pilotée par <Animate> (migration lissée) */}
      {stage.chromos.map((c, i) => (
        <group
          key={c.id}
          ref={(el) => {
            if (el) refs.current.set(c.id, el);
            else refs.current.delete(c.id);
          }}
        >
          {c.thin ? (
            <FloatingChromo chromo={c} seed={i} />
          ) : (
            <ChromoBody arms={c.arms} len={c.len} thin={c.thin} />
          )}
        </group>
      ))}

      <Animate
        fn={(_state, delta) => {
          // Changement de phase : on repart de la pose RÉELLE de chaque
          // chromosome (ou de `from` pour ceux qui viennent d'apparaître).
          if (lastKey.current !== stageKey) {
            lastKey.current = stageKey;
            elapsed.current = 0;
            starts.current.clear();
            for (const c of stage.chromos) {
              const g = refs.current.get(c.id);
              if (!g) continue;
              if (!g.userData.ready) {
                const s = c.from ?? c.pos;
                g.position.set(s[0], s[1], s[2]);
                g.rotation.z = c.rotZ;
                g.userData.ready = true;
              }
              starts.current.set(c.id, [g.position.x, g.position.y, g.position.z, g.rotation.z]);
            }
          }

          elapsed.current = Math.min(elapsed.current + delta, dur);
          const u = easing(elapsed.current / dur);

          for (const c of stage.chromos) {
            const g = refs.current.get(c.id);
            if (!g) continue;
            let s = starts.current.get(c.id);
            if (!s) {
              const f = c.from ?? c.pos;
              g.rotation.z = c.rotZ;
              g.userData.ready = true;
              s = [f[0], f[1], f[2], c.rotZ];
              starts.current.set(c.id, s);
            }
            g.position.set(mix(s[0], c.pos[0], u), mix(s[1], c.pos[1], u), mix(s[2], c.pos[2], u));
            g.rotation.z = mix(s[3], c.rotZ, u);
          }
        }}
      />

      {/* Le détail que les élèves ratent : halo qui respire. */}
      {stage.focus && (
        <FocusHalo
          position={stage.focus.pos}
          radius={stage.focus.radius}
          tone="chimie"
          color={CROSS}
          label={stage.focus.label}
          labelOffset={0.3}
          distanceFactor={6}
        />
      )}

      {stage.tags.map((t, i) => (
        <Tag3D key={`tag-${i}`} position={t.pos} label={t.label} tone="svt" distanceFactor={6} />
      ))}

      <SceneLabel
        position={[0, 2.7, 0]}
        title={stage.title}
        subtitle={`${mode === 'mitose' ? 'Mitose' : 'Méiose'} · ${stage.cells.length} cellule${stage.cells.length > 1 ? 's' : ''}`}
        tone="svt"
        distanceFactor={7}
      />
      <Readout position={[-1.95, 2.02, 0]} value={stage.nChr} caption="chromosomes / cellule" distanceFactor={6} />
      <Readout position={[1.95, 2.02, 0]} value={stage.adn} unit="Q" caption="ADN / cellule" distanceFactor={6} />

      {/* Où en est la division ? phases faites cochées, suivantes estompées. */}
      <StepNarration
        position={[-3.35, 0.3, 0]}
        tone="svt"
        title={mode === 'mitose' ? 'Mitose — où en es-tu ?' : 'Méiose — où en es-tu ?'}
        steps={NARRATION[mode]}
        current={phase}
        width={188}
        distanceFactor={5.6}
      />

      <LegendCard
        position={[-3.3, -1.7, 0]}
        tone="svt"
        title="Lire les chromosomes"
        items={legend}
        width={182}
        distanceFactor={5.6}
      />

      {/* La comparaison centrale du chapitre — bilan des cellules filles. */}
      <CompareCard
        position={[3.3, 1.35, 0]}
        tone="svt"
        title="Cellules filles : chromosomes"
        left={{ label: 'Mitose', value: 4, unit: 'chr' }}
        right={{ label: 'Méiose', value: 2, unit: 'chr' }}
        precision={0}
        deltaLabel="Écart"
        verdict="La méiose divise le caryotype par 2 : 2n = 4 → n = 2."
        width={190}
        distanceFactor={5.6}
      />
      <CompareCard
        position={[3.3, -1.6, 0]}
        tone="svt"
        title="Cellules filles : quantité d’ADN"
        left={{ label: 'Mitose', value: 2, unit: 'Q' }}
        right={{ label: 'Méiose', value: 1, unit: 'Q' }}
        precision={0}
        deltaLabel="Écart"
        verdict="Une seule réplication pour deux divisions : l’ADN est aussi divisé par 2."
        width={190}
        distanceFactor={5.6}
      />
    </LabScene>
  );
}
