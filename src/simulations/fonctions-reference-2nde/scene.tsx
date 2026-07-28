'use client';

import { useMemo, useRef } from 'react';
import { Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Axes2D, FunctionCurve, DataPoints } from '@/components/lab3d/plot';
import { Animate } from '@/components/lab3d/anim';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';

/**
 * Scène 3D — fonctions de référence (Seconde, Mathématiques).
 *
 * Un seul repère <Axes2D> et UNE courbe <FunctionCurve> dont l'élève choisit
 * l'expression : affine (x↦x), carré (x↦x²), inverse (x↦1/x), racine (x↦√x).
 * Maths justes : domaine et allure réels. Pour 1/x on trace DEUX branches
 * (x<0 puis x>0) avec clampY pour éviter l'asymptote en x = 0.
 */

export type FnKind = 'affine' | 'carre' | 'inverse' | 'racine';
export type FnSceneProps = { kind: FnKind };

const COLOR: Record<FnKind, string> = {
  affine: '#0EA5E9',
  carre: '#7C3AED',
  inverse: '#DC2626',
  racine: '#16A34A',
};
const NAME: Record<FnKind, string> = {
  affine: 'f(x) = x',
  carre: 'f(x) = x²',
  inverse: 'f(x) = 1/x',
  racine: 'f(x) = √x',
};
const DOMAIN: Record<FnKind, string> = {
  affine: 'définie sur ℝ',
  carre: 'définie sur ℝ · f(x) ≥ 0',
  inverse: 'définie sur ℝ* (x ≠ 0)',
  racine: 'définie sur [0 ; +∞[',
};

const F: Record<FnKind, (x: number) => number> = {
  affine: (x) => x,
  carre: (x) => x * x,
  inverse: (x) => 1 / x,
  racine: (x) => Math.sqrt(x),
};

// Points caractéristiques à marquer pour chaque fonction.
const KEYPTS: Record<FnKind, [number, number, number][]> = {
  affine: [
    [-2, -2, 0],
    [0, 0, 0],
    [2, 2, 0],
  ],
  carre: [
    [-2, 4, 0],
    [0, 0, 0],
    [2, 4, 0],
  ],
  inverse: [
    [-2, -0.5, 0],
    [-0.5, -2, 0],
    [0.5, 2, 0],
    [2, 0.5, 0],
  ],
  racine: [
    [0, 0, 0],
    [1, 1, 0],
    [4, 2, 0],
  ],
};

export default function FnScene({ kind }: FnSceneProps) {
  const dot = useRef<Mesh>(null);
  const color = COLOR[kind];

  // Point courant qui parcourt la courbe en suivant le domaine de définition.
  const span = useMemo(() => {
    if (kind === 'racine') return { a: 0, b: 4 };
    if (kind === 'inverse') return { a: 0.34, b: 4 }; // branche x > 0
    return { a: -2.6, b: 2.6 };
  }, [kind]);

  return (
    <LabScene cameraPosition={[0.4, 0.6, 9.5]} background="#F5F3FF" minDistance={5} maxDistance={16} groundY={null}>
      <Axes2D size={4.6} color="#64748B" ticks z={0} />

      {kind === 'inverse' ? (
        <>
          {/* hyperbole : deux branches séparées, jamais x = 0 */}
          <FunctionCurve fn={F.inverse} from={-4.4} to={-0.24} samples={120} color={color} width={4} clampY={4.4} />
          <FunctionCurve fn={F.inverse} from={0.24} to={4.4} samples={120} color={color} width={4} clampY={4.4} />
        </>
      ) : (
        <FunctionCurve
          fn={F[kind]}
          from={kind === 'racine' ? 0 : -2.6}
          to={kind === 'carre' ? 2.15 : kind === 'racine' ? 4.4 : 4.4}
          samples={140}
          color={color}
          width={4}
          clampY={4.4}
        />
      )}

      {/* points caractéristiques */}
      <DataPoints points={KEYPTS[kind]} color={color} size={0.11} />

      {/* point courant animé qui glisse le long de la courbe */}
      <mesh ref={dot} position={[span.a, F[kind](span.a) || 0, 0]}>
        <sphereGeometry args={[0.14, 20, 16]} />
        <meshStandardMaterial color="#F59E0B" emissive="#F59E0B" emissiveIntensity={0.35} />
      </mesh>

      {/* étiquette O à l'origine */}
      <Tag3D position={[-0.32, -0.34, 0]} label="O" tone="maths" />

      <SceneLabel position={[0, 5.3, 0]} title={NAME[kind]} subtitle={DOMAIN[kind]} tone="maths" />
      <Readout position={[3.5, 4.4, 0]} value={kind === 'affine' ? 'droite' : kind === 'carre' ? 'parabole' : kind === 'inverse' ? 'hyperbole' : 'racine'} caption="allure de la courbe" />

      <Animate fn={(state) => {
        const u = (Math.sin(state.clock.elapsedTime * 0.7) + 1) / 2; // 0→1→0
        const x = span.a + u * (span.b - span.a);
        let y = F[kind](x);
        if (!Number.isFinite(y)) y = 0;
        y = Math.max(-4.4, Math.min(4.4, y));
        dot.current?.position.set(x, y, 0);
      }} />
    </LabScene>
  );
}
