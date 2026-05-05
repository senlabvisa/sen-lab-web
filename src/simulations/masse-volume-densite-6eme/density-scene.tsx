'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { HotspotCoach } from '@/components/lab/hotspot-coach';

/**
 * Scène 3D — masse, volume et densité.
 *
 * Cuve d'eau transparente vue de 3/4. 4 objets aux densités différentes :
 *  - bois (0.7 g/cm³) → flotte à la surface
 *  - polystyrène (0.05 g/cm³) → flotte presque hors de l'eau
 *  - glaçon (0.92 g/cm³) → flotte juste sous la surface (~10% émergé)
 *  - bille de fer (7.87 g/cm³) → coule au fond
 *
 * Chaque objet est cliquable. La sélection met l'objet en surbrillance
 * et déclenche un hotspot avec son nom — le module pédago affiche les
 * propriétés (masse, volume, densité).
 *
 * Doit être chargé via next/dynamic({ ssr: false }).
 */

export type ObjectKey = 'bois' | 'polystyrene' | 'glacon' | 'fer';

const OBJECT_LABELS: Record<ObjectKey, string> = {
  bois: 'Bois',
  polystyrene: 'Polystyrène',
  glacon: 'Glaçon',
  fer: 'Bille de fer',
};

// Hauteur "y" finale de chaque objet dans la cuve (eau à y=1.0, fond à y=-1.5)
// Calcul : un objet de densité d flotte avec une fraction d/d_eau immergée
const Y_WATER_SURFACE = 1.0;
const Y_BOTTOM = -1.4;

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
// CUVE
// =========================================================================
function Cuve() {
  const W = 4;
  const H = 3;
  const D = 2.4;
  // Parois transparentes (4 plans + un sol)
  return (
    <group>
      {/* Sol */}
      <mesh position={[0, Y_BOTTOM, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#94A3B8" />
      </mesh>
      {/* Paroi avant */}
      <mesh position={[0, (Y_BOTTOM + Y_WATER_SURFACE + 0.5) / 2 - 0.1, D / 2]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#BFDBFE" opacity={0.18} transparent side={DoubleSide} />
      </mesh>
      {/* Paroi arrière */}
      <mesh position={[0, (Y_BOTTOM + Y_WATER_SURFACE + 0.5) / 2 - 0.1, -D / 2]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#BFDBFE" opacity={0.18} transparent side={DoubleSide} />
      </mesh>
      {/* Paroi gauche */}
      <mesh position={[-W / 2, (Y_BOTTOM + Y_WATER_SURFACE + 0.5) / 2 - 0.1, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#BFDBFE" opacity={0.18} transparent side={DoubleSide} />
      </mesh>
      {/* Paroi droite */}
      <mesh position={[W / 2, (Y_BOTTOM + Y_WATER_SURFACE + 0.5) / 2 - 0.1, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#BFDBFE" opacity={0.18} transparent side={DoubleSide} />
      </mesh>
      {/* Eau (volume bleuté semi-transparent) */}
      <mesh
        position={[
          0,
          (Y_BOTTOM + Y_WATER_SURFACE) / 2,
          0,
        ]}
      >
        <boxGeometry args={[W * 0.99, Y_WATER_SURFACE - Y_BOTTOM, D * 0.99]} />
        <meshStandardMaterial
          color="#3B82F6"
          opacity={0.28}
          transparent
          roughness={0.2}
        />
      </mesh>
      {/* Surface d'eau (subtile, légèrement translucide) */}
      <mesh position={[0, Y_WATER_SURFACE, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 0.99, D * 0.99]} />
        <meshStandardMaterial
          color="#60A5FA"
          opacity={0.5}
          transparent
          metalness={0.2}
          roughness={0.15}
        />
      </mesh>
    </group>
  );
}

// =========================================================================
// OBJETS
// =========================================================================
function FloatingObject({
  position,
  selected,
  onClick,
  children,
  bobble = true,
}: {
  position: [number, number, number];
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  bobble?: boolean;
}) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (groupRef.current && bobble) {
      const t = state.clock.elapsedTime;
      groupRef.current.position.y = position[1] + Math.sin(t * 1.2 + position[0]) * 0.04;
    }
  });
  const handlers = PointerHandlers(onClick);
  return (
    <group ref={groupRef} position={position} {...handlers} scale={selected ? 1.15 : 1}>
      {children}
    </group>
  );
}

function BoisCube({ selected, onClick }: { selected: boolean; onClick: () => void }) {
  // Bois (densité 0.7) : 70% immergé, 30% émergé. Centre à y = surface - 0.4 * 0.5
  return (
    <FloatingObject position={[-1.2, Y_WATER_SURFACE - 0.1, 0.4]} selected={selected} onClick={onClick}>
      <mesh>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial
          color="#A0522D"
          roughness={0.85}
          emissive={selected ? '#92400E' : '#000'}
          emissiveIntensity={selected ? 0.35 : 0}
        />
      </mesh>
      {/* Quelques rainures pour l'effet bois */}
      <mesh position={[0, 0.255, 0]}>
        <boxGeometry args={[0.5, 0.005, 0.5]} />
        <meshStandardMaterial color="#5D3A1A" />
      </mesh>
    </FloatingObject>
  );
}

function PolystyreneCube({ selected, onClick }: { selected: boolean; onClick: () => void }) {
  // Polystyrène (densité 0.05) : flotte presque entièrement hors de l'eau
  return (
    <FloatingObject position={[1.3, Y_WATER_SURFACE + 0.18, -0.5]} selected={selected} onClick={onClick}>
      <mesh>
        <boxGeometry args={[0.45, 0.45, 0.45]} />
        <meshStandardMaterial
          color="#F8FAFC"
          roughness={0.95}
          emissive={selected ? '#94A3B8' : '#000'}
          emissiveIntensity={selected ? 0.4 : 0}
        />
      </mesh>
    </FloatingObject>
  );
}

function GlaconCube({ selected, onClick }: { selected: boolean; onClick: () => void }) {
  // Glaçon (densité 0.92) : ~92% immergé, 8% émergé (iceberg)
  return (
    <FloatingObject position={[-0.2, Y_WATER_SURFACE - 0.18, -0.4]} selected={selected} onClick={onClick}>
      <mesh>
        <boxGeometry args={[0.48, 0.48, 0.48]} />
        <meshStandardMaterial
          color="#DBEAFE"
          opacity={0.85}
          transparent
          roughness={0.1}
          metalness={0.1}
          emissive={selected ? '#93C5FD' : '#000'}
          emissiveIntensity={selected ? 0.4 : 0}
        />
      </mesh>
    </FloatingObject>
  );
}

function FerBille({ selected, onClick }: { selected: boolean; onClick: () => void }) {
  // Fer : coule au fond
  return (
    <FloatingObject
      position={[0.6, Y_BOTTOM + 0.18, 0.5]}
      selected={selected}
      onClick={onClick}
      bobble={false}
    >
      <mesh>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshStandardMaterial
          color="#475569"
          metalness={0.7}
          roughness={0.3}
          emissive={selected ? '#1E293B' : '#000'}
          emissiveIntensity={selected ? 0.5 : 0}
        />
      </mesh>
    </FloatingObject>
  );
}

// =========================================================================
// SCÈNE
// =========================================================================
export type DensitySceneProps = {
  selected: ObjectKey | null;
  onSelect: (k: ObjectKey) => void;
};

export default function DensityScene({ selected, onSelect }: DensitySceneProps) {
  const labelByKey: Record<ObjectKey, { label: string; tone: 'action' | 'science' | 'violet' | 'alert' }> = {
    bois: { label: 'Bois — flotte (d=0.7)', tone: 'action' },
    polystyrene: { label: 'Polystyrène — flotte haut (d=0.05)', tone: 'violet' },
    glacon: { label: 'Glaçon — flotte (d=0.92)', tone: 'science' },
    fer: { label: 'Fer — coule (d=7.87)', tone: 'alert' },
  };

  return (
    <LabScene
      cameraPosition={[3.5, 2, 4.5]}
      background="#EFF6FF"
      minDistance={3}
      maxDistance={12}
      enablePan
    >
      <Cuve />

      <BoisCube selected={selected === 'bois'} onClick={() => onSelect('bois')} />
      <PolystyreneCube selected={selected === 'polystyrene'} onClick={() => onSelect('polystyrene')} />
      <GlaconCube selected={selected === 'glacon'} onClick={() => onSelect('glacon')} />
      <FerBille selected={selected === 'fer'} onClick={() => onSelect('fer')} />

      {/* Hotspot d'invitation au début */}
      {selected === null && (
        <HotspotCoach position={[0, 2.4, 0]} label="Clique sur les objets" tone="violet" />
      )}
      {/* Hotspot info sur l'objet sélectionné */}
      {selected !== null && (
        <HotspotCoach
          position={[0, 2.6, 0]}
          label={labelByKey[selected].label}
          tone={labelByKey[selected].tone}
        />
      )}
    </LabScene>
  );
}

export { OBJECT_LABELS };
