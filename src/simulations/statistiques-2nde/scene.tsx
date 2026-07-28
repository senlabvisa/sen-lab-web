'use client';

import { useMemo, useRef } from 'react';
import { Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench } from '@/components/lab3d/environment';
import { Axes2D, Bar, PolyLine, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — indicateurs de position et de dispersion (Maths, Seconde).
 *
 * Histogramme `Bar` d'une série sur un repère `Axes2D`. Deux repères verticaux
 * (`PolyLine`) marquent la MOYENNE (sensible aux extrêmes) et la MÉDIANE
 * (robuste). Quand l'élève déplace la valeur extrême, le repère de moyenne
 * glisse nettement alors que celui de médiane bouge à peine. Tone maths.
 */

export type StatsSceneProps = {
  /** Série de valeurs (revenus mensuels, en milliers de FCFA). */
  values: number[];
  mean: number;
  median: number;
  /** Index de la barre « valeur extrême » pilotée par le slider. */
  extremeIndex: number;
};

const SLOT = 0.62; // pas horizontal entre deux barres
const BAR_W = 0.42;
const Y_UNIT = 0.022; // mille FCFA → unité scène (axe vertical)
const BASE_Y = -1.5;

export default function StatsScene({ values, mean, median, extremeIndex }: StatsSceneProps) {
  const pulse = useRef<Mesh>(null);

  const { bars, maxV, span, x } = useMemo(() => {
    const n = values.length;
    const start = -((n - 1) / 2) * SLOT;
    const xs = values.map((_, i) => start + i * SLOT);
    return {
      bars: values.map((v, i) => ({ v, x: xs[i] })),
      maxV: Math.max(...values, 1),
      span: ((n - 1) / 2) * SLOT + SLOT,
      x: xs,
    };
  }, [values]);

  const meanX = useMemo(() => -span + (mean / maxV) * (2 * span), [mean, maxV, span]);
  const medianX = useMemo(() => -span + (median / maxV) * (2 * span), [median, maxV, span]);
  const topY = BASE_Y + maxV * Y_UNIT + 0.4;

  return (
    <LabScene cameraPosition={[0, 0.6, 7.2]} background="#F5F3FF" minDistance={4.5} maxDistance={12} groundY={BASE_Y}>
      <LabBench y={BASE_Y} color="#E6E0F8" size={26} />

      {/* Repère gradué (origine au pied gauche de l'histogramme) */}
      <group position={[-span, BASE_Y, 0]}>
        <Axes2D size={3} color="#6D5BD0" ticks={false} />
      </group>

      {/* Histogramme de la série */}
      {bars.map((b, i) => (
        <group key={i}>
          <Bar x={b.x} height={Math.max(0.04, b.v * Y_UNIT)} width={BAR_W} depth={BAR_W} color={i === extremeIndex ? '#F59E0B' : '#A78BFA'} />
          <Tag3D position={[b.x, BASE_Y + b.v * Y_UNIT + 0.2, 0]} label={`${b.v}`} tone="maths" />
        </group>
      ))}

      {/* Repère MÉDIANE — robuste (trait plein vert) */}
      <PolyLine points={[[-span + (medianX + span), BASE_Y, 0.32], [-span + (medianX + span), topY, 0.32]]} color="#16A34A" width={4} />
      <Marker position={[medianX, topY, 0.32]} color="#16A34A" size={0.1} />
      <Tag3D position={[medianX, topY + 0.28, 0.32]} label={`médiane ${median}`} tone="svt" />

      {/* Repère MOYENNE — sensible (trait pointillé rouge, point pulsant) */}
      <PolyLine points={[[meanX, BASE_Y, 0.34], [meanX, topY, 0.34]]} color="#DC2626" width={4} dashed />
      <mesh ref={pulse} position={[meanX, topY, 0.34]} castShadow>
        <sphereGeometry args={[0.1, 18, 14]} />
        <meshStandardMaterial color="#DC2626" emissive="#DC2626" emissiveIntensity={0.4} />
      </mesh>
      <Tag3D position={[meanX, topY + 0.6, 0.34]} label={`moyenne ${mean.toFixed(1)}`} tone="physique" />

      {/* Le point de moyenne pulse pour signaler qu'il « suit » la valeur extrême */}
      <Animate
        fn={(state) => {
          const s = 1 + 0.18 * Math.sin(state.clock.elapsedTime * 3);
          pulse.current?.scale.setScalar(s);
        }}
      />

      <SceneLabel position={[0, topY + 1.15, 0]} title="Moyenne vs Médiane" subtitle="Indicateurs de position · revenus (milliers FCFA)" tone="maths" />
      <Readout position={[span + 1.1, BASE_Y + 1.5, 0]} value={mean.toFixed(1)} unit="k" caption="moyenne (sensible)" />
      <Readout position={[span + 1.1, BASE_Y + 0.8, 0]} value={median} unit="k" caption="médiane (robuste)" />
      <Readout position={[span + 1.1, BASE_Y + 0.1, 0]} value={maxV - Math.min(...values)} unit="k" caption="étendue = max − min" />
    </LabScene>
  );
}
