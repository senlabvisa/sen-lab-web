'use client';

import { ReactNode, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { ARButton, XR } from '@react-three/xr';
import { ACESFilmicToneMapping } from 'three';

/**
 * <LabScene> — wrapper Canvas R3F générique partagé par les TPs Lab Premium.
 *
 * Améliorations actives :
 *  - ACES Filmic tone mapping
 *  - 3-point lighting + ContactShadows + shadows
 *  - Post-processing (bloom + vignette) opt-out via postFx={false}
 *  - Environment HDR opt-in (null par défaut — évite les fetch CDN lents)
 *  - Mode AR via @react-three/xr opt-in (enableAR={true})
 *
 * Doit être chargé via `next/dynamic({ ssr: false })`.
 */

export type LabSceneProps = {
  children: ReactNode;
  background?: string;
  cameraPosition?: [number, number, number];
  fov?: number;
  minDistance?: number;
  maxDistance?: number;
  enablePan?: boolean;
  onInteract?: () => void;
  /** Préset HDR Environment. null = pas d'env (défaut, évite fetch CDN). */
  environment?: 'city' | 'sunset' | 'studio' | 'park' | 'night' | 'warehouse' | 'dawn' | 'apartment' | null;
  groundY?: number | null;
  postFx?: boolean;
  /** Activer le mode AR (WebXR). false par défaut, opt-in pour les TPs supportés. */
  enableAR?: boolean;
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
  environment = null,
  groundY = -1.5,
  postFx = true,
  enableAR = false,
}: LabSceneProps) {
  // Contenu de la scène (réutilisable avec ou sans XR wrapper)
  const sceneContent = (
    <>
      <ambientLight intensity={0.35} />
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
      <directionalLight position={[-4, 3, -5]} intensity={0.35} />
      <directionalLight position={[0, -2, -8]} intensity={0.18} />

      {environment && (
        <Suspense fallback={null}>
          <Environment preset={environment} />
        </Suspense>
      )}

      <Suspense fallback={null}>{children}</Suspense>

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

      {postFx && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.45} luminanceThreshold={0.85} luminanceSmoothing={0.5} mipmapBlur />
          <Vignette eskil={false} offset={0.15} darkness={0.4} />
        </EffectComposer>
      )}
    </>
  );

  return (
    <div className="relative h-full w-full">
      {enableAR && (
        <ARButton
          className="absolute right-3 top-3 z-10 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-bold text-white shadow-soft hover:bg-violet-700"
          sessionInit={{ optionalFeatures: ['local-floor'] }}
        />
      )}
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
        {enableAR ? <XR>{sceneContent}</XR> : sceneContent}
      </Canvas>
    </div>
  );
}
