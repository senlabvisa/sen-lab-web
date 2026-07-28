'use client';

import { useMemo, useRef } from 'react';
import { Group, Mesh, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench, Stand } from '@/components/lab3d/environment';
import { Arrow3D, PolyLine } from '@/components/lab3d/plot';
import { Animate } from '@/components/lab3d/anim';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';

/**
 * Scène 3D — dynamomètre vertical (peser un sac d'arachides au marché).
 *
 * Un ressort calibré s'allonge proportionnellement au poids P = m·g de la
 * masse suspendue (loi de Hooke pour la lecture). L'aiguille et le `Readout`
 * indiquent le poids en newtons ; un `Arrow3D` vers le bas figure le poids.
 * On change de lieu (Terre / Dakar / Lune) : la masse reste, le poids varie.
 * Construit sur le kit lab3d.
 */

export type ScaleSceneProps = { mass: number; g: number; place: string };

// Géométrie de l'instrument (unités scène)
const TOP_Y = 1.7; // accroche du ressort au statif
const SPRING_REST = 0.55; // longueur du ressort à vide
const STRETCH_PER_N = 0.0019; // allongement (u) par newton — calibration
const STRETCH_MAX = 1.3; // garde-fou (l'aiguille sature comme un vrai cadran)
const PAN_Y_REST = TOP_Y - SPRING_REST; // bas du ressort à vide

/** Hélice du ressort, du haut (y0) jusqu'en bas (y0 - len). */
function helix(y0: number, len: number, coils = 9, r = 0.16): Vector3Tuple[] {
  const pts: Vector3Tuple[] = [];
  const N = coils * 16;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = t * coils * Math.PI * 2;
    pts.push([Math.cos(a) * r, y0 - t * len, Math.sin(a) * r]);
  }
  return pts;
}

export default function ScaleScene({ mass, g, place }: ScaleSceneProps) {
  const load = useRef<Group>(null);
  const needle = useRef<Mesh>(null);

  const weight = mass * g; // P = m·g (newtons)
  const stretch = Math.min(STRETCH_MAX, weight * STRETCH_PER_N);
  const springLen = SPRING_REST + stretch;
  const panY = TOP_Y - springLen;

  // Le ressort « tombe » vers sa nouvelle longueur avec un léger rebond.
  const animLen = useRef(springLen);
  const spring = useMemo(() => helix(TOP_Y, springLen), [springLen]);

  const groundY = -1.7;

  return (
    <LabScene cameraPosition={[0.2, 0.3, 5.4]} background="#FFF7E8" minDistance={3.5} maxDistance={10} groundY={groundY}>
      <LabBench y={groundY} color="#E7D8B8" size={24} />

      {/* Statif qui porte le dynamomètre */}
      <Stand position={[1.15, 0.05, -0.1]} height={4} />

      {/* Corps du dynamomètre (cadran cylindrique) + crochet de suspension */}
      <group position={[0, TOP_Y + 0.34, 0]}>
        <mesh position={[0, 0.26, 0]}>
          <torusGeometry args={[0.1, 0.03, 12, 24]} />
          <meshStandardMaterial color="#9AA3AF" roughness={0.3} metalness={0.9} />
        </mesh>
        <mesh castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.5, 24]} />
          <meshStandardMaterial color="#C2410C" roughness={0.45} metalness={0.2} />
        </mesh>
        {/* fenêtre du cadran (aiguille devant) */}
        <mesh position={[0, 0, 0.215]}>
          <circleGeometry args={[0.15, 24]} />
          <meshStandardMaterial color="#FFFBEB" roughness={0.6} />
        </mesh>
        <mesh ref={needle} position={[0, 0, 0.23]}>
          <boxGeometry args={[0.02, 0.16, 0.01]} />
          <meshStandardMaterial color="#DC2626" emissive="#7F1D1D" emissiveIntensity={0.3} />
        </mesh>
      </group>

      {/* Ressort hélicoïdal (s'allonge avec le poids) */}
      <PolyLine points={spring} color="#64748B" width={4} />

      {/* Ensemble suspendu : crochet + sac d'arachides (animé en y) */}
      <group ref={load} position={[0, panY, 0]}>
        {/* tige + crochet */}
        <mesh position={[0, -0.12, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.24, 10]} />
          <meshStandardMaterial color="#9AA3AF" roughness={0.3} metalness={0.9} />
        </mesh>
        {/* sac de jute d'arachides */}
        <mesh position={[0, -0.55, 0]} castShadow>
          <sphereGeometry args={[0.34, 22, 18]} />
          <meshStandardMaterial color="#C8A86A" roughness={0.95} />
        </mesh>
        <mesh position={[0, -0.27, 0]}>
          <cylinderGeometry args={[0.12, 0.2, 0.18, 16]} />
          <meshStandardMaterial color="#A98B53" roughness={0.95} />
        </mesh>
        {/* poignée du sac (lien) */}
        <mesh position={[0, -0.27, 0]}>
          <torusGeometry args={[0.13, 0.018, 8, 20]} />
          <meshStandardMaterial color="#6B5836" roughness={0.9} />
        </mesh>

        {/* Vecteur poids P, vers le bas */}
        <Arrow3D from={[0.5, -0.4, 0]} to={[0.5, -1.15, 0]} color="#2563EB" radius={0.028} headLength={0.2} />
        <Tag3D position={[0.78, -0.62, 0]} label="P⃗" tone="physique" />
      </group>

      {/* Étiquettes scène */}
      <SceneLabel
        position={[-0.15, 2.85, 0]}
        title={`Sur ${place} · g = ${g} N/kg`}
        subtitle="Dynamomètre · sac d'arachides"
        tone="physique"
      />
      <Readout position={[-1.7, 0.3, 0]} value={weight.toFixed(1)} unit="N" caption="poids lu (P)" />
      <Readout position={[-1.7, -0.45, 0]} value={mass} unit="kg" caption="masse (constante)" />

      <Animate fn={(_, dt) => {
        // amorti vers la longueur cible (effet ressort qui se stabilise)
        animLen.current += (springLen - animLen.current) * Math.min(1, dt * 6);
        const y = TOP_Y - animLen.current;
        load.current?.position.setY(y);
        // aiguille : rotation proportionnelle à la charge (-50°..+50°)
        if (needle.current) {
          const frac = Math.min(1, stretch / STRETCH_MAX);
          needle.current.rotation.z = (0.9 - 1.75 * frac);
        }
      }} />
    </LabScene>
  );
}
