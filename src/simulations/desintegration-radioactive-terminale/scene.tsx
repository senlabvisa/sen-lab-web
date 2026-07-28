'use client';

import { useMemo, useRef } from 'react';
import { Mesh, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { GraphPaper } from '@/components/lab3d/environment';
import { Axes2D, FunctionCurve, PolyLine, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — décroissance radioactive du Carbone 14 (Physique-Chimie, Tle).
 *
 * Vraie courbe N(t)/N₀ = (1/2)^(t/T) tracée avec FunctionCurve (et non des
 * dizaines de sphères, cf. playbook). Les demi-vies successives sont marquées
 * (50 %, 25 %, 12,5 %…) et un point parcourt la courbe à l'instant choisi.
 */

export type DecaySceneProps = { time: number };

const T12 = 5730; // demi-vie du C14 (ans)
const TMAX = 30000;
const X0 = -2.6;
const X1 = 2.6;

const xOf = (t: number) => X0 + (t / TMAX) * (X1 - X0);
const tOf = (x: number) => ((x - X0) / (X1 - X0)) * TMAX;
const yOf = (n: number) => n * 3.4 - 1.7; // N=1 → +1.7 ; N=0 → −1.7
const nOf = (t: number) => Math.pow(0.5, t / T12);

export default function DecayScene({ time }: DecaySceneProps) {
  const dot = useRef<Mesh>(null);
  const N = nOf(time);

  const halfLives = useMemo(
    () => [1, 2, 3, 4].map((k) => ({ k, x: xOf(k * T12), y: yOf(Math.pow(0.5, k)), pct: Math.pow(0.5, k) * 100 })),
    [],
  );
  const target: Vector3Tuple = [xOf(time), yOf(N), 0.05];

  return (
    <LabScene cameraPosition={[0, 0.1, 6.2]} background="#FEF7E6" minDistance={4} maxDistance={10} groundY={null}>
      <GraphPaper width={6.2} height={4.6} step={0.5} />
      <Axes2D size={2.7} color="#92400E" />

      {/* Courbe de décroissance exponentielle */}
      <FunctionCurve fn={(x) => yOf(nOf(tOf(x)))} from={X0} to={X1} samples={120} color="#EA580C" width={4} clampY={2.0} z={0.01} />

      {/* Demi-vies successives (50 %, 25 %, 12,5 %…) */}
      {halfLives.map((h) => (
        <group key={h.k}>
          <PolyLine points={[[h.x, yOf(0), 0.02], [h.x, h.y, 0.02]]} color="#A8A29E" width={1.5} dashed />
          <Marker position={[h.x, h.y, 0.04]} color="#7C3AED" size={0.08} />
          <Tag3D position={[h.x, h.y + 0.32, 0.04]} label={`${h.pct.toFixed(h.k > 2 ? 1 : 0)} %`} tone="chimie" />
        </group>
      ))}
      <Tag3D position={[xOf(T12), yOf(0) - 0.3, 0.04]} label="T½" tone="physique" />

      {/* Point courant qui pulse à l'instant choisi */}
      <mesh ref={dot} position={target}>
        <sphereGeometry args={[0.12, 20, 16]} />
        <meshStandardMaterial color="#DC2626" emissive="#7F1D1D" emissiveIntensity={0.4} />
      </mesh>
      <Animate
        fn={(state) => {
          const s = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.18;
          dot.current?.scale.setScalar(s);
        }}
      />

      <SceneLabel position={[0, 2.5, 0]} title="N(t) / N₀ = (½)^(t/T)" subtitle="Carbone 14 · T½ = 5730 ans" tone="physique" />
      <Readout position={[2.0, 1.6, 0]} value={(N * 100).toFixed(1)} unit="%" caption="noyaux restants" />
      <Readout position={[-2.0, -2.05, 0]} value={time.toLocaleString('fr-FR')} unit="ans" caption="temps écoulé" />
    </LabScene>
  );
}
