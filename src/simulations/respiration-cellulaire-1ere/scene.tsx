'use client';

import { useRef } from 'react';
import type { Group } from 'three';
import {
  Animate,
  Arrow3D,
  Bar,
  LabScene,
  MOLECULES,
  Molecule,
  Readout,
  SceneLabel,
  Tag3D,
  type AtomSpec,
  type BondSpec,
} from '@/components/lab3d';

/**
 * Scène 3D — la respiration CELLULAIRE (SVT, Première S).
 *
 * Trois vues complémentaires, toutes construites sur le kit lab3d :
 *  1. « mitochondrie » — coupe d'une mitochondrie (double membrane, espace
 *     intermembranaire, matrice, crêtes). Le glucose et le dioxygène entrent,
 *     le dioxyde de carbone et l'eau sortent, l'ATP est libéré. Sans O₂, la
 *     mitochondrie s'éteint et de l'acide lactique apparaît.
 *  2. « etapes » — les trois temps de l'oxydation du glucose et leur
 *     rendement : glycolyse (2 ATP, cytoplasme), cycle de Krebs (2 ATP,
 *     matrice), chaîne respiratoire (≈ 32 ATP, crêtes). Total ≈ 36 ATP.
 *  3. « bilan » — histogramme comparatif respiration (36 ATP) / fermentation
 *     lactique (2 ATP) + molécules O₂, CO₂, H₂O.
 *
 * À ne pas confondre avec la scène du TP de 5ème (respiration ventilatoire :
 * thorax, alvéoles, eau de chaux) : ici on est à l'intérieur de la cellule.
 *
 * Règle R3F : aucun useFrame dans le composant qui retourne <LabScene> —
 * l'animation passe par <Animate>, enfant du Canvas.
 */

export type MitoView = 'mitochondrie' | 'etapes' | 'bilan';
export type MitoSceneProps = { view: MitoView; glucose: number; aerobie: boolean };

export const ATP_RESPIRATION = 36;
export const ATP_FERMENTATION = 2;

const BASE_Y = -1.7;
const CRISTAE = [-1.05, -0.63, -0.21, 0.21, 0.63, 1.05];

/** Acide lactique CH₃–CHOH–COOH (squelette d'atomes lourds). */
const LACTATE_ATOMS: AtomSpec[] = [
  { el: 'C', pos: [-1.15, -0.35, 0] },
  { el: 'C', pos: [0, 0.2, 0] },
  { el: 'C', pos: [1.15, -0.35, 0] },
  { el: 'O', pos: [0.05, 1.25, 0] },
  { el: 'O', pos: [2.1, 0.25, 0] },
  { el: 'O', pos: [1.25, -1.45, 0] },
];
const LACTATE_BONDS: BondSpec[] = [[0, 1], [1, 2], [1, 3], [2, 4, 2], [2, 5]];

// ──────────────────────────────────────────────────────────────────────
// Vue 1 — la mitochondrie en coupe
// ──────────────────────────────────────────────────────────────────────

function MitochondrieView({ aerobie }: { aerobie: boolean }) {
  const sucre = useRef<Group>(null);
  const o2 = useRef<Group>(null);
  const dechets = useRef<Group>(null);
  const lactate = useRef<Group>(null);
  const atp = useRef<Group>(null);

  return (
    <>
      {/* Membrane externe (lisse) */}
      <mesh scale={[1.75, 1, 1]}>
        <sphereGeometry args={[1.18, 40, 28]} />
        <meshStandardMaterial color="#F9A8D4" transparent opacity={0.2} roughness={0.2} />
      </mesh>
      {/* Membrane interne (repliée en crêtes) — laisse voir l'espace intermembranaire */}
      <mesh scale={[1.66, 0.88, 0.88]}>
        <sphereGeometry args={[1.08, 36, 26]} />
        <meshStandardMaterial color="#DB2777" transparent opacity={0.22} roughness={0.3} />
      </mesh>
      {/* Matrice */}
      <mesh scale={[1.6, 0.82, 0.82]}>
        <sphereGeometry args={[1.0, 32, 24]} />
        <meshStandardMaterial color="#FBCFE8" transparent opacity={0.42} roughness={0.5} />
      </mesh>

      {/* Crêtes = replis de la membrane interne, là où siège la chaîne respiratoire */}
      {CRISTAE.map((x, i) => (
        <mesh key={x} position={[x, i % 2 === 0 ? -0.6 : 0.6, 0]} rotation={[0, 0, i % 2 === 0 ? 0 : Math.PI]}>
          <torusGeometry args={[0.36, 0.06, 10, 26, Math.PI]} />
          <meshStandardMaterial
            color="#BE185D"
            roughness={0.35}
            emissive="#9D174D"
            emissiveIntensity={aerobie ? 0.5 : 0.05}
          />
        </mesh>
      ))}

      {/* Glucose : cycle hexagonal (C₆H₁₂O₆) */}
      <group ref={sucre}>
        <mesh>
          <torusGeometry args={[0.19, 0.055, 6, 6]} />
          <meshStandardMaterial color="#F59E0B" roughness={0.3} emissive="#B45309" emissiveIntensity={0.35} />
        </mesh>
      </group>

      {/* Réactifs et produits de la respiration (uniquement en présence de O₂) */}
      {aerobie && (
        <group ref={o2}>
          <Molecule atoms={MOLECULES.O2.atoms} bonds={MOLECULES.O2.bonds} scale={0.3} />
        </group>
      )}
      {aerobie && (
        <group ref={dechets}>
          <group position={[0, 0.32, 0]}>
            <Molecule atoms={MOLECULES.CO2.atoms} bonds={MOLECULES.CO2.bonds} scale={0.26} />
          </group>
          <group position={[0, -0.36, 0]}>
            <Molecule atoms={MOLECULES.H2O.atoms} bonds={MOLECULES.H2O.bonds} scale={0.3} />
          </group>
        </group>
      )}
      {!aerobie && (
        <group ref={lactate}>
          <Molecule atoms={LACTATE_ATOMS} bonds={LACTATE_BONDS} scale={0.26} />
        </group>
      )}

      {/* ATP : adénosine + 3 groupements phosphate */}
      <group ref={atp}>
        <mesh>
          <boxGeometry args={[0.3, 0.17, 0.13]} />
          <meshStandardMaterial color="#10B981" roughness={0.3} emissive="#047857" emissiveIntensity={0.5} />
        </mesh>
        {[0.24, 0.37, 0.5].map((px) => (
          <mesh key={px} position={[px, 0, 0]}>
            <sphereGeometry args={[0.055, 14, 10]} />
            <meshStandardMaterial color="#FBBF24" roughness={0.3} emissive="#D97706" emissiveIntensity={0.4} />
          </mesh>
        ))}
      </group>

      <Animate
        fn={(state) => {
          const t = (state.clock.elapsedTime % 4) / 4;
          sucre.current?.position.set(-3.3 + t * 2.6, 0.6, 0.95);
          o2.current?.position.set(-3.3 + t * 2.6, -0.45, 0.95);
          dechets.current?.position.set(0.7 + t * 2.6, 0.2, 0.95);
          lactate.current?.position.set(0.7 + t * 2.6, -0.4, 0.95);
          atp.current?.position.set(-0.95 + t * 2.0, 1.2 + Math.sin(t * Math.PI) * 0.3, 0.8);
        }}
      />

      <Tag3D position={[-2.5, 1.35, 0.95]} label={aerobie ? 'Glucose + O₂ entrent' : 'Glucose seul (pas de O₂)'} tone="svt" />
      <Tag3D position={[2.5, -1.15, 0.95]} label={aerobie ? 'CO₂ + H₂O sortent' : 'Acide lactique'} tone="chimie" />
      <Tag3D position={[0, 1.9, 0.8]} label="ATP" tone="physique" />
      <Tag3D position={[-1.5, -1.32, 0]} label="Crêtes" tone="svt" />
      <Tag3D position={[0.15, 0.05, 0]} label="Matrice" tone="neutral" />
      <Tag3D position={[1.95, 0.95, 0]} label="Double membrane" tone="svt" />
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Vue 2 — les trois étapes et leur rendement
// ──────────────────────────────────────────────────────────────────────

const STAGES: { x: number; atp: number; name: string; place: string; color: string }[] = [
  { x: -2.5, atp: 2, name: 'Glycolyse', place: 'cytoplasme', color: '#F59E0B' },
  { x: 0, atp: 2, name: 'Cycle de Krebs', place: 'matrice', color: '#EC4899' },
  { x: 2.5, atp: 32, name: 'Chaîne respiratoire', place: 'crêtes', color: '#10B981' },
];

function EtapesView() {
  const K = 0.075; // 1 ATP → 0,075 unité de hauteur
  return (
    <>
      <group position={[0, BASE_Y, 0]}>
        {STAGES.map((s) => (
          <Bar key={s.name} x={s.x} height={s.atp * K} width={1.1} depth={1.1} color={s.color} />
        ))}
      </group>
      {STAGES.map((s) => (
        <group key={s.name}>
          <Tag3D position={[s.x, BASE_Y + s.atp * K + 0.4, 0]} label={`${s.atp} ATP`} tone="physique" />
          <Tag3D position={[s.x, BASE_Y - 0.35, 0]} label={s.name} tone="svt" />
          <Tag3D position={[s.x, BASE_Y - 0.8, 0]} label={s.place} tone="neutral" />
        </group>
      ))}
      <Arrow3D from={[-1.85, BASE_Y + 0.75, 0]} to={[-0.65, BASE_Y + 0.75, 0]} color="#BE185D" radius={0.03} headLength={0.24} />
      <Arrow3D from={[0.65, BASE_Y + 0.75, 0]} to={[1.85, BASE_Y + 0.75, 0]} color="#BE185D" radius={0.03} headLength={0.24} />
      <Tag3D position={[-1.25, BASE_Y + 1.15, 0]} label="pyruvate" tone="chimie" />
      <Tag3D position={[1.25, BASE_Y + 1.15, 0]} label="transporteurs réduits" tone="chimie" />
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Vue 3 — bilan comparatif respiration / fermentation
// ──────────────────────────────────────────────────────────────────────

function BilanView() {
  const K = 0.07;
  return (
    <>
      <group position={[0, BASE_Y, 0]}>
        <Bar x={-1.5} height={ATP_RESPIRATION * K} width={1.2} depth={1.2} color="#10B981" />
        <Bar x={1.5} height={ATP_FERMENTATION * K} width={1.2} depth={1.2} color="#F59E0B" />
      </group>
      <Tag3D position={[-1.5, BASE_Y + ATP_RESPIRATION * K + 0.4, 0]} label="36 ATP" tone="physique" />
      <Tag3D position={[1.5, BASE_Y + ATP_FERMENTATION * K + 0.4, 0]} label="2 ATP" tone="physique" />
      <Tag3D position={[-1.5, BASE_Y - 0.35, 0]} label="Respiration (avec O₂)" tone="svt" />
      <Tag3D position={[1.5, BASE_Y - 0.35, 0]} label="Fermentation (sans O₂)" tone="chimie" />

      {/* Les gaz de l'équation bilan */}
      <group position={[-2.6, 1.6, 0]}>
        <Molecule atoms={MOLECULES.O2.atoms} bonds={MOLECULES.O2.bonds} scale={0.34} />
      </group>
      <Tag3D position={[-2.6, 1.05, 0]} label="O₂ consommé" tone="chimie" />
      <group position={[0, 1.6, 0]}>
        <Molecule atoms={MOLECULES.CO2.atoms} bonds={MOLECULES.CO2.bonds} scale={0.3} />
      </group>
      <Tag3D position={[0, 1.05, 0]} label="CO₂ rejeté" tone="chimie" />
      <group position={[2.6, 1.6, 0]}>
        <Molecule atoms={MOLECULES.H2O.atoms} bonds={MOLECULES.H2O.bonds} scale={0.34} />
      </group>
      <Tag3D position={[2.6, 1.05, 0]} label="H₂O formée" tone="chimie" />
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────

export default function MitoScene({ view, glucose, aerobie }: MitoSceneProps) {
  const rendement = aerobie ? ATP_RESPIRATION : ATP_FERMENTATION;
  const atpTotal = glucose * rendement;

  const title =
    view === 'mitochondrie'
      ? aerobie
        ? 'Mitochondrie en activité'
        : 'Mitochondrie à l’arrêt (pas de O₂)'
      : view === 'etapes'
        ? 'Où sont fabriqués les 36 ATP ?'
        : 'Respiration ou fermentation ?';

  const subtitle =
    view === 'mitochondrie'
      ? 'coupe · double membrane et crêtes'
      : view === 'etapes'
        ? 'glycolyse · Krebs · chaîne respiratoire'
        : 'même glucose, rendement 18 fois plus faible';

  return (
    <LabScene cameraPosition={[0, 0.15, 7.2]} background="#FFF1F5" minDistance={4} maxDistance={14} groundY={null}>
      {view === 'mitochondrie' && <MitochondrieView aerobie={aerobie} />}
      {view === 'etapes' && <EtapesView />}
      {view === 'bilan' && <BilanView />}

      <SceneLabel position={[0, 2.5, 0]} title={title} subtitle={subtitle} tone="svt" />
      <Readout
        position={[0, -2.55, 0]}
        value={atpTotal}
        unit="ATP"
        caption={`${glucose} glucose × ${rendement} ATP`}
      />
    </LabScene>
  );
}
