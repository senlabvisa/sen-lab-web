'use client';

import { useRef } from 'react';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Arrow3D } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — tectonique des plaques (SVT, 1ère).
 *
 * Deux plaques posées sur le manteau convergent. Plus la tension monte, plus
 * elles se rapprochent et soulèvent une chaîne de montagnes à la frontière
 * (orogenèse) ; la faille devient incandescente. Au-delà du seuil, l'énergie
 * se libère : tremblement (séisme). Construit sur le kit lab3d — les plaques
 * bougent vraiment, fini la sphère bleue statique.
 */

export type TectoSceneProps = { tension: number };

const Y = -0.5;

export default function TectoScene({ tension }: TectoSceneProps) {
  const t = Math.max(0, Math.min(1, tension));
  const rig = useRef<Group>(null);
  const conv = t * 0.3; // rapprochement des plaques
  const ridgeH = 0.2 + t * 1.1; // hauteur de la chaîne de montagnes
  const quake = t > 0.7;

  return (
    <LabScene cameraPosition={[0, 1.6, 6.2]} background="#1E1B2E" minDistance={3.5} maxDistance={11} groundY={null}>
      {/* Manteau (asthénosphère chaude) */}
      <mesh position={[0, Y - 0.9, 0]}>
        <boxGeometry args={[7, 1.2, 3]} />
        <meshStandardMaterial color="#7F1D1D" emissive="#B91C1C" emissiveIntensity={0.22} roughness={0.7} />
      </mesh>

      <group ref={rig}>
        {/* Plaque gauche (lithosphère océanique) */}
        <mesh position={[-1.6 + conv, Y, 0]} castShadow>
          <boxGeometry args={[3, 0.45, 2.6]} />
          <meshStandardMaterial color="#475569" roughness={0.85} />
        </mesh>
        {/* Plaque droite (lithosphère continentale) */}
        <mesh position={[1.6 - conv, Y, 0]} castShadow>
          <boxGeometry args={[3, 0.45, 2.6]} />
          <meshStandardMaterial color="#3F6212" roughness={0.85} />
        </mesh>
        {/* Chaîne de montagnes à la frontière (orogenèse) */}
        <mesh position={[0, Y + 0.22 + ridgeH / 2, 0]} castShadow>
          <coneGeometry args={[0.5 + t * 0.3, ridgeH, 5]} />
          <meshStandardMaterial color="#A8A29E" roughness={0.95} />
        </mesh>
        {/* Faille incandescente */}
        <mesh position={[0, Y, 0]}>
          <boxGeometry args={[0.08, 0.5, 2.6]} />
          <meshStandardMaterial color="#FB923C" emissive="#F97316" emissiveIntensity={0.3 + t * 1.3} />
        </mesh>
      </group>

      {/* Vecteurs de convergence */}
      <Arrow3D from={[-2.7, Y + 0.85, 0]} to={[-1.45, Y + 0.85, 0]} color="#38BDF8" radius={0.04} headLength={0.25} />
      <Arrow3D from={[2.7, Y + 0.85, 0]} to={[1.45, Y + 0.85, 0]} color="#84CC16" radius={0.04} headLength={0.25} />
      <Tag3D position={[-2.2, Y + 1.25, 0]} label="Plaque africaine" tone="svt" />
      <Tag3D position={[2.2, Y + 1.25, 0]} label="Plaque voisine" tone="physique" />

      {/* Tremblement quand l'énergie se libère */}
      <Animate
        fn={(state) => {
          if (!rig.current) return;
          if (quake) {
            const amp = (0.05 * (t - 0.7)) / 0.3;
            rig.current.position.x = Math.sin(state.clock.elapsedTime * 30) * amp;
            rig.current.position.y = Math.sin(state.clock.elapsedTime * 26) * amp * 0.5;
          } else {
            rig.current.position.set(0, 0, 0);
          }
        }}
      />

      <SceneLabel
        position={[0, Y + 2.5, 0]}
        title={quake ? '⚠ Séisme !' : 'Frontière de plaques'}
        subtitle={`Tension ${(t * 100).toFixed(0)} %`}
        tone={quake ? 'physique' : 'svt'}
      />
      <Readout position={[0, Y - 2.0, 0]} value={(t * 100).toFixed(0)} unit="%" caption="tension à la faille" />
    </LabScene>
  );
}
