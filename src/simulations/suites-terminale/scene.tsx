'use client';

import { useMemo, useRef } from 'react';
import type { Group, Mesh, Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Arrow3D, DataPoints, FunctionCurve, Marker, PolyLine } from '@/components/lab3d/plot';
import { Animate } from '@/components/lab3d/anim';
import { Readout, SceneLabel, Tag3D } from '@/components/lab3d/annotations';

/**
 * Scène 3D — suite récurrente uₙ₊₁ = f(uₙ) avec f(x) = a·x + b (Terminale, Bac).
 *
 * PANNEAU GAUCHE : le diagramme en TOILE D'ARAIGNÉE (escalier de convergence).
 * On trace la droite y = f(x) et la droite y = x. Partant de u₀ sur l'axe des
 * abscisses, on monte verticalement jusqu'à la courbe de f (on lit uₙ₊₁), puis
 * on va horizontalement jusqu'à y = x (on reporte uₙ₊₁ en abscisse). L'escalier
 * est révélé segment par segment via <Animate>. Il converge vers le POINT FIXE
 * l = f(l) = b/(1−a) quand |a| < 1, et sort du cadre quand |a| > 1.
 *
 * PANNEAU DROIT : les termes (n ; uₙ) en <DataPoints>, avec l'asymptote
 * horizontale y = l en pointillés — même échelle verticale que l'escalier.
 */

export type CobwebSceneProps = {
  u0: number;
  a: number;
  b: number;
  unit: string;
  dec: number;
  /** Limite (point fixe attractif) ou null si la suite n'a pas de limite finie. */
  limit: number | null;
  verdict: string;
};

const N_TERMS = 12; // u₀ … u₁₂ sur le graphe de droite
const STEPS = 9; // marches de l'escalier au maximum
const W_MIN = -0.5; // fenêtre visible (unités scène) sur x ET sur y
const W_MAX = 3.05;
const SEQ_W = 2.9; // largeur du panneau des termes

export default function CobwebScene({ u0, a, b, unit, dec, limit, verdict }: CobwebSceneProps) {
  const walker = useRef<Mesh>(null);
  const dot = useRef<Mesh>(null);
  const segs = useRef<(Group | null)[]>([]);

  const { s, cobweb, seqPts, yLim, cFrom, cTo } = useMemo(() => {
    const attractif = Math.abs(a) < 1 && limit !== null;
    const ref = Math.max(u0, attractif ? Math.abs(limit) : 0, Math.abs(b), 1) * 1.3;
    const sc = 2.5 / ref; // valeur réelle → unité scène
    const inWin = (x: number, y: number) => x >= W_MIN && x <= W_MAX && y >= W_MIN && y <= W_MAX;

    // Escalier : (u₀,0) → (u₀,u₁) → (u₁,u₁) → (u₁,u₂) → …
    const cob: Vector3Tuple[] = [];
    let x = u0 * sc;
    if (inWin(x, 0)) cob.push([x, 0, 0]);
    for (let i = 0; i < STEPS; i++) {
      const y = a * x + b * sc;
      if (!inWin(x, y)) break;
      cob.push([x, y, 0]);
      if (!inWin(y, y)) break;
      cob.push([y, y, 0]);
      x = y;
    }

    // Termes (n ; uₙ) tant qu'ils restent dans la fenêtre
    const pts: Vector3Tuple[] = [];
    let v = u0;
    for (let n = 0; n <= N_TERMS; n++) {
      const yy = v * sc;
      if (yy > W_MAX || yy < W_MIN) break;
      pts.push([(n * SEQ_W) / N_TERMS, yy, 0]);
      v = a * v + b;
    }

    // Portion de la droite y = f(x) réellement visible
    let from = -0.4;
    let to = W_MAX;
    if (Math.abs(a) > 1e-9) {
      const xA = (W_MIN - b * sc) / a;
      const xB = (W_MAX - b * sc) / a;
      from = Math.max(from, Math.min(xA, xB));
      to = Math.min(to, Math.max(xA, xB));
      if (to - from < 0.2) {
        from = -0.4;
        to = W_MAX;
      }
    }

    return { s: sc, cobweb: cob, seqPts: pts, yLim: attractif ? limit * sc : null, cFrom: from, cTo: to };
  }, [u0, a, b, limit]);

  const fmt = (x: number) => x.toFixed(dec).replace('.', ',');
  const fmtA = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(2).replace(/0$/, '').replace('.', ','));
  const fLabelY = Math.min(2.85, Math.max(-0.35, a * (cTo - 0.35) + b * s));

  return (
    <LabScene cameraPosition={[0, 0.3, 9]} background="#F5F3FF" minDistance={5} maxDistance={15} groundY={null}>
      {/* ══════ PANNEAU GAUCHE — toile d'araignée (escalier) ══════ */}
      <group position={[-3.4, -1.5, 0]}>
        <Arrow3D from={[-0.45, 0, 0]} to={[3.2, 0, 0]} color="#64748B" radius={0.016} headLength={0.16} />
        <Arrow3D from={[0, -0.45, 0]} to={[0, 3.2, 0]} color="#64748B" radius={0.016} headLength={0.16} />

        {/* Droite y = x : c'est elle qui « reporte » uₙ₊₁ en abscisse */}
        <PolyLine points={[[-0.45, -0.45, 0], [2.95, 2.95, 0]]} color="#94A3B8" width={2} dashed />
        <Tag3D position={[2.75, 3.0, 0]} label="y = x" tone="neutral" />

        {/* Droite y = f(x) = a·x + b */}
        <FunctionCurve fn={(X) => a * X + b * s} from={cFrom} to={cTo} samples={8} color="#7C3AED" width={3.5} clampY={3.05} />
        <Tag3D position={[cTo - 0.3, fLabelY + 0.3, 0]} label="y = f(x)" tone="chimie" />

        {/* Asymptote / niveau de la limite */}
        {yLim !== null && limit !== null && (
          <>
            <PolyLine points={[[-0.45, yLim, 0], [3.05, yLim, 0]]} color="#059669" width={2} dashed />
            <Marker position={[yLim, yLim, 0]} color="#059669" size={0.1} />
            <Tag3D position={[yLim + 0.6, yLim - 0.3, 0]} label={`l = ${fmt(limit)} ${unit}`} tone="svt" />
          </>
        )}

        {/* Les marches, révélées une par une */}
        {cobweb.slice(0, -1).map((p, i) => (
          <group
            key={i}
            ref={(el) => {
              segs.current[i] = el;
            }}
          >
            <PolyLine points={[p, cobweb[i + 1]]} color={i % 2 === 0 ? '#EA580C' : '#F59E0B'} width={3.5} />
          </group>
        ))}

        {/* Point mobile qui construit l'escalier */}
        <mesh ref={walker}>
          <sphereGeometry args={[0.12, 20, 16]} />
          <meshStandardMaterial color="#DC2626" emissive="#B91C1C" emissiveIntensity={0.45} roughness={0.3} />
        </mesh>

        <Tag3D position={[u0 * s, -0.32, 0]} label={`u₀ = ${fmt(u0)}`} tone="maths" />
        <Tag3D position={[1.5, -0.85, 0]} label="Toile d'araignée : uₙ₊₁ = f(uₙ)" tone="maths" />
      </group>

      {/* ══════ PANNEAU DROIT — les termes (n ; uₙ) ══════ */}
      <group position={[0.55, -1.5, 0]}>
        <Arrow3D from={[-0.35, 0, 0]} to={[3.15, 0, 0]} color="#64748B" radius={0.016} headLength={0.16} />
        <Arrow3D from={[0, -0.45, 0]} to={[0, 3.2, 0]} color="#64748B" radius={0.016} headLength={0.16} />

        {yLim !== null && (
          <>
            <PolyLine points={[[-0.2, yLim, 0], [3.05, yLim, 0]]} color="#059669" width={2} dashed />
            <Tag3D position={[2.65, yLim + 0.28, 0]} label={`asymptote y = l`} tone="svt" />
          </>
        )}

        {seqPts.length > 1 && <PolyLine points={seqPts} color="#C4B5FD" width={1.8} />}
        <DataPoints points={seqPts} color="#F43F5E" size={0.085} />

        <mesh ref={dot}>
          <sphereGeometry args={[0.13, 20, 16]} />
          <meshStandardMaterial color="#DC2626" emissive="#B91C1C" emissiveIntensity={0.45} roughness={0.3} />
        </mesh>

        <Tag3D position={[3.1, -0.32, 0]} label="n" tone="maths" />
        <Tag3D position={[0.42, 3.05, 0]} label={`uₙ (${unit})`} tone="maths" />
        <Tag3D position={[1.5, -0.85, 0]} label="Les termes de la suite" tone="maths" />
      </group>

      <SceneLabel
        position={[0, 2.35, 0]}
        title={`uₙ₊₁ = ${fmtA(a)} × uₙ + ${fmt(b)}`}
        subtitle={verdict}
        tone="maths"
      />
      <Readout
        position={[2.55, 1.75, 0]}
        value={limit === null ? '∞' : fmt(limit)}
        unit={limit === null ? '' : unit}
        caption={limit === null ? 'pas de limite finie' : 'limite l = f(l)'}
      />

      {/* Construction pas à pas : une marche révélée toutes les 0,42 s, puis relance */}
      <Animate
        fn={(state) => {
          const nSeg = Math.max(1, cobweb.length - 1);
          const k = Math.floor((state.clock.elapsedTime / 0.42) % (nSeg + 5));
          for (let i = 0; i < nSeg; i++) {
            const g = segs.current[i];
            if (g) g.visible = i <= k;
          }
          const p = cobweb[Math.min(k + 1, cobweb.length - 1)];
          if (p && walker.current) walker.current.position.set(p[0], p[1], 0.03);
          const q = seqPts[Math.min(Math.floor((k + 1) / 2), seqPts.length - 1)];
          if (q && dot.current) dot.current.position.set(q[0], q[1], 0.03);
        }}
      />
    </LabScene>
  );
}
