'use client';

import { useMemo, useRef } from 'react';
import { Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Axes2D, DataPoints, PolyLine, FunctionCurve } from '@/components/lab3d/plot';
import { Animate } from '@/components/lab3d/anim';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';

/**
 * Scène 3D — suites arithmétiques et géométriques (Première, Maths).
 *
 * On trace le nuage de points (n ; uₙ) dans un repère. Une suite
 * ARITHMÉTIQUE (uₙ = u₀ + n·r) donne des points ALIGNÉS sur une droite ;
 * une suite GÉOMÉTRIQUE (uₙ = u₀·qⁿ) suit une courbe exponentielle.
 * Un point « courant » parcourt la suite terme par terme. Échelle
 * automatique de l'axe vertical pour que les termes restent lisibles.
 */

export type SuiteSceneProps = { kind: 'arith' | 'geo'; u0: number; raison: number };

const N = 7; // termes u₀ … u₇
const X_LEFT = -2.6; // position de n = 0 sur l'axe
const X_STEP = 0.72; // écart horizontal entre deux rangs n

export default function SuiteScene({ kind, u0, raison }: SuiteSceneProps) {
  const dot = useRef<Mesh>(null);
  const t0 = useRef(0);

  const isArith = kind === 'arith';
  const term = (n: number) => (isArith ? u0 + n * raison : u0 * Math.pow(raison, n));

  const { points, yScale, uMax, line, growing } = useMemo(() => {
    const raw: number[] = [];
    for (let n = 0; n <= N; n++) raw.push(term(n));
    const peak = Math.max(1, ...raw.map((v) => Math.abs(v)));
    const s = 2.4 / peak; // garde la plus grande valeur à ~2,4 unités scène
    const pts: [number, number, number][] = raw.map((v, n) => [X_LEFT + n * X_STEP, v * s, 0]);
    return {
      points: pts,
      yScale: s,
      uMax: raw[N],
      line: pts,
      growing: raw[N] >= raw[0],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, u0, raison]);

  const color = isArith ? '#0EA5E9' : '#16A34A';

  return (
    <LabScene cameraPosition={[0.4, 0.6, 7]} background="#F0F9FF" minDistance={4} maxDistance={12} groundY={null}>
      <Axes2D size={3} color="#64748B" ticks z={0} />

      {/* Pour une suite arithmétique : droite affine de support (points alignés) */}
      {isArith && (
        <FunctionCurve
          fn={(x) => (u0 + ((x - X_LEFT) / X_STEP) * raison) * yScale}
          from={X_LEFT}
          to={X_LEFT + N * X_STEP}
          samples={2}
          color="#7DD3FC"
          width={2}
          clampY={6}
        />
      )}

      {/* Ligne reliant les termes successifs */}
      <PolyLine points={line} color={color} width={2.5} dashed={!isArith} />

      {/* Les termes uₙ comme nuage de points */}
      <DataPoints points={points} color={color} size={0.1} />

      {/* Repères de quelques rangs n sur l'axe horizontal */}
      <Tag3D position={[X_LEFT, -0.32, 0]} label="n=0" tone="maths" />
      <Tag3D position={[X_LEFT + N * X_STEP, -0.32, 0]} label={`n=${N}`} tone="maths" />

      {/* Étiquette du premier et du dernier terme */}
      <Tag3D position={[points[0][0] - 0.05, points[0][1] + 0.32, 0]} label={`u₀=${u0}`} tone="maths" />
      <Tag3D position={[points[N][0] + 0.1, points[N][1] + 0.32, 0]} label={`u₇=${uMax.toFixed(1)}`} tone="maths" />

      {/* Point courant animé qui parcourt la suite terme par terme */}
      <mesh ref={dot} castShadow>
        <sphereGeometry args={[0.15, 20, 16]} />
        <meshStandardMaterial color="#F43F5E" emissive="#BE123C" emissiveIntensity={0.4} roughness={0.3} />
      </mesh>

      <SceneLabel
        position={[0.3, 3.05, 0]}
        title={isArith ? `uₙ = ${u0} + n × ${raison}` : `uₙ = ${u0} × ${raison}ⁿ`}
        subtitle={isArith ? 'Suite arithmétique · points alignés' : `Suite géométrique · ${growing ? 'croissance' : 'décroissance'}`}
        tone="maths"
      />
      <Readout position={[3.1, 2.2, 0]} value={uMax.toFixed(1)} caption={`u₇ (${isArith ? '+r' : '×q'})`} />

      {/* Point courant : avance terme par terme (palier + saut), boucle. */}
      <Animate fn={(state) => {
        if (t0.current === 0) t0.current = state.clock.elapsedTime;
        const elapsed = state.clock.elapsedTime - t0.current;
        const perStep = 0.55;
        const i = Math.floor(elapsed / perStep) % (N + 1);
        const p = points[i];
        dot.current?.position.set(p[0], p[1], 0);
      }} />
    </LabScene>
  );
}
