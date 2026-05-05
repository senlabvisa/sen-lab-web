'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { HotspotCoach } from '@/components/lab/hotspot-coach';

/**
 * Scène 3D — Parc National du Niokolo-Koba (Sénégal oriental).
 *
 * Savane avec 5 animaux emblématiques cliquables : lion, antilope,
 * hippopotame, crocodile, calao. Chaque clic sur un animal le marque
 * comme "rencontré" et déclenche la suite pédagogique.
 *
 * Animaux modélisés en primitives Three.js (low-poly stylisé) pour
 * garder le bundle léger.
 *
 * Doit être chargé via next/dynamic({ ssr: false }).
 */

export type AnimalKey = 'lion' | 'antilope' | 'hippopotame' | 'crocodile' | 'calao';

const ANIMAL_LABELS: Record<AnimalKey, string> = {
  lion: 'Lion',
  antilope: 'Antilope',
  hippopotame: 'Hippopotame',
  crocodile: 'Crocodile',
  calao: 'Calao',
};

function PointerHandlers({ onClick }: { onClick?: () => void }) {
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
// SAVANE (sol + acacias)
// =========================================================================
function Savana() {
  return (
    <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[14, 48]} />
      <meshStandardMaterial color="#D4B26A" roughness={0.95} />
    </mesh>
  );
}

function Acacia({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.07, 0.1, 1.2, 6]} />
        <meshStandardMaterial color="#5D3A1A" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.4, 0]} scale={[1, 0.35, 1]}>
        <sphereGeometry args={[0.7, 12, 8]} />
        <meshStandardMaterial color="#84B650" roughness={0.7} />
      </mesh>
      <mesh position={[0.35, 1.5, 0.2]} scale={[0.7, 0.25, 0.7]}>
        <sphereGeometry args={[0.5, 10, 8]} />
        <meshStandardMaterial color="#7AAD45" roughness={0.7} />
      </mesh>
    </group>
  );
}

// =========================================================================
// ANIMAUX
// =========================================================================
function Lion({ position, met, onClick }: { position: [number, number, number]; met: boolean; onClick: () => void }) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3 + position[0]) * 0.1;
    }
  });
  const handlers = PointerHandlers({ onClick });
  const body = met ? '#F4C088' : '#D4A574';
  return (
    <group ref={groupRef} position={position} {...handlers}>
      {/* Corps */}
      <mesh position={[0, 0.4, 0]} scale={[1.3, 0.7, 0.7]}>
        <sphereGeometry args={[0.35, 14, 12]} />
        <meshStandardMaterial color={body} emissive={met ? '#F59E0B' : '#000'} emissiveIntensity={met ? 0.2 : 0} />
      </mesh>
      {/* Tête */}
      <mesh position={[0.55, 0.55, 0]}>
        <sphereGeometry args={[0.22, 14, 12]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* Crinière (anneau de cubes) */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[0.55 + Math.cos(a) * 0.18, 0.55 + Math.sin(a) * 0.18, 0]}
          >
            <sphereGeometry args={[0.07, 8, 6]} />
            <meshStandardMaterial color="#7B3F0E" />
          </mesh>
        );
      })}
      {/* Pattes */}
      {[
        [-0.3, 0, -0.2],
        [-0.3, 0, 0.2],
        [0.3, 0, -0.2],
        [0.3, 0, 0.2],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y + 0.08, z]}>
          <cylinderGeometry args={[0.07, 0.07, 0.3, 6]} />
          <meshStandardMaterial color={body} />
        </mesh>
      ))}
      {/* Queue */}
      <mesh position={[-0.5, 0.45, 0]} rotation={[0, 0, Math.PI / 5]}>
        <cylinderGeometry args={[0.025, 0.025, 0.45, 6]} />
        <meshStandardMaterial color={body} />
      </mesh>
    </group>
  );
}

function Antilope({ position, met, onClick }: { position: [number, number, number]; met: boolean; onClick: () => void }) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      groupRef.current.position.y = position[1] + Math.abs(Math.sin(t * 1.5 + position[0])) * 0.04;
    }
  });
  const handlers = PointerHandlers({ onClick });
  const body = met ? '#E2B080' : '#C09060';
  return (
    <group ref={groupRef} position={position} {...handlers}>
      {/* Corps */}
      <mesh position={[0, 0.55, 0]} scale={[1.4, 0.55, 0.55]}>
        <sphereGeometry args={[0.3, 12, 10]} />
        <meshStandardMaterial color={body} emissive={met ? '#F59E0B' : '#000'} emissiveIntensity={met ? 0.2 : 0} />
      </mesh>
      {/* Cou */}
      <mesh position={[0.4, 0.78, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.06, 0.07, 0.4, 6]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* Tête */}
      <mesh position={[0.58, 0.96, 0]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* Cornes (V) */}
      <mesh position={[0.6, 1.18, -0.06]} rotation={[0, 0, -Math.PI / 8]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 6]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      <mesh position={[0.6, 1.18, 0.06]} rotation={[Math.PI / 12, 0, -Math.PI / 8]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 6]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      {/* 4 longues pattes */}
      {[
        [-0.32, -0.02, -0.18],
        [-0.32, -0.02, 0.18],
        [0.32, -0.02, -0.18],
        [0.32, -0.02, 0.18],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y + 0.25, z]}>
          <cylinderGeometry args={[0.04, 0.04, 0.55, 6]} />
          <meshStandardMaterial color={body} />
        </mesh>
      ))}
    </group>
  );
}

function Hippopotame({
  position,
  met,
  onClick,
}: {
  position: [number, number, number];
  met: boolean;
  onClick: () => void;
}) {
  const handlers = PointerHandlers({ onClick });
  const body = met ? '#9CA3AF' : '#7C7C8A';
  return (
    <group position={position} {...handlers}>
      {/* Gros corps */}
      <mesh position={[0, 0.45, 0]} scale={[1.6, 0.85, 1.05]}>
        <sphereGeometry args={[0.4, 14, 12]} />
        <meshStandardMaterial color={body} emissive={met ? '#FB923C' : '#000'} emissiveIntensity={met ? 0.2 : 0} />
      </mesh>
      {/* Tête massive */}
      <mesh position={[0.65, 0.4, 0]} scale={[0.95, 0.85, 1.05]}>
        <sphereGeometry args={[0.32, 14, 12]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* Oreilles */}
      <mesh position={[0.7, 0.7, 0.18]}>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color={body} />
      </mesh>
      <mesh position={[0.7, 0.7, -0.18]}>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* 4 grosses pattes courtes */}
      {[
        [-0.45, 0, -0.3],
        [-0.45, 0, 0.3],
        [0.4, 0, -0.3],
        [0.4, 0, 0.3],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y + 0.1, z]}>
          <cylinderGeometry args={[0.13, 0.13, 0.25, 8]} />
          <meshStandardMaterial color={body} />
        </mesh>
      ))}
    </group>
  );
}

function Crocodile({
  position,
  met,
  onClick,
}: {
  position: [number, number, number];
  met: boolean;
  onClick: () => void;
}) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      groupRef.current.rotation.y = Math.sin(t * 0.6 + position[2]) * 0.2;
    }
  });
  const handlers = PointerHandlers({ onClick });
  const body = met ? '#65A30D' : '#4A6A2E';
  return (
    <group ref={groupRef} position={position} {...handlers}>
      {/* Corps allongé */}
      <mesh position={[0, 0.13, 0]} scale={[2.2, 0.45, 0.65]}>
        <sphereGeometry args={[0.3, 12, 8]} />
        <meshStandardMaterial color={body} emissive={met ? '#84CC16' : '#000'} emissiveIntensity={met ? 0.2 : 0} />
      </mesh>
      {/* Tête (museau allongé) */}
      <mesh position={[0.85, 0.13, 0]} scale={[1.5, 0.4, 0.5]}>
        <sphereGeometry args={[0.22, 12, 8]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* Yeux */}
      <mesh position={[0.85, 0.27, 0.1]}>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshStandardMaterial color="#FBBF24" emissive="#F59E0B" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0.85, 0.27, -0.1]}>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshStandardMaterial color="#FBBF24" emissive="#F59E0B" emissiveIntensity={0.4} />
      </mesh>
      {/* Queue (cône allongé) */}
      <mesh position={[-0.85, 0.13, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.2, 0.7, 6]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* 4 pattes courtes */}
      {[
        [-0.3, 0, -0.25],
        [-0.3, 0, 0.25],
        [0.4, 0, -0.25],
        [0.4, 0, 0.25],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y + 0.05, z]}>
          <cylinderGeometry args={[0.05, 0.05, 0.15, 6]} />
          <meshStandardMaterial color={body} />
        </mesh>
      ))}
    </group>
  );
}

function Calao({
  basePos,
  met,
  onClick,
}: {
  basePos: [number, number, number];
  met: boolean;
  onClick: () => void;
}) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      groupRef.current.position.y = basePos[1] + Math.sin(t * 1.3) * 0.05;
      groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.2;
    }
  });
  const handlers = PointerHandlers({ onClick });
  const body = met ? '#1F2937' : '#0B1F4F';
  return (
    <group ref={groupRef} position={basePos} {...handlers}>
      {/* Corps */}
      <mesh>
        <sphereGeometry args={[0.18, 14, 12]} />
        <meshStandardMaterial color={body} emissive={met ? '#7C3AED' : '#000'} emissiveIntensity={met ? 0.25 : 0} />
      </mesh>
      {/* Tête */}
      <mesh position={[0, 0.18, 0.12]}>
        <sphereGeometry args={[0.12, 14, 12]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* Bec énorme courbe (cylindre + cone) */}
      <mesh position={[0, 0.16, 0.28]} rotation={[Math.PI / 2 + 0.1, 0, 0]}>
        <coneGeometry args={[0.06, 0.28, 8]} />
        <meshStandardMaterial color="#F59E0B" />
      </mesh>
      <mesh position={[0, 0.24, 0.28]} scale={[0.7, 0.4, 0.7]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial color="#F59E0B" />
      </mesh>
      {/* Ailes */}
      <mesh position={[0.16, 0, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <coneGeometry args={[0.07, 0.32, 4]} />
        <meshStandardMaterial color={body} />
      </mesh>
      <mesh position={[-0.16, 0, 0]} rotation={[0, 0, Math.PI / 6]}>
        <coneGeometry args={[0.07, 0.32, 4]} />
        <meshStandardMaterial color={body} />
      </mesh>
    </group>
  );
}

// =========================================================================
// SCÈNE
// =========================================================================
export type NiokoloSceneProps = {
  metAnimals: Set<AnimalKey>;
  onMeet: (a: AnimalKey) => void;
};

export default function NiokoloScene({ metAnimals, onMeet }: NiokoloSceneProps) {
  return (
    <LabScene
      cameraPosition={[5.5, 3.5, 6]}
      background="#FED7AA"
      minDistance={4}
      maxDistance={16}
      enablePan
    >
      <fog attach="fog" args={['#FED7AA', 10, 24]} />
      <Savana />

      {/* Acacias dispersés */}
      <Acacia position={[-3.5, 0, 1]} scale={1.1} />
      <Acacia position={[4, 0, -2.5]} scale={0.9} />
      <Acacia position={[-1, 0, -3.5]} scale={1.05} />
      <Acacia position={[3.5, 0, 2.8]} scale={0.85} />

      {/* 5 animaux */}
      <Lion position={[0, 0, 0]} met={metAnimals.has('lion')} onClick={() => onMeet('lion')} />
      <Antilope
        position={[2.2, 0, -0.8]}
        met={metAnimals.has('antilope')}
        onClick={() => onMeet('antilope')}
      />
      <Hippopotame
        position={[-2.5, 0, -1.2]}
        met={metAnimals.has('hippopotame')}
        onClick={() => onMeet('hippopotame')}
      />
      <Crocodile
        position={[1.0, 0, 2.2]}
        met={metAnimals.has('crocodile')}
        onClick={() => onMeet('crocodile')}
      />
      <Calao
        basePos={[-2.5, 1.7, 1.2]}
        met={metAnimals.has('calao')}
        onClick={() => onMeet('calao')}
      />

      {/* Hotspots progressifs */}
      {metAnimals.size === 0 && (
        <HotspotCoach position={[0, 1.6, 0]} label="Clique sur les animaux" tone="action" />
      )}
      {metAnimals.size > 0 && metAnimals.size < 5 && (
        <HotspotCoach
          position={[0, 3.2, 0]}
          label={`${metAnimals.size}/5 — continue !`}
          tone="violet"
        />
      )}
    </LabScene>
  );
}

export { ANIMAL_LABELS };
