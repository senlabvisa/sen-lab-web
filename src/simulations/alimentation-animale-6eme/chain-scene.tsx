'use client';

import { useRef } from 'react';
import { DoubleSide, type Group, type Mesh } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import {
  Animate,
  Arrow3D,
  Bar,
  HotspotCoach,
  LabScene,
  Readout,
  SceneLabel,
  Tag3D,
} from '@/components/lab3d';

/**
 * Scène 3D — « Qui mange qui ? » dans un champ de mil du bassin arachidier.
 *
 * Quatre maillons modélisés avec des silhouettes proportionnées (pied de mil,
 * criquet pèlerin, margouillat, rapace). L'élève clique les organismes dans
 * l'ordre de la chaîne alimentaire : chaque bonne réponse trace une flèche
 * « est mangé par ». En phase impact, des barres montrent l'effectif de chaque
 * maillon quand on traite le champ contre les criquets.
 *
 * Chargée uniquement via next/dynamic({ ssr: false }).
 */

export type OrganismKey = 'mil' | 'criquet' | 'margouillat' | 'rapace';
type V3 = [number, number, number];

const POS: Record<OrganismKey, V3> = {
  mil: [-4.2, 0, 0.4],
  criquet: [-1.5, 0.28, 0.4],
  margouillat: [1.5, 0.16, 0.4],
  rapace: [4.2, 2.1, 0.4],
};

/** Point d'accroche des flèches (au-dessus de chaque organisme). */
const ANCHOR: Record<OrganismKey, V3> = {
  mil: [-4.2, 1.5, 0.4],
  criquet: [-1.5, 0.6, 0.4],
  margouillat: [1.5, 0.55, 0.4],
  rapace: [4.2, 2.1, 0.4],
};

const BAR_COLOR: Record<OrganismKey, string> = {
  mil: '#65A30D',
  criquet: '#A3A635',
  margouillat: '#3B82F6',
  rapace: '#B45309',
};

type OrgProps = { active: boolean; onPick: () => void };

function hoverOn(e: ThreeEvent<PointerEvent>) {
  e.stopPropagation();
  document.body.style.cursor = 'pointer';
}
function hoverOff() {
  document.body.style.cursor = 'auto';
}

/** Sphère de sélection invisible : élargit la zone cliquable de l'organisme. */
function PickZone({ r, y, onPick }: { r: number; y: number; onPick: () => void }) {
  return (
    <mesh
      position={[0, y, 0]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onPick();
      }}
      onPointerOver={hoverOn}
      onPointerOut={hoverOff}
    >
      <sphereGeometry args={[r, 10, 8]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

// ── Maillon 1 : pied de mil (producteur) ────────────────────────────────
function Mil({ active, onPick }: OrgProps) {
  const epi = useRef<Mesh>(null);
  const tige = active ? '#65A30D' : '#4D7C0F';
  const feuille = active ? '#84CC16' : '#56802A';
  return (
    <group position={POS.mil}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.08, 1.6, 10]} />
        <meshStandardMaterial color={tige} roughness={0.85} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i} rotation={[0, i * 1.25, 0]}>
          <mesh position={[0.36, 0.55 + i * 0.16, 0]} rotation={[0, 0, -0.8]} scale={[1, 1, 0.1]} castShadow>
            <coneGeometry args={[0.11, 1.05, 5]} />
            <meshStandardMaterial color={feuille} roughness={0.8} side={DoubleSide} />
          </mesh>
        </group>
      ))}
      <mesh ref={epi} position={[0, 1.95, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.5, 6, 14]} />
        <meshStandardMaterial
          color={active ? '#FDE68A' : '#D3BC7B'}
          roughness={0.95}
          emissive={active ? '#F59E0B' : '#000000'}
          emissiveIntensity={active ? 0.25 : 0}
        />
      </mesh>
      <Animate fn={(s) => { if (epi.current) epi.current.rotation.z = Math.sin(s.clock.elapsedTime * 1.2) * 0.07; }} />
      <PickZone r={0.85} y={1.2} onPick={onPick} />
    </group>
  );
}

// ── Maillon 2 : criquet pèlerin (herbivore) ─────────────────────────────
function Criquet({ active, onPick }: OrgProps) {
  const g = useRef<Group>(null);
  const body = active ? '#A3E635' : '#7C9A2E';
  return (
    <group ref={g} position={POS.criquet}>
      <group scale={0.75} rotation={[0, -0.5, 0]}>
        <mesh position={[-0.2, 0.16, 0]} rotation={[0, 0, 0.12]} scale={[1.8, 0.62, 0.6]} castShadow>
          <sphereGeometry args={[0.2, 18, 12]} />
          <meshStandardMaterial color={body} roughness={0.55} emissive={active ? '#65A30D' : '#000000'} emissiveIntensity={active ? 0.3 : 0} />
        </mesh>
        <mesh position={[0.16, 0.2, 0]} scale={[1, 0.95, 0.85]} castShadow>
          <sphereGeometry args={[0.15, 16, 12]} />
          <meshStandardMaterial color={body} roughness={0.55} />
        </mesh>
        <mesh position={[0.37, 0.24, 0]} scale={[1, 1, 0.9]} castShadow>
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshStandardMaterial color={body} roughness={0.5} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[0.44, 0.28, 0.07 * s]}>
              <sphereGeometry args={[0.038, 10, 8]} />
              <meshStandardMaterial color="#1F2937" roughness={0.2} />
            </mesh>
            <mesh position={[0.5, 0.4, 0.05 * s]} rotation={[0, 0, -0.9]}>
              <cylinderGeometry args={[0.007, 0.007, 0.3, 5]} />
              <meshStandardMaterial color="#3F2A12" />
            </mesh>
            <group position={[-0.03, 0.13, 0.13 * s]}>
              <mesh position={[-0.1, 0.08, 0]} rotation={[0, 0, 0.9]}>
                <capsuleGeometry args={[0.035, 0.2, 4, 8]} />
                <meshStandardMaterial color={body} roughness={0.6} />
              </mesh>
              <mesh position={[-0.21, -0.05, 0]} rotation={[0, 0, -0.45]}>
                <cylinderGeometry args={[0.014, 0.014, 0.26, 6]} />
                <meshStandardMaterial color="#4D7C0F" />
              </mesh>
            </group>
            <mesh position={[0.14, 0.05, 0.1 * s]} rotation={[0, 0, 0.35]}>
              <cylinderGeometry args={[0.012, 0.012, 0.2, 6]} />
              <meshStandardMaterial color="#4D7C0F" />
            </mesh>
          </group>
        ))}
        {/* aile repliée le long du corps */}
        <mesh position={[-0.18, 0.26, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.28, 1, 1.05]}>
          <capsuleGeometry args={[0.11, 0.42, 4, 12]} />
          <meshStandardMaterial color={active ? '#D9F99D' : '#8FA84A'} roughness={0.4} />
        </mesh>
      </group>
      <Animate
        fn={(s) => {
          if (!g.current) return;
          const t = s.clock.elapsedTime;
          g.current.position.y = POS.criquet[1] + Math.abs(Math.sin(t * 2.4)) * 0.14;
          g.current.rotation.z = Math.sin(t * 2.4) * 0.08;
        }}
      />
      <PickZone r={0.5} y={0.2} onPick={onPick} />
    </group>
  );
}

// ── Maillon 3 : margouillat (carnivore, mange les criquets) ─────────────
function Margouillat({ active, onPick }: OrgProps) {
  const tete = useRef<Group>(null);
  const queue = useRef<Group>(null);
  const corps = active ? '#60A5FA' : '#5B7FA6';
  const tetec = active ? '#F97316' : '#C2591F';
  return (
    <group position={POS.margouillat} rotation={[0, 0.35, 0]}>
      <mesh position={[0, 0.2, 0]} scale={[2, 0.62, 0.9]} castShadow>
        <sphereGeometry args={[0.2, 20, 14]} />
        <meshStandardMaterial color={corps} roughness={0.6} emissive={active ? '#2563EB' : '#000000'} emissiveIntensity={active ? 0.22 : 0} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-0.1 + i * 0.14, 0.31, 0]} castShadow>
          <coneGeometry args={[0.03, 0.09, 5]} />
          <meshStandardMaterial color={corps} roughness={0.7} />
        </mesh>
      ))}
      <group ref={tete} position={[0.4, 0.22, 0]}>
        <mesh scale={[1.35, 0.85, 0.95]} castShadow>
          <sphereGeometry args={[0.13, 18, 12]} />
          <meshStandardMaterial color={tetec} roughness={0.5} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.08, 0.06, 0.075 * s]}>
            <sphereGeometry args={[0.028, 10, 8]} />
            <meshStandardMaterial color="#111827" roughness={0.15} />
          </mesh>
        ))}
      </group>
      <group ref={queue} position={[-0.36, 0.2, 0]}>
        <mesh position={[-0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <coneGeometry args={[0.075, 0.95, 10]} />
          <meshStandardMaterial color={corps} roughness={0.65} />
        </mesh>
      </group>
      {[
        [0.22, 0.16],
        [0.22, -0.16],
        [-0.2, 0.16],
        [-0.2, -0.16],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0.15, z]}>
          <mesh position={[0, -0.02, z > 0 ? 0.09 : -0.09]} rotation={[z > 0 ? -0.9 : 0.9, 0, 0]}>
            <capsuleGeometry args={[0.033, 0.13, 4, 8]} />
            <meshStandardMaterial color={corps} roughness={0.7} />
          </mesh>
          <mesh position={[0.02, -0.11, z > 0 ? 0.17 : -0.17]}>
            <sphereGeometry args={[0.045, 8, 6]} />
            <meshStandardMaterial color={corps} roughness={0.8} />
          </mesh>
        </group>
      ))}
      <Animate
        fn={(s) => {
          const t = s.clock.elapsedTime;
          // le margouillat fait ses « pompes » et balaie la queue
          if (tete.current) tete.current.position.y = 0.22 + Math.abs(Math.sin(t * 1.6)) * 0.07;
          if (queue.current) queue.current.rotation.y = Math.sin(t * 0.9) * 0.35;
        }}
      />
      <PickZone r={0.6} y={0.2} onPick={onPick} />
    </group>
  );
}

// ── Maillon 4 : rapace (prédateur au sommet) ────────────────────────────
function Rapace({ active, onPick }: OrgProps) {
  const g = useRef<Group>(null);
  const wings = useRef<Group[]>([]);
  const plume = active ? '#A16207' : '#6B4423';
  return (
    <group ref={g} position={POS.rapace} rotation={[0, -0.5, 0]}>
      <mesh scale={[0.75, 0.8, 1.9]} castShadow>
        <sphereGeometry args={[0.3, 20, 16]} />
        <meshStandardMaterial color={plume} roughness={0.7} emissive={active ? '#92400E' : '#000000'} emissiveIntensity={active ? 0.25 : 0} />
      </mesh>
      <mesh position={[0, 0.2, 0.44]} scale={[0.95, 0.95, 1]} castShadow>
        <sphereGeometry args={[0.17, 18, 14]} />
        <meshStandardMaterial color={active ? '#D6D3D1' : '#A8A29E'} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.19, 0.62]} rotation={[-Math.PI / 2 + 0.35, 0, 0]}>
        <coneGeometry args={[0.055, 0.2, 8]} />
        <meshStandardMaterial color="#F5C542" roughness={0.35} metalness={0.1} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.085 * s, 0.28, 0.5]}>
          <sphereGeometry args={[0.032, 10, 8]} />
          <meshStandardMaterial color="#FDE047" emissive="#F59E0B" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {/* queue en éventail */}
      <mesh position={[0, 0.02, -0.78]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 0.1]} castShadow>
        <coneGeometry args={[0.26, 0.7, 4]} />
        <meshStandardMaterial color={plume} roughness={0.75} side={DoubleSide} />
      </mesh>
      {/* ailes déployées (battement) */}
      {[0, 1].map((i) => (
        <group
          key={i}
          ref={(el) => {
            if (el) wings.current[i] = el;
          }}
          position={[0.2 * (i === 0 ? 1 : -1), 0.14, 0.05]}
          rotation={[0, i === 0 ? 0 : Math.PI, 0]}
        >
          <mesh position={[0.42, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.16, 1, 1.7]} castShadow>
            <capsuleGeometry args={[0.19, 0.5, 4, 12]} />
            <meshStandardMaterial color={plume} roughness={0.75} />
          </mesh>
          <mesh position={[1.05, -0.01, -0.05]} rotation={[0, 0, -Math.PI / 2]} scale={[0.11, 1, 1.25]} castShadow>
            <coneGeometry args={[0.22, 0.85, 6]} />
            <meshStandardMaterial color={active ? '#78350F' : '#4A2E14'} roughness={0.8} side={DoubleSide} />
          </mesh>
        </group>
      ))}
      <Animate
        fn={(s) => {
          const t = s.clock.elapsedTime;
          const flap = Math.sin(t * 2.2) * 0.32;
          wings.current.forEach((w) => { if (w) w.rotation.z = flap; });
          if (g.current) g.current.position.y = POS.rapace[1] + Math.sin(t * 2.2) * 0.12;
        }}
      />
      <PickZone r={0.7} y={0} onPick={onPick} />
    </group>
  );
}

// ── Décor : savane du bassin arachidier ─────────────────────────────────
function Acacia({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.16, 1.8, 10]} />
        <meshStandardMaterial color="#6B5233" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.95, 0]} scale={[1, 0.28, 1]} castShadow>
        <sphereGeometry args={[1.05, 18, 12]} />
        <meshStandardMaterial color="#4F7C3A" roughness={0.9} />
      </mesh>
    </group>
  );
}

export type ChainSceneProps = {
  /** Organismes déjà validés, dans l'ordre de la chaîne. */
  clicked: OrganismKey[];
  /** Prochain maillon attendu (null si la chaîne est finie). */
  next: OrganismKey | null;
  onPick: (k: OrganismKey) => void;
  /** Affiche les barres d'effectifs (phase « traitement du champ »). */
  showImpact: boolean;
  /** Effectifs courants de chaque maillon. */
  counts: Record<OrganismKey, number>;
  /** Part de survivants (0 → 1) appliquée aux animaux. */
  survie: number;
};

function shorten(a: V3, b: V3, m: number): { from: V3; to: V3 } {
  const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L = Math.hypot(d[0], d[1], d[2]) || 1;
  const u: V3 = [d[0] / L, d[1] / L, d[2] / L];
  return {
    from: [a[0] + u[0] * m, a[1] + u[1] * m, a[2] + u[2] * m],
    to: [b[0] - u[0] * m, b[1] - u[1] * m, b[2] - u[2] * m],
  };
}

const BAR_KEYS: OrganismKey[] = ['mil', 'criquet', 'margouillat', 'rapace'];
const BAR_SHORT: Record<OrganismKey, string> = {
  mil: 'Mil',
  criquet: 'Criquets',
  margouillat: 'Margouillats',
  rapace: 'Rapaces',
};

export default function ChainScene({ clicked, next, onPick, showImpact, counts, survie }: ChainSceneProps) {
  const isOn = (k: OrganismKey) => clicked.includes(k);

  return (
    <LabScene cameraPosition={[0, 3.2, 10.5]} background="#FDF0C9" minDistance={6} maxDistance={20} groundY={0} enablePan>
      <fog attach="fog" args={['#FDF0C9', 14, 32]} />

      {/* sol de savane */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[18, 56]} />
        <meshStandardMaterial color="#D9BE7A" roughness={0.98} />
      </mesh>
      <Acacia x={-7.5} z={-5} s={1.1} />
      <Acacia x={6.5} z={-6} s={0.85} />

      <Mil active={isOn('mil')} onPick={() => onPick('mil')} />
      <Criquet active={isOn('criquet')} onPick={() => onPick('criquet')} />
      <Margouillat active={isOn('margouillat')} onPick={() => onPick('margouillat')} />
      <Rapace active={isOn('rapace')} onPick={() => onPick('rapace')} />

      {/* flèches « est mangé par » entre maillons validés */}
      {clicked.slice(0, -1).map((k, i) => {
        const seg = shorten(ANCHOR[k], ANCHOR[clicked[i + 1]], 0.55);
        const midY = (seg.from[1] + seg.to[1]) / 2 + 0.35;
        return (
          <group key={k}>
            <Arrow3D from={seg.from} to={seg.to} color="#059669" radius={0.045} headLength={0.3} />
            <Tag3D position={[(seg.from[0] + seg.to[0]) / 2, midY, seg.from[2]]} label="est mangé par" tone="svt" />
          </group>
        );
      })}

      {next && (
        <HotspotCoach
          position={[POS[next][0], POS[next][1] + (next === 'mil' ? 2.5 : next === 'rapace' ? 0.9 : 1.1), POS[next][2]]}
          label={clicked.length === 0 ? 'Commence ici' : 'Qui le mange ?'}
          tone="action"
        />
      )}

      {/* barres d'effectifs (phase traitement) */}
      {showImpact && (
        <group position={[0, 0, -3.2]}>
          {BAR_KEYS.map((k) => {
            const ratio = k === 'mil' ? 1 : survie;
            const h = 0.06 + 2.4 * ratio;
            return (
              <group key={k} position={[POS[k][0], 0, 0]}>
                <Bar x={0} height={h} width={0.7} depth={0.7} color={BAR_COLOR[k]} />
                <Readout position={[0, h + 0.45, 0]} value={counts[k]} caption={BAR_SHORT[k]} />
              </group>
            );
          })}
          <SceneLabel
            position={[0, 3.6, 0]}
            title={`Survivants : ${Math.round(survie * 100)} %`}
            subtitle="Effectifs après traitement du champ"
            tone="svt"
          />
        </group>
      )}

      {!showImpact && (
        <SceneLabel
          position={[0, 3.5, 0]}
          title={`Chaîne alimentaire : ${clicked.length}/4 maillons`}
          subtitle="Champ de mil · bassin arachidier"
          tone="svt"
        />
      )}
    </LabScene>
  );
}
