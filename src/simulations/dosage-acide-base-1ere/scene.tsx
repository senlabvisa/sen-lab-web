'use client';

import { useMemo, useRef } from 'react';
import { Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench, Stand } from '@/components/lab3d/environment';
import { Burette, Erlenmeyer, Drop } from '@/components/lab3d/glassware';
import { Axes2D, PolyLine, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — dosage acido-basique (titrage), Première S.
 *
 * Montage réel : burette (NaOH, robinet) au-dessus d'un erlenmeyer (jus
 * acide + phénolphtaléine) posé sur un statif. On verse un volume Vb : le
 * niveau de la burette baisse, des gouttes tombent, et à l'ÉQUIVALENCE
 * (Vb = Veq) l'erlenmeyer vire brutalement de l'incolore au rose. Une
 * courbe pH = f(Vb) est tracée à côté (saut à l'équivalence).
 */

export type DosageSceneProps = {
  vb: number; // volume de base versé (mL)
  vbMax: number; // capacité de la burette (mL)
  vbEq: number; // volume à l'équivalence (mL)
  ph: number; // pH courant
  curve: [number, number, number][]; // points pH = f(Vb) en coordonnées scène
};

const TOP_Y = 0.2; // hauteur de la pointe de la burette (sortie des gouttes)
const ERLEN_TOP = -1.1; // surface du liquide dans l'erlenmeyer

export default function DosageScene({ vb, vbMax, vbEq, ph, curve }: DosageSceneProps) {
  const drop = useRef<Mesh>(null);
  const reached = vb >= vbEq;
  // niveau restant dans la burette : plein à Vb=0, baisse linéairement
  const buretteFill = Math.max(0.05, 1 - vb / vbMax);
  // virage phénolphtaléine : incolore (jaune très pâle du jus) → rose franc
  const liquidColor = reached ? '#EC4899' : '#FAF3D6';
  // on verse tant que le robinet est ouvert (Vb > 0) et qu'il reste du réactif
  const pouring = vb > 0.05 && vb < vbMax;

  return (
    <LabScene cameraPosition={[1.6, 0.6, 6.2]} background="#F5F0FF" minDistance={4} maxDistance={11} groundY={-2.6}>
      <LabBench y={-2.6} color="#E4DFD2" size={24} />

      {/* Statif qui tient la burette */}
      <Stand position={[-1.7, -1, 0]} height={4.4} />

      {/* Burette (NaOH) accrochée au statif */}
      <Burette position={[-1.55, 1.4, 0]} fill={buretteFill} liquidColor="#BFD8FF" open={pouring} />
      <Tag3D position={[-1.55, 3.1, 0]} label="NaOH (base, Cb connue)" tone="chimie" />

      {/* Goutte animée entre la pointe de la burette et l'erlenmeyer */}
      {pouring && !reached && (
        <mesh ref={drop} position={[-1.55, TOP_Y, 0]}>
          <sphereGeometry args={[0.07, 14, 12]} />
          <meshStandardMaterial color="#BFD8FF" transparent opacity={0.9} roughness={0.1} />
        </mesh>
      )}
      {/* goutte « gelée » de repère quand on a fini de verser */}
      {reached && <Drop position={[-1.55, -0.4, 0]} color="#EC4899" size={0.06} />}

      {/* Erlenmeyer (jus acide + indicateur) posé sur la paillasse */}
      <Erlenmeyer position={[-1.55, -1.9, 0]} fill={0.5} liquidColor={liquidColor} height={2.4} />
      <Tag3D position={[-1.55, -2.45, 0]} label="jus acide + phénolphtaléine" tone="chimie" />
      {reached && <SceneLabel position={[-1.55, -0.95, 0]} title="Virage : rose !" subtitle="équivalence atteinte" tone="chimie" />}

      {/* Afficheurs : volume versé + pH */}
      <Readout position={[0.5, 1.7, 0]} value={vb.toFixed(1)} unit="mL" caption="Vb versé" />
      <Readout position={[0.5, 1.0, 0]} value={ph.toFixed(1)} unit="" caption="pH" />

      {/* Courbe pH = f(Vb) avec saut à l'équivalence */}
      <group position={[2.7, -0.3, 0]}>
        <Axes2D size={1.7} color="#7C3AED" ticks={false} />
        <PolyLine points={curve} color="#7C3AED" width={3} />
        {/* point courant sur la courbe */}
        <Marker position={curve[curve.length - 1]} color="#EC4899" size={0.1} />
        <Tag3D position={[1.7, -0.35, 0]} label="Vb" tone="chimie" />
        <Tag3D position={[-0.35, 1.7, 0]} label="pH" tone="chimie" />
      </group>

      <SceneLabel
        position={[0.4, 2.7, 0]}
        title={reached ? 'Équivalence : Ca·Va = Cb·Vb' : 'Tourne le robinet, verse la base'}
        subtitle="Dosage acido-basique"
        tone="chimie"
      />

      {/* Chute de la goutte (mutée par frame) */}
      <Animate
        fn={(state) => {
          if (!drop.current) return;
          const span = TOP_Y - ERLEN_TOP; // distance de chute
          const t = (state.clock.elapsedTime % 0.8) / 0.8; // cycle 0,8 s
          drop.current.position.y = TOP_Y - t * span;
          drop.current.visible = t < 0.95;
        }}
      />
    </LabScene>
  );
}
