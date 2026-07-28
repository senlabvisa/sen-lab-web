'use client';

import { useMemo } from 'react';
import type { Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { GraphPaper } from '@/components/lab3d/environment';
import { Axes2D, PolyLine, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';

/**
 * Scène 3D — loi des grands nombres (Maths, 1ère).
 *
 * On lance une pièce N fois et on trace la fréquence cumulée de Pile en
 * fonction du nombre de lancers (PolyLine). La courbe oscille au début puis
 * se resserre autour de la probabilité théorique 0,5 (ligne de référence) :
 * c'est la loi des grands nombres. Construit sur le kit lab3d.
 */

export type ProbSceneProps = { trials: number };

const X0 = -2.6;
const X1 = 2.6;
const yOf = (f: number) => Math.max(-1.95, Math.min(1.95, (f - 0.5) * 4)); // f=0,5 → 0

export default function ProbScene({ trials }: ProbSceneProps) {
  const { pts, finalF } = useMemo(() => {
    const N = Math.max(1, Math.round(trials));
    const stepEvery = Math.max(1, Math.floor(N / 200));
    let pile = 0;
    const arr: Vector3Tuple[] = [];
    for (let i = 1; i <= N; i++) {
      if (Math.random() < 0.5) pile++;
      if (i % stepEvery === 0 || i === N) {
        arr.push([X0 + (i / N) * (X1 - X0), yOf(pile / i), 0.03]);
      }
    }
    return { pts: arr, finalF: pile / N };
  }, [trials]);

  const end = pts[pts.length - 1] ?? ([X1, 0, 0.03] as Vector3Tuple);

  return (
    <LabScene cameraPosition={[0, 0.1, 6.2]} background="#F5F3FF" minDistance={4} maxDistance={10} groundY={null}>
      <GraphPaper width={6.2} height={4.4} step={0.5} />
      <Axes2D size={2.6} color="#5B21B6" />

      {/* Probabilité théorique : ligne de référence à 0,5 */}
      <PolyLine points={[[X0, yOf(0.5), 0.02], [X1, yOf(0.5), 0.02]]} color="#16A34A" width={2.5} dashed />
      <Tag3D position={[X1 - 0.1, yOf(0.5) + 0.32, 0.04]} label="p = 0,5" tone="svt" />

      {/* Fréquence cumulée de Pile */}
      <PolyLine points={pts} color="#7C3AED" width={3} />
      <Marker position={end} color="#DC2626" size={0.1} />

      <SceneLabel position={[0, 2.4, 0]} title="Fréquence de Pile" subtitle={`${Math.max(1, Math.round(trials))} lancers · loi des grands nombres`} tone="maths" />
      <Readout position={[1.9, 1.6, 0]} value={(finalF * 100).toFixed(1)} unit="%" caption="fréquence observée" />
      <Readout position={[-1.9, -2.0, 0]} value={(Math.abs(finalF - 0.5) * 100).toFixed(1)} unit="pts" caption="écart à 50 %" />
    </LabScene>
  );
}
