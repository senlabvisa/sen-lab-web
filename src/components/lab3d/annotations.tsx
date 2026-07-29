'use client';

/**
 * lab3d/annotations — étiquettes, narration et mises en évidence de la scène 3D.
 *
 * On utilise <Html> (DOM) plutôt que <Text>/troika : rendu net, pas de
 * police à fetch sur un CDN (critique pour le mode 100 % offline du PWA).
 * Tous ces composants doivent être placés à l'intérieur d'un <Canvas>.
 *
 * Deux familles :
 *  1. Étiquettes statiques (historique) : SceneLabel, Tag3D, Readout, HotspotCoach.
 *  2. Primitives PÉDAGOGIQUES : elles font qu'une animation *explique* au lieu
 *     de décorer — narration d'étapes synchronisée, état fantôme (avant/après),
 *     trace de valeur, halo de focus, atténuation du décor, comparateur.
 *
 * Performance : aucune de ces primitives ne provoque de re-render React à
 * chaque frame. Ce qui bouge est écrit directement dans des refs (objets
 * three ou nœuds DOM). Les seuls setState sont les changements d'étape
 * (quelques-uns par cycle d'animation).
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementRef,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from 'react';
import { Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import {
  DoubleSide,
  Mesh,
  Quaternion,
  Vector3,
  type Group,
  type Material,
  type MeshBasicMaterial,
  type Object3D,
  type Vector3Tuple,
} from 'three';

export type Tone = 'physique' | 'chimie' | 'maths' | 'svt' | 'neutral';

const TONE: Record<
  Tone,
  { ring: string; ink: string; dot: string; soft: string; bar: string; chipRing: string }
> = {
  physique: {
    ring: 'ring-blue-200',
    ink: 'text-blue-700',
    dot: '#2563EB',
    soft: 'bg-blue-50',
    bar: 'bg-blue-600',
    chipRing: 'ring-blue-300',
  },
  chimie: {
    ring: 'ring-violet-200',
    ink: 'text-violet-700',
    dot: '#7C3AED',
    soft: 'bg-violet-50',
    bar: 'bg-violet-600',
    chipRing: 'ring-violet-300',
  },
  maths: {
    ring: 'ring-sky-200',
    ink: 'text-sky-700',
    dot: '#0EA5E9',
    soft: 'bg-sky-50',
    bar: 'bg-sky-500',
    chipRing: 'ring-sky-300',
  },
  svt: {
    ring: 'ring-emerald-200',
    ink: 'text-emerald-700',
    dot: '#16A34A',
    soft: 'bg-emerald-50',
    bar: 'bg-emerald-600',
    chipRing: 'ring-emerald-300',
  },
  neutral: {
    ring: 'ring-ink/10',
    ink: 'text-ink',
    dot: '#475569',
    soft: 'bg-slate-100',
    bar: 'bg-slate-600',
    chipRing: 'ring-slate-300',
  },
};

/** Grande étiquette « carte » au-dessus de la scène (titre + sous-titre). */
export function SceneLabel({
  position,
  title,
  subtitle,
  tone = 'neutral',
  distanceFactor = 9,
}: {
  position: Vector3Tuple;
  title: string;
  subtitle?: string;
  tone?: Tone;
  distanceFactor?: number;
}) {
  const t = TONE[tone];
  return (
    <Html position={position} center distanceFactor={distanceFactor} style={{ pointerEvents: 'none' }}>
      <div className={`select-none whitespace-nowrap rounded-2xl bg-white/95 px-3 py-1.5 text-center shadow-card ring-1 ${t.ring}`}>
        {subtitle && <div className="text-[10px] uppercase tracking-wider text-ink/45">{subtitle}</div>}
        <div className={`font-display text-sm font-bold ${t.ink}`}>{title}</div>
      </div>
    </Html>
  );
}

/** Petite pastille collée à un point (nom d'atome, d'organe, de borne). */
export function Tag3D({
  position,
  label,
  tone = 'neutral',
  distanceFactor = 8,
}: {
  position: Vector3Tuple;
  label: string;
  tone?: Tone;
  distanceFactor?: number;
}) {
  const t = TONE[tone];
  return (
    <Html position={position} center distanceFactor={distanceFactor} style={{ pointerEvents: 'none' }}>
      <span className={`select-none whitespace-nowrap rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-semibold shadow-soft ring-1 ${t.ring} ${t.ink}`}>
        {label}
      </span>
    </Html>
  );
}

/** Lecture de mesure type afficheur (valeur + unité), fond sombre « instrument ». */
export function Readout({
  position,
  value,
  unit,
  caption,
  distanceFactor = 8,
}: {
  position: Vector3Tuple;
  value: string | number;
  unit?: string;
  caption?: string;
  distanceFactor?: number;
}) {
  return (
    <Html position={position} center distanceFactor={distanceFactor} style={{ pointerEvents: 'none' }}>
      <div className="select-none whitespace-nowrap rounded-lg bg-night-900/95 px-2.5 py-1 text-center shadow-card ring-1 ring-white/10">
        <div className="font-mono text-sm font-bold tabular-nums text-emerald-300">
          {value}
          {unit ? <span className="ml-0.5 text-[11px] text-emerald-200/70">{unit}</span> : null}
        </div>
        {caption ? <div className="text-[9px] uppercase tracking-wide text-white/40">{caption}</div> : null}
      </div>
    </Html>
  );
}

export { HotspotCoach } from '@/components/lab/hotspot-coach';

// ══════════════════════════════════════════════════════════════════════
// PRIMITIVES PÉDAGOGIQUES
// ══════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────────
// Outils internes
// ──────────────────────────────────────────────────────────────────────

/** Format « manuel sénégalais » : virgule décimale (3,25 et non 3.25). */
function fr(n: number, precision = 2): string {
  const s = Math.abs(n).toFixed(precision).replace('.', ',');
  return n < 0 ? `−${s}` : s;
}

function clampIndex(i: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(0, Math.round(i)), count - 1);
}

// ──────────────────────────────────────────────────────────────────────
// 1. Narration d'étapes — « 1/4 — Le macrophage adhère à la bactérie »
// ──────────────────────────────────────────────────────────────────────

/** Une étape de narration. `hold` = durée en secondes (mode automatique). */
export type NarrationStep = {
  label: string;
  /** Précision affichée uniquement quand l'étape est en cours. */
  detail?: string;
  /** Durée de l'étape en secondes (mode <AutoNarration>). Défaut : `hold` global. */
  hold?: number;
};

type StepInput = string | NarrationStep;

function normalizeSteps(steps: readonly StepInput[]): NarrationStep[] {
  return steps.map((s) => (typeof s === 'string' ? { label: s } : s));
}

function NarrationCard({
  steps,
  current,
  title,
  tone,
  progress,
  barRef,
  width,
}: {
  steps: NarrationStep[];
  current: number;
  title: string;
  tone: Tone;
  /** 0 → 1. Affiche la barre d'avancement de l'étape en cours. */
  progress?: number;
  /** Alternative à `progress` : la barre est pilotée par mutation directe du DOM. */
  barRef?: RefObject<HTMLDivElement>;
  width: number;
}) {
  const t = TONE[tone];
  const total = steps.length;
  const idx = clampIndex(current, total);
  const showBar = progress !== undefined || barRef !== undefined;

  return (
    <div
      className={`select-none rounded-2xl bg-white/95 px-3 py-2.5 shadow-card ring-1 ${t.ring}`}
      style={{ width }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50">{title}</span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums ring-1 ${t.soft} ${t.ink} ${t.chipRing}`}>
          {idx + 1}/{total}
        </span>
      </div>

      <ol className="mt-2 space-y-1">
        {steps.map((s, i) => {
          const done = i < idx;
          const now = i === idx;
          return (
            <li
              key={`${i}-${s.label}`}
              className={`flex items-start gap-2 rounded-lg py-1 pr-1 ${now ? `${t.soft} border-l-4 pl-1.5` : 'border-l-4 border-transparent pl-1.5'}`}
              style={{
                borderLeftColor: now ? t.dot : 'transparent',
                opacity: now ? 1 : done ? 0.72 : 0.42,
              }}
            >
              <span
                aria-hidden
                className={`mt-[1px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[10px] font-bold leading-none ${
                  now ? 'text-white' : done ? 'bg-white text-ink/70 ring-1 ring-ink/25' : 'border border-dashed border-ink/35 bg-white text-ink/50'
                }`}
                style={now ? { background: t.dot } : undefined}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`text-[12.5px] leading-snug ${now ? `font-bold ${t.ink}` : 'font-medium text-ink/75'}`}>
                {now && (
                  <span className="font-mono tabular-nums">
                    {i + 1}/{total} —{' '}
                  </span>
                )}
                {s.label}
                {now && s.detail ? (
                  <span className="mt-0.5 block text-[11.5px] font-medium leading-snug text-ink/60">{s.detail}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>

      {showBar && (
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
          <div
            ref={barRef}
            className={`h-full w-full origin-left rounded-full ${t.bar}`}
            style={{ transform: `scaleX(${progress ?? 0})` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * <StepNarration> — légende d'étapes PILOTÉE par la scène (mode contrôlé).
 *
 * L'étape courante est mise en avant (fond teinté, barre latérale, numéro
 * plein, préfixe « 2/4 — »), les précédentes sont cochées « ✓ », les
 * suivantes estompées. L'état ne repose jamais sur la seule couleur.
 *
 * @example
 * <LabScene cameraPosition={[0, 1.4, 6]}>
 *   <StepNarration
 *     position={[-2.6, 2.1, 0]}
 *     tone="svt"
 *     title="Ce que tu observes"
 *     steps={[
 *       'Le macrophage repère la bactérie',
 *       { label: 'Il adhère à la bactérie', detail: 'Les récepteurs se fixent sur la paroi.' },
 *       'Il englobe la bactérie (phagocytose)',
 *       'Il digère la bactérie dans une vésicule',
 *     ]}
 *     current={etape}
 *   />
 * </LabScene>
 */
export function StepNarration({
  position,
  steps,
  current,
  title = 'Ce que tu observes',
  tone = 'neutral',
  progress,
  width = 236,
  distanceFactor = 12,
}: {
  position: Vector3Tuple;
  steps: readonly StepInput[];
  current: number;
  title?: string;
  tone?: Tone;
  /** Avancement 0→1 de l'étape en cours (optionnel). */
  progress?: number;
  width?: number;
  distanceFactor?: number;
}) {
  const list = useMemo(() => normalizeSteps(steps), [steps]);
  if (list.length === 0) return null;
  return (
    <Html position={position} center distanceFactor={distanceFactor} style={{ pointerEvents: 'none' }}>
      <NarrationCard steps={list} current={current} title={title} tone={tone} progress={progress} width={width} />
    </Html>
  );
}

/**
 * useStepClock — horloge d'étapes basée sur le temps de la scène.
 *
 * À appeler DANS un composant enfant de <LabScene> (règle R3F : `useFrame`).
 * Un seul setState par changement d'étape ; l'avancement fin reste dans une
 * ref (`progress`) pour éviter tout re-render par frame.
 *
 * @example
 * function Phagocytose() {
 *   const { index, progress } = useStepClock({ count: 4, hold: 3 });
 *   // index : étape courante ; progress.current : 0→1 dans l'étape
 *   return <Tag3D position={[0, 2, 0]} label={`Étape ${index + 1}`} tone="svt" />;
 * }
 */
export function useStepClock({
  count,
  hold = 3.5,
  holds,
  running = true,
  loop = true,
  resetKey,
}: {
  count: number;
  /** Durée par défaut d'une étape, en secondes. */
  hold?: number;
  /** Durées par étape (prioritaire sur `hold`). */
  holds?: readonly number[];
  running?: boolean;
  loop?: boolean;
  /** Change de valeur → la narration repart à l'étape 1. */
  resetKey?: string | number;
}): { index: number; progress: MutableRefObject<number> } {
  const [index, setIndex] = useState(0);
  const elapsed = useRef(0);
  const progress = useRef(0);

  useEffect(() => {
    elapsed.current = 0;
    progress.current = 0;
    setIndex(0);
  }, [resetKey, count]);

  useFrame((_state, delta) => {
    if (!running || count <= 0) return;
    const last = index >= count - 1;
    if (last && !loop) {
      progress.current = 1;
      return;
    }
    // Onglet en arrière-plan → delta énorme : on plafonne pour ne pas sauter d'étapes.
    elapsed.current += Math.min(delta, 0.1);
    const duration = Math.max(0.15, holds?.[index] ?? hold);
    progress.current = Math.min(1, elapsed.current / duration);
    if (elapsed.current >= duration) {
      elapsed.current = 0;
      progress.current = 0;
      setIndex((i) => (i + 1 >= count ? 0 : i + 1));
    }
  });

  return { index: clampIndex(index, count), progress };
}

/**
 * <AutoNarration> — la même légende, mais synchronisée toute seule avec
 * l'animation : chaque étape reste affichée `hold` secondes, la barre du bas
 * montre le temps restant, puis on passe à la suivante (et on reboucle).
 *
 * C'est la primitive à poser sur toute animation en boucle : l'élève sait
 * enfin CE QU'IL REGARDE à chaque instant.
 *
 * @example
 * <LabScene cameraPosition={[0, 1.2, 6]} background="#F0FDF4">
 *   <MacrophageAnime />
 *   <AutoNarration
 *     position={[-2.7, 2, 0]}
 *     tone="svt"
 *     hold={3}
 *     steps={[
 *       { label: 'Le macrophage repère la bactérie', hold: 2.5 },
 *       'Il adhère à la bactérie',
 *       'Il englobe la bactérie : c’est la phagocytose',
 *       'Il digère la bactérie, puis rejette les déchets',
 *     ]}
 *     onStepChange={(i) => setEtape(i)}
 *   />
 * </LabScene>
 */
export function AutoNarration({
  position,
  steps,
  title = 'Ce que tu observes',
  tone = 'neutral',
  hold = 3.5,
  running = true,
  loop = true,
  resetKey,
  onStepChange,
  width = 236,
  distanceFactor = 12,
}: {
  position: Vector3Tuple;
  steps: readonly StepInput[];
  title?: string;
  tone?: Tone;
  /** Durée par défaut d'une étape (s). Surchargée par `step.hold`. */
  hold?: number;
  running?: boolean;
  loop?: boolean;
  resetKey?: string | number;
  /** Prévenu à chaque changement d'étape (pour piloter la 3D en écho). */
  onStepChange?: (index: number) => void;
  width?: number;
  distanceFactor?: number;
}) {
  const list = useMemo(() => normalizeSteps(steps), [steps]);
  const holds = useMemo(() => list.map((s) => s.hold ?? hold), [list, hold]);
  const { index, progress } = useStepClock({ count: list.length, hold, holds, running, loop, resetKey });
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onStepChange?.(index);
    // onStepChange est volontairement hors deps : on ne notifie qu'au changement d'étape.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Mutation DOM directe : pas de setState, donc pas de re-render par frame.
  useFrame(() => {
    const el = bar.current;
    if (el) el.style.transform = `scaleX(${progress.current})`;
  });

  if (list.length === 0) return null;
  return (
    <Html position={position} center distanceFactor={distanceFactor} style={{ pointerEvents: 'none' }}>
      <NarrationCard steps={list} current={index} title={title} tone={tone} barRef={bar} width={width} />
    </Html>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 2. État fantôme / atténuation — rendre le changement visible
// ──────────────────────────────────────────────────────────────────────

const VEIL_FLAG = '__labVeil';
const VEIL_OPAQUE = '__labVeilTransparent';

/**
 * Clone (une seule fois) les matériaux du sous-arbre puis règle leur opacité.
 * On clone pour ne JAMAIS toucher aux matériaux partagés du kit.
 */
function useMaterialVeil(
  root: RefObject<Group>,
  { active, opacity, wireframe }: { active: boolean; opacity: number; wireframe: boolean },
) {
  const owned = useRef<Material[]>([]);

  // Pas de tableau de deps : le sous-arbre 3D peut changer entre deux rendus.
  // Le drapeau userData empêche de re-cloner ce qui l'a déjà été.
  useEffect(() => {
    const group = root.current;
    if (!group) return;
    group.traverse((obj: Object3D) => {
      if (!(obj instanceof Mesh)) return;
      const isArray = Array.isArray(obj.material);
      const list: Material[] = isArray ? (obj.material as Material[]) : [obj.material as Material];
      const next = list.map((m) => {
        if (m.userData[VEIL_FLAG]) return m;
        const copy = m.clone();
        copy.userData[VEIL_FLAG] = true;
        copy.userData[VEIL_OPAQUE] = m.transparent;
        owned.current.push(copy);
        return copy;
      });
      obj.material = isArray ? next : next[0];
    });
    for (const m of owned.current) {
      m.transparent = active ? true : Boolean(m.userData[VEIL_OPAQUE]);
      m.opacity = active ? opacity : 1;
      m.depthWrite = !active;
      const w = m as Material & { wireframe?: boolean };
      if ('wireframe' in w) w.wireframe = active && wireframe;
      m.needsUpdate = true;
    }
  });

  useEffect(
    () => () => {
      for (const m of owned.current) m.dispose();
      owned.current = [];
    },
    [],
  );
}

/**
 * <GhostState> — laisse l'état PRÉCÉDENT en trace translucide (option
 * fil de fer) pour que le changement saute aux yeux : position de départ
 * d'un mobile, berge avant l'érosion, courbe sans traitement…
 *
 * Accessibilité : la trace n'est pas seulement « plus pâle », elle peut être
 * affichée en fil de fer (`wireframe`) et porte une étiquette en pointillés.
 *
 * @example
 * <LabScene cameraPosition={[0, 1.5, 7]}>
 *   {/* la berge d'avant, en fantôme *\/}
 *   <GhostState opacity={0.2} wireframe caption="Berge avant la crue" captionPosition={[-1.8, 0.9, 0]}>
 *     <mesh position={[-1.8, 0, 0]}>
 *       <boxGeometry args={[2.4, 0.8, 1.6]} />
 *       <meshStandardMaterial color="#A16207" />
 *     </mesh>
 *   </GhostState>
 *   {/* la berge d'aujourd'hui, pleine *\/}
 *   <mesh position={[-1.8, 0, 0]}>
 *     <boxGeometry args={[1.5, 0.8, 1.6]} />
 *     <meshStandardMaterial color="#A16207" />
 *   </mesh>
 * </LabScene>
 */
export function GhostState({
  children,
  opacity = 0.22,
  wireframe = false,
  visible = true,
  caption,
  captionPosition,
  tone = 'neutral',
  distanceFactor = 8,
}: {
  children: ReactNode;
  /** Opacité de la trace (0→1). */
  opacity?: number;
  /** Rend la trace en fil de fer : repère non coloriel. */
  wireframe?: boolean;
  visible?: boolean;
  /** Étiquette en pointillés, ex. « Position de départ ». */
  caption?: string;
  captionPosition?: Vector3Tuple;
  tone?: Tone;
  distanceFactor?: number;
}) {
  const group = useRef<Group>(null);
  useMaterialVeil(group, { active: true, opacity, wireframe });
  const t = TONE[tone];
  return (
    <group ref={group} visible={visible}>
      {children}
      {caption && captionPosition && (
        <Html position={captionPosition} center distanceFactor={distanceFactor} style={{ pointerEvents: 'none' }}>
          <span className={`select-none whitespace-nowrap rounded-full border-2 border-dashed bg-white/85 px-2 py-0.5 text-[11px] font-semibold ${t.ink}`} style={{ borderColor: t.dot }}>
            {caption}
          </span>
        </Html>
      )}
    </group>
  );
}

/**
 * <DimGroup> — atténue tout ce qui n'est PAS l'objet de la consigne.
 * À combiner avec <FocusHalo> : on isole l'essentiel au lieu d'ajouter du bruit.
 *
 * @example
 * <LabScene>
 *   <DimGroup dimmed={etape === 2}>
 *     <Beaker position={[-1.5, 0, 0]} fill={0.6} liquidColor="#93C5FD" />
 *     <Stand position={[1.5, 0, 0]} />
 *   </DimGroup>
 *   <Burette position={[0, 1, 0]} open={etape === 2} />
 *   {etape === 2 && <FocusHalo position={[0, 0.2, 0]} tone="chimie" label="Regarde la goutte" />}
 * </LabScene>
 */
export function DimGroup({
  children,
  dimmed = true,
  opacity = 0.16,
}: {
  children: ReactNode;
  dimmed?: boolean;
  /** Opacité appliquée quand `dimmed` est vrai. */
  opacity?: number;
}) {
  const group = useRef<Group>(null);
  useMaterialVeil(group, { active: dimmed, opacity, wireframe: false });
  return <group ref={group}>{children}</group>;
}

// ──────────────────────────────────────────────────────────────────────
// 3. Trace de valeur — matérialiser le parcours d'un point
// ──────────────────────────────────────────────────────────────────────

/**
 * <ValueTrail> — le point courant laisse derrière lui la trace de son
 * parcours (trajectoire d'un mobile, évolution d'une grandeur sur un graphe).
 * L'élève voit l'HISTOIRE de la valeur, pas seulement sa position actuelle.
 *
 * Échantillonné (`sampleEvery`) puis écrit directement dans la géométrie :
 * aucun re-render React.
 *
 * @example
 * function Chute() {
 *   const bille = useRef<Mesh>(null);
 *   return (
 *     <LabScene cameraPosition={[0, 1, 7]}>
 *       <Axes2D size={3} />
 *       <mesh ref={bille}>
 *         <sphereGeometry args={[0.12, 20, 16]} />
 *         <meshStandardMaterial color="#DC2626" />
 *       </mesh>
 *       <Animate fn={(s) => bille.current?.position.set(s.clock.elapsedTime % 4 - 2, 2 - 0.5 * (s.clock.elapsedTime % 4) ** 2, 0)} />
 *       <ValueTrail target={bille} color="#DC2626" maxPoints={120} />
 *       <Tag3D position={[2.2, -1.8, 0]} label="Trace de la bille" tone="physique" />
 *     </LabScene>
 *   );
 * }
 */
export function ValueTrail({
  target,
  sample,
  color = '#DC2626',
  width = 3,
  maxPoints = 90,
  sampleEvery = 0.05,
  running = true,
  resetKey,
  head = false,
  headSize = 0.1,
}: {
  /** Objet 3D à suivre (sa position monde est échantillonnée). */
  target?: RefObject<Object3D>;
  /** Alternative : fonction qui renvoie la position courante. */
  sample?: () => Vector3Tuple;
  color?: string;
  width?: number;
  /** Longueur de la trace (nombre de points conservés). */
  maxPoints?: number;
  /** Période d'échantillonnage en secondes. */
  sampleEvery?: number;
  running?: boolean;
  /** Change de valeur → la trace est effacée (nouvelle mesure, nouvel essai). */
  resetKey?: string | number;
  /** Affiche une petite sphère sur le point courant (si pas déjà dessiné). */
  head?: boolean;
  headSize?: number;
}) {
  const line = useRef<ElementRef<typeof Line>>(null);
  const dot = useRef<Mesh>(null);
  const cap = Math.max(2, Math.floor(maxPoints));
  const buffer = useMemo(() => new Float32Array(cap * 3), [cap]);
  const count = useRef(0);
  const acc = useRef(0);
  const tmp = useMemo(() => new Vector3(), []);
  const seed = useMemo<Vector3Tuple[]>(() => [[0, 0, 0], [0, 0, 0]], []);

  useEffect(() => {
    count.current = 0;
    acc.current = 0;
    if (line.current) line.current.visible = false;
  }, [resetKey, cap]);

  useFrame((_state, delta) => {
    if (!running) return;
    if (target?.current) target.current.getWorldPosition(tmp);
    else if (sample) tmp.fromArray(sample());
    else return;

    if (dot.current) dot.current.position.copy(tmp);

    acc.current += delta;
    if (acc.current < sampleEvery) return;
    acc.current = 0;

    const n = count.current;
    if (n > 0) {
      const dx = buffer[(n - 1) * 3] - tmp.x;
      const dy = buffer[(n - 1) * 3 + 1] - tmp.y;
      const dz = buffer[(n - 1) * 3 + 2] - tmp.z;
      if (dx * dx + dy * dy + dz * dz < 1e-8) return; // immobile : rien à tracer
    }
    if (n >= cap) {
      buffer.copyWithin(0, 3); // fenêtre glissante
      count.current = cap - 1;
    }
    const i = count.current * 3;
    buffer[i] = tmp.x;
    buffer[i + 1] = tmp.y;
    buffer[i + 2] = tmp.z;
    count.current += 1;

    if (count.current >= 2 && line.current) {
      line.current.geometry.setPositions(buffer.subarray(0, count.current * 3));
      line.current.visible = true;
    }
  });

  return (
    <>
      <Line ref={line} points={seed} color={color} lineWidth={width} visible={false} />
      {head && (
        <mesh ref={dot}>
          <sphereGeometry args={[headSize, 18, 14]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
        </mesh>
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 4. Mise en évidence — attirer l'œil au bon endroit
// ──────────────────────────────────────────────────────────────────────

/**
 * <FocusHalo> — halo qui respire autour de l'élément dont parle la consigne.
 * Deux anneaux déphasés (donc jamais d'instant « éteint ») + un cercle fixe
 * qui reste lisible même en plein soleil. Animation par mutation de refs.
 *
 * @example
 * <LabScene>
 *   <Atom element="O" position={[0, 0, 0]} />
 *   <FocusHalo position={[0, 0, 0]} radius={0.7} tone="chimie" label="L’atome d’oxygène" />
 * </LabScene>
 */
export function FocusHalo({
  position,
  radius = 0.55,
  tone = 'neutral',
  color,
  label,
  speed = 0.55,
  labelOffset = 0.35,
  distanceFactor = 8,
}: {
  position: Vector3Tuple;
  radius?: number;
  tone?: Tone;
  /** Couleur explicite (sinon dérivée du `tone`). */
  color?: string;
  /** Libellé : le repère ne doit pas être uniquement coloriel. */
  label?: string;
  /** Cycles par seconde. */
  speed?: number;
  labelOffset?: number;
  distanceFactor?: number;
}) {
  const t = TONE[tone];
  const hue = color ?? t.dot;
  const group = useRef<Group>(null);
  const ringA = useRef<Mesh>(null);
  const ringB = useRef<Mesh>(null);
  const matA = useRef<MeshBasicMaterial>(null);
  const matB = useRef<MeshBasicMaterial>(null);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    g.quaternion.copy(state.camera.quaternion); // toujours face à l'élève
    const base = (state.clock.elapsedTime * speed) % 1;
    const phase = [base, (base + 0.5) % 1];
    const meshes = [ringA.current, ringB.current];
    const mats = [matA.current, matB.current];
    for (let i = 0; i < 2; i++) {
      const p = phase[i];
      meshes[i]?.scale.setScalar(0.72 + 0.9 * p);
      if (mats[i]) mats[i]!.opacity = 0.55 * (1 - p);
    }
  });

  return (
    <group ref={group} position={position}>
      {/* anneau fixe : lisible même sur un écran délavé */}
      <mesh>
        <ringGeometry args={[radius * 0.93, radius, 56]} />
        <meshBasicMaterial color={hue} transparent opacity={0.85} side={DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={ringA}>
        <ringGeometry args={[radius * 0.9, radius, 56]} />
        <meshBasicMaterial ref={matA} color={hue} transparent opacity={0.5} side={DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={ringB}>
        <ringGeometry args={[radius * 0.9, radius, 56]} />
        <meshBasicMaterial ref={matB} color={hue} transparent opacity={0.25} side={DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      {label && (
        <Html position={[0, radius + labelOffset, 0]} center distanceFactor={distanceFactor} style={{ pointerEvents: 'none' }}>
          <span className="select-none whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 text-[11.5px] font-bold shadow-soft ring-1 ring-ink/10" style={{ color: hue }}>
            {label}
          </span>
        </Html>
      )}
    </group>
  );
}

const UP_AXIS = new Vector3(0, 1, 0);

/**
 * <Callout> — flèche d'appel : une bulle posée dans le vide, reliée par un
 * trait en pointillés à l'élément qu'elle nomme. Sert quand l'objet est trop
 * petit ou trop encombré pour porter une étiquette collée.
 *
 * @example
 * <LabScene>
 *   <Bulb position={[0, 0.4, 0]} on brightness={0.8} />
 *   <Callout
 *     at={[0, 0.4, 0]}
 *     to={[2.2, 1.6, 0]}
 *     label="Le filament chauffe"
 *     detail="C’est l’effet Joule : l’énergie électrique devient chaleur puis lumière."
 *     tone="physique"
 *   />
 * </LabScene>
 */
export function Callout({
  at,
  to,
  label,
  detail,
  tone = 'neutral',
  dashed = true,
  arrow = true,
  width = 200,
  distanceFactor = 10,
}: {
  /** Point visé (l'objet). */
  at: Vector3Tuple;
  /** Point où se pose la bulle. */
  to: Vector3Tuple;
  label: string;
  detail?: string;
  tone?: Tone;
  dashed?: boolean;
  arrow?: boolean;
  width?: number;
  distanceFactor?: number;
}) {
  const t = TONE[tone];
  const { quat, tip, length } = useMemo(() => {
    const a = new Vector3(...to);
    const b = new Vector3(...at);
    const dir = b.clone().sub(a);
    const len = dir.length() || 1e-6;
    const q = new Quaternion().setFromUnitVectors(UP_AXIS, dir.clone().normalize());
    const head = 0.18;
    const p = b.clone().sub(dir.clone().normalize().multiplyScalar(head / 2));
    return { quat: q, tip: p, length: len };
  }, [at, to]);

  return (
    <group>
      <Line points={[to, at]} color={t.dot} lineWidth={2} dashed={dashed} dashScale={10} transparent opacity={0.85} />
      {arrow && length > 0.05 && (
        <mesh position={[tip.x, tip.y, tip.z]} quaternion={quat}>
          <coneGeometry args={[0.07, 0.18, 16]} />
          <meshStandardMaterial color={t.dot} roughness={0.45} />
        </mesh>
      )}
      <Html position={to} center distanceFactor={distanceFactor} style={{ pointerEvents: 'none' }}>
        <div
          className={`select-none rounded-xl bg-white/95 px-2.5 py-1.5 shadow-card ring-1 ${t.ring}`}
          style={{ width, borderLeft: `4px solid ${t.dot}` }}
        >
          <div className={`text-[12.5px] font-bold leading-snug ${t.ink}`}>{label}</div>
          {detail && <div className="mt-0.5 text-[11.5px] font-medium leading-snug text-ink/65">{detail}</div>}
        </div>
      </Html>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 5. Comparateur côte à côte
// ──────────────────────────────────────────────────────────────────────

export type CompareValue = {
  label: string;
  value: number | string;
  unit?: string;
};

/**
 * <CompareCard> — cartouche « A vs B » : deux valeurs, leur écart, et un
 * verdict lisible. Mesuré vs attendu, avec vs sans traitement, théorie vs
 * expérience… L'écart est la vraie information : on l'affiche, on ne le
 * laisse pas calculer de tête.
 *
 * Accessibilité : chaque colonne porte un repère de forme (carré plein /
 * carré évidé) et le verdict porte un glyphe (✓ / △), jamais que la couleur.
 *
 * @example
 * <LabScene>
 *   <CompareCard
 *     position={[2.4, 1.8, 0]}
 *     title="Ta mesure et la théorie"
 *     left={{ label: 'Mesuré', value: 9.62, unit: 'm/s²' }}
 *     right={{ label: 'Attendu à Dakar', value: 9.78, unit: 'm/s²' }}
 *     tolerance={0.2}
 *     tone="physique"
 *   />
 * </LabScene>
 */
export function CompareCard({
  position,
  left,
  right,
  title = 'Comparaison',
  tone = 'neutral',
  precision = 2,
  deltaLabel = 'Écart',
  showPercent = true,
  tolerance,
  verdict,
  width = 250,
  distanceFactor = 11,
}: {
  position: Vector3Tuple;
  left: CompareValue;
  right: CompareValue;
  title?: string;
  tone?: Tone;
  precision?: number;
  deltaLabel?: string;
  /** Ajoute l'écart relatif en % (référence = colonne de gauche). */
  showPercent?: boolean;
  /** Si fourni, affiche « ✓ écart acceptable » ou « △ écart trop grand ». */
  tolerance?: number;
  /** Phrase de conclusion écrite par le TP (remplace le verdict auto). */
  verdict?: string;
  width?: number;
  distanceFactor?: number;
}) {
  const t = TONE[tone];
  const a = typeof left.value === 'number' ? left.value : null;
  const b = typeof right.value === 'number' ? right.value : null;
  const delta = a !== null && b !== null ? b - a : null;
  const percent = delta !== null && a !== null && a !== 0 ? (delta / Math.abs(a)) * 100 : null;
  const glyph = delta === null ? '' : delta > 0 ? '▲' : delta < 0 ? '▼' : '=';
  const ok = tolerance !== undefined && delta !== null ? Math.abs(delta) <= tolerance : null;

  const cell = (v: CompareValue, filled: boolean) => (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1">
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
          style={filled ? { background: t.dot } : { border: `2px solid ${t.dot}` }}
        />
        <span className="truncate text-[10px] font-bold uppercase tracking-wide text-ink/50">{v.label}</span>
      </div>
      <div className={`font-mono text-[15px] font-bold tabular-nums ${t.ink}`}>
        {typeof v.value === 'number' ? fr(v.value, precision) : v.value}
        {v.unit ? <span className="ml-0.5 text-[10.5px] font-semibold text-ink/50">{v.unit}</span> : null}
      </div>
    </div>
  );

  return (
    <Html position={position} center distanceFactor={distanceFactor} style={{ pointerEvents: 'none' }}>
      <div className={`select-none rounded-2xl bg-white/95 px-3 py-2 shadow-card ring-1 ${t.ring}`} style={{ width }}>
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink/50">{title}</div>
        <div className="mt-1 flex items-start gap-2">
          {cell(left, true)}
          <div className="mt-1 w-px self-stretch bg-ink/10" />
          {cell(right, false)}
        </div>
        {delta !== null && (
          <div className={`mt-1.5 flex items-baseline gap-1.5 rounded-lg px-2 py-1 ${t.soft}`}>
            <span aria-hidden className={`text-[11px] font-bold ${t.ink}`}>{glyph}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink/55">{deltaLabel}</span>
            <span className={`font-mono text-[13px] font-bold tabular-nums ${t.ink}`}>
              {delta > 0 ? '+' : ''}
              {fr(delta, precision)}
              {right.unit ? <span className="ml-0.5 text-[10px] font-semibold text-ink/50">{right.unit}</span> : null}
            </span>
            {showPercent && percent !== null && (
              <span className="font-mono text-[11px] font-semibold tabular-nums text-ink/55">
                ({percent > 0 ? '+' : ''}
                {fr(percent, 1)} %)
              </span>
            )}
          </div>
        )}
        {(verdict || ok !== null) && (
          <div
            className={`mt-1 rounded-lg px-2 py-1 text-[11.5px] font-semibold leading-snug ${
              ok === null ? 'bg-slate-100 text-ink/70' : ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
            }`}
          >
            <span aria-hidden className="mr-1 font-bold">{ok === null ? '•' : ok ? '✓' : '△'}</span>
            {verdict ?? (ok ? 'Écart acceptable : ta mesure confirme le modèle.' : 'Écart trop grand : reprends la mesure.')}
          </div>
        )}
      </div>
    </Html>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 6. Consigne d'observation & légende
// ──────────────────────────────────────────────────────────────────────

/**
 * <ObservationCue> — dit à l'élève OÙ regarder et QUOI chercher, dans la
 * scène elle-même (pas dans un paragraphe au-dessus qu'il ne lira pas).
 *
 * @example
 * <LabScene>
 *   <ObservationCue
 *     position={[0, 2.4, 0]}
 *     tone="chimie"
 *     text="Surveille la couleur du bécher au moment où la goutte tombe."
 *     question="À ton avis, pourquoi la couleur change-t-elle d’un coup ?"
 *   />
 * </LabScene>
 */
export function ObservationCue({
  position,
  text,
  question,
  badge = 'À observer',
  tone = 'neutral',
  width = 260,
  distanceFactor = 12,
}: {
  position: Vector3Tuple;
  text: string;
  /** Question ouverte affichée sous la consigne. */
  question?: string;
  badge?: string;
  tone?: Tone;
  width?: number;
  distanceFactor?: number;
}) {
  const t = TONE[tone];
  return (
    <Html position={position} center distanceFactor={distanceFactor} style={{ pointerEvents: 'none' }}>
      <div
        className={`select-none rounded-2xl bg-white/95 px-3 py-2 shadow-card ring-1 ${t.ring}`}
        style={{ width, borderLeft: `4px solid ${t.dot}` }}
      >
        <span className={`inline-block rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ring-1 ${t.soft} ${t.ink} ${t.chipRing}`}>
          {badge}
        </span>
        <p className="mt-1 text-[12.5px] font-semibold leading-snug text-ink">{text}</p>
        {question && (
          <p className="mt-1 flex gap-1.5 text-[11.5px] font-medium italic leading-snug text-ink/65">
            <span aria-hidden className={`not-italic font-bold ${t.ink}`}>?</span>
            {question}
          </p>
        )}
      </div>
    </Html>
  );
}

export type LegendItem = {
  label: string;
  color: string;
  /** Repère de forme : ne jamais distinguer deux séries par la seule couleur. */
  shape?: 'dot' | 'ring' | 'square' | 'triangle' | 'dash' | 'dashed';
  note?: string;
};

function LegendGlyph({ item }: { item: LegendItem }) {
  const shape = item.shape ?? 'dot';
  const base = 'inline-block shrink-0';
  if (shape === 'triangle') {
    return (
      <span
        aria-hidden
        className={base}
        style={{
          width: 0,
          height: 0,
          marginTop: 3,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: `11px solid ${item.color}`,
        }}
      />
    );
  }
  if (shape === 'square') {
    return <span aria-hidden className={`${base} h-3 w-3 rounded-[2px]`} style={{ background: item.color, marginTop: 2 }} />;
  }
  if (shape === 'ring') {
    return <span aria-hidden className={`${base} h-3 w-3 rounded-full`} style={{ border: `2.5px solid ${item.color}`, marginTop: 2 }} />;
  }
  if (shape === 'dash') {
    return <span aria-hidden className={`${base} h-1 w-4 rounded-full`} style={{ background: item.color, marginTop: 7 }} />;
  }
  if (shape === 'dashed') {
    return (
      <span
        aria-hidden
        className={`${base} h-1 w-4 rounded-full`}
        style={{
          marginTop: 7,
          backgroundImage: `repeating-linear-gradient(90deg, ${item.color} 0 4px, transparent 4px 7px)`,
        }}
      />
    );
  }
  return <span aria-hidden className={`${base} h-3 w-3 rounded-full`} style={{ background: item.color, marginTop: 2 }} />;
}

/**
 * <LegendCard> — légende des couleurs ET des formes de la scène. Sans elle,
 * un élève daltonien (ou un écran délavé au soleil) perd l'information.
 *
 * @example
 * <LabScene>
 *   <LegendCard
 *     position={[2.6, -1, 0]}
 *     tone="svt"
 *     items={[
 *       { label: 'Sang riche en dioxygène', color: '#DC2626', shape: 'dot' },
 *       { label: 'Sang pauvre en dioxygène', color: '#2563EB', shape: 'ring' },
 *       { label: 'Trajet sans traitement', color: '#94A3B8', shape: 'dashed', note: 'témoin' },
 *     ]}
 *   />
 * </LabScene>
 */
export function LegendCard({
  position,
  items,
  title = 'Légende',
  tone = 'neutral',
  width = 216,
  distanceFactor = 11,
}: {
  position: Vector3Tuple;
  items: readonly LegendItem[];
  title?: string;
  tone?: Tone;
  width?: number;
  distanceFactor?: number;
}) {
  const t = TONE[tone];
  if (items.length === 0) return null;
  return (
    <Html position={position} center distanceFactor={distanceFactor} style={{ pointerEvents: 'none' }}>
      <div className={`select-none rounded-2xl bg-white/95 px-3 py-2 shadow-card ring-1 ${t.ring}`} style={{ width }}>
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink/50">{title}</div>
        <ul className="mt-1 space-y-1">
          {items.map((it, i) => (
            <li key={`${i}-${it.label}`} className="flex items-start gap-2">
              <LegendGlyph item={it} />
              <span className="text-[11.5px] font-semibold leading-snug text-ink/80">
                {it.label}
                {it.note ? <span className="ml-1 text-[10.5px] font-medium text-ink/50">({it.note})</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Html>
  );
}
