'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

export type SoilSceneProps = { selected: 'vers' | 'racines' | 'feuilles' | 'champignons' | null };

const POSITIONS = {
  feuilles: [0, 0.6, 0] as [number, number, number],
  vers: [-1, -0.3, 0.4] as [number, number, number],
  racines: [0.8, -0.4, 0] as [number, number, number],
  champignons: [-0.6, 0.2, -0.4] as [number, number, number],
};

const LABELS = { vers: 'Ver de terre', racines: 'Racines', feuilles: 'Feuilles', champignons: 'Champignons' };

function PointerHandlers(onClick?: () => void) {
  return {
    onClick: (e: any) => { e.stopPropagation(); onClick?.(); },
    onPointerOver: (e: any) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; },
    onPointerOut: () => { document.body.style.cursor = 'auto'; },
  };
}

export default function SoilScene({ selected }: SoilSceneProps) {
  return (
    <LabScene cameraPosition={[2, 1, 3.5]} background="#A7F3D0" minDistance={2.5} maxDistance={8}>
      {/* Coupe de sol (cube brun) */}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[3, 1.2, 1.5]} />
        <meshStandardMaterial color="#78350F" roughness={0.95} />
      </mesh>
      {/* Surface (herbe) */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[3, 0.05, 1.5]} />
        <meshStandardMaterial color="#65A30D" />
      </mesh>

      {/* Vers de terre (tube rose) */}
      <mesh position={POSITIONS.vers} rotation={[0, 0, Math.PI / 6]}>
        <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
        <meshStandardMaterial
          color={selected === 'vers' ? '#FBA48A' : '#F8C9B6'}
          emissive={selected === 'vers' ? '#FB7185' : '#000'}
          emissiveIntensity={selected === 'vers' ? 0.4 : 0}
        />
      </mesh>

      {/* Racines */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[POSITIONS.racines[0] + i * 0.1, POSITIONS.racines[1] - i * 0.15, POSITIONS.racines[2]]} rotation={[0, 0, Math.PI / 8 + i * 0.2]}>
          <cylinderGeometry args={[0.025, 0.012, 0.4, 6]} />
          <meshStandardMaterial color={selected === 'racines' ? '#FCA5A5' : '#FECACA'} emissive={selected === 'racines' ? '#DC2626' : '#000'} emissiveIntensity={selected === 'racines' ? 0.3 : 0} />
        </mesh>
      ))}

      {/* Champignons (3 petits) */}
      {[-0.2, 0, 0.2].map((dx, i) => (
        <group key={i} position={[POSITIONS.champignons[0] + dx, POSITIONS.champignons[1], POSITIONS.champignons[2]]}>
          <mesh position={[0, -0.05, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.12, 8]} />
            <meshStandardMaterial color="#F9F4E7" />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <sphereGeometry args={[0.08, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={selected === 'champignons' ? '#F87171' : '#FCA5A5'} emissive={selected === 'champignons' ? '#DC2626' : '#000'} emissiveIntensity={selected === 'champignons' ? 0.4 : 0} />
          </mesh>
        </group>
      ))}

      {/* Feuilles (au-dessus de l'herbe) */}
      {[-0.5, 0, 0.5].map((dx, i) => (
        <mesh key={i} position={[POSITIONS.feuilles[0] + dx, POSITIONS.feuilles[1] + i * 0.05, POSITIONS.feuilles[2]]} scale={[1, 0.3, 0.6]}>
          <sphereGeometry args={[0.18, 10, 8]} />
          <meshStandardMaterial color={selected === 'feuilles' ? '#FBBF24' : '#84CC16'} emissive={selected === 'feuilles' ? '#A16207' : '#000'} emissiveIntensity={selected === 'feuilles' ? 0.3 : 0} />
        </mesh>
      ))}
    </LabScene>
  );
}

export { LABELS };
