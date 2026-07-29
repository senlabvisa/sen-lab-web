'use client';

import { useMemo, useRef } from 'react';
import { Group, Mesh, type Vector3Tuple } from 'three';
import {
  LabScene,
  Wire,
  PolyLine,
  Arrow3D,
  Marker,
  SceneLabel,
  Tag3D,
  Readout,
  Animate,
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
 *
 *  • « phagocytose » : les 4 temps de la phagocytose (adhésion, ingestion,
 *                      digestion dans la vacuole avec les lysosomes, rejet des
 *                      débris). 2e ligne, NON spécifique, rapide, sans mémoire.
 *
 *  • « specifique »  : lymphocyte B → plasmocyte → anticorps en Y qui se fixent
 *                      sur les antigènes du microbe A, mais PAS sur ceux du
 *                      microbe B (spécificité). Lymphocyte T qui détruit une
 *                      cellule infectée. Le nombre d'anticorps suit le taux réel.
 *
 *  • « memoire »     : courbes du taux d'anticorps — réponse primaire (lente,
 *                      faible) contre réponse secondaire après le rappel du
 *                      vaccin (rapide, beaucoup plus ample).
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

// ════════════════════════════════════════════════════════════════════════
// Briques réutilisables
// ════════════════════════════════════════════════════════════════════════

/** Anticorps en Y : deux bras (sites de fixation) + une tige. */
function Anticorps({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  color = '#7C3AED',
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
function Bacterie({ position, scale = 1, color = '#166534' }: { position: Vector3Tuple; scale?: number; color?: string }) {
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

const BUMPS: Vector3Tuple[] = [
  [0.66, 0.34, 0.12],
  [0.2, 0.7, -0.18],
  [-0.42, 0.6, 0.2],
  [-0.72, 0.05, -0.1],
  [-0.5, -0.55, 0.18],
  [0.12, -0.72, -0.15],
  [0.64, -0.36, 0.14],
];

/** Macrophage : cytoplasme bosselé (pseudopodes) + noyau réniforme. */
function Macrophage() {
  return (
    <group>
      <mesh castShadow>
        <sphereGeometry args={[0.72, 30, 22]} />
        <meshStandardMaterial color="#E4EEFF" roughness={0.5} />
      </mesh>
      {BUMPS.map((b, i) => (
        <mesh key={i} position={b} castShadow>
          <sphereGeometry args={[0.26, 16, 12]} />
          <meshStandardMaterial color="#E4EEFF" roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[-0.18, -0.1, 0.36]} scale={[1.3, 0.85, 0.6]}>
        <sphereGeometry args={[0.3, 20, 16]} />
        <meshStandardMaterial color="#5B7FB4" roughness={0.55} />
      </mesh>
    </group>
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
        <meshStandardMaterial color="#7C93B8" roughness={0.6} />
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
  [-4.9, -0.95, 0.82],
  [-2.9, -0.6, 0.82],
  [-1.0, -1.1, 0.82],
  [0.9, -0.62, 0.82],
  [2.9, -1.05, 0.82],
  [4.9, -0.72, 0.82],
];

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

function BarriereView({ peauIntacte }: { peauIntacte: boolean }) {
  const germs = useRef<Group>(null);
  const phagos = useRef<Group>(null);

  const cols = useMemo(() => Array.from({ length: SKIN_COLS }, (_, i) => SKIN_X0 + i * SKIN_STEP), []);

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

      {/* Vaisseau sanguin du derme (dessiné sur la face de coupe) */}
      <Wire points={VESSEL} color="#B91C1C" radius={peauIntacte ? 0.11 : 0.17} />

      {/* Épiderme : rangées de cellules, interrompues par la plaie */}
      {ROWS.map((r, ri) =>
        cols.map((x) => {
          if (!peauIntacte && Math.abs(x) < 1.05) return null;
          return (
            <mesh key={`${ri}-${x}`} position={[x, r.y, 0]} castShadow>
              <boxGeometry args={[0.8, r.h, SKIN_Z]} />
              <meshStandardMaterial color={r.color} roughness={0.75} />
            </mesh>
          );
        }),
      )}

      {peauIntacte ? (
        /* Film gras + flore microbienne de surface : une protection en plus */
        <mesh position={[0, 1.58, 0]}>
          <boxGeometry args={[9.7, 0.07, SKIN_Z]} />
          <meshStandardMaterial color="#FDE68A" roughness={0.3} transparent opacity={0.75} />
        </mesh>
      ) : (
        <>
          {/* Fond de la plaie : derme mis à nu */}
          <mesh position={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[2.62, 0.28, SKIN_Z]} />
            <meshStandardMaterial color="#C0554C" roughness={0.85} />
          </mesh>
          {/* Grains de sable du terrain de foot */}
          {SABLE.map((p, i) => (
            <mesh key={i} position={p} castShadow>
              <dodecahedronGeometry args={[0.11, 0]} />
              <meshStandardMaterial color={i % 2 ? '#B08D57' : '#D6B370'} roughness={0.95} />
            </mesh>
          ))}
          {/* Inflammation : rougeur et chaleur autour de la plaie */}
          <mesh position={[0, 0.7, 0]} scale={[1.9, 1.15, 1.0]}>
            <sphereGeometry args={[1.25, 24, 18]} />
            <meshStandardMaterial color="#EF4444" emissive="#B91C1C" emissiveIntensity={0.5} transparent opacity={0.2} />
          </mesh>
          {/* Phagocytes qui quittent le vaisseau et gagnent la plaie */}
          <group ref={phagos}>
            {([0, 1, 2] as number[]).map((i) => (
              <group key={i}>
                <Phagocyte />
              </group>
            ))}
          </group>
        </>
      )}

      {/* Microbes au-dessus de la peau */}
      <group ref={germs}>
        {GERM_HOME.map((p, i) => (
          <Bacterie key={i} position={p} scale={0.95} color={i % 2 ? '#166534' : '#7E22CE'} />
        ))}
      </group>

      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime;
          const g = germs.current;
          if (g) {
            g.children.forEach((c, i) => {
              const base = GERM_HOME[i];
              if (peauIntacte || i > 2) {
                c.position.set(
                  base[0] + 0.28 * Math.sin(t * 0.7 + i),
                  base[1] + 0.16 * Math.sin(t * 1.2 + i * 1.7),
                  base[2],
                );
                c.rotation.z = 0.5 * Math.sin(t * 0.9 + i);
              } else {
                const u = (t * 0.24 + i / 3) % 1;
                c.position.set(base[0] * (1 - u) + 0.12 * Math.sin(t * 2 + i), base[1] + u * (0.35 - base[1]), base[2] * (1 - u) + 0.35 * u);
                c.rotation.z = t * 1.5 + i;
              }
            });
          }
          const p = phagos.current;
          if (p) {
            p.children.forEach((c, i) => {
              const u = (t * 0.3 + i / 3) % 1;
              const e = u < 0.5 ? u * 2 : 2 - u * 2; // aller puis retour
              const sx = -1.6 + i * 0.55;
              const sy = -0.75 - i * 0.14;
              c.position.set(sx + e * (-0.6 + i * 0.6 - sx), sy + e * (0.52 - sy), 0.95);
              c.scale.setScalar(0.9 + 0.16 * Math.sin(t * 3 + i));
            });
          }
        }}
      />

      <Tag3D position={[-5.7, 1.52, 0]} label="Couche cornée" tone="neutral" />
      <Tag3D position={[-5.7, 0.82, 0]} label="Épiderme" tone="svt" />
      <Tag3D position={[-5.7, -0.85, 0]} label="Derme" tone="svt" />
      <Tag3D position={[4.3, -1.75, 0]} label="Vaisseau sanguin" tone="physique" />
      {peauIntacte ? (
        <>
          <Tag3D position={[0, 1.95, 0]} label="Barrière intacte : les microbes restent dehors" tone="svt" />
          <Tag3D position={[3.9, 1.85, 0]} label="Film gras + sueur acide" tone="neutral" />
        </>
      ) : (
        <>
          <Tag3D position={[-2.35, 1.9, 0]} label="Plaie : les microbes passent" tone="physique" />
          <Tag3D position={[2.6, 1.55, 0]} label="Inflammation : rougeur, chaleur, gonflement" tone="physique" />
          <Tag3D position={[-2.9, -1.9, 0]} label="Phagocytes appelés sur place" tone="svt" />
        </>
      )}

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
// Vue 2 — la phagocytose en 4 temps
// ════════════════════════════════════════════════════════════════════════

const PX = [-5.2, -1.75, 1.75, 5.2];

function PhagoView() {
  const bact = useRef<Group>(null);
  const arms = useRef<Group>(null);
  const lyso = useRef<Group>(null);
  const digest = useRef<Group>(null);
  const debris = useRef<Group>(null);

  return (
    <group>
      {/* 1 · Adhésion — la bactérie se colle au macrophage */}
      <group position={[PX[0], 0, 0]}>
        <Macrophage />
        <group ref={bact}>
          <Bacterie position={[0, 0, 0]} scale={1.05} />
        </group>
      </group>

      {/* 2 · Ingestion — les pseudopodes entourent la bactérie */}
      <group position={[PX[1], 0, 0]}>
        <Macrophage />
        <Bacterie position={[0.74, 0.02, 0.3]} scale={0.95} />
        <group ref={arms}>
          <mesh position={[0.6, 0.52, 0.22]} rotation={[0, 0, -0.95]} castShadow>
            <capsuleGeometry args={[0.17, 0.52, 6, 16]} />
            <meshStandardMaterial color="#E4EEFF" roughness={0.5} />
          </mesh>
          <mesh position={[0.6, -0.52, 0.22]} rotation={[0, 0, 0.95]} castShadow>
            <capsuleGeometry args={[0.17, 0.52, 6, 16]} />
            <meshStandardMaterial color="#E4EEFF" roughness={0.5} />
          </mesh>
        </group>
      </group>

      {/* 3 · Digestion — la bactérie est enfermée dans une vacuole, les lysosomes la détruisent */}
      <group position={[PX[2], 0, 0]}>
        <Macrophage />
        <mesh position={[0.18, 0.02, 0.34]}>
          <sphereGeometry args={[0.36, 22, 16]} />
          <meshStandardMaterial color="#BFDBFE" roughness={0.2} transparent opacity={0.55} />
        </mesh>
        <group ref={digest} position={[0.18, 0.02, 0.34]}>
          <Bacterie position={[0, 0, 0]} scale={0.62} />
        </group>
        <group ref={lyso}>
          {([0, 1, 2, 3] as number[]).map((i) => (
            <mesh key={i}>
              <sphereGeometry args={[0.1, 12, 10]} />
              <meshStandardMaterial color="#22C55E" emissive="#15803D" emissiveIntensity={0.8} />
            </mesh>
          ))}
        </group>
      </group>

      {/* 4 · Rejet — les débris sont évacués */}
      <group position={[PX[3], 0, 0]}>
        <Macrophage />
        <group ref={debris}>
          {([0, 1, 2, 3, 4] as number[]).map((i) => (
            <mesh key={i}>
              <dodecahedronGeometry args={[0.09, 0]} />
              <meshStandardMaterial color="#8A6B4F" roughness={0.85} />
            </mesh>
          ))}
        </group>
      </group>

      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime;
          bact.current?.position.set(1.06 + 0.13 * Math.sin(t * 1.6), 0.18, 0.34);
          bact.current?.rotation.set(0, 0, 0.35 * Math.sin(t * 1.2));
          arms.current?.scale.setScalar(1 + 0.07 * Math.sin(t * 2.1));
          digest.current?.scale.setScalar(0.35 + 0.6 * (0.5 + 0.5 * Math.cos(t * 0.85)));
          const l = lyso.current;
          if (l) {
            l.children.forEach((c, i) => {
              const a = t * 0.95 + (i * Math.PI) / 2;
              const r = 0.58 + 0.14 * Math.sin(t * 1.4 + i);
              c.position.set(0.18 + Math.cos(a) * r, 0.02 + Math.sin(a) * r * 0.72, 0.34);
            });
          }
          const d = debris.current;
          if (d) {
            d.children.forEach((c, i) => {
              const u = (t * 0.34 + i / 5) % 1;
              c.position.set(0.78 + u * 1.05, 0.06 + (i - 2) * 0.17 * (0.4 + u), 0.28);
              c.rotation.set(t * 1.4 + i, t * 0.9, 0);
              c.scale.setScalar(Math.max(0.08, 1 - u));
            });
          }
        }}
      />

      <Tag3D position={[PX[0], -1.55, 0]} label="1 · Adhésion" tone="svt" />
      <Tag3D position={[PX[1], -1.55, 0]} label="2 · Ingestion (pseudopodes)" tone="svt" />
      <Tag3D position={[PX[2], -1.55, 0]} label="3 · Digestion (vacuole + lysosomes)" tone="svt" />
      <Tag3D position={[PX[3], -1.55, 0]} label="4 · Rejet des débris" tone="svt" />
      <Tag3D position={[PX[0] + 1.15, 1.25, 0]} label="Bactérie" tone="physique" />
      <Tag3D position={[PX[2] + 0.35, 1.3, 0]} label="Lysosomes" tone="neutral" />

      <SceneLabel
        position={[0, 2.5, 0]}
        title="La phagocytose en 4 temps"
        subtitle="2e ligne · non spécifique · rapide · sans mémoire"
        tone="svt"
      />
      <Readout position={[0, -2.5, 0]} value="< 24" unit="h" caption="délai d'intervention" />
    </group>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Vue 3 — la réponse spécifique (anticorps et lymphocytes T)
// ════════════════════════════════════════════════════════════════════════

const MICROBE_A: Vector3Tuple = [1.9, 1.3, 0];
const RA = 0.62;
const N_ANTIGENE = 8;

function SpecifiqueView({ taux, rappel, jour }: { taux: number; rappel: boolean; jour: number }) {
  const freeAb = useRef<Group>(null);
  const abRej = useRef<Group>(null);
  const infected = useRef<Mesh>(null);

  const angles = useMemo(() => Array.from({ length: N_ANTIGENE }, (_, i) => (i / N_ANTIGENE) * Math.PI * 2), []);
  /** Plus le taux d'anticorps est élevé, plus le microbe est recouvert (neutralisé). */
  const occupes = Math.round(N_ANTIGENE * Math.min(1, taux / 80));

  return (
    <group>
      {/* Lymphocyte B → plasmocyte (usine à anticorps) */}
      <mesh position={[-5.2, 1.4, 0]} castShadow>
        <sphereGeometry args={[0.42, 24, 18]} />
        <meshStandardMaterial color="#DDD6FE" roughness={0.55} />
      </mesh>
      <mesh position={[-5.2, 1.4, 0.14]}>
        <sphereGeometry args={[0.3, 20, 16]} />
        <meshStandardMaterial color="#6D28D9" roughness={0.5} />
      </mesh>
      <Arrow3D from={[-4.55, 1.4, 0]} to={[-3.62, 1.4, 0]} color="#7C3AED" radius={0.035} headLength={0.24} />
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
          <mesh key={i} position={[-2.75 + Math.cos(a) * 0.42, 1.25 + Math.sin(a) * 0.34, 0.42]} rotation={[Math.PI / 2, 0, a]}>
            <torusGeometry args={[0.11, 0.03, 8, 18]} />
            <meshStandardMaterial color="#8B5CF6" roughness={0.5} />
          </mesh>
        );
      })}

      {/* Anticorps libres qui filent vers le microbe A */}
      <group ref={freeAb}>
        {([0, 1, 2, 3] as number[]).map((i) => (
          <group key={i}>
            <Anticorps position={[0, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={0.85} />
          </group>
        ))}
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
        {/* rotation portée par l'animation (voir <Animate/>) : les bras visent le microbe B */}
        <Anticorps position={[0, 0, 0]} scale={0.9} />
      </group>

      {/* Lymphocyte T qui détruit une cellule infectée */}
      <mesh position={[-4.6, -1.7, 0]} castShadow>
        <sphereGeometry args={[0.45, 24, 18]} />
        <meshStandardMaterial color="#93C5FD" roughness={0.55} />
      </mesh>
      <mesh position={[-4.6, -1.7, 0.16]}>
        <sphereGeometry args={[0.31, 20, 16]} />
        <meshStandardMaterial color="#1D4ED8" roughness={0.5} />
      </mesh>
      <Arrow3D from={[-4.0, -1.7, 0]} to={[-3.15, -1.7, 0]} color="#2563EB" radius={0.033} headLength={0.22} />
      <mesh ref={infected} position={[-2.3, -1.7, 0]} castShadow>
        <sphereGeometry args={[0.58, 24, 18]} />
        <meshStandardMaterial color="#FCA5A5" roughness={0.6} emissive="#DC2626" emissiveIntensity={0.25} />
      </mesh>
      <Bacterie position={[-2.3, -1.7, 0.42]} scale={0.55} color="#7F1D1D" />

      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime;
          const f = freeAb.current;
          if (f) {
            f.children.forEach((c, i) => {
              const u = (t * 0.26 + i / 4) % 1;
              c.position.set(-2.0 + u * 3.05, 1.35 + 0.5 * Math.sin(u * Math.PI * 2 + i), 0.35 * Math.cos(t * 0.8 + i));
              c.rotation.z = 0.5 * Math.sin(t * 1.3 + i);
            });
          }
          const r = abRej.current;
          if (r) {
            const u = (t * 0.55) % 2;
            const e = u < 1 ? u : 2 - u;
            r.position.set(3.25 + e * 0.85, -1.6 + e * 0.08, 0.35);
            r.rotation.z = -Math.PI / 2 + 0.35 * Math.sin(t * 3);
          }
          infected.current?.scale.setScalar(1 - 0.4 * (0.5 + 0.5 * Math.sin(t * 1.1)));
        }}
      />

      <Tag3D position={[-5.2, 2.15, 0]} label="Lymphocyte B" tone="svt" />
      <Tag3D position={[-2.75, 2.35, 0]} label="Plasmocyte : usine à anticorps" tone="svt" />
      <Tag3D position={[1.9, 2.45, 0]} label="Microbe A · antigènes en pointe" tone="physique" />
      <Tag3D position={[0.15, 0.15, 0]} label="Anticorps en Y" tone="neutral" />
      <Tag3D position={[4.95, -0.55, 0]} label="Microbe B · autres antigènes" tone="physique" />
      <Tag3D position={[4.6, -2.75, 0]} label="L'anticorps anti-A ne s'y fixe pas" tone="neutral" />
      <Tag3D position={[-4.6, -2.55, 0]} label="Lymphocyte T" tone="svt" />
      <Tag3D position={[-2.3, -2.75, 0]} label="Cellule infectée détruite" tone="neutral" />

      <SceneLabel
        position={[-0.4, 3.35, 0]}
        title="Un anticorps = un seul antigène"
        subtitle={rappel ? 'Réponse secondaire · après le rappel du vaccin' : 'Réponse primaire · 1re rencontre'}
        tone="svt"
      />
      <Readout position={[3.6, 3.05, 0]} value={taux.toFixed(0)} unit="u.a." caption={`anticorps au jour ${jour}`} />
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

function P(day: number, v: number): Vector3Tuple {
  return [OX + day * SX, OY + v * SY, 0];
}

function MemoireView({ jour, taux, rappel }: { jour: number; taux: number; rappel: boolean }) {
  const dot = useRef<Group>(null);

  const { primaire, secondaire } = useMemo(() => {
    const a: Vector3Tuple[] = [];
    const b: Vector3Tuple[] = [];
    for (let d = 0; d <= DAY_MAX; d += 0.5) {
      a.push(P(d, titre(d, false)));
      b.push(P(d, titre(d, true)));
    }
    return { primaire: a, secondaire: b };
  }, []);

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
      <PolyLine
        points={[P(0, SEUIL), P(DAY_MAX + 0.6, SEUIL)]}
        color="#DC2626"
        width={2}
        dashed
      />
      <Tag3D position={[OX + 8.0, OY + SEUIL * SY + 0.32, 0]} label="Seuil de protection" tone="physique" />

      {/* Les deux réponses */}
      <PolyLine points={primaire} color="#2563EB" width={4} />
      <PolyLine points={secondaire} color="#16A34A" width={4} />

      {/* Repère du jour choisi */}
      <PolyLine points={[[cur[0], OY, 0], cur]} color="#94A3B8" width={2} dashed />
      <group ref={dot}>
        <Marker position={cur} color="#DC2626" size={0.14} />
      </group>

      <Animate
        fn={(state) => {
          dot.current?.scale.setScalar(1 + 0.18 * Math.sin(state.clock.elapsedTime * 3));
        }}
      />

      <Tag3D position={[OX + 14 * SX + 0.15, OY + 15.6 * SY + 0.42, 0]} label="1re rencontre : lente et faible" tone="physique" />
      <Tag3D position={[OX + 7 * SX + 1.15, OY + 134 * SY, 0]} label="Après le rappel : rapide et 8× plus forte" tone="svt" />
      <Tag3D position={[OX - 0.95, OY + 4.75, 0]} label="140 u.a." tone="neutral" />
      <Tag3D position={[OX + 9.2, OY - 0.05, 0]} label="jours" tone="neutral" />

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

export default function ImmuneScene({ view, peauIntacte, rappel, jour, taux }: ImmuneSceneProps) {
  const camera: Vector3Tuple =
    view === 'barriere' ? [0, 0.3, 12] : view === 'phagocytose' ? [0, 0.1, 13.5] : view === 'specifique' ? [0, 0.2, 14] : [0.3, 0.4, 12.5];

  return (
    <LabScene
      cameraPosition={[camera[0], camera[1], camera[2]]}
      background="#F0FDF4"
      minDistance={6}
      maxDistance={22}
      groundY={null}
    >
      {view === 'barriere' && <BarriereView peauIntacte={peauIntacte} />}
      {view === 'phagocytose' && <PhagoView />}
      {view === 'specifique' && <SpecifiqueView taux={taux} rappel={rappel} jour={jour} />}
      {view === 'memoire' && <MemoireView jour={jour} taux={taux} rappel={rappel} />}
    </LabScene>
  );
}
