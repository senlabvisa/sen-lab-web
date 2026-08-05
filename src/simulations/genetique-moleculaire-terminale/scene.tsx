'use client';

import { createRef, useMemo, useRef, useState } from 'react';
import type { Group, Mesh, Vector3Tuple } from 'three';
import {
  AlongPath,
  Callout,
  CompareCard,
  DimGroup,
  DNAHelix,
  Float,
  FocusHalo,
  GhostState,
  LabScene,
  LegendCard,
  Marker,
  ObservationCue,
  Readout,
  SceneLabel,
  Segment,
  StepNarration,
  Tag3D,
  Timeline,
  clamp01,
  damp,
  easeInOut,
  easeOut,
  easeOutBack,
  easeOutElastic,
  goldenPhase,
  linear,
  mix,
  noise1D,
} from '@/components/lab3d';

/**
 * Scène 3D — de l'ADN à la protéine (génétique moléculaire, Terminale S, Bac).
 *
 * Portion réelle du début du gène de la bêta-globine humaine (HBB) :
 *   brin codant     5' ATG GTG CAC CTG ACT CCT GAG 3'
 *   brin transcrit  3' TAC CAC GTG GAC TGA GGA CTC 5'
 *   ARNm            5' AUG GUG CAC CUG ACU CCU GAG 3'
 *
 * L'ADN est fermé en double hélice (kit <DNAHelix>) de part et d'autre d'une
 * « bulle de transcription » ouverte : l'ARN polymérase y avance et l'ARNm se
 * construit nucléotide par nucléotide (complémentarité A-U, T-A, G-C, C-G).
 * Puis le ribosome parcourt l'ARNm codon par codon et enfile les acides aminés.
 * Toute la biologie est calculée par le module : la scène ne fait que la montrer.
 *
 * ── Deux régimes, une seule boucle de frame ──────────────────────────────────
 *  · MANUEL (défaut) : les curseurs du module donnent `nt` et `codonIndex` ;
 *    la scène les rejoint avec de l'inertie (`damp`), jamais en translation sèche.
 *  · FILM (`cine`)   : une <Timeline> de 6 phases déroule le dogme central et
 *    pilote À LA FOIS la 3D et la légende <StepNarration> — une seule horloge,
 *    donc aucune dérive entre ce qu'on voit et ce qu'on lit.
 *
 * Zéro re-render par frame : tout ce qui bouge est écrit dans des refs. Les
 * seuls setState sont les changements d'étape et de nucléotide/codon courant
 * (≈ 28 sur les 22 s du film), qui pilotent les annotations.
 */

export type GeneSceneProps = {
  /** Étape en cours du dogme central (mode manuel). */
  phase: 'transcription' | 'traduction';
  /** Nucléotides d'ARNm déjà synthétisés (0 → 21). */
  nt: number;
  /** Codons déjà lus par le ribosome (0 → 7). */
  codonIndex: number;
  /** Brin transcrit de l'ADN (21 lettres). */
  template: string;
  /** ARNm correspondant, mutation comprise (21 lettres). */
  mrna: string;
  /** Acides aminés des 7 codons (code 3 lettres, 'STOP' possible). */
  aminos: string[];
  /** Position du nucléotide muté dans l'ARNm, ou null. */
  mutIndex: number | null;
  /** ARNm de référence (allèle A) — sert de témoin fantôme. */
  refMrna?: string;
  /** Acides aminés de référence (allèle A) — protéine normale en fantôme. */
  refAminos?: string[];
  /** Déroule le film automatique de la synthèse. */
  cine?: boolean;
  /** Change de valeur → le film repart du début. */
  runKey?: number;
  /** Appelé une fois quand le film est arrivé au bout. */
  onCineEnd?: () => void;
};

const N = 21;
const CODONS = 7;
const SP = 0.3;
const X0 = -((N - 1) / 2) * SP; // -3.0
const LEN_MRNA = (N - 1) * SP; // 6.0
const Y_CODANT = 1.9;
const Y_TEMPLATE = 1.25;
const Y_MID = (Y_CODANT + Y_TEMPLATE) / 2;
const Y_MRNA = 0.45;
const Y_POLY = 0.88;
const Y_PROT = -1.15;
const Y_GHOST = -2.05;
const RUNG_Y = 0.75;
const RUNG_H = 0.36;
const HELIX_X = 3.75;

/** Couleurs des bases azotées (convention des manuels). */
const BASE: Record<string, string> = {
  A: '#3B82F6',
  T: '#F59E0B',
  G: '#10B981',
  C: '#EC4899',
  U: '#8B5CF6',
};

/** Couleurs des acides aminés — Glu (hydrophile) en rouge, Val (hydrophobe) en vert. */
const AA_COLOR: Record<string, string> = {
  Met: '#F59E0B',
  Val: '#16A34A',
  His: '#0EA5E9',
  Leu: '#8B5CF6',
  Thr: '#F97316',
  Pro: '#14B8A6',
  Glu: '#DC2626',
  STOP: '#334155',
};

/** Noms complets des acides aminés rencontrés dans ce TP. */
const AA_NAME: Record<string, string> = {
  Met: 'méthionine',
  Val: 'valine',
  His: 'histidine',
  Leu: 'leucine',
  Thr: 'thréonine',
  Pro: 'proline',
  Glu: 'acide glutamique',
  STOP: 'codon stop',
};

const COMP: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G' };

const px = (i: number) => X0 + i * SP;
const aaPos = (j: number): Vector3Tuple => [px(3 * j + 1), Y_PROT - 0.14 * Math.sin(j * 1.25), 0];
const ghostPos = (j: number): Vector3Tuple => [px(3 * j + 1), Y_GHOST - 0.14 * Math.sin(j * 1.25), 0];

/** Les 6 temps du dogme central. Le film ET la légende lisent ce même tableau. */
const NARRATION = [
  {
    label: "La double hélice d'ADN s'ouvre",
    detail: 'Les deux brins se séparent : une bulle de transcription apparaît.',
  },
  {
    label: "L'ARN polymérase recopie le brin transcrit",
    detail: 'Elle glisse le long de l’ADN et ajoute les nucléotides un à un : A→U, T→A, G→C, C→G.',
  },
  {
    label: "L'ARN messager quitte le noyau",
    detail: "L'ADN se referme ; l'ARNm part vers le cytoplasme.",
  },
  {
    label: 'Le ribosome se fixe sur le codon AUG',
    detail: 'Ce codon initiateur apporte le premier acide aminé : la méthionine.',
  },
  {
    label: "Le ribosome lit l'ARNm codon par codon",
    detail: 'Chaque codon (3 nucléotides) désigne un acide aminé grâce au code génétique.',
  },
  {
    label: 'La chaîne polypeptidique est assemblée',
    detail: 'La suite des acides aminés dépend directement de la suite des bases du gène.',
  },
];

/** Durées du film. Les phases 1 et 4 sont aussi celles des <AlongPath>. */
const D_TRANSCRIPTION = 7;
const D_LECTURE = 7;
const CINE_PHASES = [
  { name: 'ouverture', duration: 2, easing: easeInOut },
  { name: 'transcription', duration: D_TRANSCRIPTION, easing: linear },
  { name: 'sortie', duration: 1.8, easing: easeInOut },
  { name: 'fixation', duration: 1.6, easing: linear },
  { name: 'lecture', duration: D_LECTURE, easing: linear },
  { name: 'proteine', duration: 2.6, easing: easeInOut },
];

/** Chemin de l'ARN polymérase le long de l'ADN (parcouru à vitesse constante). */
const POLY_PATH: Vector3Tuple[] = [
  [px(-1.4), Y_POLY + 0.14, 0.18],
  [px(5), Y_POLY - 0.02, 0.02],
  [px(11), Y_POLY + 0.07, -0.06],
  [px(16), Y_POLY - 0.02, 0.02],
  [px(N + 0.2), Y_POLY + 0.12, 0.16],
];

/** Chemin du ribosome le long de l'ARNm (du 1ᵉʳ au 7ᵉ codon, vitesse constante). */
const RIBO_PATH: Vector3Tuple[] = [
  [px(1), 0, 0],
  [px(7), 0.04, 0],
  [px(13), -0.03, 0],
  [px(19), 0, 0],
];

/** Nucléotides libres du milieu (déterministes : angle d'or, jamais Math.random). */
const FREE_NT = Array.from({ length: 7 }, (_, i) => ({
  base: 'AUGC'[i % 4],
  pos: [-3 + goldenPhase(i) * 6, 2.35 + goldenPhase(i + 11) * 0.8, -0.7 + goldenPhase(i + 23) * 1.5] as Vector3Tuple,
}));

/** Acides aminés libres du cytoplasme, en avant-plan pendant la traduction. */
const FREE_AA = Array.from({ length: 5 }, (_, i) => ({
  aa: ['Val', 'Glu', 'Leu', 'Pro', 'Thr'][i],
  pos: [-2.6 + goldenPhase(i + 5) * 5.2, -0.55 + goldenPhase(i + 17) * 0.75, 1 + goldenPhase(i + 31) * 0.9] as Vector3Tuple,
}));

export default function GeneScene({
  phase,
  nt,
  codonIndex,
  template,
  mrna,
  aminos,
  mutIndex,
  refMrna,
  refAminos,
  cine = false,
  runKey = 0,
  onCineEnd,
}: GeneSceneProps) {
  // ── Refs de scène (tout ce qui bouge) ──────────────────────────────────────
  const dnaRoot = useRef<Group>(null);
  const strandTop = useRef<Group>(null);
  const strandBot = useRef<Group>(null);
  const helixOutL = useRef<Group>(null);
  const helixOutR = useRef<Group>(null);
  const helixL = useRef<Group>(null);
  const helixR = useRef<Group>(null);
  const poly = useRef<Group>(null);
  const ribo = useRef<Group>(null);
  const mrnaBar = useRef<Group>(null);
  const ntRefs = useRef<(Mesh | null)[]>([]);
  const aaRefs = useRef<(Mesh | null)[]>([]);
  const bondRefs = useRef<(Group | null)[]>([]);
  const rungRefs = useRef<(Mesh | null)[]>([]);
  const polyPlaced = useRef(false);
  const riboPlaced = useRef(false);

  const freeNtRefs = useMemo(() => FREE_NT.map(() => createRef<Mesh>()), []);
  const freeAaRefs = useMemo(() => FREE_AA.map(() => createRef<Mesh>()), []);

  /** Valeurs amorties : aucune translation linéaire, tout rejoint sa cible. */
  const smooth = useRef({ nt: 0, chain: 0, open: 1, lift: 0 });

  // ── État « gros grain » : ne change qu'aux étapes, jamais par frame ────────
  const [cineStep, setCineStep] = useState(0);
  const [live, setLive] = useState({ nt: 0, codon: 0 });
  const stepRef = useRef(0);
  const liveRef = useRef({ nt: 0, codon: 0 });
  const runRef = useRef(runKey);

  const ntProp = Math.max(0, Math.min(N, nt));
  const codonProp = Math.max(0, Math.min(CODONS, codonIndex));

  const activePhase: 'transcription' | 'traduction' = cine
    ? cineStep <= 2
      ? 'transcription'
      : 'traduction'
    : phase;
  const modeRef = useRef(activePhase);
  modeRef.current = activePhase;

  const shownNt = cine ? live.nt : ntProp;
  const shownCodon = cine ? live.codon : codonProp;

  /** Étape de narration : en film c'est la timeline, en manuel c'est toi. */
  const narrStep = cine
    ? cineStep
    : phase === 'transcription'
      ? ntProp <= 0
        ? 0
        : ntProp < N
          ? 1
          : 2
      : codonProp <= 0
        ? 3
        : codonProp < CODONS
          ? 4
          : 5;

  /** Brin codant (non transcrit) = complémentaire du brin transcrit. */
  const codant = useMemo(() => template.split('').map((b) => COMP[b] ?? b), [template]);

  /** Codon actuellement dans le ribosome (0 → 6). */
  const focusCodon = activePhase === 'traduction' ? Math.min(shownCodon, CODONS - 1) : null;
  const focusText = focusCodon === null ? '' : mrna.slice(3 * focusCodon, 3 * focusCodon + 3);
  const focusAA = focusCodon === null ? '' : (aminos[focusCodon] ?? '???');

  /** Comparaison allèle A / allèle muté. */
  const hasMutation = refMrna !== undefined && refMrna !== mrna;
  const normCodon = (refMrna ?? mrna).slice(3 * (CODONS - 1), 3 * CODONS);
  const normAA = (refAminos ?? aminos)[CODONS - 1] ?? '???';
  const mutCodon = mrna.slice(3 * (CODONS - 1), 3 * CODONS);
  const mutAA = aminos[CODONS - 1] ?? '???';
  const ghostChain = useMemo(
    () => (refAminos ?? aminos).slice(0, shownCodon).filter((a) => a !== 'STOP'),
    [refAminos, aminos, shownCodon],
  );
  const showGhost = hasMutation && activePhase === 'traduction' && shownCodon > 0;
  const showCompare = hasMutation && activePhase === 'traduction' && shownCodon >= CODONS;

  const verdict =
    mutAA === 'STOP'
      ? "Mutation non-sens : le ribosome s'arrête ici, la protéine est tronquée et non fonctionnelle."
      : mutAA === normAA
        ? 'Mutation silencieuse : le code génétique est redondant, la protéine reste identique.'
        : `Mutation faux-sens : ${normAA} (${AA_NAME[normAA] ?? normAA}) devient ${mutAA} (${AA_NAME[mutAA] ?? mutAA}).`;

  // ── Consigne d'observation, selon ce qu'on est en train de regarder ───────
  const cue =
    activePhase === 'transcription'
      ? {
          text: "Regarde la base que l'ARN polymérase vient d'ajouter à l'ARNm : elle est toujours complémentaire de celle du brin transcrit.",
          question: "Quelle base l'ARN place-t-il en face d'une adénine (A) ?",
        }
      : hasMutation
        ? {
            text: 'Compare la protéine en construction avec le témoin fantôme placé en dessous : la protéine normale de l’allèle A.',
            question: 'À partir de quel codon les deux protéines cessent-elles d’être identiques ?',
          }
        : {
            text: 'Suis le ribosome : à chaque codon lu, un acide aminé de plus vient s’accrocher à la chaîne.',
            question: 'Combien de nucléotides le ribosome lit-il pour placer un seul acide aminé ?',
          };

  const polyOnPath = cine && cineStep === 1;
  const riboOnPath = cine && cineStep === 4;

  const readout =
    activePhase === 'transcription'
      ? shownNt > 0
        ? { value: `${template[shownNt - 1]} → ${mrna[shownNt - 1]}`, caption: `nucléotide ${shownNt}/21` }
        : { value: '—', caption: 'appariement' }
      : { value: `${focusText || '—'} → ${focusAA || '—'}`, caption: `codon ${(focusCodon ?? 0) + 1}/7` };

  return (
    <LabScene cameraPosition={[0, 0.1, 14]} background="#F0FDF4" minDistance={6} maxDistance={24} groundY={null}>
      {/* ══ ADN : hélices + bulle de transcription ══════════════════════════ */}
      <group ref={dnaRoot}>
        {/* clé = séquence : garantit des matériaux frais quand la mutation change */}
        <DimGroup key={`dna-${template}`} dimmed={activePhase === 'traduction'} opacity={0.2}>
          <group ref={helixOutL} rotation={[0, 0, Math.PI / 2]}>
            <group ref={helixL}>
              <DNAHelix turns={2} height={1.9} radius={0.32} />
            </group>
          </group>
          <group ref={helixOutR} rotation={[0, 0, Math.PI / 2]}>
            <group ref={helixR}>
              <DNAHelix turns={2} height={1.9} radius={0.32} />
            </group>
          </group>

          {/* brin codant (non transcrit) */}
          <group ref={strandTop}>
            <Segment a={[px(0) - 0.2, Y_CODANT, 0]} b={[px(N - 1) + 0.2, Y_CODANT, 0]} color="#A78BFA" width={0.045} />
            {codant.map((b, i) => (
              <mesh key={`c${i}`} position={[px(i), Y_CODANT + 0.2, 0]} castShadow>
                <boxGeometry args={[0.19, 0.24, 0.19]} />
                <meshStandardMaterial color={BASE[b] ?? '#94A3B8'} roughness={0.4} />
              </mesh>
            ))}
          </group>

          {/* brin transcrit (matrice lue par l'ARN polymérase) */}
          <group ref={strandBot}>
            <Segment a={[px(0) - 0.2, Y_TEMPLATE, 0]} b={[px(N - 1) + 0.2, Y_TEMPLATE, 0]} color="#C4B5FD" width={0.045} />
            {template.split('').map((b, i) => (
              <mesh key={`t${i}`} position={[px(i), Y_TEMPLATE - 0.2, 0]} castShadow>
                <boxGeometry args={[0.19, 0.24, 0.19]} />
                <meshStandardMaterial
                  color={BASE[b] ?? '#94A3B8'}
                  roughness={0.4}
                  emissive={i === mutIndex ? '#DC2626' : '#000000'}
                  emissiveIntensity={i === mutIndex ? 0.55 : 0}
                />
              </mesh>
            ))}
          </group>
        </DimGroup>
      </group>

      {/* ══ Appariements en train de se faire (4 barreaux glissants) ════════ */}
      {[0, 1, 2, 3].map((k) => (
        <mesh
          key={`rung${k}`}
          ref={(m) => {
            rungRefs.current[k] = m;
          }}
          visible={false}
        >
          <cylinderGeometry args={[0.016, 0.016, RUNG_H, 6]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.6} />
        </mesh>
      ))}

      {/* ══ ARNm : squelette qui s'allonge + nucléotides qui se posent ══════ */}
      <group ref={mrnaBar} position={[px(0), Y_MRNA, 0]} visible={false}>
        <mesh position={[LEN_MRNA / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, LEN_MRNA, 8]} />
          <meshStandardMaterial color="#67E8F9" roughness={0.5} />
        </mesh>
      </group>

      {/* un <DimGroup> par codon : on éteint tout sauf celui dont on parle */}
      {Array.from({ length: CODONS }, (_, c) => (
        <DimGroup
          key={`cod${c}-${mrna.slice(3 * c, 3 * c + 3)}`}
          dimmed={focusCodon !== null && focusCodon !== c}
          opacity={0.18}
        >
          {[0, 1, 2].map((k) => {
            const i = 3 * c + k;
            const b = mrna[i] ?? 'A';
            return (
              <mesh
                key={`m${i}`}
                ref={(m) => {
                  ntRefs.current[i] = m;
                }}
                visible={false}
                castShadow
              >
                <sphereGeometry args={[i === mutIndex ? 0.17 : 0.13, 18, 14]} />
                <meshStandardMaterial
                  color={BASE[b] ?? '#94A3B8'}
                  roughness={0.3}
                  emissive={i === mutIndex ? '#DC2626' : (BASE[b] ?? '#94A3B8')}
                  emissiveIntensity={i === mutIndex ? 0.6 : 0.15}
                />
              </mesh>
            );
          })}
        </DimGroup>
      ))}

      {/* ══ ARN polymérase ══════════════════════════════════════════════════ */}
      {activePhase === 'transcription' && (
        <group ref={poly}>
          <mesh castShadow>
            <sphereGeometry args={[0.46, 24, 18]} />
            <meshStandardMaterial color="#FB7185" roughness={0.35} transparent opacity={0.72} />
          </mesh>
          <mesh position={[0.12, 0.28, 0.1]} castShadow>
            <sphereGeometry args={[0.24, 18, 14]} />
            <meshStandardMaterial color="#F43F5E" roughness={0.35} transparent opacity={0.75} />
          </mesh>
        </group>
      )}
      {polyOnPath && (
        <AlongPath
          objectRef={poly}
          points={POLY_PATH}
          duration={D_TRANSCRIPTION}
          easing={linear}
          restartKey={`poly-${runKey}`}
        />
      )}

      {/* ══ Ribosome (2 sous-unités + tunnel de sortie) ═════════════════════ */}
      {activePhase === 'traduction' && (
        <group ref={ribo}>
          <mesh position={[0, Y_MRNA + 0.42, 0]} castShadow>
            <sphereGeometry args={[0.36, 22, 16]} />
            <meshStandardMaterial color="#C084FC" roughness={0.4} />
          </mesh>
          <mesh position={[0, Y_MRNA - 0.42, 0]} scale={[1.25, 1, 1.1]} castShadow>
            <sphereGeometry args={[0.46, 24, 18]} />
            <meshStandardMaterial color="#9333EA" roughness={0.45} />
          </mesh>
          <mesh position={[0, Y_MRNA - 0.95, 0]}>
            <cylinderGeometry args={[0.07, 0.13, 0.26, 12]} />
            <meshStandardMaterial color="#7E22CE" roughness={0.5} />
          </mesh>
        </group>
      )}
      {riboOnPath && (
        <AlongPath
          objectRef={ribo}
          points={RIBO_PATH}
          duration={D_LECTURE}
          easing={linear}
          restartKey={`ribo-${runKey}`}
        />
      )}

      {/* ══ Chaîne polypeptidique ═══════════════════════════════════════════ */}
      {activePhase === 'traduction' && (
        <>
          {Array.from({ length: CODONS - 1 }, (_, j) => (
            <group
              key={`pb${j}`}
              ref={(g) => {
                bondRefs.current[j] = g;
              }}
              visible={false}
            >
              <Segment a={aaPos(j)} b={aaPos(j + 1)} color="#CBD5E1" width={0.05} />
            </group>
          ))}
          {Array.from({ length: CODONS }, (_, j) => (
            <mesh
              key={`aa${j}`}
              ref={(m) => {
                aaRefs.current[j] = m;
              }}
              visible={false}
              castShadow
            >
              <sphereGeometry args={[0.22, 22, 16]} />
              <meshStandardMaterial
                color={AA_COLOR[aminos[j] ?? ''] ?? '#64748B'}
                roughness={0.35}
                metalness={0.05}
              />
            </mesh>
          ))}
        </>
      )}

      {/* ══ Témoin fantôme : la protéine normale (allèle A) ═════════════════ */}
      {showGhost && (
        <GhostState
          key={`ghost-${refMrna}-${ghostChain.length}`}
          opacity={0.26}
          wireframe
          tone="svt"
          caption="Protéine normale (allèle A)"
          captionPosition={[px(N - 1) + 1.65, Y_GHOST, 0]}
        >
          {ghostChain.slice(0, -1).map((_, j) => (
            <Segment key={`gb${j}`} a={ghostPos(j)} b={ghostPos(j + 1)} color="#CBD5E1" width={0.05} />
          ))}
          {ghostChain.map((a, j) => (
            <mesh key={`ga${j}`} position={ghostPos(j)}>
              <sphereGeometry args={[0.22, 20, 14]} />
              <meshStandardMaterial color={AA_COLOR[a] ?? '#64748B'} roughness={0.4} />
            </mesh>
          ))}
        </GhostState>
      )}

      {/* ══ Molécules libres du milieu — flottement déterministe ════════════ */}
      {activePhase === 'transcription' &&
        FREE_NT.map((f, i) => (
          <group key={`fnt${i}`}>
            <mesh ref={freeNtRefs[i]}>
              <sphereGeometry args={[0.1, 14, 10]} />
              <meshStandardMaterial
                color={BASE[f.base] ?? '#94A3B8'}
                roughness={0.35}
                emissive={BASE[f.base] ?? '#94A3B8'}
                emissiveIntensity={0.12}
                transparent
                opacity={0.8}
              />
            </mesh>
            <Float objectRef={freeNtRefs[i]} base={f.pos} amplitude={0.11} speed={0.32} seed={i + 3} rotation={0.3} />
          </group>
        ))}
      {activePhase === 'traduction' &&
        FREE_AA.map((f, i) => (
          <group key={`faa${i}`}>
            <mesh ref={freeAaRefs[i]}>
              <sphereGeometry args={[0.13, 16, 12]} />
              <meshStandardMaterial
                color={AA_COLOR[f.aa] ?? '#64748B'}
                roughness={0.4}
                transparent
                opacity={0.75}
              />
            </mesh>
            <Float objectRef={freeAaRefs[i]} base={f.pos} amplitude={0.13} speed={0.28} seed={i + 41} rotation={0.22} />
          </group>
        ))}

      {/* ══ Mise en évidence de l'endroit dont on parle ═════════════════════ */}
      {activePhase === 'transcription' && shownNt > 0 && (
        <>
          <FocusHalo
            position={[px(Math.min(shownNt - 1, N - 1)), (Y_TEMPLATE - 0.2 + Y_MRNA) / 2, 0.05]}
            radius={0.34}
            tone="svt"
            label={`${template[shownNt - 1]} → ${mrna[shownNt - 1]}`}
            labelOffset={0.22}
            distanceFactor={7}
          />
          <Callout
            at={[px(Math.min(shownNt - 1, N - 1)), Y_MRNA - 0.2, 0]}
            to={[3.3, -1.9, 0]}
            tone="svt"
            label="Complémentarité des bases"
            detail="En face de A l'ARN place U ; en face de T, A ; en face de G, C ; en face de C, G."
            width={180}
            distanceFactor={9}
          />
        </>
      )}
      {focusCodon !== null && (
        <>
          <FocusHalo
            position={[px(3 * focusCodon + 1), Y_MRNA, 0.05]}
            radius={0.46}
            tone="chimie"
            label={`codon ${focusCodon + 1} : ${focusText}`}
            labelOffset={0.26}
            distanceFactor={7}
          />
          {focusAA !== 'STOP' && shownCodon > focusCodon && (
            <FocusHalo
              position={[px(3 * focusCodon + 1), aaPos(focusCodon)[1], 0.05]}
              radius={0.36}
              tone="svt"
              label={focusAA}
              labelOffset={0.22}
              distanceFactor={7}
            />
          )}
          <Callout
            at={[px(3 * focusCodon + 1), Y_MRNA - 0.25, 0]}
            to={[3.3, -2.6, 0]}
            tone="chimie"
            label={`${focusText} → ${focusAA}`}
            detail={
              focusAA === 'STOP'
                ? 'Codon stop : aucun acide aminé, la traduction se termine ici.'
                : `Le code génétique associe ce codon à ${AA_NAME[focusAA] ?? focusAA}.`
            }
            width={180}
            distanceFactor={9}
          />
        </>
      )}

      {/* ══ Étiquettes & cartes ═════════════════════════════════════════════ */}
      <Tag3D position={[px(0) - 1.5, Y_CODANT + 0.2, 0]} label="ADN · brin codant" tone="svt" />
      <Tag3D position={[px(0) - 1.5, Y_TEMPLATE - 0.35, 0]} label="brin transcrit" tone="svt" />
      {shownNt > 0 && <Tag3D position={[px(0) - 1.1, Y_MRNA, 0]} label="ARNm" tone="chimie" />}
      {activePhase === 'transcription' && <Tag3D position={[px(N - 1) + 1.2, Y_POLY, 0]} label="ARN polymérase" tone="neutral" />}
      {activePhase === 'traduction' && <Tag3D position={[px(N - 1) + 1.2, Y_MRNA + 0.9, 0]} label="ribosome" tone="neutral" />}
      {activePhase === 'traduction' && shownCodon > 0 && (
        <Tag3D position={[px(0) - 1.1, Y_PROT, 0]} label="protéine" tone="svt" />
      )}
      {mutIndex !== null && shownNt > mutIndex && (
        <>
          <Marker position={[px(mutIndex), Y_MRNA - 0.4, 0]} color="#DC2626" size={0.07} />
          <Tag3D position={[px(mutIndex), Y_MRNA - 0.72, 0]} label="mutation" tone="physique" />
        </>
      )}

      <SceneLabel
        position={[0, 3.6, 0]}
        title={
          activePhase === 'transcription'
            ? `Transcription — ${shownNt}/21 nucléotides`
            : `Traduction — codon ${Math.min(shownCodon + (shownCodon < CODONS ? 1 : 0), CODONS)}/7`
        }
        subtitle={
          activePhase === 'transcription'
            ? 'ADN → ARNm · A-U, T-A, G-C, C-G'
            : 'ARNm → protéine · ribosome & code génétique'
        }
        tone="svt"
        distanceFactor={11}
      />

      <StepNarration
        position={[-5.1, 1.5, 0]}
        title="Ce que tu observes"
        tone="svt"
        steps={NARRATION}
        current={narrStep}
        width={210}
        distanceFactor={10}
      />

      <LegendCard
        position={[-5.1, -2.1, 0]}
        tone="svt"
        title="Légende"
        items={[
          { label: 'Adénine (A)', color: '#3B82F6', shape: 'dot' },
          { label: 'Thymine (T) — ADN', color: '#F59E0B', shape: 'square' },
          { label: 'Uracile (U) — ARN', color: '#8B5CF6', shape: 'triangle' },
          { label: 'Guanine (G)', color: '#10B981', shape: 'ring' },
          { label: 'Cytosine (C)', color: '#EC4899', shape: 'dash' },
          { label: 'Protéine normale', color: '#94A3B8', shape: 'dashed', note: 'témoin fantôme' },
        ]}
        width={196}
        distanceFactor={10}
      />

      <Readout position={[5.1, 2.2, 0]} value={readout.value} caption={readout.caption} distanceFactor={8} />

      {showCompare && (
        <CompareCard
          position={[5.1, 0.5, 0]}
          title="Allèle A et allèle muté"
          left={{ label: 'Normal (A)', value: `${normCodon} → ${normAA}` }}
          right={{ label: 'Muté', value: `${mutCodon} → ${mutAA}` }}
          verdict={verdict}
          tone="svt"
          width={212}
          distanceFactor={10}
        />
      )}

      <ObservationCue
        position={[0, -3.55, 0]}
        tone="svt"
        badge="À observer"
        text={cue.text}
        question={cue.question}
        width={250}
        distanceFactor={10}
      />

      {/* ══ Une seule horloge : elle pilote la 3D ET la légende ═════════════ */}
      <Timeline
        phases={CINE_PHASES}
        playing={cine}
        restartKey={runKey}
        onDone={onCineEnd}
        onFrame={(f, state, delta) => {
          const t = state.clock.elapsedTime;
          const s = smooth.current;

          // ── 0. Relance du film : on repart ADN fermé, ARNm vide.
          if (runRef.current !== runKey) {
            runRef.current = runKey;
            if (cine) {
              s.nt = 0;
              s.chain = 0;
              s.open = 0;
              s.lift = 0;
              stepRef.current = 0;
              liveRef.current = { nt: 0, codon: 0 };
              setCineStep(0);
              setLive({ nt: 0, codon: 0 });
            }
          }

          // ── 1. Cibles : le film les lit dans la timeline, le mode manuel
          //       dans les curseurs du module.
          let ntT = ntProp;
          let codT = codonProp;
          let openT = 1;
          let liftT = modeRef.current === 'traduction' ? 1 : 0;

          if (cine) {
            switch (f.name) {
              case 'ouverture':
                ntT = 0;
                codT = 0;
                openT = f.t;
                liftT = 0;
                break;
              case 'transcription':
                ntT = f.raw * N;
                codT = 0;
                openT = 1;
                liftT = 0;
                break;
              case 'sortie':
                ntT = N;
                codT = 0;
                openT = 1 - f.t;
                liftT = f.t;
                break;
              case 'fixation':
                ntT = N;
                codT = 0;
                openT = 0.15;
                liftT = 1;
                break;
              case 'lecture':
                ntT = N;
                codT = f.raw * CODONS;
                openT = 0.15;
                liftT = 1;
                break;
              default:
                ntT = N;
                codT = CODONS;
                openT = 0.15;
                liftT = 1;
            }
            if (f.index !== stepRef.current) {
              stepRef.current = f.index;
              setCineStep(f.index);
            }
          } else if (stepRef.current !== 0) {
            // Retour au mode manuel : la légende doit repartir de tes curseurs.
            stepRef.current = 0;
            liveRef.current = { nt: 0, codon: 0 };
            setCineStep(0);
          }

          // ── 2. Inertie : rien ne saute, tout rejoint sa cible (damp).
          const kFast = cine ? 16 : 7;
          s.nt = damp(s.nt, ntT, kFast, delta);
          s.chain = damp(s.chain, codT, cine ? 16 : 6, delta);
          s.open = damp(s.open, openT, 4.5, delta);
          s.lift = damp(s.lift, liftT, 4, delta);

          // ── 3. Nucléotide / codon courant : un setState par franchissement.
          if (cine) {
            const ni = Math.max(0, Math.min(N, Math.round(s.nt)));
            const ci = Math.max(0, Math.min(CODONS, Math.round(s.chain)));
            if (ni !== liveRef.current.nt || ci !== liveRef.current.codon) {
              liveRef.current = { nt: ni, codon: ci };
              setLive({ nt: ni, codon: ci });
            }
          }

          // ── 4. Ouverture / refermeture de la double hélice.
          const gap = 1 - s.open;
          strandTop.current?.position.set(0, gap * (Y_MID - Y_CODANT), 0);
          strandBot.current?.position.set(0, gap * (Y_MID - Y_TEMPLATE), 0);
          helixOutL.current?.position.set(mix(-2.55, -HELIX_X, s.open), Y_MID, 0);
          helixOutR.current?.position.set(mix(2.55, HELIX_X, s.open), Y_MID, 0);
          if (helixL.current) helixL.current.rotation.y += delta * 0.55;
          if (helixR.current) helixR.current.rotation.y += delta * 0.55;
          dnaRoot.current?.position.set(0, s.lift * 0.5, 0);

          // ── 5. ARNm : le squelette s'allonge, chaque base se pose (easeOutBack).
          const bar = mrnaBar.current;
          if (bar) {
            const grown = clamp01((s.nt - 1) / (N - 1));
            bar.visible = s.nt > 1.02;
            bar.scale.set(Math.max(1e-4, grown), 1, 1);
          }
          for (let i = 0; i < N; i++) {
            const m = ntRefs.current[i];
            if (!m) continue;
            const a = clamp01(s.nt - i);
            if (a <= 0.002) {
              m.visible = false;
              continue;
            }
            m.visible = true;
            m.scale.setScalar(0.05 + 0.95 * easeOutBack(a));
            m.position.set(
              px(i),
              mix(Y_TEMPLATE - 0.34, Y_MRNA, easeOut(a)) + noise1D(t * 0.7 + i * 0.5, i) * 0.01,
              0,
            );
          }

          // ── 6. Barreaux d'appariement : les 4 derniers, glissants.
          const transcribing = modeRef.current === 'transcription';
          for (let k = 0; k < 4; k++) {
            const m = rungRefs.current[k];
            if (!m) continue;
            const idx = Math.floor(s.nt) - 1 - k;
            if (!transcribing || idx < 0 || idx >= N || s.nt < 0.6 || s.open < 0.55) {
              m.visible = false;
              continue;
            }
            m.visible = true;
            m.position.set(px(idx), RUNG_Y, 0);
            m.scale.set(1, 1 - k * 0.18, 1);
          }

          // ── 7. ARN polymérase : sur rail (film) ou amortie (manuel).
          const p = poly.current;
          if (!p) {
            polyPlaced.current = false;
          } else if (!polyOnPath) {
            const target = px(Math.min(s.nt, N - 1));
            if (!polyPlaced.current) {
              polyPlaced.current = true;
              p.position.set(target, Y_POLY, 0);
            }
            p.position.x = damp(p.position.x, target, 6, delta);
            p.position.y = Y_POLY + noise1D(t * 0.9, 3) * 0.06;
            p.position.z = 0;
          }

          // ── 8. Ribosome : arrivée élastique, puis rail à vitesse constante.
          const r = ribo.current;
          if (!r) {
            riboPlaced.current = false;
          } else {
            r.scale.setScalar(1 + Math.sin(t * 2.6) * 0.02);
            if (!riboOnPath) {
              const target = px(3 * Math.min(Math.round(s.chain), CODONS - 1) + 1);
              if (cine && f.name === 'fixation') {
                r.position.set(mix(px(6), px(1), easeInOut(f.t)), mix(1.7, 0, easeOutElastic(f.t)), 0);
                riboPlaced.current = true;
              } else {
                if (!riboPlaced.current) {
                  riboPlaced.current = true;
                  r.position.set(target, 0, 0);
                }
                r.position.x = damp(r.position.x, target, 5, delta);
                r.position.y = damp(r.position.y, 0, 6, delta);
              }
            }
          }

          // ── 9. Acides aminés : ils tombent du cytoplasme et s'emboîtent.
          for (let j = 0; j < CODONS; j++) {
            const m = aaRefs.current[j];
            if (!m) continue;
            const a = clamp01(s.chain - j);
            if (a <= 0.002 || aminos[j] === 'STOP') {
              m.visible = false;
              continue;
            }
            m.visible = true;
            m.scale.setScalar(0.08 + 0.92 * easeOutBack(a));
            const base = aaPos(j);
            const e = easeOut(a);
            m.position.set(base[0], mix(base[1] + 1.25, base[1], e), mix(0.55, 0, e));
          }
          for (let j = 0; j < CODONS - 1; j++) {
            const g = bondRefs.current[j];
            if (!g) continue;
            g.visible =
              s.chain > j + 1.45 && aminos[j] !== 'STOP' && aminos[j + 1] !== 'STOP';
          }
        }}
      />
    </LabScene>
  );
}
