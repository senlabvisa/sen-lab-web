'use client';

import { useMemo, useRef } from 'react';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench } from '@/components/lab3d/environment';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — agrandissement / réduction (Maths, 3ème).
 *
 * Une même maison 3D (cube + toit pyramidal) en deux exemplaires :
 * l'ORIGINAL (k = 1, à gauche) et son IMAGE par le coefficient k (à droite).
 * L'image grandit ou rétrécit avec le slider k. On lit en direct que les
 * longueurs sont ×k, les aires ×k² et le volume ×k³. Construit sur lab3d.
 */

export type ScaleSceneProps = { ratio: number };

const GROUND_Y = -1.5;
const ORIG = -2; // position x de l'original
const IMG = 2; // position x de l'image

/** Maison repère : socle cubique + toit pyramidal. `s` = facteur d'échelle. */
function House({ s, color, roof }: { s: number; color: string; roof: string }) {
  return (
    <group scale={[s, s, s]}>
      {/* murs (cube de côté 1) */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
      </mesh>
      {/* toit (pyramide à base carrée → coneGeometry 4 segments) */}
      <mesh position={[0, 1.18, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.78, 0.55, 4]} />
        <meshStandardMaterial color={roof} roughness={0.5} />
      </mesh>
      {/* porte (repère de longueur) */}
      <mesh position={[0, 0.22, 0.505]}>
        <boxGeometry args={[0.26, 0.44, 0.02]} />
        <meshStandardMaterial color="#7C3AED" roughness={0.6} />
      </mesh>
    </group>
  );
}

export default function ScaleScene({ ratio }: ScaleSceneProps) {
  const imgRef = useRef<Group>(null);

  const { aire, volume, kind } = useMemo(() => {
    const k = ratio;
    return {
      aire: k * k,
      volume: k * k * k,
      kind: k > 1.001 ? 'Agrandissement' : k < 0.999 ? 'Réduction' : 'Identique',
    };
  }, [ratio]);

  return (
    <LabScene cameraPosition={[0, 1.3, 7]} background="#F5F3FF" minDistance={4} maxDistance={12} groundY={GROUND_Y}>
      <LabBench y={GROUND_Y} color="#E9E3F7" size={26} />

      {/* ORIGINAL (k = 1) */}
      <group position={[ORIG, GROUND_Y, 0]}>
        <House s={1} color="#A78BFA" roof="#6D28D9" />
        <Tag3D position={[0, 1.9, 0]} label="Original (k = 1)" tone="maths" />
      </group>

      {/* IMAGE (× k) — grandit / rétrécit avec le slider */}
      <group ref={imgRef} position={[IMG, GROUND_Y, 0]}>
        <House s={ratio} color="#7C3AED" roof="#4C1D95" />
        <Tag3D position={[0, Math.max(1.9, 1.7 * ratio + 0.5), 0]} label={`Image (×${ratio.toFixed(1)})`} tone="maths" />
      </group>

      {/* Légère oscillation de l'image pour la « mettre en vie » sans useFrame composant */}
      <Animate
        fn={(state) => {
          imgRef.current?.position.setY(GROUND_Y + Math.sin(state.clock.elapsedTime * 1.4) * 0.04);
        }}
      />

      {/* Lectures clés : effet de k sur longueurs / aires / volumes */}
      <SceneLabel position={[0, 2.7, 0]} title={`Coefficient k = ${ratio.toFixed(1)}`} subtitle={kind} tone="maths" />
      <Readout position={[IMG, -0.5, 0]} value={ratio.toFixed(1)} unit="×" caption="longueurs ×k" />
      <Readout position={[IMG + 1.7, 0.4, 0]} value={aire.toFixed(2)} unit="×" caption="aire ×k²" />
      <Readout position={[IMG + 1.7, 1.3, 0]} value={volume.toFixed(2)} unit="×" caption="volume ×k³" />
    </LabScene>
  );
}
