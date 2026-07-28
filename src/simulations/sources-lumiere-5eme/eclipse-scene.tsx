'use client';

import { useMemo, useRef } from 'react';
import { Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Animate } from '@/components/lab3d/anim';
import { LabBench } from '@/components/lab3d/environment';
import { PolyLine, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';

/**
 * Scène 3D — propagation rectiligne de la lumière et formation des ombres
 * (Physique-Chimie, 5ème). Le Soleil (source primaire) éclaire un baobab
 * opaque ; la lumière se propage en LIGNE DROITE jusqu'à un écran et y
 * dessine une OMBRE portée. Rapprocher la source agrandit l'ombre.
 *
 * Les rayons sont tracés avec <PolyLine> (lignes droites), jamais des sphères.
 * L'ombre = projection conique (homothétie) : demi-ombre = h · d_se / d_so.
 */

export type EclipseSceneProps = { sourceX: number };

const GROUND_Y = -1.5;
const OBJ_X = 0; // baobab opaque centré
const OBJ_H = 1.1; // demi-hauteur de l'objet opaque
const SCREEN_X = 3.4; // écran (mur) à droite
const SUN_Y = GROUND_Y + OBJ_H * 0.55; // hauteur de la source

/** sourceX ∈ [0,100] → position x de la source entre -4 (loin) et -1 (près). */
function sourcePosX(sourceX: number) {
  const t = Math.max(0, Math.min(100, sourceX)) / 100;
  return -4 + t * 3; // 0 % → -4 (loin) ; 100 % → -1 (près)
}

export default function EclipseScene({ sourceX }: EclipseSceneProps) {
  const sun = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);

  const sx = sourcePosX(sourceX);

  const { rays, shadowHalf, shadowMid, sunPos } = useMemo(() => {
    const sourceY = SUN_Y;
    const src: [number, number, number] = [sx, sourceY, 0];
    const dSo = OBJ_X - sx; // source → objet (>0)
    const dSe = SCREEN_X - sx; // source → écran (>0)
    const k = dSe / dSo; // facteur d'agrandissement conique

    // Bords haut et bas de l'objet opaque (silhouette baobab).
    const topObj = GROUND_Y + 2 * OBJ_H;
    const botObj = GROUND_Y;
    // Projection des bords sur l'écran (homothétie de centre = source).
    const topScreen = sourceY + (topObj - sourceY) * k;
    const botScreen = sourceY + (botObj - sourceY) * k;
    const half = Math.abs(topScreen - botScreen) / 2;
    const mid = (topScreen + botScreen) / 2;

    // Rayons rectilignes : source → bord objet → écran (lignes droites).
    const rayTop: [number, number, number][] = [src, [OBJ_X, topObj, 0], [SCREEN_X, topScreen, 0]];
    const rayBot: [number, number, number][] = [src, [OBJ_X, botObj, 0], [SCREEN_X, botScreen, 0]];
    // Rayon libre au-dessus (lumière qui ne rencontre pas l'objet → pas d'ombre).
    const freeTopY = sourceY + (topObj + 0.9 - sourceY) * k;
    const rayFree: [number, number, number][] = [src, [SCREEN_X, freeTopY, 0]];

    return { rays: { rayTop, rayBot, rayFree }, shadowHalf: half, shadowMid: mid, sunPos: src };
  }, [sx]);

  return (
    <LabScene cameraPosition={[0.2, 0.8, 7.5]} background="#0B1220" minDistance={4} maxDistance={13} groundY={GROUND_Y}>
      <LabBench y={GROUND_Y} color="#C9B89A" size={26} />

      {/* Source primaire : le Soleil (sphère émissive + pointLight) */}
      <group position={sunPos}>
        <mesh ref={sun}>
          <sphereGeometry args={[0.42, 32, 24]} />
          <meshStandardMaterial color="#FFE27A" emissive="#FCA419" emissiveIntensity={1.4} roughness={0.4} />
        </mesh>
        <mesh ref={halo}>
          <sphereGeometry args={[0.6, 24, 18]} />
          <meshStandardMaterial color="#FDE68A" emissive="#FBBF24" emissiveIntensity={0.5} transparent opacity={0.28} />
        </mesh>
        <pointLight intensity={6} distance={14} decay={1.4} color="#FFE6A8" />
      </group>
      <Tag3D position={[sunPos[0], sunPos[1] + 0.95, 0]} label="Soleil · source primaire" tone="physique" />

      {/* Objet opaque : silhouette de baobab (tronc large + houppier) */}
      <group position={[OBJ_X, GROUND_Y, 0]}>
        <mesh position={[0, OBJ_H * 0.85, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.4, OBJ_H * 1.7, 16]} />
          <meshStandardMaterial color="#5A4126" roughness={0.9} />
        </mesh>
        <mesh position={[0, 2 * OBJ_H - 0.1, 0]} castShadow>
          <sphereGeometry args={[0.5, 20, 16]} />
          <meshStandardMaterial color="#2F6B33" roughness={0.85} />
        </mesh>
        <mesh position={[-0.35, 2 * OBJ_H - 0.35, 0]} castShadow>
          <sphereGeometry args={[0.32, 18, 14]} />
          <meshStandardMaterial color="#357A38" roughness={0.85} />
        </mesh>
        <mesh position={[0.36, 2 * OBJ_H - 0.4, 0]} castShadow>
          <sphereGeometry args={[0.3, 18, 14]} />
          <meshStandardMaterial color="#2C6630" roughness={0.85} />
        </mesh>
      </group>
      <Tag3D position={[OBJ_X, GROUND_Y - 0.3, 0]} label="objet opaque (baobab)" tone="svt" />

      {/* Écran (mur éclairé = objet diffusant) avec l'ombre portée dessinée */}
      <group position={[SCREEN_X, GROUND_Y + OBJ_H, 0]}>
        <mesh>
          <planeGeometry args={[0.05, 2 * OBJ_H + 1.6]} />
          <meshStandardMaterial color="#E8E0CF" roughness={0.95} />
        </mesh>
        <mesh position={[0.03, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[3.2, 2 * OBJ_H + 1.6]} />
          <meshStandardMaterial color="#EDE6D6" roughness={0.95} />
        </mesh>
        {/* tache d'ombre portée (sombre) centrée sur la projection de l'objet */}
        <mesh position={[0.04, shadowMid - (GROUND_Y + OBJ_H), 0]}>
          <planeGeometry args={[1.0, shadowHalf * 2]} />
          <meshStandardMaterial color="#11161F" roughness={1} />
        </mesh>
      </group>
      <Tag3D position={[SCREEN_X, GROUND_Y - 0.3, 0]} label="écran · mur diffusant" tone="physique" />

      {/* Rayons lumineux RECTILIGNES (PolyLine, lignes droites) */}
      <PolyLine points={rays.rayTop} color="#FACC15" width={2.5} />
      <PolyLine points={rays.rayBot} color="#FACC15" width={2.5} />
      <PolyLine points={rays.rayFree} color="#FDE68A" width={1.6} dashed />

      {/* Repères de l'ombre sur l'écran */}
      <Marker position={[SCREEN_X + 0.05, shadowMid, 0]} color="#1E293B" size={0.07} />

      <SceneLabel
        position={[0, GROUND_Y + 2 * OBJ_H + 1.1, 0]}
        title="La lumière se propage en ligne droite"
        subtitle="Soleil → baobab opaque → ombre sur le mur"
        tone="physique"
      />
      <Readout position={[SCREEN_X + 0.9, GROUND_Y + OBJ_H, 0]} value={(shadowHalf * 2).toFixed(2)} unit="m" caption="hauteur de l'ombre" />

      {/* Léger scintillement de la source (vivant, non distrayant). */}
      <Animate fn={(state) => {
        const p = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.04;
        sun.current?.scale.setScalar(p);
        halo.current?.scale.setScalar(p * 1.15);
      }} />
    </LabScene>
  );
}
