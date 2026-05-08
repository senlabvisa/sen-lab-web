'use client';

import { ReactNode, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { ACESFilmicToneMapping } from 'three';

/**
 * <LabScene> — wrapper Canvas R3F générique partagé par les TPs Lab Premium.
 *
 * Améliorations (Phase 1) :
 *  - ACES Filmic tone mapping (couleurs naturelles)
 *  - Environment HDR (préset "city" par défaut, drei) → reflets + ambiance
 *  - ContactShadows (ombre soft au sol, optionnel)
 *  - 3-point lighting (key + fill + rim) au lieu de 2 directionalLights
 *  - shadows activées
 *  - dpr [1, 2] pour qualité retina
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
  /** Préréglage d'environnement HDR (drei). 'city', 'sunset', 'studio', 'park', 'night', 'warehouse'. */
  environment?: 'city' | 'sunset' | 'studio' | 'park' | 'night' | 'warehouse' | 'dawn' | 'apartment' | null;
  /** Position Y du sol pour les ContactShadows. null = désactivé. */
  groundY?: number | null;
  /** Activer post-processing (bloom + vignette). true par défaut, false sur mobile lent. */
  postFx?: boolean;
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
  environment = 'city',
  groundY = -1.5,
  postFx = true,
}: LabSceneProps) {
  return (
    <Canvas
      camera={{ position: cameraPosition, fov }}
      dpr={[1, 2]}
      shadows
      onPointerDown={onInteract}
      onWheel={onInteract}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
    >
      <color attach="background" args={[background]} />

      {/* 3-point lighting */}
      <ambientLight intensity={0.35} />
      {/* Key light (principale, chaude) */}
      <directionalLight
        position={[5, 8, 6]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={20}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      {/* Fill light (secondaire, douce, opposée) */}
      <directionalLight position={[-4, 3, -5]} intensity={0.35} />
      {/* Rim light (contour) */}
      <directionalLight position={[0, -2, -8]} intensity={0.18} />

      {/* Environment HDR pour reflets et ambiance — drei built-in presets */}
      {environment && (
        <Suspense fallback={null}>
          <Environment preset={environment} />
        </Suspense>
      )}

      <Suspense fallback={null}>{children}</Suspense>

      {/* Ombres soft au sol */}
      {groundY !== null && (
        <ContactShadows
          position={[0, groundY, 0]}
          opacity={0.4}
          scale={20}
          blur={2.5}
          far={4}
          color="#0F172A"
        />
      )}

      <OrbitControls
        enablePan={enablePan}
        minDistance={minDistance}
        maxDistance={maxDistance}
        enableDamping
        dampingFactor={0.08}
      />

      {/* Post-processing : bloom subtil + vignette douce */}
      {postFx && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.45} luminanceThreshold={0.85} luminanceSmoothing={0.5} mipmapBlur />
          <Vignette eskil={false} offset={0.15} darkness={0.4} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
