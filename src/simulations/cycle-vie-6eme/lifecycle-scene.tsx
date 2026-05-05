'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group, Quaternion, Vector3 } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { HotspotCoach } from '@/components/lab/hotspot-coach';

/**
 * Scène 3D — cycle de vie de la poule.
 *
 * 4 stades en cercle : œuf → poussin → poulet → poule adulte → œuf...
 * L'élève clique dans l'ordre. Des flèches courbes apparaissent au fur
 * et à mesure pour matérialiser la circulation du cycle.
 */

export type StageKey = 'oeuf' | 'poussin' | 'poulet' | 'poule';

const STAGE_LABELS: Record<StageKey, string> = {
  oeuf: 'Œuf',
  poussin: 'Poussin',
  poulet: 'Poulet',
  poule: 'Poule adulte',
};

// Positions en cercle (4 stades à 90° chacun)
const RADIUS = 2.4;
const STAGE_POSITIONS: Record<StageKey, [number, number, number]> = {
  oeuf: [Math.cos(0) * RADIUS, 0, -Math.sin(0) * RADIUS],
  poussin: [Math.cos(Math.PI / 2) * RADIUS, 0, -Math.sin(Math.PI / 2) * RADIUS],
  poulet: [Math.cos(Math.PI) * RADIUS, 0, -Math.sin(Math.PI) * RADIUS],
  poule: [Math.cos(3 * Math.PI / 2) * RADIUS, 0, -Math.sin(3 * Math.PI / 2) * RADIUS],
};

const ORDER: StageKey[] = ['oeuf', 'poussin', 'poulet', 'poule'];

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

function Ground() {
  return (
    <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[5, 48]} />
      <meshStandardMaterial color="#A3A084" roughness={0.95} />
    </mesh>
  );
}

// =========================================================================
// STADES
// =========================================================================
function Oeuf({ active, onClick }: { active: boolean; onClick: () => void }) {
  const handlers = PointerHandlers(onClick);
  return (
    <group position={STAGE_POSITIONS.oeuf} {...handlers}>
      <mesh position={[0, 0.18, 0]} scale={[0.85, 1.2, 0.85]}>
        <sphereGeometry args={[0.22, 16, 14]} />
        <meshStandardMaterial
          color={active ? '#FEF3C7' : '#FAF6E1'}
          roughness={0.5}
          emissive={active ? '#FCD34D' : '#000'}
          emissiveIntensity={active ? 0.3 : 0}
        />
      </mesh>
      {/* Tâche brunâtre suggérant l'œuf de poule */}
      <mesh position={[0.1, 0.22, 0.1]} scale={[0.3, 0.3, 0.3]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#D97706" opacity={0.4} transparent />
      </mesh>
    </group>
  );
}

function Poussin({ active, onClick }: { active: boolean; onClick: () => void }) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      groupRef.current.position.y = Math.abs(Math.sin(t * 3)) * 0.05;
    }
  });
  const handlers = PointerHandlers(onClick);
  const body = active ? '#FBBF24' : '#FCD34D';
  return (
    <group ref={groupRef} position={STAGE_POSITIONS.poussin} {...handlers}>
      {/* Corps (boule jaune) */}
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.22, 14, 12]} />
        <meshStandardMaterial
          color={body}
          emissive={active ? '#F59E0B' : '#000'}
          emissiveIntensity={active ? 0.3 : 0}
        />
      </mesh>
      {/* Tête plus petite */}
      <mesh position={[0.15, 0.45, 0]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* Bec orange */}
      <mesh position={[0.27, 0.45, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.04, 0.1, 6]} />
        <meshStandardMaterial color="#EA580C" />
      </mesh>
      {/* 2 yeux */}
      <mesh position={[0.21, 0.5, 0.07]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      <mesh position={[0.21, 0.5, -0.07]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      {/* 2 pattes */}
      {[-0.06, 0.06].map((z, i) => (
        <mesh key={i} position={[0, 0.05, z]}>
          <cylinderGeometry args={[0.012, 0.012, 0.12, 4]} />
          <meshStandardMaterial color="#EA580C" />
        </mesh>
      ))}
    </group>
  );
}

function Poulet({ active, onClick }: { active: boolean; onClick: () => void }) {
  const handlers = PointerHandlers(onClick);
  const body = active ? '#FCD34D' : '#FAF0BC';
  return (
    <group position={STAGE_POSITIONS.poulet} {...handlers}>
      {/* Corps moyen */}
      <mesh position={[0, 0.4, 0]} scale={[1.1, 0.9, 0.9]}>
        <sphereGeometry args={[0.32, 14, 12]} />
        <meshStandardMaterial
          color={body}
          emissive={active ? '#F59E0B' : '#000'}
          emissiveIntensity={active ? 0.3 : 0}
        />
      </mesh>
      {/* Cou */}
      <mesh position={[0.28, 0.55, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.07, 0.09, 0.25, 8]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* Tête */}
      <mesh position={[0.42, 0.7, 0]}>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* Bec */}
      <mesh position={[0.6, 0.7, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.05, 0.16, 6]} />
        <meshStandardMaterial color="#EA580C" />
      </mesh>
      {/* Crête (jeune) */}
      <mesh position={[0.42, 0.86, 0]}>
        <boxGeometry args={[0.05, 0.08, 0.03]} />
        <meshStandardMaterial color="#DC2626" />
      </mesh>
      {/* Pattes */}
      {[-0.08, 0.08].map((z, i) => (
        <mesh key={i} position={[0, 0.13, z]}>
          <cylinderGeometry args={[0.025, 0.025, 0.25, 6]} />
          <meshStandardMaterial color="#EA580C" />
        </mesh>
      ))}
    </group>
  );
}

function Poule({ active, onClick }: { active: boolean; onClick: () => void }) {
  const handlers = PointerHandlers(onClick);
  const body = active ? '#F4F4F5' : '#E4E4E7';
  return (
    <group position={STAGE_POSITIONS.poule} {...handlers}>
      {/* Gros corps adulte */}
      <mesh position={[0, 0.45, 0]} scale={[1.2, 1, 1]}>
        <sphereGeometry args={[0.4, 14, 12]} />
        <meshStandardMaterial
          color={body}
          emissive={active ? '#A1A1AA' : '#000'}
          emissiveIntensity={active ? 0.3 : 0}
        />
      </mesh>
      {/* Cou */}
      <mesh position={[0.34, 0.6, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.08, 0.1, 0.3, 8]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* Tête */}
      <mesh position={[0.5, 0.78, 0]}>
        <sphereGeometry args={[0.18, 12, 10]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* Bec */}
      <mesh position={[0.7, 0.78, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.06, 0.18, 6]} />
        <meshStandardMaterial color="#EA580C" />
      </mesh>
      {/* Grande crête rouge */}
      <mesh position={[0.5, 0.98, 0]}>
        <boxGeometry args={[0.07, 0.18, 0.06]} />
        <meshStandardMaterial color="#DC2626" />
      </mesh>
      {/* Caroncules */}
      <mesh position={[0.62, 0.66, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#DC2626" />
      </mesh>
      {/* Pattes */}
      {[-0.1, 0.1].map((z, i) => (
        <mesh key={i} position={[0, 0.13, z]}>
          <cylinderGeometry args={[0.03, 0.03, 0.3, 6]} />
          <meshStandardMaterial color="#EA580C" />
        </mesh>
      ))}
      {/* Petit œuf à côté pour suggérer la ponte */}
      {active && (
        <mesh position={[-0.45, 0.12, 0.3]} scale={[0.7, 0.9, 0.7]}>
          <sphereGeometry args={[0.13, 12, 10]} />
          <meshStandardMaterial color="#FAF6E1" />
        </mesh>
      )}
    </group>
  );
}

// =========================================================================
// FLÈCHE COURBE entre 2 stades
// =========================================================================
const Y_UP = new Vector3(0, 1, 0);

function CycleArrow({
  fromKey,
  toKey,
}: {
  fromKey: StageKey;
  toKey: StageKey;
}) {
  const data = useMemo(() => {
    const from = new Vector3(...STAGE_POSITIONS[fromKey]);
    const to = new Vector3(...STAGE_POSITIONS[toKey]);
    from.y = 0.5;
    to.y = 0.5;
    const dir = new Vector3().subVectors(to, from);
    const len = dir.length();
    const unit = dir.clone().normalize();
    const startV = new Vector3().addVectors(from, unit.clone().multiplyScalar(0.55));
    const endV = new Vector3().addVectors(to, unit.clone().multiplyScalar(-0.55));
    const lineDir = new Vector3().subVectors(endV, startV);
    const lineLen = Math.max(0.1, lineDir.length());
    const center = new Vector3().addVectors(startV, endV).multiplyScalar(0.5);
    const q = new Quaternion().setFromUnitVectors(Y_UP, lineDir.clone().normalize());
    return { center, q, lineLen, endV };
  }, [fromKey, toKey]);

  return (
    <group>
      <mesh position={data.center} quaternion={data.q}>
        <cylinderGeometry args={[0.04, 0.04, data.lineLen * 0.85, 8]} />
        <meshStandardMaterial color="#10B981" emissive="#059669" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={data.endV} quaternion={data.q}>
        <coneGeometry args={[0.13, 0.22, 8]} />
        <meshStandardMaterial color="#10B981" emissive="#059669" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// =========================================================================
// SCÈNE
// =========================================================================
export type LifecycleSceneProps = {
  clicked: StageKey[];
  currentIndex: number;
  onClick: (k: StageKey) => void;
};

export default function LifecycleScene({ clicked, currentIndex, onClick }: LifecycleSceneProps) {
  const arrows = useMemo(() => {
    const list: Array<{ from: StageKey; to: StageKey }> = [];
    for (let i = 0; i < clicked.length - 1; i++) {
      list.push({ from: clicked[i], to: clicked[i + 1] });
    }
    if (clicked.length === ORDER.length) {
      // Cycle bouclé : flèche poule → œuf
      list.push({ from: 'poule', to: 'oeuf' });
    }
    return list;
  }, [clicked]);

  const next = ORDER[currentIndex];
  const isClicked = (k: StageKey) => clicked.includes(k);

  return (
    <LabScene
      cameraPosition={[0, 5, 5]}
      background="#FED7AA"
      minDistance={4}
      maxDistance={14}
      enablePan
    >
      <Ground />

      <Oeuf active={isClicked('oeuf')} onClick={() => onClick('oeuf')} />
      <Poussin active={isClicked('poussin')} onClick={() => onClick('poussin')} />
      <Poulet active={isClicked('poulet')} onClick={() => onClick('poulet')} />
      <Poule active={isClicked('poule')} onClick={() => onClick('poule')} />

      {arrows.map((a, i) => (
        <CycleArrow key={i} fromKey={a.from} toKey={a.to} />
      ))}

      {next && (
        <HotspotCoach
          position={[
            STAGE_POSITIONS[next][0],
            STAGE_POSITIONS[next][1] + 1.4,
            STAGE_POSITIONS[next][2],
          ]}
          label={currentIndex === 0 ? 'Commence par le début' : 'Suivant'}
          tone="action"
        />
      )}
    </LabScene>
  );
}

export { ORDER, STAGE_LABELS };
