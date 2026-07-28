'use client';

import { useMemo } from 'react';
import { LabScene } from '@/components/lab/lab-scene';
import { Axes2D, FunctionCurve, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';

/**
 * Scène 3D — trinôme du second degré f(x) = ax² + bx + c (Maths, Seconde).
 *
 * Parabole réelle tracée avec FunctionCurve. Δ = b² − 4ac détermine le nombre
 * de racines : les intersections avec l'axe Ox sont marquées (Marker) quand
 * elles existent, et le sommet en x = −b/(2a) est toujours repéré. Δ et le
 * nombre de racines sont affichés via SceneLabel / Readout. Construit sur lab3d.
 */

export type ParabolaSceneProps = { a: number; b: number; c: number };

const SIZE = 3; // demi-étendue du repère (unités scène = unités maths)

export default function ParabolaScene({ a, b, c }: ParabolaSceneProps) {
  const { delta, roots, vertex, nbRacines } = useMemo(() => {
    const d = b * b - 4 * a * c;
    const safeA = a === 0 ? 1e-6 : a;
    const xs = -b / (2 * safeA);
    const ys = a * xs * xs + b * xs + c;
    const rs: number[] = [];
    if (d > 1e-9) {
      const r = Math.sqrt(d);
      rs.push((-b - r) / (2 * safeA), (-b + r) / (2 * safeA));
    } else if (d > -1e-9) {
      rs.push(xs); // racine double
    }
    return { delta: d, roots: rs, vertex: [xs, ys] as [number, number], nbRacines: rs.length };
  }, [a, b, c]);

  const fn = useMemo(() => (x: number) => a * x * x + b * x + c, [a, b, c]);
  const curveColor = a >= 0 ? '#0EA5E9' : '#F97316'; // bleu vers le haut, orange vers le bas

  return (
    <LabScene cameraPosition={[0, 0.4, 6.4]} background="#F5F3FF" minDistance={4} maxDistance={11} groundY={null}>
      {/* Repère fléché gradué (Ox, Oy) */}
      <Axes2D size={SIZE} color="#64748B" ticks />
      <Tag3D position={[SIZE + 0.35, -0.32, 0]} label="x" tone="maths" />
      <Tag3D position={[0.4, SIZE + 0.32, 0]} label="y" tone="maths" />

      {/* Parabole f(x) = ax² + bx + c */}
      <FunctionCurve fn={fn} from={-SIZE} to={SIZE} samples={160} color={curveColor} width={4} clampY={SIZE + 0.4} />

      {/* Racines : intersections avec l'axe Ox (si Δ ≥ 0) */}
      {roots.map((x, i) =>
        Math.abs(x) <= SIZE + 0.05 ? (
          <group key={i}>
            <Marker position={[x, 0, 0]} color="#DC2626" size={0.11} />
            <Tag3D position={[x, -0.45, 0]} label={delta < 1e-9 ? `x₀ ≈ ${x.toFixed(2)}` : `x${i === 0 ? '₁' : '₂'} ≈ ${x.toFixed(2)}`} tone="maths" />
          </group>
        ) : null,
      )}

      {/* Sommet de la parabole en x = −b/(2a) */}
      {Math.abs(vertex[0]) <= SIZE + 0.05 && Math.abs(vertex[1]) <= SIZE + 0.05 && (
        <group>
          <Marker position={[vertex[0], vertex[1], 0]} color="#7C3AED" size={0.1} />
          <Tag3D position={[vertex[0] + 0.05, vertex[1] + (a >= 0 ? -0.5 : 0.5), 0]} label="Sommet S" tone="maths" />
        </group>
      )}

      <SceneLabel
        position={[0, SIZE + 0.7, 0]}
        title={`y = ${a}x² + ${b >= 0 ? '+ ' : '− '}${Math.abs(b)}x ${c >= 0 ? '+ ' : '− '}${Math.abs(c)}`}
        subtitle={`Δ = b² − 4ac = ${delta.toFixed(1)} · ${nbRacines} racine${nbRacines > 1 ? 's' : ''}`}
        tone="maths"
      />
      <Readout position={[SIZE + 0.6, SIZE - 0.3, 0]} value={delta.toFixed(1)} caption="discriminant Δ" />
      <Readout position={[SIZE + 0.6, SIZE - 1.1, 0]} value={nbRacines} unit={nbRacines > 1 ? 'racines' : 'racine'} caption={delta > 1e-9 ? 'Δ > 0' : delta > -1e-9 ? 'Δ = 0' : 'Δ < 0'} />
    </LabScene>
  );
}
