'use client';

import { useMemo, useRef, useState } from 'react';
import { Group, Mesh, type Vector3Tuple } from 'three';
import {
  LabScene,
  Wire,
  PolyLine,
  Arrow3D,
  SceneLabel,
  Tag3D,
  Readout,
  Animate,
  // ── pédagogie ────────────────────────────────────────────────────────
  AutoNarration,
  useStepClock,
  GhostState,
  DimGroup,
  ValueTrail,
  FocusHalo,
  Callout,
  CompareCard,
  ObservationCue,
  LegendCard,
  // ── mouvement ────────────────────────────────────────────────────────
  Timeline,
  AlongPath,
  Float,
  damp,
  damp3,
  ease,
  easeInOut,
  easeOut,
  easeOutBack,
  easeOutBounce,
  mix,
  clamp01,
  fbm1D,
  noise1D,
  goldenPhase,
} from '@/components/lab3d';

/**
 * Scène 3D — les défenses de l'organisme (SVT, 3ème).
 *
 * Quatre planches, comme dans le manuel, toutes centrées sur les CELLULES
 * (aucun personnage humain n'est représenté) :
 *
 *  • « barriere »    : coupe de peau (couche cornée, épiderme, derme, vaisseau).
 *                      Peau intacte → les microbes restent dehors. Plaie souillée
 *                      de sable → ils entrent, la zone s'enflamme et les phagocytes
 *                      sortent du vaisseau (diapédèse). 1re ligne, NON spécifique.
 *                      La peau d'avant l'éraflure reste en <GhostState> pour que
 *                      l'élève voie ce qui a été détruit.
 *
 *  • « phagocytose » : les 4 temps de la phagocytose (adhésion, ingestion,
 *                      digestion dans la vacuole avec les lysosomes, rejet des
 *                      débris) joués par UN macrophage, pilotés par une
 *                      <Timeline> et commentés en direct par <AutoNarration>
 *                      (« 2/4 — Il entoure la bactérie de ses pseudopodes »).
 *                      2e ligne, NON spécifique, rapide, sans mémoire.
 *
 *  • « specifique »  : lymphocyte B → plasmocyte → anticorps en Y qui se fixent
 *                      sur les antigènes du microbe A, mais PAS sur ceux du
 *                      microbe B (spécificité). Lymphocyte T qui détruit une
 *                      cellule infectée. Le nombre d'anticorps suit le taux réel.
 *                      La consigne tourne d'une cellule à l'autre : <DimGroup>
 *                      éteint le reste, <FocusHalo> désigne celle dont on parle.
 *
 *  • « memoire »     : courbes du taux d'anticorps. Elles se CONSTRUISENT au fil
 *                      du curseur (<ValueTrail>), la réponse primaire reste en
 *                      trace (<GhostState>) pendant qu'on lit la secondaire, et
 *                      deux <CompareCard> chiffrent l'écart (J9 → J3, pic ×9).
 *
 * Règle R3F : tout ce qui anime (Timeline, Float, AlongPath, AutoNarration,
 * ValueTrail, FocusHalo, Animate) est ENFANT de <LabScene>, jamais dans le
 * composant qui retourne <LabScene>. Aucun Math.random() : le hasard vient de
 * `noise1D` / `fbm1D` / `goldenPhase`, donc la scène est reproductible.
 */

export type ImmuneView = 'barriere' | 'phagocytose' | 'specifique' | 'memoire';

export type ImmuneSceneProps = {
  view: ImmuneView;
  /** Vue barrière : peau saine ou plaie souillée. */
  peauIntacte: boolean;
  /** false = 1re rencontre avec l'antigène ; true = après le rappel du vaccin. */
  rappel: boolean;
  /** Jour après le contact avec le microbe (0 → 28). */
  jour: number;
  /** Taux d'anticorps au jour choisi, en unités arbitraires. */
  taux: number;
  /** Premier jour où la réponse primaire dépasse le seuil de protection. */
  protPrim?: number | null;
  /** Premier jour où la réponse secondaire dépasse le seuil de protection. */
  protSec?: number | null;
  /** Pic d'anticorps de la réponse primaire (u.a.). */
  picPrim?: number;
  /** Pic d'anticorps de la réponse secondaire (u.a.). */
  picSec?: number;
};

// ── Modèle du taux d'anticorps (identique à celui du module) ─────────────
const PRIM = { lag: 5, peak: 14, amp: 15, res: 0.05, tau: 6 };
const SEC = { lag: 2, peak: 7, amp: 120, res: 0.15, tau: 3 };

function titre(jour: number, rappel: boolean) {
  const p = rappel ? SEC : PRIM;
  const t = jour - p.lag;
  if (t <= 0) return 0;
  const tp = p.peak - p.lag;
  const r = t / tp;
  return p.amp * r * r * Math.exp(2 * (1 - r)) + p.amp * p.res * (1 - Math.exp(-t / p.tau));
}

const SEUIL = 8; // u.a. — seuil de protection

// ── Palette : une couleur ET une forme par type cellulaire ──────────────
const C_HEMATIE = '#DC2626';
const C_PHAGOCYTE = '#93A9CE';
const C_BACTERIE = '#166534';
const C_ANTICORPS = '#7C3AED';
const C_LYMPHO_B = '#8B5CF6';
const C_LYMPHO_T = '#2563EB';
const C_LYSOSOME = '#22C55E';
const C_SABLE = '#B08D57';

/** Point d'une courbe de Bézier quadratique (trajet cellulaire courbe). */
function bez2(a: Vector3Tuple, b: Vector3Tuple, c: Vector3Tuple, s: number): Vector3Tuple {
  const u = 1 - s;
  return [
    u * u * a[0] + 2 * u * s * b[0] + s * s * c[0],
    u * u * a[1] + 2 * u * s * b[1] + s * s * c[1],
    u * u * a[2] + 2 * u * s * b[2] + s * s * c[2],
  ];
}

// ════════════════════════════════════════════════════════════════════════
// Briques réutilisables
// ════════════════════════════════════════════════════════════════════════

/** Anticorps en Y : deux bras (sites de fixation) + une tige. */
function Anticorps({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  color = C_ANTICORPS,
}: {
  position: Vector3Tuple;
  rotation?: [number, number, number];
  scale?: number;
  color?: string;
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, -0.2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.4, 12]} />
        <meshStandardMaterial color={color} roughness={0.35} />
      </mesh>
      <mesh position={[-0.11, 0.12, 0]} rotation={[0, 0, Math.PI / 5]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.36, 12]} />
        <meshStandardMaterial color={color} roughness={0.35} />
      </mesh>
      <mesh position={[0.11, 0.12, 0]} rotation={[0, 0, -Math.PI / 5]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.36, 12]} />
        <meshStandardMaterial color={color} roughness={0.35} />
      </mesh>
      <mesh position={[-0.21, 0.28, 0]}>
        <sphereGeometry args={[0.062, 12, 10]} />
        <meshStandardMaterial color="#EDE9FE" roughness={0.3} />
      </mesh>
      <mesh position={[0.21, 0.28, 0]}>
        <sphereGeometry args={[0.062, 12, 10]} />
        <meshStandardMaterial color="#EDE9FE" roughness={0.3} />
      </mesh>
    </group>
  );
}

/** Bactérie en bâtonnet (microbe). */
function Bacterie({ position, scale = 1, color = C_BACTERIE }: { position: Vector3Tuple; scale?: number; color?: string }) {
  return (
    <group position={position} scale={scale}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.13, 0.3, 6, 16]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
      <mesh position={[0.3, 0.02, 0.09]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#4ADE80" roughness={0.5} />
      </mesh>
      <mesh position={[-0.3, -0.02, -0.09]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#4ADE80" roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Hématie (globule rouge) : disque biconcave, vu de face. */
function Hematie({ scale = 1 }: { scale?: number }) {
  return (
    <mesh scale={[scale, scale, scale * 0.45]} castShadow>
      <torusGeometry args={[0.13, 0.085, 10, 22]} />
      <meshStandardMaterial color={C_HEMATIE} roughness={0.45} />
    </mesh>
  );
}

/** Petit phagocyte circulant (granulocyte sorti du vaisseau). */
function Phagocyte() {
  return (
    <group>
      <mesh castShadow>
        <sphereGeometry args={[0.24, 18, 14]} />
        <meshStandardMaterial color="#F8FAFF" roughness={0.45} />
      </mesh>
      {([0, 1, 2, 3] as number[]).map((i) => {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0.05]}>
            <sphereGeometry args={[0.1, 10, 8]} />
            <meshStandardMaterial color="#F8FAFF" roughness={0.45} />
          </mesh>
        );
      })}
      <mesh position={[0, 0, 0.14]}>
        <sphereGeometry args={[0.11, 12, 10]} />
        <meshStandardMaterial color={C_PHAGOCYTE} roughness={0.6} />
      </mesh>
    </group>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Vue 1 — la barrière cutanée
// ════════════════════════════════════════════════════════════════════════

const SKIN_COLS = 11;
const SKIN_X0 = -4.4;
const SKIN_STEP = 0.88;
const SKIN_Z = 1.6;
const ROWS: { y: number; h: number; color: string }[] = [
  { y: 1.44, h: 0.16, color: '#E6D5BE' }, // couche cornée (cellules mortes, aplaties)
  { y: 1.16, h: 0.3, color: '#F7CBBB' },
  { y: 0.82, h: 0.32, color: '#F2B9A6' },
  { y: 0.44, h: 0.36, color: '#E39A8B' }, // couche basale
];

const VESSEL: Vector3Tuple[] = [
  [-6.6, -1.1, 0.82],
  [-4.9, -0.95, 0.82],
  [-2.9, -0.6, 0.82],
  [-1.0, -1.1, 0.82],
  [0.9, -0.62, 0.82],
  [2.9, -1.05, 0.82],
  [4.9, -0.72, 0.82],
  [6.6, -0.95, 0.82],
];

/** Trajet du sang : mêmes points, ramenés devant la paroi pour rester visibles. */
const FLUX: Vector3Tuple[] = VESSEL.map((p) => [p[0], p[1], 1.02] as Vector3Tuple);

const GERM_HOME: Vector3Tuple[] = [
  [-0.9, 2.35, 0.45],
  [0.35, 2.75, 0.15],
  [1.1, 2.3, 0.5],
  [-3.1, 2.5, 0.3],
  [-2.0, 2.95, 0.55],
  [2.6, 2.6, 0.2],
  [3.7, 2.3, 0.5],
];

const SABLE: Vector3Tuple[] = [
  [-0.62, 0.58, 0.5],
  [-0.15, 0.45, 0.15],
  [0.28, 0.62, 0.55],
  [0.66, 0.42, 0.1],
  [-0.35, 0.7, -0.2],
  [0.1, 0.36, 0.62],
];

/** Colonnes de cellules de l'épiderme (mode = tout / seulement la plaie / sauf la plaie). */
function SkinColumns({ xs, mode }: { xs: number[]; mode: 'all' | 'wound' | 'skin' }) {
  return (
    <>
      {ROWS.map((r, ri) =>
        xs.map((x) => {
          const inWound = Math.abs(x) < 1.05;
          if (mode === 'wound' && !inWound) return null;
          if (mode === 'skin' && inWound) return null;
          return (
            <mesh key={`${ri}-${x}`} position={[x, r.y, 0]} castShadow>
              <boxGeometry args={[0.8, r.h, SKIN_Z]} />
              <meshStandardMaterial color={r.color} roughness={0.75} />
            </mesh>
          );
        }),
      )}
    </>
  );
}

function BarriereView({ peauIntacte }: { peauIntacte: boolean }) {
  const germs = useRef<Group>(null);
  const phagos = useRef<Group>(null);
  const rbc0 = useRef<Group>(null);
  const rbc1 = useRef<Group>(null);
  const rbc2 = useRef<Group>(null);

  const cols = useMemo(() => Array.from({ length: SKIN_COLS }, (_, i) => SKIN_X0 + i * SKIN_STEP), []);
  const proches = useMemo(() => cols.filter((x) => Math.abs(x) < 2.4), [cols]);
  const lointaines = useMemo(() => cols.filter((x) => Math.abs(x) >= 2.4), [cols]);

  return (
    <group>
      {/* Hypoderme (tissu graisseux) + derme */}
      <mesh position={[0, -2.1, 0]} castShadow>
        <boxGeometry args={[9.9, 0.55, SKIN_Z]} />
        <meshStandardMaterial color="#F5E2A6" roughness={0.85} />
      </mesh>
      <mesh position={[0, -0.83, 0]} castShadow>
        <boxGeometry args={[9.9, 2.0, SKIN_Z]} />
        <meshStandardMaterial color="#EFA79C" roughness={0.8} />
      </mesh>

      {/* Vaisseau sanguin du derme — dilaté quand la zone s'enflamme */}
      <Wire points={VESSEL} color="#B91C1C" radius={peauIntacte ? 0.2 : 0.27} />

      {/* Hématies emportées par le courant : trajet lisse, vitesse régulière */}
      <group ref={rbc0}>
        <Hematie scale={0.78} />
      </group>
      <group ref={rbc1}>
        <Hematie scale={0.7} />
      </group>
      <group ref={rbc2}>
        <Hematie scale={0.84} />
      </group>
      <AlongPath objectRef={rbc0} points={FLUX} duration={11} loop offset={0} />
      <AlongPath objectRef={rbc1} points={FLUX} duration={11} loop offset={0.34} />
      <AlongPath objectRef={rbc2} points={FLUX} duration={11} loop offset={0.67} />

      {/* Épiderme — les colonnes éloignées s'effacent quand la plaie est ouverte */}
      <DimGroup dimmed={!peauIntacte} opacity={0.34}>
        <SkinColumns xs={lointaines} mode="all" />
      </DimGroup>
      <SkinColumns xs={proches} mode={peauIntacte ? 'all' : 'skin'} />

      {peauIntacte ? (
        /* Film gras + flore microbienne de surface : une protection en plus */
        <mesh position={[0, 1.58, 0]}>
          <boxGeometry args={[9.7, 0.07, SKIN_Z]} />
          <meshStandardMaterial color="#FDE68A" roughness={0.3} transparent opacity={0.75} />
        </mesh>
      ) : (
        <>
          {/* Ce que l'éraflure a emporté : la peau d'avant, en fil de fer */}
          <GhostState
            opacity={0.18}
            wireframe
            tone="neutral"
            caption="Peau avant l'éraflure"
            captionPosition={[0, 2.02, 0]}
          >
            <SkinColumns xs={proches} mode="wound" />
          </GhostState>

          {/* Fond de la plaie : derme mis à nu */}
          <mesh position={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[2.62, 0.28, SKIN_Z]} />
            <meshStandardMaterial color="#C0554C" roughness={0.85} />
          </mesh>
          {/* Grains de sable du terrain de foot */}
          {SABLE.map((p, i) => (
            <mesh key={i} position={p} castShadow>
              <dodecahedronGeometry args={[0.11, 0]} />
              <meshStandardMaterial color={i % 2 ? C_SABLE : '#D6B370'} roughness={0.95} />
            </mesh>
          ))}
          {/* Inflammation : rougeur et chaleur autour de la plaie */}
          <mesh position={[0, 0.7, 0]} scale={[1.9, 1.15, 1.0]}>
            <sphereGeometry args={[1.25, 24, 18]} />
            <meshStandardMaterial color="#EF4444" emissive="#B91C1C" emissiveIntensity={0.5} transparent opacity={0.2} />
          </mesh>
          {/* Phagocytes qui quittent le vaisseau et gagnent la plaie (diapédèse) */}
          <group ref={phagos}>
            {([0, 1, 2] as number[]).map((i) => (
              <group key={i}>
                <Phagocyte />
              </group>
            ))}
          </group>
          <FocusHalo position={[0, 0.62, 0.95]} radius={1.35} tone="svt" label="La porte d'entrée" speed={0.45} />
        </>
      )}

      {/* Microbes au-dessus de la peau */}
      <group ref={germs}>
        {GERM_HOME.map((p, i) => (
          <Bacterie key={i} position={p} scale={0.95} color={i % 2 ? C_BACTERIE : '#7E22CE'} />
        ))}
      </group>

      <Animate
        fn={(state, delta) => {
          const t = state.clock.elapsedTime;
          const dt = delta;

          const g = germs.current;
          if (g) {
            g.children.forEach((c, i) => {
              const base = GERM_HOME[i];
              const ph = goldenPhase(i);
              if (peauIntacte || i > 2) {
                // Flottement déterministe : le microbe dérive, il ne glisse pas.
                damp3(
                  c.position,
                  [
                    base[0] + 0.34 * fbm1D(t * 0.34 + ph * 7, i * 13, 3),
                    base[1] + 0.24 * fbm1D(t * 0.29 + ph * 11, i * 13 + 5, 3),
                    base[2] + 0.18 * fbm1D(t * 0.31 + ph * 3, i * 13 + 9, 2),
                  ],
                  3.2,
                  dt,
                );
                c.rotation.z = damp(c.rotation.z, 0.6 * noise1D(t * 0.45 + ph * 4, i), 2.4, dt);
                c.visible = true;
              } else {
                const u = (t * 0.2 + ph) % 1;
                if (u < 0.04) c.position.set(base[0], base[1], base[2]);
                const s = easeInOut(clamp01(u / 0.88));
                damp3(
                  c.position,
                  [
                    mix(base[0], -0.42 + i * 0.46, s) + 0.09 * fbm1D(t * 0.8 + ph * 5, i * 7, 2),
                    mix(base[1], 0.44, s),
                    mix(base[2], 0.55, s),
                  ],
                  5,
                  dt,
                );
                c.rotation.z += dt * 1.7;
                c.visible = u < 0.94;
              }
            });
          }

          const p = phagos.current;
          if (p) {
            p.children.forEach((c, i) => {
              const ph = goldenPhase(i * 3 + 1);
              const u = (t * 0.13 + ph) % 1;
              const a: Vector3Tuple = [-2.3 + i * 1.75, -0.8 - 0.08 * i, 1.0];
              if (u < 0.04) c.position.set(a[0], a[1], a[2]);
              const s = easeInOut(clamp01(u / 0.86));
              const b: Vector3Tuple = [-1.1 + i * 0.95, -0.22, 0.98];
              const q: Vector3Tuple = [-0.6 + i * 0.58, 0.52, 0.88];
              const target = bez2(a, b, q, s);
              // damp3 = inertie : la cellule met un instant à rejoindre sa cible.
              damp3(c.position, target, 4.4, dt);
              c.scale.setScalar(0.86 + 0.15 * noise1D(t * 1.5 + ph * 5, i));
              c.visible = u < 0.95;
            });
          }
        }}
      />

      <Tag3D position={[-5.7, 1.52, 0]} label="Couche cornée" tone="neutral" />
      <Tag3D position={[-5.7, 0.82, 0]} label="Épiderme" tone="svt" />
      <Tag3D position={[-5.7, -0.85, 0]} label="Derme" tone="svt" />
      <Tag3D position={[4.6, -1.85, 0]} label="Vaisseau sanguin" tone="physique" />
      {peauIntacte ? (
        <>
          <Tag3D position={[0, 1.95, 0]} label="Barrière intacte : les microbes restent dehors" tone="svt" />
          <Tag3D position={[3.9, 1.85, 0]} label="Film gras + sueur acide" tone="neutral" />
        </>
      ) : (
        <>
          <Tag3D position={[-3.0, 1.55, 0]} label="Plaie : les microbes passent" tone="physique" />
          <Tag3D position={[3.0, 1.55, 0]} label="Inflammation : rougeur, chaleur, gonflement" tone="physique" />
          <Tag3D position={[1.9, -2.6, 0]} label="Diapédèse : les phagocytes sortent du vaisseau" tone="svt" />
        </>
      )}

      <ObservationCue
        position={[4.3, 3.45, 0]}
        distanceFactor={10}
        tone="svt"
        badge="À observer"
        text={
          peauIntacte
            ? 'Suis un microbe au-dessus de la peau : il tourne, mais il ne descend jamais plus bas que la couche cornée.'
            : "Suis un phagocyte : il quitte le vaisseau, traverse le derme et monte jusqu'à la plaie."
        }
        question={peauIntacte ? 'Qu’est-ce qui l’empêche d’entrer ?' : 'Qui l’a appelé jusque-là ?'}
        width={240}
      />

      <LegendCard
        position={[-4.7, -3.5, 0]}
        distanceFactor={10}
        tone="svt"
        title="Qui est qui ?"
        items={[
          { label: 'Hématie (globule rouge)', color: C_HEMATIE, shape: 'ring', note: 'disque' },
          { label: 'Phagocyte', color: C_PHAGOCYTE, shape: 'dot', note: 'rond bosselé' },
          { label: 'Bactérie', color: C_BACTERIE, shape: 'dash', note: 'bâtonnet' },
          { label: 'Grain de sable', color: C_SABLE, shape: 'triangle' },
        ]}
        width={216}
      />

      <SceneLabel
        position={[0, 3.75, 0]}
        title={peauIntacte ? 'Peau intacte : rien ne passe' : 'Plaie souillée de sable : les microbes entrent'}
        subtitle="1re ligne de défense · non spécifique"
        tone="svt"
      />
    </group>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Vue 2 — la phagocytose en 4 temps (Timeline + AutoNarration synchronisées)
// ════════════════════════════════════════════════════════════════════════

/**
 * Les durées de la <Timeline> et les `hold` de l'<AutoNarration> sont les
 * MÊMES : le commentaire dit toujours ce que l'image est en train de montrer.
 * À chaque tour, `onStepChange(0)` incrémente `cycle`, qui sert de `restartKey`
 * à la timeline : les deux horloges se recalent, aucune dérive ne s'accumule.
 */
const PHAGO_HOLDS = [3.6, 3.6, 4.6, 3.6];
const PHAGO_PHASES = [
  { name: 'adhesion', duration: PHAGO_HOLDS[0] },
  { name: 'ingestion', duration: PHAGO_HOLDS[1] },
  { name: 'digestion', duration: PHAGO_HOLDS[2] },
  { name: 'rejet', duration: PHAGO_HOLDS[3] },
];

const PHAGO_STEPS = [
  {
    label: 'Le macrophage reconnaît la bactérie et s’y colle',
    detail: 'Ses récepteurs se fixent sur la paroi du microbe : c’est l’adhésion.',
    hold: PHAGO_HOLDS[0],
  },
  {
    label: 'Il entoure la bactérie de ses pseudopodes',
    detail: 'La membrane s’étire, les deux bras se referment : c’est l’ingestion.',
    hold: PHAGO_HOLDS[1],
  },
  {
    label: 'Il digère la bactérie dans une vacuole',
    detail: 'Les lysosomes viennent y déverser leurs enzymes : le microbe est détruit.',
    hold: PHAGO_HOLDS[2],
  },
  {
    label: 'Il rejette les débris dehors',
    detail: 'Le macrophage est prêt à recommencer. Il ne garde aucun souvenir du microbe.',
    hold: PHAGO_HOLDS[3],
  },
];

/** Bosses du grand macrophage (le même dessin, à l'échelle de la planche). */
const PHAGO_BUMPS: Vector3Tuple[] = [
  [0.94, 0.48, 0.17],
  [0.28, 0.99, -0.26],
  [-0.6, 0.85, 0.28],
  [-1.02, 0.07, -0.14],
  [-0.71, -0.78, 0.26],
  [0.17, -1.02, -0.21],
  [0.91, -0.51, 0.2],
];

const B_START: Vector3Tuple = [3.35, 1.05, 0.45];
const B_CONTACT: Vector3Tuple = [1.48, 0.22, 0.55];
const B_VAC: Vector3Tuple = [0.28, 0.05, 0.62];
const LYSO_C: Vector3Tuple = [-0.5, -0.18, 0.35];
const DEBRIS_OUT: Vector3Tuple = [1.05, -0.55, 0.5];

/** Décor : quelques hématies qui passent derrière, volontairement estompées. */
const RBC_HOME: Vector3Tuple[] = [
  [-4.3, 1.9, -1.6],
  [-3.2, -1.9, -1.4],
  [3.6, 2.2, -1.7],
  [4.2, -1.5, -1.3],
  [-0.4, 2.6, -1.8],
];

function PhagoView() {
  const [etape, setEtape] = useState(0);
  const [cycle, setCycle] = useState(0);
  const premier = useRef(true);

  const cellule = useRef<Group>(null);
  const corps = useRef<Mesh>(null);
  const bras1 = useRef<Group>(null);
  const bras2 = useRef<Group>(null);
  const bact = useRef<Group>(null);
  const vacuole = useRef<Mesh>(null);
  const lyso = useRef<Group>(null);
  const debris = useRef<Group>(null);
  const hematies = useRef<Group>(null);
  const angleBras = useRef(0.1);

  const halo: { pos: Vector3Tuple; r: number; label: string }[] = [
    { pos: [2.4, 0.62, 0.5], r: 0.62, label: 'La bactérie adhère' },
    { pos: [1.15, 0.05, 0.4], r: 0.95, label: 'Les pseudopodes' },
    { pos: [0.28, 0.05, 0.6], r: 0.78, label: 'La vacuole digestive' },
    { pos: [2.1, -0.95, 0.5], r: 0.8, label: 'Les débris rejetés' },
  ];
  const h = halo[Math.min(etape, 3)];

  return (
    <group>
      {/* Décor : le plasma et ses hématies passent derrière, en retrait */}
      <DimGroup dimmed opacity={0.2}>
        <group ref={hematies}>
          {RBC_HOME.map((p, i) => (
            <group key={i} position={p}>
              <Hematie scale={1.1} />
            </group>
          ))}
        </group>
      </DimGroup>

      <group ref={cellule}>
        {/* Cytoplasme + noyau : ils deviennent translucides dès que l'action se
            passe À L'INTÉRIEUR (ingestion, puis digestion), pour laisser voir la
            bactérie, la vacuole et les lysosomes. */}
        <DimGroup dimmed={etape === 1 || etape === 2} opacity={etape === 2 ? 0.24 : 0.4}>
          <mesh ref={corps} castShadow>
            <sphereGeometry args={[1.02, 34, 24]} />
            <meshStandardMaterial color="#E4EEFF" roughness={0.5} />
          </mesh>
          {PHAGO_BUMPS.map((b, i) => (
            <mesh key={i} position={b} castShadow>
              <sphereGeometry args={[0.37, 18, 14]} />
              <meshStandardMaterial color="#E4EEFF" roughness={0.5} />
            </mesh>
          ))}
          <mesh position={[-0.26, -0.14, 0.5]} scale={[1.3, 0.85, 0.6]}>
            <sphereGeometry args={[0.42, 22, 16]} />
            <meshStandardMaterial color="#5B7FB4" roughness={0.55} />
          </mesh>

          {/* Pseudopodes : deux bras montés sur pivot, ils se referment */}
          <group ref={bras1} position={[0.85, 0.62, 0.35]}>
            <mesh position={[0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <capsuleGeometry args={[0.2, 0.66, 6, 16]} />
              <meshStandardMaterial color="#E4EEFF" roughness={0.5} />
            </mesh>
          </group>
          <group ref={bras2} position={[0.85, -0.62, 0.35]}>
            <mesh position={[0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <capsuleGeometry args={[0.2, 0.66, 6, 16]} />
              <meshStandardMaterial color="#E4EEFF" roughness={0.5} />
            </mesh>
          </group>
        </DimGroup>

        {/* Vacuole digestive */}
        <mesh ref={vacuole} position={B_VAC} visible={false}>
          <sphereGeometry args={[0.52, 24, 18]} />
          <meshStandardMaterial color="#BFDBFE" roughness={0.2} transparent opacity={0.5} />
        </mesh>

        {/* Lysosomes */}
        <group ref={lyso}>
          {([0, 1, 2, 3] as number[]).map((i) => (
            <mesh key={i}>
              <sphereGeometry args={[0.15, 14, 12]} />
              <meshStandardMaterial color={C_LYSOSOME} emissive="#15803D" emissiveIntensity={0.8} />
            </mesh>
          ))}
        </group>

        {/* La bactérie : elle fait tout le voyage */}
        <group ref={bact} position={B_START}>
          <Bacterie position={[0, 0, 0]} scale={1.25} />
        </group>

        {/* Débris rejetés */}
        <group ref={debris}>
          {([0, 1, 2, 3, 4] as number[]).map((i) => (
            <mesh key={i} visible={false}>
              <dodecahedronGeometry args={[0.12, 0]} />
              <meshStandardMaterial color="#8A6B4F" roughness={0.85} />
            </mesh>
          ))}
        </group>
      </group>

      {/* Le macrophage n'est jamais immobile : micro-dérive déterministe */}
      <Float objectRef={cellule} amplitude={0.055} speed={0.32} seed={4} rotation={0.02} base={[0, 0, 0]} />

      {/* Le chemin parcouru par le microbe reste visible */}
      <ValueTrail target={bact} color={C_BACTERIE} width={2.5} maxPoints={90} sampleEvery={0.06} resetKey={cycle} />

      <Timeline
        phases={PHAGO_PHASES}
        loop
        restartKey={cycle}
        onFrame={(f, state, delta) => {
          const t = state.clock.elapsedTime;
          const dt = delta;
          const i = f.index;
          const p = f.raw;

          // ── 1. la bactérie ────────────────────────────────────────────
          const b = bact.current;
          if (b) {
            if (i === 0) {
              const s = easeInOut(p);
              b.position.set(
                mix(B_START[0], B_CONTACT[0], s),
                mix(B_START[1], B_CONTACT[1], s),
                mix(B_START[2], B_CONTACT[2], s),
              );
              b.scale.setScalar(1);
              b.rotation.z = 0.7 * noise1D(t * 0.7, 21);
              b.visible = true;
            } else if (i === 1) {
              const s = easeOut(p);
              b.position.set(
                mix(B_CONTACT[0], B_VAC[0], s),
                mix(B_CONTACT[1], B_VAC[1], s),
                mix(B_CONTACT[2], B_VAC[2], s),
              );
              b.scale.setScalar(mix(1, 0.92, s));
              b.rotation.z += dt * 0.9;
              b.visible = true;
            } else if (i === 2) {
              const s = clamp01((p - 0.12) / 0.78);
              b.position.set(
                B_VAC[0] + 0.05 * noise1D(t * 2.1, 3),
                B_VAC[1] + 0.05 * noise1D(t * 1.9, 7),
                B_VAC[2],
              );
              b.scale.setScalar(mix(0.92, 0.06, easeInOut(s)));
              b.rotation.z += dt * (1.4 + 3.2 * s);
              b.visible = s < 0.99;
            } else {
              b.visible = false;
            }
          }

          // ── 2. les pseudopodes ────────────────────────────────────────
          const cible =
            i === 0
              ? ease(0.1, 0.32, p, easeInOut)
              : i === 1
                ? ease(0.32, 1.2, p, easeOutBack)
                : i === 2
                  ? ease(1.2, 0.24, p, easeInOut)
                  : ease(0.24, 0.1, p, easeInOut);
          // damp = inertie : les bras n'atteignent leur pose qu'après un instant.
          angleBras.current = damp(angleBras.current, cible, 11, dt);
          const a = angleBras.current;
          if (bras1.current) {
            bras1.current.rotation.z = -a;
            bras1.current.scale.setScalar(1 + 0.16 * clamp01(a));
          }
          if (bras2.current) {
            bras2.current.rotation.z = a;
            bras2.current.scale.setScalar(1 + 0.16 * clamp01(a));
          }

          // ── 3. la membrane respire ────────────────────────────────────
          if (corps.current) {
            corps.current.scale.setScalar(1 + 0.028 * fbm1D(t * 0.5, 3, 2) + (i === 1 ? 0.05 * easeOut(p) : 0));
          }

          // ── 4. la vacuole ─────────────────────────────────────────────
          const v = vacuole.current;
          if (v) {
            const sc =
              i === 1
                ? ease(0.02, 1, clamp01((p - 0.4) / 0.6), easeOutBack)
                : i === 2
                  ? 1 + 0.07 * noise1D(t * 1.3, 11)
                  : i === 3
                    ? ease(1, 0.02, p, easeInOut)
                    : 0.001;
            v.scale.setScalar(Math.max(0.001, sc));
            v.visible = sc > 0.04;
          }

          // ── 5. les lysosomes ──────────────────────────────────────────
          const L = lyso.current;
          if (L) {
            L.children.forEach((c, k) => {
              const ang = t * 0.8 + (k * Math.PI) / 2 + goldenPhase(k) * 2;
              const rr = 0.74 + 0.1 * fbm1D(t * 0.5 + k, k * 31, 2);
              const ox = LYSO_C[0] + Math.cos(ang) * rr;
              const oy = LYSO_C[1] + Math.sin(ang) * rr * 0.82;
              if (i === 2) {
                const s = clamp01((p - k * 0.1) / 0.5);
                damp3(c.position, [mix(ox, B_VAC[0], s), mix(oy, B_VAC[1], s), mix(LYSO_C[2], B_VAC[2], s)], 6, dt);
                c.scale.setScalar(mix(1, 0.12, clamp01((p - 0.5 - k * 0.07) / 0.32)));
              } else {
                damp3(c.position, [ox, oy, LYSO_C[2]], 5, dt);
                c.scale.setScalar(i === 3 ? ease(0.12, 1, p, easeOut) : 1);
              }
            });
          }

          // ── 6. les débris ─────────────────────────────────────────────
          const D = debris.current;
          if (D) {
            D.children.forEach((c, k) => {
              if (i !== 3) {
                c.visible = false;
                return;
              }
              const s = clamp01((p - k * 0.07) / 0.72);
              c.visible = true;
              c.position.set(
                ease(DEBRIS_OUT[0], 2.2 + k * 0.34, s, easeOut),
                ease(DEBRIS_OUT[1], -1.05 - k * 0.16, s, easeOutBounce),
                DEBRIS_OUT[2],
              );
              c.rotation.set(t * 1.3 + k, t * 0.9 + k, 0);
              c.scale.setScalar(mix(0.95, 0.12, s));
            });
          }

          // ── 7. le décor circule doucement ─────────────────────────────
          const H = hematies.current;
          if (H) {
            H.children.forEach((c, k) => {
              const base = RBC_HOME[k];
              const ph = goldenPhase(k + 2);
              damp3(
                c.position,
                [
                  base[0] + 0.5 * fbm1D(t * 0.22 + ph * 9, k * 17, 3),
                  base[1] + 0.36 * fbm1D(t * 0.19 + ph * 5, k * 17 + 4, 3),
                  base[2],
                ],
                2.2,
                dt,
              );
              c.rotation.z += dt * 0.25;
            });
          }
        }}
      />

      {/* LE commentaire synchronisé : « 2/4 — Il entoure la bactérie… » */}
      <AutoNarration
        position={[-5.3, 0.6, 0]}
        distanceFactor={10}
        tone="svt"
        title="La phagocytose, temps par temps"
        steps={PHAGO_STEPS}
        hold={3.6}
        loop
        width={240}
        onStepChange={(i) => {
          setEtape(i);
          if (i === 0) {
            if (premier.current) premier.current = false;
            else setCycle((c) => c + 1);
          }
        }}
      />

      {/* On désigne exactement ce dont parle le commentaire */}
      <FocusHalo position={h.pos} radius={h.r} tone="svt" label={h.label} speed={0.5} />

      {etape === 2 && (
        <Callout
          at={[0.28, 0.05, 0.62]}
          to={[3.9, 1.3, 0]}
          label="La vacuole digestive"
          detail="Les lysosomes y versent des enzymes : la bactérie y est découpée en débris."
          tone="svt"
          width={200}
        />
      )}

      <LegendCard
        position={[5.3, -0.9, 0]}
        distanceFactor={10}
        tone="svt"
        title="Qui est qui ?"
        items={[
          { label: 'Macrophage', color: '#9DB8E6', shape: 'dot', note: 'gros, bosselé' },
          { label: 'Bactérie', color: C_BACTERIE, shape: 'dash', note: 'bâtonnet' },
          { label: 'Lysosome', color: C_LYSOSOME, shape: 'ring', note: 'petite bille' },
          { label: 'Débris', color: '#8A6B4F', shape: 'triangle' },
          { label: 'Hématie (décor)', color: C_HEMATIE, shape: 'ring', note: 'estompée' },
        ]}
        width={210}
      />

      <ObservationCue
        position={[-2.6, -3.1, 0]}
        distanceFactor={10}
        tone="svt"
        badge="À observer"
        text="Regarde la trace verte : c’est le chemin du microbe, de l’extérieur jusqu’à la vacuole."
        question="Combien de temps le macrophage garde-t-il le souvenir de cette bactérie ?"
        width={246}
      />

      <SceneLabel
        position={[-0.4, 3.3, 0]}
        title="La phagocytose en 4 temps"
        subtitle="2e ligne · non spécifique · rapide · sans mémoire"
        tone="svt"
      />
      <Readout position={[3.9, -2.85, 0]} value="< 24" unit="h" caption="délai d'intervention" />
    </group>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Vue 3 — la réponse spécifique (anticorps et lymphocytes T)
// ════════════════════════════════════════════════════════════════════════

const MICROBE_A: Vector3Tuple = [1.9, 1.3, 0];
const RA = 0.62;
const N_ANTIGENE = 8;

/** Trajet des anticorps : du plasmocyte jusqu'aux antigènes du microbe A. */
const AB_PATH: Vector3Tuple[] = [
  [-2.1, 1.45, 0.35],
  [-1.1, 2.15, 0.1],
  [0.1, 1.05, 0.5],
  [1.0, 1.5, 0.3],
];

/** Les trois temps de la consigne : on n'éclaire qu'une cellule à la fois. */
const SPEC_FOCUS: { pos: Vector3Tuple; r: number; label: string }[] = [
  { pos: [-2.75, 1.0, 0], r: 1.15, label: '1/3 — La fabrication des anticorps' },
  { pos: [1.9, 0.95, 0], r: 1.35, label: '2/3 — La reconnaissance de l’antigène' },
  { pos: [-2.3, -1.7, 0], r: 1.05, label: '3/3 — La cellule infectée détruite' },
];

const SPEC_PHASES = [
  { name: 'approche', duration: 1.7, easing: easeInOut },
  { name: 'choc', duration: 0.9, easing: easeOutBounce },
  { name: 'recul', duration: 1.5, easing: easeInOut },
];

function SpecifiqueView({ taux, rappel, jour }: { taux: number; rappel: boolean; jour: number }) {
  const ab0 = useRef<Group>(null);
  const ab1 = useRef<Group>(null);
  const ab2 = useRef<Group>(null);
  const abRej = useRef<Group>(null);
  const infected = useRef<Mesh>(null);

  // Horloge de consigne : useStepClock est appelé DANS un enfant du Canvas.
  const { index: foc } = useStepClock({ count: 3, hold: 5.5, loop: true });

  const angles = useMemo(() => Array.from({ length: N_ANTIGENE }, (_, i) => (i / N_ANTIGENE) * Math.PI * 2), []);
  /** Plus le taux d'anticorps est élevé, plus le microbe est recouvert (neutralisé). */
  const occupes = Math.round(N_ANTIGENE * Math.min(1, taux / 80));
  const f = SPEC_FOCUS[foc];

  return (
    <group>
      {/* ── Groupe 1 : la fabrication des anticorps ───────────────────── */}
      <DimGroup dimmed={foc !== 0} opacity={0.15}>
        {/* Lymphocyte B → plasmocyte (usine à anticorps) */}
        <mesh position={[-5.2, 1.4, 0]} castShadow>
          <sphereGeometry args={[0.42, 24, 18]} />
          <meshStandardMaterial color="#DDD6FE" roughness={0.55} />
        </mesh>
        <mesh position={[-5.2, 1.4, 0.14]}>
          <sphereGeometry args={[0.3, 20, 16]} />
          <meshStandardMaterial color="#6D28D9" roughness={0.5} />
        </mesh>
        <Arrow3D from={[-4.55, 1.4, 0]} to={[-3.62, 1.4, 0]} color={C_ANTICORPS} radius={0.035} headLength={0.24} />
        <mesh position={[-2.75, 1.4, 0]} scale={[1.05, 1, 0.95]} castShadow>
          <sphereGeometry args={[0.66, 26, 20]} />
          <meshStandardMaterial color="#C4B5FD" roughness={0.55} />
        </mesh>
        <mesh position={[-2.95, 1.5, 0.24]}>
          <sphereGeometry args={[0.27, 20, 16]} />
          <meshStandardMaterial color="#5B21B6" roughness={0.5} />
        </mesh>
        {([0, 1, 2, 3] as number[]).map((i) => {
          const a = 0.5 + (i / 4) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[-2.75 + Math.cos(a) * 0.42, 1.25 + Math.sin(a) * 0.34, 0.42]}
              rotation={[Math.PI / 2, 0, a]}
            >
              <torusGeometry args={[0.11, 0.03, 8, 18]} />
              <meshStandardMaterial color={C_LYMPHO_B} roughness={0.5} />
            </mesh>
          );
        })}
      </DimGroup>

      {/* ── Groupe 2 : la reconnaissance antigène / anticorps ─────────── */}
      <DimGroup dimmed={foc !== 1} opacity={0.15}>
        {/* Anticorps libres qui filent vers le microbe A */}
        <group ref={ab0}>
          <Anticorps position={[0, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={0.85} />
        </group>
        <group ref={ab1}>
          <Anticorps position={[0, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={0.85} />
        </group>
        <group ref={ab2}>
          <Anticorps position={[0, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={0.85} />
        </group>

        {/* Microbe A + ses antigènes « pointus » */}
        <mesh position={MICROBE_A} castShadow>
          <sphereGeometry args={[RA, 28, 20]} />
          <meshStandardMaterial color="#15803D" roughness={0.5} />
        </mesh>
        {angles.map((a, i) => (
          <group key={i}>
            <mesh
              position={[MICROBE_A[0] + Math.cos(a) * (RA + 0.12), MICROBE_A[1] + Math.sin(a) * (RA + 0.12), 0]}
              rotation={[0, 0, a - Math.PI / 2]}
            >
              <coneGeometry args={[0.09, 0.28, 12]} />
              <meshStandardMaterial color="#84CC16" roughness={0.45} />
            </mesh>
            {i < occupes && (
              <Anticorps
                position={[MICROBE_A[0] + Math.cos(a) * (RA + 0.55), MICROBE_A[1] + Math.sin(a) * (RA + 0.55), 0]}
                rotation={[0, 0, a + Math.PI / 2]}
                scale={0.9}
              />
            )}
          </group>
        ))}

        {/* Microbe B : d'autres antigènes → l'anticorps anti-A ne s'y fixe pas */}
        <mesh position={[4.95, -1.6, 0]} castShadow>
          <sphereGeometry args={[0.5, 24, 18]} />
          <meshStandardMaterial color="#C2410C" roughness={0.5} />
        </mesh>
        {([0, 1, 2, 3, 4, 5] as number[]).map((i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh key={i} position={[4.95 + Math.cos(a) * 0.58, -1.6 + Math.sin(a) * 0.58, 0]} rotation={[0, 0, a]}>
              <boxGeometry args={[0.19, 0.19, 0.19]} />
              <meshStandardMaterial color="#FDBA74" roughness={0.5} />
            </mesh>
          );
        })}
        <group ref={abRej}>
          {/* position/rotation portées par la <Timeline> : approche, choc, recul */}
          <Anticorps position={[0, 0, 0]} scale={0.9} />
        </group>
      </DimGroup>

      {/* ── Groupe 3 : le lymphocyte T ────────────────────────────────── */}
      <DimGroup dimmed={foc !== 2} opacity={0.15}>
        <mesh position={[-4.6, -1.7, 0]} castShadow>
          <sphereGeometry args={[0.45, 24, 18]} />
          <meshStandardMaterial color="#93C5FD" roughness={0.55} />
        </mesh>
        <mesh position={[-4.6, -1.7, 0.16]}>
          <sphereGeometry args={[0.31, 20, 16]} />
          <meshStandardMaterial color="#1D4ED8" roughness={0.5} />
        </mesh>
        <Arrow3D from={[-4.0, -1.7, 0]} to={[-3.15, -1.7, 0]} color={C_LYMPHO_T} radius={0.033} headLength={0.22} />
        <mesh ref={infected} position={[-2.3, -1.7, 0]} castShadow>
          <sphereGeometry args={[0.58, 24, 18]} />
          <meshStandardMaterial color="#FCA5A5" roughness={0.6} emissive="#DC2626" emissiveIntensity={0.25} />
        </mesh>
        <Bacterie position={[-2.3, -1.7, 0.42]} scale={0.55} color="#7F1D1D" />
      </DimGroup>

      {/* Les anticorps suivent une vraie courbe, à vitesse régulière */}
      <AlongPath objectRef={ab0} points={AB_PATH} duration={4.4} loop offset={0} />
      <AlongPath objectRef={ab1} points={AB_PATH} duration={4.4} loop offset={0.34} />
      <AlongPath objectRef={ab2} points={AB_PATH} duration={4.4} loop offset={0.67} />

      <Timeline
        phases={SPEC_PHASES}
        loop
        onFrame={(fr, state, delta) => {
          const t = state.clock.elapsedTime;
          const dt = delta;

          // L'anticorps anti-A bute sur le microbe B et repart : la clé n'entre pas.
          const r = abRej.current;
          if (r) {
            const s = fr.t;
            const x = fr.index === 0 ? mix(3.15, 4.16, s) : fr.index === 1 ? mix(4.16, 4.02, s) : mix(4.02, 3.15, s);
            r.position.set(x, -1.6 + 0.06 * noise1D(t * 1.4, 5), 0.4);
            r.rotation.z = -Math.PI / 2 + (fr.index === 1 ? 0.55 * Math.sin(s * Math.PI * 4) : 0.12 * noise1D(t, 9));
          }

          // Léger roulis des anticorps libres : ils dérivent, ils ne glissent pas.
          [ab0.current, ab1.current, ab2.current].forEach((g, i) => {
            if (!g) return;
            g.rotation.z = damp(g.rotation.z, -Math.PI / 2 + 0.45 * noise1D(t * 0.7 + goldenPhase(i) * 6, i * 11), 3, dt);
          });

          // La cellule infectée se rétracte puis éclate (lyse).
          if (infected.current) {
            const u = (t * 0.18) % 1;
            infected.current.scale.setScalar(1 - 0.45 * easeInOut(clamp01(u / 0.85)));
          }
        }}
      />

      <FocusHalo position={f.pos} radius={f.r} tone="svt" label={f.label} speed={0.5} />

      <Tag3D position={[-5.2, 0.55, 0]} label="Lymphocyte B" tone="svt" />
      <Tag3D position={[-3.1, 0.42, 0]} label="Plasmocyte : usine à anticorps" tone="svt" />
      <Tag3D position={[3.55, 0.5, 0]} label="Microbe A · antigènes en pointe" tone="physique" />
      <Tag3D position={[0.15, 2.35, 0]} label="Anticorps en Y" tone="neutral" />
      <Tag3D position={[4.95, -0.55, 0]} label="Microbe B · autres antigènes" tone="physique" />
      <Tag3D position={[4.6, -2.75, 0]} label="L'anticorps anti-A ne s'y fixe pas" tone="neutral" />
      <Tag3D position={[-4.6, -2.55, 0]} label="Lymphocyte T" tone="svt" />
      <Tag3D position={[-2.3, -2.75, 0]} label="Cellule infectée détruite" tone="neutral" />

      <LegendCard
        position={[6.5, 2.9, 0]}
        distanceFactor={10}
        tone="svt"
        title="Qui est qui ?"
        items={[
          { label: 'Lymphocyte B / plasmocyte', color: C_LYMPHO_B, shape: 'dot' },
          { label: 'Lymphocyte T', color: C_LYMPHO_T, shape: 'square' },
          { label: 'Anticorps en Y', color: C_ANTICORPS, shape: 'triangle' },
          { label: 'Microbe A (antigènes pointus)', color: '#15803D', shape: 'ring' },
          { label: 'Microbe B (antigènes cubiques)', color: '#C2410C', shape: 'square' },
        ]}
        width={228}
      />

      <SceneLabel
        position={[-3.0, 3.7, 0]}
        title="Un anticorps = un seul antigène"
        subtitle={rappel ? 'Réponse secondaire · après le rappel du vaccin' : 'Réponse primaire · 1re rencontre'}
        tone="svt"
      />
      <Readout position={[1.4, -3.4, 0]} value={taux.toFixed(0)} unit="u.a." caption={`anticorps au jour ${jour}`} />
    </group>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Vue 4 — la mémoire immunitaire (primaire vs secondaire)
// ════════════════════════════════════════════════════════════════════════

const DAY_MAX = 28;
const TITRE_MAX = 140;
const OX = -4.2;
const OY = -2.0;
const SX = 8.4 / DAY_MAX;
const SY = 4.6 / TITRE_MAX;
const C_PRIM = '#2563EB';
const C_SEC = '#16A34A';

function P(day: number, v: number): Vector3Tuple {
  return [OX + day * SX, OY + v * SY, 0];
}

/** Échantillonne une réponse de J0 à `jusqu'à` (0,5 jour de pas). */
function courbe(rappelCourbe: boolean, jusqua: number): Vector3Tuple[] {
  const pts: Vector3Tuple[] = [];
  for (let d = 0; d <= jusqua + 1e-9; d += 0.5) pts.push(P(d, titre(d, rappelCourbe)));
  if (pts.length < 2) pts.push(P(Math.max(0.01, jusqua), titre(Math.max(0.01, jusqua), rappelCourbe)));
  return pts;
}

function MemoireView({
  jour,
  taux,
  rappel,
  protPrim,
  protSec,
  picPrim,
  picSec,
}: {
  jour: number;
  taux: number;
  rappel: boolean;
  protPrim: number | null;
  protSec: number | null;
  picPrim: number;
  picSec: number;
}) {
  const tete = useRef<Mesh>(null);
  const jourLisse = useRef(jour);

  /** La courbe active se CONSTRUIT : elle ne va que jusqu'au jour du curseur. */
  const tracee = useMemo(() => courbe(rappel, jour), [rappel, jour]);
  /** La réponse primaire complète, gardée en trace pendant qu'on lit la secondaire. */
  const primaireComplete = useMemo(() => courbe(false, DAY_MAX), []);

  const cur = P(jour, taux);

  return (
    <group>
      {/* Repère */}
      <Arrow3D from={[OX - 0.35, OY, 0]} to={[OX + 9.0, OY, 0]} color="#475569" radius={0.02} headLength={0.2} />
      <Arrow3D from={[OX, OY - 0.35, 0]} to={[OX, OY + 5.1, 0]} color="#475569" radius={0.02} headLength={0.2} />
      {([7, 14, 21, 28] as number[]).map((d) => (
        <group key={d}>
          <mesh position={[OX + d * SX, OY, 0]}>
            <boxGeometry args={[0.018, 0.14, 0.018]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          <Tag3D position={[OX + d * SX, OY - 0.4, 0]} label={`J${d}`} tone="neutral" />
        </group>
      ))}

      {/* Seuil de protection */}
      <PolyLine points={[P(0, SEUIL), P(DAY_MAX + 0.6, SEUIL)]} color="#DC2626" width={2} dashed />
      <Tag3D position={[OX + 8.0, OY + SEUIL * SY + 0.32, 0]} label="Seuil de protection" tone="physique" />

      {/* La réponse primaire reste en trace quand on regarde la secondaire :
          c'est CE contraste qui rend la mémoire immunitaire évidente. */}
      <GhostState
        visible={rappel}
        opacity={0.34}
        tone="neutral"
        caption="Réponse primaire (déjà observée)"
        captionPosition={[OX + 19 * SX, OY + 18 * SY + 0.3, 0]}
      >
        <PolyLine points={primaireComplete} color={C_PRIM} width={4} />
      </GhostState>

      {/* La courbe en cours de construction */}
      <PolyLine points={tracee} color={rappel ? C_SEC : C_PRIM} width={4} />

      {/* Repère du jour choisi */}
      <PolyLine points={[[cur[0], OY, 0], cur]} color="#94A3B8" width={2} dashed />

      {/* Point courant : il rejoint le curseur avec de l'inertie (damp) */}
      <mesh ref={tete} position={cur}>
        <sphereGeometry args={[0.15, 20, 16]} />
        <meshStandardMaterial color="#DC2626" emissive="#DC2626" emissiveIntensity={0.35} />
      </mesh>

      {/* Sa trace dessine la courbe sous les yeux de l'élève */}
      <ValueTrail
        target={tete}
        color={rappel ? C_SEC : C_PRIM}
        width={5}
        maxPoints={300}
        sampleEvery={0.05}
        resetKey={rappel ? 'secondaire' : 'primaire'}
      />

      <Animate
        fn={(state, delta) => {
          const m = tete.current;
          if (!m) return;
          jourLisse.current = damp(jourLisse.current, jour, 6, delta);
          const d = jourLisse.current;
          m.position.set(OX + d * SX, OY + titre(d, rappel) * SY, 0);
          m.scale.setScalar(1 + 0.16 * noise1D(state.clock.elapsedTime * 1.6, 3));
        }}
      />

      <Tag3D position={[OX + 14 * SX + 0.15, OY + 15.6 * SY + 0.42, 0]} label="1re rencontre : lente et faible" tone="physique" />
      <Tag3D position={[OX + 7 * SX + 1.15, OY + 134 * SY, 0]} label="Après le rappel : rapide et 8× plus forte" tone="svt" />
      <Tag3D position={[OX - 0.95, OY + 4.75, 0]} label="140 u.a." tone="neutral" />
      <Tag3D position={[OX + 9.2, OY - 0.05, 0]} label="jours" tone="neutral" />

      {/* L'écart est la vraie information : on l'affiche, on ne le fait pas calculer de tête. */}
      <CompareCard
        position={[7.0, 2.6, 0]}
        distanceFactor={10}
        tone="svt"
        title="Protégé à partir de…"
        left={{ label: '1re rencontre', value: protPrim === null ? '—' : `J${protPrim.toFixed(0)}`, unit: '' }}
        right={{ label: 'Après rappel', value: protSec === null ? '—' : `J${protSec.toFixed(0)}`, unit: '' }}
        verdict={
          protPrim !== null && protSec !== null
            ? `Tu gagnes ${(protPrim - protSec).toFixed(0)} jours grâce aux lymphocytes mémoire.`
            : 'Déplace le curseur jusqu’au seuil de protection.'
        }
        width={244}
      />
      <CompareCard
        position={[7.0, -1.4, 0]}
        distanceFactor={10}
        tone="svt"
        title="Pic d'anticorps"
        left={{ label: '1re rencontre', value: picPrim, unit: 'u.a.' }}
        right={{ label: 'Après rappel', value: picSec, unit: 'u.a.' }}
        precision={0}
        deltaLabel="Écart"
        verdict={`Le pic est ${(picSec / Math.max(1e-6, picPrim)).toFixed(0)} fois plus haut : voilà le rôle du rappel.`}
        width={244}
      />

      <LegendCard
        position={[-7.1, -3.4, 0]}
        distanceFactor={10}
        tone="svt"
        title="Lecture du graphique"
        items={[
          { label: 'Réponse primaire (1re rencontre)', color: C_PRIM, shape: 'dash' },
          { label: 'Réponse secondaire (après rappel)', color: C_SEC, shape: 'dash' },
          { label: 'Courbe déjà observée', color: C_PRIM, shape: 'dashed', note: 'trace' },
          { label: 'Seuil de protection', color: '#DC2626', shape: 'dashed' },
          { label: 'Jour lu au curseur', color: '#DC2626', shape: 'dot' },
        ]}
        width={236}
      />

      <ObservationCue
        position={[-7.1, -0.3, 0]}
        distanceFactor={10}
        tone="svt"
        badge="À faire"
        text="Fais glisser le curseur des jours : la courbe se dessine devant toi, jour après jour."
        question="À quel jour coupes-tu le trait rouge du seuil de protection ?"
        width={240}
      />

      <SceneLabel
        position={[0.4, 3.5, 0]}
        title="Mémoire immunitaire"
        subtitle="taux d'anticorps dans le sang (u.a.) au fil des jours"
        tone="svt"
      />
      <Readout
        position={[cur[0], cur[1] + 0.72, 0]}
        value={taux.toFixed(0)}
        unit="u.a."
        caption={rappel ? `rappel · jour ${jour}` : `1re fois · jour ${jour}`}
      />
    </group>
  );
}

// ════════════════════════════════════════════════════════════════════════

export default function ImmuneScene({
  view,
  peauIntacte,
  rappel,
  jour,
  taux,
  protPrim = null,
  protSec = null,
  picPrim = 0,
  picSec = 0,
}: ImmuneSceneProps) {
  const camera: Vector3Tuple =
    view === 'barriere'
      ? [0, 0.3, 13]
      : view === 'phagocytose'
        ? [0.3, 0.1, 14]
        : view === 'specifique'
          ? [0.4, 0.2, 16]
          : [0.6, 0.4, 16.5];

  return (
    <LabScene
      cameraPosition={[camera[0], camera[1], camera[2]]}
      background="#F0FDF4"
      minDistance={6}
      maxDistance={24}
      groundY={null}
    >
      {view === 'barriere' && <BarriereView peauIntacte={peauIntacte} />}
      {view === 'phagocytose' && <PhagoView />}
      {view === 'specifique' && <SpecifiqueView taux={taux} rappel={rappel} jour={jour} />}
      {view === 'memoire' && (
        <MemoireView
          jour={jour}
          taux={taux}
          rappel={rappel}
          protPrim={protPrim}
          protSec={protSec}
          picPrim={picPrim}
          picSec={picSec}
        />
      )}
    </LabScene>
  );
}
