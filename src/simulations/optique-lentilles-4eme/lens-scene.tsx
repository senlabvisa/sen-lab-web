'use client';

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type LensSceneProps = { focal: number; objectDist: number };

export default function LensScene({ focal, objectDist }: LensSceneProps) {
  // Image : 1/p + 1/p' = 1/f ⇒ p' = (f * p) / (p - f) (formule simplifiée)
  const imageDist = useMemo(() => {
    const f = focal;
    const p = objectDist;
    if (Math.abs(p - f) < 0.05) return 99; // infini
    return (f * p) / (p - f);
  }, [focal, objectDist]);
  const inverted = imageDist > 0;

  return (
    <LabScene cameraPosition={[0, 1, 5]} background="#DBEAFE" minDistance={3} maxDistance={10}>
      {/* Axe optique */}
      <mesh>
        <boxGeometry args={[8, 0.02, 0.02]} />
        <meshStandardMaterial color="#94A3B8" />
      </mesh>
      {/* Lentille (cylindre fin) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1, 1, 0.1, 32]} />
        <meshStandardMaterial color="#A5C8F5" opacity={0.4} transparent />
      </mesh>
      {/* Objet (flèche debout) */}
      <mesh position={[-objectDist, 0.4, 0]}>
        <boxGeometry args={[0.05, 0.8, 0.05]} />
        <meshStandardMaterial color="#DC2626" />
      </mesh>
      <mesh position={[-objectDist, 0.85, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.1, 0.2, 8]} />
        <meshStandardMaterial color="#DC2626" />
      </mesh>
      {/* Image (flèche inversée si réelle) */}
      {imageDist < 8 && imageDist > 0 && (
        <>
          <mesh position={[imageDist, -0.4, 0]}>
            <boxGeometry args={[0.05, 0.8, 0.05]} />
            <meshStandardMaterial color="#10B981" />
          </mesh>
          <mesh position={[imageDist, -0.85, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.1, 0.2, 8]} />
            <meshStandardMaterial color="#10B981" />
          </mesh>
        </>
      )}
      {/* Foyers */}
      {[-focal, focal].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <sphereGeometry args={[0.06, 12, 10]} />
          <meshStandardMaterial color="#F59E0B" emissive="#D97706" emissiveIntensity={0.5} />
        </mesh>
      ))}
      <Html position={[0, 1.6, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-blue-200">
          <div className="text-[10px] uppercase text-ink/50">Image</div>
          <div className="font-display text-sm font-bold text-blue-700">{imageDist > 8 ? 'Très loin' : imageDist < 0 ? 'Virtuelle' : 'Réelle inversée'}</div>
        </div>
      </Html>
    </LabScene>
  );
}
