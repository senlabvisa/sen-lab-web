'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Group, Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { HotspotCoach } from '@/components/lab/hotspot-coach';

/**
 * Scène 3D — mangrove du Saloum.
 *
 * Écosystème simplifié low-poly : vase + surface d'eau + 3 palétuviers
 * (tronc, racines aériennes en éventail, canopée) + faune (poissons,
 * crabes, oiseau). Les créatures sont cliquables — l'élève les
 * identifie pour valider la "manipulation".
 *
 * Doit être chargé via next/dynamic({ ssr: false }).
 */

const Y_GROUND = -1.4;
const Y_WATER = -0.2;

type Species = 'paletuvier' | 'poisson' | 'crabe' | 'oiseau';

function MudGround() {
  return (
    <mesh position={[0, Y_GROUND, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[8, 48]} />
      <meshStandardMaterial color="#78350F" roughness={0.95} />
    </mesh>
  );
}

function WaterSurface() {
  const meshRef = useRef<Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      // Léger effet de "respiration" pour suggérer le mouvement de l'eau
      const t = state.clock.elapsedTime;
      meshRef.current.position.y = Y_WATER + Math.sin(t * 0.6) * 0.01;
    }
  });
  return (
    <mesh ref={meshRef} position={[0, Y_WATER, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[8, 48]} />
      <meshStandardMaterial
        color="#0EA5E9"
        opacity={0.55}
        transparent
        roughness={0.2}
        metalness={0.1}
        side={DoubleSide}
      />
    </mesh>
  );
}

function Paletuvier({
  position,
  scale = 1,
  onClick,
  highlighted,
}: {
  position: [number, number, number];
  scale?: number;
  onClick?: () => void;
  highlighted?: boolean;
}) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      // Bercement très léger de la canopée
      const t = state.clock.elapsedTime;
      groupRef.current.rotation.z = Math.sin(t * 0.4 + position[0]) * 0.015;
    }
  });

  // Génère 5 racines aériennes en étoile
  const roots = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const x = Math.cos(angle) * 0.42;
    const z = Math.sin(angle) * 0.42;
    roots.push(
      <mesh key={i} position={[x, -0.4, z]} rotation={[0, -angle, Math.PI / 4]}>
        <cylinderGeometry args={[0.06, 0.09, 1.1, 6]} />
        <meshStandardMaterial color="#6B4423" roughness={0.85} />
      </mesh>,
    );
  }

  return (
    <group
      ref={groupRef}
      position={position}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      {roots}
      {/* Tronc */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.18, 0.24, 1.6, 8]} />
        <meshStandardMaterial color="#5D3A1A" roughness={0.8} />
      </mesh>
      {/* Canopée (3 sphères qui se chevauchent) */}
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.85, 16, 12]} />
        <meshStandardMaterial color={highlighted ? '#22C55E' : '#16A34A'} roughness={0.7} />
      </mesh>
      <mesh position={[0.4, 1.85, 0.2]}>
        <sphereGeometry args={[0.55, 14, 12]} />
        <meshStandardMaterial color="#15803D" roughness={0.7} />
      </mesh>
      <mesh position={[-0.35, 1.95, -0.15]}>
        <sphereGeometry args={[0.5, 14, 12]} />
        <meshStandardMaterial color="#166534" roughness={0.7} />
      </mesh>
    </group>
  );
}

function Fish({
  basePos,
  color,
  speed,
  onClick,
  highlighted,
}: {
  basePos: [number, number, number];
  color: string;
  speed: number;
  onClick?: () => void;
  highlighted?: boolean;
}) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime * speed;
      groupRef.current.position.x = basePos[0] + Math.sin(t) * 1.6;
      groupRef.current.position.z = basePos[2] + Math.cos(t * 0.7) * 1.2;
      groupRef.current.position.y = basePos[1] + Math.sin(t * 1.3) * 0.15;
      // Orientation : tangent à la trajectoire
      const dx = Math.cos(t) * 1.6 * speed;
      const dz = -Math.sin(t * 0.7) * 1.2 * 0.7 * speed;
      groupRef.current.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
    }
  });
  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <mesh>
        <sphereGeometry args={[0.18, 12, 10]} />
        <meshStandardMaterial
          color={highlighted ? '#FCD34D' : color}
          emissive={highlighted ? '#F59E0B' : '#000'}
          emissiveIntensity={highlighted ? 0.3 : 0}
        />
      </mesh>
      {/* Corps allongé */}
      <mesh scale={[0.6, 0.6, 1.6]} position={[0, 0, -0.05]}>
        <sphereGeometry args={[0.18, 12, 10]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Queue */}
      <mesh position={[0, 0, 0.28]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.14, 0.2, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

function Crab({
  position,
  onClick,
  highlighted,
}: {
  position: [number, number, number];
  onClick?: () => void;
  highlighted?: boolean;
}) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      // Petit trémoussement
      const t = state.clock.elapsedTime;
      groupRef.current.position.x = position[0] + Math.sin(t * 0.8 + position[2]) * 0.08;
      groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.3;
    }
  });
  // 6 pattes
  const legs = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const x = Math.cos(angle) * 0.18;
    const z = Math.sin(angle) * 0.18;
    legs.push(
      <mesh key={i} position={[x, -0.05, z]} rotation={[0, -angle, Math.PI / 3]}>
        <cylinderGeometry args={[0.015, 0.015, 0.18, 4]} />
        <meshStandardMaterial color="#9A3412" />
      </mesh>,
    );
  }
  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      {legs}
      {/* Corps aplati */}
      <mesh scale={[1, 0.45, 0.85]}>
        <sphereGeometry args={[0.2, 14, 10]} />
        <meshStandardMaterial
          color={highlighted ? '#FB923C' : '#C2410C'}
          emissive={highlighted ? '#F97316' : '#000'}
          emissiveIntensity={highlighted ? 0.3 : 0}
        />
      </mesh>
      {/* Yeux */}
      <mesh position={[0.1, 0.07, 0.12]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      <mesh position={[-0.1, 0.07, 0.12]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
    </group>
  );
}

function Bird({ basePos, onClick, highlighted }: { basePos: [number, number, number]; onClick?: () => void; highlighted?: boolean }) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      groupRef.current.position.y = basePos[1] + Math.sin(t * 1.5) * 0.1;
      groupRef.current.rotation.y += 0.005;
    }
  });
  return (
    <group
      ref={groupRef}
      position={basePos}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Corps */}
      <mesh>
        <sphereGeometry args={[0.18, 12, 10]} />
        <meshStandardMaterial
          color={highlighted ? '#FDE68A' : '#F8FAFC'}
          emissive={highlighted ? '#FBBF24' : '#000'}
          emissiveIntensity={highlighted ? 0.25 : 0}
        />
      </mesh>
      {/* Tête */}
      <mesh position={[0, 0.18, 0.12]}>
        <sphereGeometry args={[0.1, 12, 10]} />
        <meshStandardMaterial color={highlighted ? '#FDE68A' : '#F1F5F9'} />
      </mesh>
      {/* Bec */}
      <mesh position={[0, 0.16, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.04, 0.13, 6]} />
        <meshStandardMaterial color="#F59E0B" />
      </mesh>
      {/* Ailes (2 plats triangulaires) */}
      <mesh position={[0.16, 0, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <coneGeometry args={[0.07, 0.32, 4]} />
        <meshStandardMaterial color={highlighted ? '#FDE68A' : '#E2E8F0'} />
      </mesh>
      <mesh position={[-0.16, 0, 0]} rotation={[0, 0, Math.PI / 6]}>
        <coneGeometry args={[0.07, 0.32, 4]} />
        <meshStandardMaterial color={highlighted ? '#FDE68A' : '#E2E8F0'} />
      </mesh>
    </group>
  );
}

export type MangroveSceneProps = {
  identified: Set<Species>;
  onIdentify: (s: Species) => void;
};

export default function MangroveScene({ identified, onIdentify }: MangroveSceneProps) {
  return (
    <LabScene
      cameraPosition={[5, 2.4, 5.5]}
      background="#BAE6FD"
      minDistance={4}
      maxDistance={14}
      enablePan
    >
      <fog attach="fog" args={['#BAE6FD', 8, 22]} />
      <MudGround />
      <WaterSurface />

      {/* 3 palétuviers */}
      <Paletuvier
        position={[-2.4, -0.4, 0.8]}
        onClick={() => onIdentify('paletuvier')}
        highlighted={identified.has('paletuvier')}
      />
      <Paletuvier position={[2.6, -0.4, -1.2]} scale={0.9} />
      <Paletuvier position={[0.5, -0.4, 2.6]} scale={1.05} />

      {/* Faune */}
      <Fish
        basePos={[-0.5, -0.7, -0.5]}
        color="#3B82F6"
        speed={0.6}
        onClick={() => onIdentify('poisson')}
        highlighted={identified.has('poisson')}
      />
      <Fish
        basePos={[1.0, -0.9, 1.5]}
        color="#7C3AED"
        speed={0.85}
      />
      <Crab
        position={[-1.6, -1.32, -0.4]}
        onClick={() => onIdentify('crabe')}
        highlighted={identified.has('crabe')}
      />
      <Crab position={[1.4, -1.32, 1.2]} />
      <Bird
        basePos={[2.0, 1.6, -0.2]}
        onClick={() => onIdentify('oiseau')}
        highlighted={identified.has('oiseau')}
      />

      {/* Hotspots flottants pour les espèces non encore identifiées */}
      {!identified.has('paletuvier') && (
        <HotspotCoach position={[-2.4, 1.8, 0.8]} label="Clique-moi" tone="action" />
      )}
      {!identified.has('poisson') && identified.has('paletuvier') && (
        <HotspotCoach position={[-0.5, -0.3, -0.5]} label="Cherche les poissons" tone="science" />
      )}
      {!identified.has('crabe') && identified.has('poisson') && (
        <HotspotCoach position={[-1.6, -1.0, -0.4]} label="Et le crabe ?" tone="alert" />
      )}
      {!identified.has('oiseau') && identified.has('crabe') && (
        <HotspotCoach position={[2.0, 2.2, -0.2]} label="Lève les yeux" tone="violet" />
      )}
    </LabScene>
  );
}
