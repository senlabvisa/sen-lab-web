'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Quaternion, Vector3 } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { HotspotCoach } from '@/components/lab/hotspot-coach';

/**
 * Scène 3D — chaîne alimentaire de la savane sénégalaise.
 *
 * 5 organismes positionnés en arc, cliquables. Quand l'élève les clique
 * dans le bon ordre (herbe → criquet → lézard → serpent → faucon), des
 * flèches vertes apparaissent entre eux dans la scène 3D pour matérialiser
 * la chaîne. Si erreur, le clic est ignoré et un signal visuel s'affiche.
 *
 * Doit être chargé via next/dynamic({ ssr: false }).
 */

export type OrganismKey = 'herbe' | 'criquet' | 'lezard' | 'serpent' | 'faucon';

const ORGANISM_LABELS: Record<OrganismKey, string> = {
  herbe: 'Herbe / Mil',
  criquet: 'Criquet',
  lezard: 'Lézard',
  serpent: 'Serpent',
  faucon: 'Faucon',
};

const ORGANISM_POSITIONS: Record<OrganismKey, [number, number, number]> = {
  herbe: [-3.5, 0, 1.5],
  criquet: [-1.7, 0.05, -0.5],
  lezard: [0.2, 0.05, 1.2],
  serpent: [2.0, 0.1, -1.0],
  faucon: [3.6, 1.6, 0.8],
};

const ORDER: OrganismKey[] = ['herbe', 'criquet', 'lezard', 'serpent', 'faucon'];

function PointerHandlers(onClick?: () => void) {
  return {
    onClick: (e: any) => {
      e.stopPropagation();
      onClick?.();
    },
    onPointerOver: (e: any) => {
      e.stopPropagation();
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      document.body.style.cursor = 'auto';
    },
  };
}

// =========================================================================
// SAVANE
// =========================================================================
function Savana() {
  return (
    <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[14, 48]} />
      <meshStandardMaterial color="#D4B26A" roughness={0.95} />
    </mesh>
  );
}

// =========================================================================
// ORGANISMES
// =========================================================================
function Herbe({ active, onClick }: { active: boolean; onClick: () => void }) {
  const handlers = PointerHandlers(onClick);
  // Petite touffe d'herbe : plusieurs cônes verts
  return (
    <group position={ORGANISM_POSITIONS.herbe} {...handlers}>
      {Array.from({ length: 7 }).map((_, i) => {
        const a = (i / 7) * Math.PI * 2;
        const x = Math.cos(a) * 0.18;
        const z = Math.sin(a) * 0.18;
        const h = 0.35 + Math.random() * 0.15;
        return (
          <mesh key={i} position={[x, h / 2, z]}>
            <coneGeometry args={[0.08, h, 5]} />
            <meshStandardMaterial
              color={active ? '#84CC16' : '#65A30D'}
              emissive={active ? '#65A30D' : '#000'}
              emissiveIntensity={active ? 0.3 : 0}
            />
          </mesh>
        );
      })}
      {/* Épi de mil au centre */}
      <mesh position={[0, 0.65, 0]} scale={[0.4, 1, 0.4]}>
        <sphereGeometry args={[0.18, 10, 8]} />
        <meshStandardMaterial color={active ? '#FDE047' : '#CA8A04'} />
      </mesh>
    </group>
  );
}

function Criquet({ active, onClick }: { active: boolean; onClick: () => void }) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      groupRef.current.position.y = ORGANISM_POSITIONS.criquet[1] + Math.abs(Math.sin(t * 4)) * 0.06;
    }
  });
  const handlers = PointerHandlers(onClick);
  const body = active ? '#A3E635' : '#65A30D';
  return (
    <group ref={groupRef} position={ORGANISM_POSITIONS.criquet} {...handlers}>
      {/* Corps */}
      <mesh position={[0, 0.18, 0]} scale={[1, 0.6, 0.55]}>
        <sphereGeometry args={[0.18, 12, 8]} />
        <meshStandardMaterial
          color={body}
          emissive={active ? '#84CC16' : '#000'}
          emissiveIntensity={active ? 0.35 : 0}
        />
      </mesh>
      {/* Tête */}
      <mesh position={[0.2, 0.2, 0]}>
        <sphereGeometry args={[0.1, 12, 8]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* Antennes */}
      <mesh position={[0.27, 0.32, -0.04]} rotation={[0, 0, Math.PI / 4]}>
        <cylinderGeometry args={[0.008, 0.008, 0.18, 4]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      <mesh position={[0.27, 0.32, 0.04]} rotation={[0, 0, Math.PI / 4]}>
        <cylinderGeometry args={[0.008, 0.008, 0.18, 4]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      {/* Pattes arrière (sauteuses) */}
      <mesh position={[-0.08, 0.05, -0.16]} rotation={[0, 0, -Math.PI / 6]}>
        <cylinderGeometry args={[0.015, 0.015, 0.22, 4]} />
        <meshStandardMaterial color={body} />
      </mesh>
      <mesh position={[-0.08, 0.05, 0.16]} rotation={[0, 0, -Math.PI / 6]}>
        <cylinderGeometry args={[0.015, 0.015, 0.22, 4]} />
        <meshStandardMaterial color={body} />
      </mesh>
    </group>
  );
}

function Lezard({ active, onClick }: { active: boolean; onClick: () => void }) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      groupRef.current.rotation.y = Math.sin(t * 0.8) * 0.4;
    }
  });
  const handlers = PointerHandlers(onClick);
  const body = active ? '#FBBF24' : '#CA8A04';
  return (
    <group ref={groupRef} position={ORGANISM_POSITIONS.lezard} {...handlers}>
      {/* Corps allongé */}
      <mesh position={[0, 0.07, 0]} scale={[1.6, 0.4, 0.5]}>
        <sphereGeometry args={[0.18, 12, 8]} />
        <meshStandardMaterial
          color={body}
          emissive={active ? '#F59E0B' : '#000'}
          emissiveIntensity={active ? 0.3 : 0}
        />
      </mesh>
      {/* Tête */}
      <mesh position={[0.3, 0.07, 0]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* Queue */}
      <mesh position={[-0.32, 0.07, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.07, 0.32, 6]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* 4 pattes */}
      {[
        [-0.13, 0, -0.13],
        [-0.13, 0, 0.13],
        [0.15, 0, -0.13],
        [0.15, 0, 0.13],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y + 0.03, z]} rotation={[0, 0, Math.PI / 4]}>
          <cylinderGeometry args={[0.025, 0.025, 0.1, 4]} />
          <meshStandardMaterial color={body} />
        </mesh>
      ))}
    </group>
  );
}

function Serpent({ active, onClick }: { active: boolean; onClick: () => void }) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      // Léger ondulement
      const t = state.clock.elapsedTime;
      groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.3;
    }
  });
  const handlers = PointerHandlers(onClick);
  const body = active ? '#92400E' : '#5D3A1A';
  // Une série de sphères en zigzag pour figurer le serpent
  const segments = useMemo(() => {
    const arr: Array<{ pos: [number, number, number]; r: number }> = [];
    const N = 12;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const x = -0.6 + t * 1.2;
      const y = 0.1 + Math.sin(t * Math.PI * 3) * 0.06;
      const z = Math.cos(t * Math.PI * 2) * 0.18;
      arr.push({ pos: [x, y, z], r: 0.075 - t * 0.025 });
    }
    return arr;
  }, []);
  return (
    <group ref={groupRef} position={ORGANISM_POSITIONS.serpent} {...handlers}>
      {segments.map((s, i) => (
        <mesh key={i} position={s.pos}>
          <sphereGeometry args={[s.r, 10, 8]} />
          <meshStandardMaterial
            color={body}
            emissive={active ? '#B45309' : '#000'}
            emissiveIntensity={active ? 0.3 : 0}
          />
        </mesh>
      ))}
      {/* Yeux jaunes sur la tête (= dernier segment côté +x) */}
      <mesh position={[segments[segments.length - 1].pos[0] + 0.04, segments[segments.length - 1].pos[1] + 0.03, 0.04]}>
        <sphereGeometry args={[0.012, 6, 6]} />
        <meshStandardMaterial color="#FBBF24" emissive="#F59E0B" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function Faucon({ active, onClick }: { active: boolean; onClick: () => void }) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      // Vol stationnaire avec petite oscillation
      groupRef.current.position.y = ORGANISM_POSITIONS.faucon[1] + Math.sin(t * 1.6) * 0.15;
      groupRef.current.rotation.y += 0.005;
    }
  });
  const handlers = PointerHandlers(onClick);
  const body = active ? '#A16207' : '#78350F';
  return (
    <group ref={groupRef} position={ORGANISM_POSITIONS.faucon} {...handlers}>
      {/* Corps */}
      <mesh>
        <sphereGeometry args={[0.22, 14, 12]} />
        <meshStandardMaterial
          color={body}
          emissive={active ? '#B45309' : '#000'}
          emissiveIntensity={active ? 0.3 : 0}
        />
      </mesh>
      {/* Tête */}
      <mesh position={[0, 0.22, 0.14]}>
        <sphereGeometry args={[0.15, 14, 12]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* Bec courbe */}
      <mesh position={[0, 0.18, 0.32]} rotation={[Math.PI / 2 + 0.2, 0, 0]}>
        <coneGeometry args={[0.05, 0.18, 6]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      {/* Yeux */}
      <mesh position={[0.07, 0.27, 0.22]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#FBBF24" emissive="#F59E0B" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-0.07, 0.27, 0.22]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#FBBF24" emissive="#F59E0B" emissiveIntensity={0.5} />
      </mesh>
      {/* Ailes déployées (cones aplatis) */}
      <mesh position={[0.4, 0.05, 0]} rotation={[0, 0, -Math.PI / 4]} scale={[1, 0.3, 0.5]}>
        <coneGeometry args={[0.15, 0.55, 4]} />
        <meshStandardMaterial color={body} />
      </mesh>
      <mesh position={[-0.4, 0.05, 0]} rotation={[0, 0, Math.PI / 4]} scale={[1, 0.3, 0.5]}>
        <coneGeometry args={[0.15, 0.55, 4]} />
        <meshStandardMaterial color={body} />
      </mesh>
    </group>
  );
}

// =========================================================================
// FLÈCHE entre 2 organismes (cône + cylindre)
// =========================================================================
const Y_UP = new Vector3(0, 1, 0);

function FoodArrow({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const data = useMemo(() => {
    const fromV = new Vector3(...from);
    const toV = new Vector3(...to);
    // Réduit la flèche pour qu'elle ne traverse pas les organismes
    const dir = new Vector3().subVectors(toV, fromV);
    const len = dir.length();
    const unit = dir.clone().normalize();
    const startV = new Vector3().addVectors(fromV, unit.clone().multiplyScalar(0.45));
    const endV = new Vector3().addVectors(toV, unit.clone().multiplyScalar(-0.45));
    const lineDir = new Vector3().subVectors(endV, startV);
    const lineLen = Math.max(0.1, lineDir.length());
    const center = new Vector3().addVectors(startV, endV).multiplyScalar(0.5);
    const q = new Quaternion().setFromUnitVectors(Y_UP, lineDir.clone().normalize());
    return { center, q, lineLen, endV, len };
  }, [from, to]);

  return (
    <group>
      {/* Tige */}
      <mesh position={data.center} quaternion={data.q}>
        <cylinderGeometry args={[0.04, 0.04, data.lineLen * 0.8, 8]} />
        <meshStandardMaterial
          color="#10B981"
          emissive="#059669"
          emissiveIntensity={0.4}
        />
      </mesh>
      {/* Pointe (cone à l'extrémité) */}
      <mesh position={data.endV} quaternion={data.q}>
        <coneGeometry args={[0.12, 0.22, 8]} />
        <meshStandardMaterial
          color="#10B981"
          emissive="#059669"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

// =========================================================================
// SCÈNE
// =========================================================================
export type ChainSceneProps = {
  /** Index courant du prochain organisme attendu (0 = herbe, 1 = criquet, ...). */
  currentIndex: number;
  /** Liste des organismes déjà cliqués dans l'ordre. */
  clicked: OrganismKey[];
  onClick: (k: OrganismKey) => void;
};

export default function ChainScene({ currentIndex, clicked, onClick }: ChainSceneProps) {
  const arrows = useMemo(() => {
    const list: Array<{ from: OrganismKey; to: OrganismKey }> = [];
    for (let i = 0; i < clicked.length - 1; i++) {
      list.push({ from: clicked[i], to: clicked[i + 1] });
    }
    return list;
  }, [clicked]);

  const isClicked = (k: OrganismKey) => clicked.includes(k);
  const next = ORDER[currentIndex];

  return (
    <LabScene
      cameraPosition={[0, 4, 8]}
      background="#FEF3C7"
      minDistance={5}
      maxDistance={16}
      enablePan
    >
      <fog attach="fog" args={['#FEF3C7', 11, 24]} />
      <Savana />

      <Herbe active={isClicked('herbe')} onClick={() => onClick('herbe')} />
      <Criquet active={isClicked('criquet')} onClick={() => onClick('criquet')} />
      <Lezard active={isClicked('lezard')} onClick={() => onClick('lezard')} />
      <Serpent active={isClicked('serpent')} onClick={() => onClick('serpent')} />
      <Faucon active={isClicked('faucon')} onClick={() => onClick('faucon')} />

      {/* Flèches de la chaîne déjà construite */}
      {arrows.map((a, i) => (
        <FoodArrow key={i} from={ORGANISM_POSITIONS[a.from]} to={ORGANISM_POSITIONS[a.to]} />
      ))}

      {/* Hotspot vert "à toi" sur le prochain organisme attendu */}
      {next && (
        <HotspotCoach
          position={[
            ORGANISM_POSITIONS[next][0],
            ORGANISM_POSITIONS[next][1] + 1.0,
            ORGANISM_POSITIONS[next][2],
          ]}
          label={currentIndex === 0 ? 'Commence ici' : 'Suivant'}
          tone="action"
        />
      )}
    </LabScene>
  );
}

export { ORDER, ORGANISM_LABELS };
