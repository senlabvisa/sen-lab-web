'use client';

import { useMemo, useRef, useState } from 'react';
import { DoubleSide } from 'three';
import type { Group, Mesh } from 'three';
import {
  Animate,
  Arrow3D,
  Erlenmeyer,
  LabBench,
  LabScene,
  MOLECULES,
  Molecule,
  Readout,
  SceneLabel,
  Tag3D,
} from '@/components/lab3d';

/**
 * Scène 3D — respiration VENTILATOIRE (SVT, 5ème).
 *
 * Trois vues complémentaires, pilotées depuis le module :
 *  1. « thorax »  : cage thoracique (côtes, sternum, colonne), trachée, bronches,
 *                   poumons (2 lobes à gauche / 3 à droite) et diaphragme en dôme.
 *                   Le cycle inspiration ↔ expiration est animé au rythme réel
 *                   choisi par l'élève (période T = 60 / fréquence).
 *  2. « alveole » : zoom sur une alvéole pulmonaire accolée à un capillaire ;
 *                   le O₂ passe de l'air vers le sang, le CO₂ fait l'inverse.
 *  3. « chaux »   : test à l'eau de chaux (témoin air ambiant vs air expiré).
 *
 * Attention : ce TP porte sur la respiration ventilatoire (appareil respiratoire),
 * pas sur la respiration cellulaire (mitochondries, TP de Première).
 *
 * Règle R3F : aucun useFrame dans le composant qui retourne <LabScene> —
 * toute l'animation passe par <Animate> à l'intérieur des sous-composants.
 */

export type View = 'thorax' | 'alveole' | 'chaux';
export type LungsSceneProps = { view: View; freq: number };

const FLESH = '#EF9AAE';
const FLESH_DARK = '#C9647E';
const BONE = '#EDE7DC';

// ──────────────────────────────────────────────────────────────────────
// Vue 1 — thorax : mécanique ventilatoire
// ──────────────────────────────────────────────────────────────────────

const RIBS: { y: number; r: number }[] = [
  { y: 1.05, r: 0.82 },
  { y: 0.7, r: 0.98 },
  { y: 0.35, r: 1.07 },
  { y: 0.0, r: 1.1 },
  { y: -0.35, r: 1.04 },
  { y: -0.7, r: 0.9 },
];

function Lung({ x, lobes }: { x: number; lobes: number }) {
  return (
    <>
      <mesh position={[0, 0.45, 0]} scale={[1, 0.95, 0.85]} castShadow>
        <sphereGeometry args={[0.38, 22, 18]} />
        <meshStandardMaterial color={FLESH} roughness={0.75} />
      </mesh>
      <mesh position={[x * 0.12, -0.12, 0]} scale={[1, 1, 0.85]} castShadow>
        <sphereGeometry args={[0.43, 22, 18]} />
        <meshStandardMaterial color={FLESH} roughness={0.75} />
      </mesh>
      {lobes === 3 && (
        <mesh position={[x * 0.08, -0.68, 0]} scale={[1, 0.85, 0.8]} castShadow>
          <sphereGeometry args={[0.38, 22, 18]} />
          <meshStandardMaterial color={FLESH_DARK} roughness={0.75} />
        </mesh>
      )}
    </>
  );
}

function Thorax({ freq }: { freq: number }) {
  const ribs = useRef<Group>(null);
  const lungL = useRef<Group>(null);
  const lungR = useRef<Group>(null);
  const diaph = useRef<Mesh>(null);
  const air = useRef<Group>(null);
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  const w = (2 * Math.PI * freq) / 60; // pulsation du cycle respiratoire (rad/s)

  return (
    <group>
      {/* Colonne vertébrale (arrière) */}
      <mesh position={[0, 0.15, -1.02]} castShadow>
        <cylinderGeometry args={[0.13, 0.15, 2.3, 16]} />
        <meshStandardMaterial color={BONE} roughness={0.7} />
      </mesh>

      {/* Cage thoracique : côtes + sternum (se soulève à l'inspiration) */}
      <group ref={ribs}>
        {RIBS.map((rib) => (
          <group key={rib.y} position={[0, rib.y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh rotation={[0, 0, -Math.PI * 0.275]} castShadow>
              <torusGeometry args={[rib.r, 0.055, 10, 48, Math.PI * 1.55]} />
              <meshStandardMaterial color={BONE} roughness={0.65} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.2, 0.98]} castShadow>
          <boxGeometry args={[0.2, 1.85, 0.12]} />
          <meshStandardMaterial color={BONE} roughness={0.65} />
        </mesh>
      </group>

      {/* Trachée + bronches */}
      <mesh position={[0, 1.58, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.15, 0.95, 18]} />
        <meshStandardMaterial color="#E8A8B8" roughness={0.6} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.28, 0.95, 0]} rotation={[0, 0, -s * 0.62]} castShadow>
          <cylinderGeometry args={[0.075, 0.1, 0.78, 14]} />
          <meshStandardMaterial color="#E8A8B8" roughness={0.6} />
        </mesh>
      ))}

      {/* Colonne d'air qui descend (inspiration) puis remonte (expiration) */}
      <group ref={air}>
        {[0.18, 0, -0.18].map((d) => (
          <mesh key={d} position={[0, d, 0]}>
            <sphereGeometry args={[0.06, 12, 10]} />
            <meshStandardMaterial color="#7DD3FC" emissive="#0EA5E9" emissiveIntensity={0.5} />
          </mesh>
        ))}
      </group>

      {/* Poumons (gauche : 2 lobes · droit : 3 lobes) */}
      <group ref={lungL} position={[-0.62, 0.05, 0]}>
        <Lung x={-1} lobes={2} />
      </group>
      <group ref={lungR} position={[0.62, 0.05, 0]}>
        <Lung x={1} lobes={3} />
      </group>

      {/* Diaphragme : dôme musculaire qui s'abaisse et s'aplatit à l'inspiration */}
      <mesh ref={diaph} position={[0, -1.15, 0]} scale={[1.05, 0.55, 0.85]} castShadow>
        <sphereGeometry args={[1, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#B04358" roughness={0.72} side={DoubleSide} />
      </mesh>

      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime * w;
          const e = (1 - Math.cos(t)) / 2; // 0 = fin d'expiration · 1 = fin d'inspiration
          if (ribs.current) {
            ribs.current.scale.setScalar(1 + 0.07 * e);
            ribs.current.position.y = 0.06 * e;
          }
          const s = 0.9 + 0.22 * e;
          lungL.current?.scale.set(s, s, s);
          lungR.current?.scale.set(s, s, s);
          if (diaph.current) {
            diaph.current.position.y = -1.15 - 0.3 * e;
            diaph.current.scale.set(1.05 + 0.1 * e, 0.55 - 0.28 * e, 0.85 + 0.08 * e);
          }
          if (air.current) air.current.position.y = 1.35 - 1.7 * e;
          const next = Math.sin(t) > 0 ? 'in' : 'out';
          setPhase((prev) => (prev === next ? prev : next));
        }}
      />

      <SceneLabel
        position={[0, 2.85, 0]}
        title={phase === 'in' ? 'INSPIRATION' : 'EXPIRATION'}
        subtitle={
          phase === 'in'
            ? 'le diaphragme descend · le volume augmente'
            : 'le diaphragme remonte · le volume diminue'
        }
        tone="svt"
      />
      <Tag3D position={[0.8, 1.95, 0]} label="Trachée" tone="svt" />
      <Tag3D position={[-1.0, 1.15, 0]} label="Bronche" tone="svt" />
      <Tag3D position={[1.75, 0.35, 0]} label="Poumon" tone="svt" />
      <Tag3D position={[-1.8, 0.75, 0]} label="Côtes" tone="neutral" />
      <Tag3D position={[0, -1.95, 0]} label="Diaphragme" tone="physique" />
      <Readout position={[2.1, -1.15, 0]} value={(60 / freq).toFixed(1)} unit="s" caption="durée d'un cycle" />
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Vue 2 — alvéole pulmonaire et échanges gazeux
// ──────────────────────────────────────────────────────────────────────

function AlveoleView() {
  const o2 = useRef<Group>(null);
  const co2 = useRef<Group>(null);
  const blood = useRef<Group>(null);

  return (
    <group>
      {/* Bronchiole qui amène l'air */}
      <mesh position={[0, 2.15, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.22, 1.1, 18]} />
        <meshStandardMaterial color="#E8A8B8" roughness={0.6} />
      </mesh>

      {/* Sac alvéolaire : une grande alvéole ouverte + la grappe voisine */}
      <mesh position={[0, 0.75, 0]}>
        <sphereGeometry args={[0.98, 36, 28]} />
        <meshStandardMaterial color="#FFC9D6" transparent opacity={0.32} roughness={0.25} />
      </mesh>
      {([
        [-1.2, 1.3, -0.25],
        [1.25, 1.35, -0.2],
        [0.1, 1.85, -0.55],
      ] as [number, number, number][]).map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.44, 24, 18]} />
          <meshStandardMaterial color="#FFB3C4" transparent opacity={0.5} roughness={0.35} />
        </mesh>
      ))}

      {/* Capillaire sanguin : sang pauvre en O₂ (gauche) → riche en O₂ (droite) */}
      <mesh position={[-1.1, -0.7, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 2.2, 26, 1, true]} />
        <meshStandardMaterial color="#3B5BFF" transparent opacity={0.42} roughness={0.3} side={DoubleSide} />
      </mesh>
      <mesh position={[1.1, -0.7, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 2.2, 26, 1, true]} />
        <meshStandardMaterial color="#DC2626" transparent opacity={0.42} roughness={0.3} side={DoubleSide} />
      </mesh>

      {/* Hématies qui circulent dans le capillaire */}
      <group ref={blood}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[-2 + i * 1.05, -0.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.07, 16]} />
            <meshStandardMaterial color="#B91C1C" roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* O₂ : de l'air alvéolaire vers le sang */}
      <Arrow3D from={[-0.7, 0.35, 0.42]} to={[-0.7, -0.32, 0.42]} color="#EF4444" radius={0.035} headLength={0.2} />
      <group ref={o2}>
        <Molecule atoms={MOLECULES.O2.atoms} bonds={MOLECULES.O2.bonds} scale={0.42} />
      </group>

      {/* CO₂ : du sang vers l'air alvéolaire */}
      <Arrow3D from={[0.8, -0.32, 0.42]} to={[0.8, 0.35, 0.42]} color="#64748B" radius={0.035} headLength={0.2} />
      <group ref={co2}>
        <Molecule atoms={MOLECULES.CO2.atoms} bonds={MOLECULES.CO2.bonds} scale={0.34} />
      </group>

      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime;
          const u = (t % 3) / 3; // 0 → 1
          o2.current?.position.set(-0.7, 0.45 - 1.15 * u, 0.42);
          co2.current?.position.set(0.8, -0.5 + 1.15 * u, 0.42);
          if (blood.current) blood.current.position.x = ((t * 0.35) % 1.05) - 0.5;
        }}
      />

      <SceneLabel position={[0, 3.2, 0]} title="Échanges gazeux" subtitle="paroi de l'alvéole ↔ capillaire" tone="svt" />
      <Tag3D position={[0.95, 2.55, 0]} label="Bronchiole" tone="svt" />
      <Tag3D position={[-1.95, 0.55, 0]} label="Alvéole" tone="svt" />
      <Tag3D position={[-1.15, 0.05, 0.45]} label="O₂ → sang" tone="physique" />
      <Tag3D position={[1.35, 0.05, 0.45]} label="CO₂ → air" tone="neutral" />
      <Tag3D position={[-2.0, -1.35, 0]} label="Sang pauvre en O₂" tone="maths" />
      <Tag3D position={[2.0, -1.35, 0]} label="Sang riche en O₂" tone="physique" />
      <Readout position={[2.5, 1.35, 0]} value="21 → 16" unit="% O₂" caption="air inspiré → expiré" />
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Vue 3 — test à l'eau de chaux
// ──────────────────────────────────────────────────────────────────────

const BENCH_Y = -1.9;

function ChauxView() {
  const bubbles = useRef<Group>(null);

  const trouble = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < 22; i++) {
      const a = (i * 2.399) % (Math.PI * 2);
      const r = 0.12 + 0.3 * ((i * 7) % 10) / 10;
      pts.push([Math.cos(a) * r, -1.8 + ((i * 3) % 10) / 10 * 0.44, Math.sin(a) * r]);
    }
    return pts;
  }, []);

  return (
    <group>
      <LabBench y={BENCH_Y} color="#E9E1D4" size={22} />

      {/* Témoin : eau de chaux limpide, au contact de l'air ambiant */}
      <Erlenmeyer position={[-1.6, -0.7, 0]} fill={0.42} liquidColor="#E6F4FF" height={2.4} />

      {/* Air expiré soufflé à la paille : l'eau de chaux se trouble */}
      <Erlenmeyer position={[1.6, -0.7, 0]} fill={0.42} liquidColor="#F3F6FA" height={2.4} />
      <mesh position={[1.6, 0.35, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 2.6, 12]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.5} />
      </mesh>

      {/* Trouble : fines particules de carbonate de calcium en suspension */}
      <group position={[1.6, 0, 0]}>
        {trouble.map((p, i) => (
          <mesh key={i} position={p}>
            <sphereGeometry args={[0.045, 8, 6]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* Bulles d'air expiré qui remontent */}
      <group ref={bubbles} position={[1.6, 0, 0]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[(i - 2) * 0.09, 0, ((i % 3) - 1) * 0.08]}>
            <sphereGeometry args={[0.055, 10, 8]} />
            <meshStandardMaterial color="#BAE6FD" transparent opacity={0.75} roughness={0.1} />
          </mesh>
        ))}
      </group>

      <Animate
        fn={(state) => {
          if (!bubbles.current) return;
          const t = state.clock.elapsedTime;
          bubbles.current.children.forEach((m, i) => {
            const u = ((t * 0.55 + i * 0.2) % 1);
            m.position.y = -1.78 + u * 0.46;
          });
        }}
      />

      <SceneLabel
        position={[0, 2.35, 0]}
        title="Test à l'eau de chaux"
        subtitle="elle se trouble en présence de dioxyde de carbone"
        tone="chimie"
      />
      <Tag3D position={[-1.6, 0.95, 0]} label="Témoin : air ambiant" tone="neutral" />
      <Tag3D position={[1.6, 1.85, 0]} label="Air expiré (paille)" tone="svt" />
      <Tag3D position={[-1.6, -2.25, 0]} label="reste limpide" tone="neutral" />
      <Tag3D position={[1.6, -2.25, 0]} label="se trouble → CO₂" tone="chimie" />
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────

export default function LungsScene({ view, freq }: LungsSceneProps) {
  if (view === 'chaux') {
    return (
      <LabScene cameraPosition={[0, 0.4, 7.2]} background="#F1F5F9" minDistance={4} maxDistance={13} groundY={BENCH_Y}>
        <ChauxView />
      </LabScene>
    );
  }
  if (view === 'alveole') {
    return (
      <LabScene cameraPosition={[0, 0.5, 7.6]} background="#FFF1F5" minDistance={4} maxDistance={14} groundY={null}>
        <AlveoleView />
      </LabScene>
    );
  }
  return (
    <LabScene cameraPosition={[0.8, 0.5, 6.4]} background="#FFF1F5" minDistance={3.5} maxDistance={13} groundY={null}>
      <Thorax freq={freq} />
    </LabScene>
  );
}
