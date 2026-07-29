'use client';

import { ReactNode, Suspense, useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  PerformanceMonitor,
} from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { ARButton, XR } from '@react-three/xr';
import { ACESFilmicToneMapping } from 'three';

/**
 * <LabScene> — wrapper Canvas R3F générique partagé par les TPs Lab Premium.
 *
 * Améliorations actives :
 *  - ACES Filmic tone mapping
 *  - **Studio d'éclairage procédural 100 % hors-ligne** (<Environment> + <Lightformer>) :
 *    aucune requête réseau, aucun HDR téléchargé. C'est ce qui donne au verre
 *    (transmission/IOR) et au métal (envMapIntensity) quelque chose à réfléchir.
 *    Rendu une seule fois (`frames={1}`) dans un cube 128/256 → coût one-shot.
 *  - Rig 3 points retravaillé (clé dirigée + contre-jour pour détacher les silhouettes)
 *  - Ombres ancrées : bias/normalBias réglés (plus d'acné), ContactShadows resserrées
 *  - Post-processing (bloom + vignette) opt-out via postFx={false}
 *  - Qualité adaptative : PerformanceMonitor pilote le dpr et coupe le postFx
 *    en dernier recours (matériel scolaire, page galerie à 6 canvas)
 *  - Environment HDR **preset** toujours opt-in via `environment` (⚠ fetch CDN)
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
  /**
   * Préset HDR Environment (⚠ télécharge un HDR depuis un CDN — à éviter hors ligne).
   * null = pas de préset (défaut). Le studio procédural local prend le relais.
   */
  environment?: 'city' | 'sunset' | 'studio' | 'park' | 'night' | 'warehouse' | 'dawn' | 'apartment' | null;
  groundY?: number | null;
  postFx?: boolean;
  /** Activer le mode AR (WebXR). false par défaut, opt-in pour les TPs supportés. */
  enableAR?: boolean;

  // ── Ajouts optionnels (défauts sûrs, rétrocompatibles) ────────────────
  /** Studio d'éclairage procédural hors-ligne. true par défaut. */
  studio?: boolean;
  /** Intensité globale de la carte d'environnement (reflets). 1 par défaut. */
  studioIntensity?: number;
  /** Résolution du cube d'environnement. `auto` selon le tier machine. */
  envResolution?: number;
  /** Résolution de la shadow map de la lumière clé. `auto` selon le tier machine. */
  shadowMapSize?: number;
  /** Plafond de device pixel ratio. `auto` (1.5 bas de gamme / 2 sinon). */
  maxDpr?: number;
  /** Dégradation automatique du dpr / postFx si le framerate s'effondre. true par défaut. */
  adaptive?: boolean;
};

/** Tier machine détecté une seule fois côté client (pas de WebGL probing). */
function detectTier(): 'low' | 'high' {
  if (typeof navigator === 'undefined') return 'low';
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  return cores >= 8 && memory >= 8 ? 'high' : 'low';
}

/**
 * Studio d'éclairage procédural — 100 % local, zéro asset externe.
 *
 * Un fond neutre (radiance de base, indispensable pour que le verre ne soit pas
 * noir) + 6 « softbox » : plafonnier, deux bandes verticales latérales (ce sont
 * elles qui dessinent les longs reflets sur la verrerie cylindrique), un panneau
 * arrière (contre-jour), un fill face caméra et un rebond chaud venant de la
 * paillasse. Rendu une seule fois dans un cube map (`frames={1}`).
 */
function StudioEnvironment({ resolution, intensity }: { resolution: number; intensity: number }) {
  return (
    <Environment frames={1} resolution={resolution} background={false} environmentIntensity={intensity}>
      {/* radiance ambiante de base du « local » */}
      <color attach="background" args={['#5D6675']} />

      {/* plafonnier (softbox principale) */}
      <Lightformer form="rect" intensity={2.4} color="#FFFFFF" scale={[9, 9, 1]} position={[0, 7, 0.5]} />
      {/* bande verticale gauche, froide → reflet allongé sur les cylindres */}
      <Lightformer form="rect" intensity={3.2} color="#EAF1FF" scale={[0.7, 7, 1]} position={[-5, 1.5, 2.5]} />
      {/* bande verticale droite, chaude → deuxième arête de reflet */}
      <Lightformer form="rect" intensity={2.1} color="#FFF2E0" scale={[0.5, 6, 1]} position={[5.2, 1.8, 1.2]} />
      {/* panneau arrière → contre-jour, détache les silhouettes */}
      <Lightformer form="rect" intensity={1.5} color="#D9E5FF" scale={[9, 4, 1]} position={[0, 3, -6.5]} />
      {/* fill face caméra → évite les faces avant de verre totalement mortes */}
      <Lightformer form="rect" intensity={0.7} color="#FFFFFF" scale={[7, 4, 1]} position={[0, 1, 7]} />
      {/* rebond de la paillasse (chaud, par en dessous) */}
      <Lightformer form="rect" intensity={0.55} color="#EDE4D2" scale={[10, 10, 1]} position={[0, -4, 0]} />
    </Environment>
  );
}

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
  studio = true,
  studioIntensity = 1,
  envResolution,
  shadowMapSize,
  maxDpr,
  adaptive = true,
}: LabSceneProps) {
  const [tier] = useState(detectTier);

  const dprCeiling = maxDpr ?? (tier === 'high' ? 2 : 1.5);
  const shadowSize = shadowMapSize ?? (tier === 'high' ? 2048 : 1024);
  const envSize = envResolution ?? (tier === 'high' ? 256 : 128);

  // Qualité adaptative : on part optimiste (dpr max) et on dégrade si ça rame.
  const [dpr, setDpr] = useState(dprCeiling);
  const [degraded, setDegraded] = useState(false);

  const handlePerfChange = useCallback(
    ({ factor }: { factor: number }) => {
      const next = 1 + factor * (dprCeiling - 1);
      setDpr(Math.round(next * 100) / 100);
    },
    [dprCeiling],
  );
  const handleFallback = useCallback(() => {
    setDpr(1);
    setDegraded(true);
  }, []);

  // Le préset HDR (opt-in, réseau) l'emporte s'il est explicitement demandé.
  const useStudio = studio && !environment;
  const effectsOn = postFx && !degraded;

  // Contenu de la scène (réutilisable avec ou sans XR wrapper)
  const sceneContent = (
    <>
      {adaptive && (
        <PerformanceMonitor
          factor={1}
          flipflops={3}
          onChange={handlePerfChange}
          onFallback={handleFallback}
        />
      )}

      {/* Ambiante volontairement basse : la carte d'environnement fournit
          désormais l'essentiel de la lumière indirecte. */}
      <ambientLight intensity={0.14} />

      {/* Lumière clé — dirigée, légèrement chaude, seule à porter les ombres. */}
      <directionalLight
        position={[4.5, 7.5, 4.5]}
        intensity={1.05}
        color="#FFF7EC"
        castShadow
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
        shadow-camera-near={0.5}
        shadow-camera-far={24}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0005}
        shadow-normalBias={0.025}
        shadow-radius={3}
      />
      {/* Fill froid, côté opposé — adoucit les ombres portées. */}
      <directionalLight position={[-5, 2.5, 3]} intensity={0.28} color="#DCE8FF" />
      {/* Contre-jour — détache les silhouettes du fond. */}
      <directionalLight position={[-2.5, 3.5, -6.5]} intensity={0.7} color="#CFE0FF" />
      {/* Rebond de la paillasse — évite les dessous complètement noirs. */}
      <directionalLight position={[0, -4, 1.5]} intensity={0.12} color="#FFEFD8" />

      {useStudio && <StudioEnvironment resolution={envSize} intensity={studioIntensity} />}

      {environment && (
        <Suspense fallback={null}>
          <Environment preset={environment} />
        </Suspense>
      )}

      <Suspense fallback={null}>{children}</Suspense>

      {groundY !== null && (
        <ContactShadows
          position={[0, groundY + 0.002, 0]}
          opacity={0.55}
          scale={20}
          blur={2.2}
          far={3}
          resolution={512}
          color="#1E293B"
        />
      )}

      <OrbitControls
        enablePan={enablePan}
        minDistance={minDistance}
        maxDistance={maxDistance}
        enableDamping
        dampingFactor={0.08}
      />

      {effectsOn && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.35} luminanceThreshold={0.9} luminanceSmoothing={0.4} mipmapBlur />
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
        dpr={dpr}
        shadows
        onPointerDown={onInteract}
        onWheel={onInteract}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
      >
        <color attach="background" args={[background]} />
        {enableAR ? <XR>{sceneContent}</XR> : sceneContent}
      </Canvas>
    </div>
  );
}
