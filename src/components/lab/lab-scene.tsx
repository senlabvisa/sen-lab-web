'use client';

import { ReactNode, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

/**
 * <LabScene> — wrapper Canvas R3F générique partagé par les TPs Lab Premium.
 *
 * Fournit un éclairage, une caméra et OrbitControls par défaut. Charge
 * les enfants 3D via Suspense (compatible avec drei <Html>, useGLTF, etc.).
 *
 * Les fichiers qui importent ce composant doivent être chargés via
 * `next/dynamic({ ssr: false })` pour garder Three.js hors du bundle initial.
 */

export type LabSceneProps = {
  children: ReactNode;
  /** Couleur de fond du Canvas. Par défaut : violet pâle Sen Lab. */
  background?: string;
  /** Position initiale de la caméra en [x, y, z]. */
  cameraPosition?: [number, number, number];
  /** Champ de vision en degrés. */
  fov?: number;
  /** Distance min en orbite. */
  minDistance?: number;
  /** Distance max en orbite. */
  maxDistance?: number;
  /** Activer le pan (déplacement caméra). */
  enablePan?: boolean;
  /** Hook utile : signale une interaction utilisateur. */
  onInteract?: () => void;
};

export function LabScene({
  children,
  background = '#F5F3FF',
  cameraPosition = [0, 1.5, 6],
  fov = 45,
  minDistance = 2,
  maxDistance = 14,
  enablePan = false,
  onInteract,
}: LabSceneProps) {
  return (
    <Canvas
      camera={{ position: cameraPosition, fov }}
      dpr={[1, 2]}
      onPointerDown={onInteract}
      onWheel={onInteract}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[background]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 6]} intensity={0.85} />
      <directionalLight position={[-4, -3, -5]} intensity={0.25} />
      <Suspense fallback={null}>{children}</Suspense>
      <OrbitControls
        enablePan={enablePan}
        minDistance={minDistance}
        maxDistance={maxDistance}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
