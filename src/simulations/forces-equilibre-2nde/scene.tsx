'use client';

import { useRef } from 'react';
import { Mesh, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench } from '@/components/lab3d/environment';
import { Arrow3D } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — forces et équilibre (Physique-Chimie, 2nde).
 *
 * Tir à la corde : deux équipes tirent le nœud central (l'objet étudié) dans
 * des sens opposés. Les vecteurs F₁ (gauche) et F₂ (droite) ont une longueur
 * proportionnelle à leur intensité. À forces égales, la résultante est nulle :
 * le nœud reste immobile au centre (équilibre). Sinon il dérive vers l'équipe
 * la plus forte. Construit sur le kit lab3d (Arrow3D, pas de cônes bricolés).
 */

export type ForceSceneProps = { f1: number; f2: number };

const Y = -0.2; // hauteur de la corde
const FSCALE = 0.16; // N → unités scène (longueur des flèches)
const GROUND_Y = -1.5;
const POST = 2.8; // demi-écart entre les deux équipes

export default function ForceScene({ f1, f2 }: ForceSceneProps) {
  const knot = useRef<Mesh>(null);
  const net = f2 - f1;
  const knotX = Math.max(-1.1, Math.min(1.1, net * 0.12)); // dérive vers l'équipe la plus forte
  const balanced = f1 === f2;

  const f1End: Vector3Tuple = [knotX - 0.18 - f1 * FSCALE, Y, 0];
  const f2End: Vector3Tuple = [knotX + 0.18 + f2 * FSCALE, Y, 0];

  const leftLen = Math.max(0.05, knotX + POST);
  const rightLen = Math.max(0.05, POST - knotX);

  return (
    <LabScene cameraPosition={[0, 0.7, 5.8]} background="#DBEAFE" minDistance={3.5} maxDistance={10} groundY={GROUND_Y}>
      <LabBench y={GROUND_Y} color="#D9C7A6" size={24} />

      {/* Poteaux d'ancrage des deux équipes */}
      <mesh position={[-POST, Y, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 1.6, 14]} />
        <meshStandardMaterial color="#1E3A8A" roughness={0.6} />
      </mesh>
      <mesh position={[POST, Y, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 1.6, 14]} />
        <meshStandardMaterial color="#065F46" roughness={0.6} />
      </mesh>

      {/* Corde (deux brins, du poteau au nœud) */}
      <mesh position={[(-POST + knotX) / 2, Y, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, leftLen, 8]} />
        <meshStandardMaterial color="#B45309" roughness={0.85} />
      </mesh>
      <mesh position={[(POST + knotX) / 2, Y, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, rightLen, 8]} />
        <meshStandardMaterial color="#B45309" roughness={0.85} />
      </mesh>

      {/* Nœud central = l'objet dont on étudie l'équilibre */}
      <mesh ref={knot} castShadow>
        <sphereGeometry args={[0.17, 20, 16]} />
        <meshStandardMaterial
          color={balanced ? '#16A34A' : '#DC2626'}
          emissive={balanced ? '#14532D' : '#7F1D1D'}
          emissiveIntensity={0.3}
          roughness={0.4}
        />
      </mesh>

      {/* Vecteurs forces (longueur ∝ intensité) */}
      <Arrow3D from={[knotX - 0.16, Y, 0]} to={f1End} color="#2563EB" radius={0.045} headLength={0.28} />
      <Arrow3D from={[knotX + 0.16, Y, 0]} to={f2End} color="#10B981" radius={0.045} headLength={0.28} />
      <Tag3D position={[f1End[0] - 0.05, Y + 0.42, 0]} label={`F₁ = ${f1} N`} tone="physique" />
      <Tag3D position={[f2End[0] + 0.05, Y + 0.42, 0]} label={`F₂ = ${f2} N`} tone="svt" />

      {/* Petite oscillation de tension si déséquilibre (le nœud n'est pas figé) */}
      <Animate
        fn={(state) => {
          const wobble = balanced ? 0 : Math.sin(state.clock.elapsedTime * 6) * 0.035 * Math.min(1, Math.abs(net) / 3);
          knot.current?.position.set(knotX + wobble, Y, 0);
        }}
      />

      <SceneLabel
        position={[0, 1.8, 0]}
        title={balanced ? '⚖ Équilibre' : `Déséquilibre → ${net > 0 ? 'droite' : 'gauche'}`}
        subtitle="Tir à la corde"
        tone={balanced ? 'svt' : 'physique'}
      />
      <Readout position={[-2.3, -1.05, 0]} value={f1} unit="N" caption="F₁ gauche" />
      <Readout position={[2.3, -1.05, 0]} value={f2} unit="N" caption="F₂ droite" />
      <Readout position={[0, -1.05, 0]} value={net === 0 ? '0' : (net > 0 ? '+' : '−') + Math.abs(net)} unit="N" caption="résultante" />
    </LabScene>
  );
}
