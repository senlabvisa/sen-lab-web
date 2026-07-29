'use client';

import { useMemo, useRef } from 'react';
import { DoubleSide, Group, Mesh, Shape, Vector3, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { GraphPaper, Segment } from '@/components/lab3d/environment';
import { Axes2D, PolyLine, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — symétrie axiale (5ème, Maths).
 *
 * Sur un papier quadrillé : un motif triangulaire ABC (façon pagne wax) et une
 * droite (d) que l'élève incline. Le symétrique A'B'C' est construit
 * exactement : réflexion par rapport à la droite passant par l'origine et de
 * vecteur directeur u = (−sin α ; cos α), soit P' = 2(P·u)u − P.
 *
 * Traits de construction visibles pour le point M choisi : perpendiculaire à
 * (d) en pointillé, pied H avec l'angle droit, marques d'égale distance
 * MH = HM'. Un point animé traverse l'axe de M vers M'.
 *
 * Mode « pliage » : le motif d'origine tourne d'un demi-tour AUTOUR de (d).
 * En géométrie plane, cette rotation d'angle π autour d'une droite du plan
 * réalise exactement la réflexion : la figure vient se superposer à son image.
 */

type V2 = [number, number];

const FIGURE: V2[] = [
  [1.5, -1],
  [3, 0],
  [2, 1.5],
];
const NAMES = ['A', 'B', 'C'];

const ORIG_COLOR = '#7C3AED'; // violet — figure d'origine
const IMG_COLOR = '#059669'; // vert — figure image
const AXIS_COLOR = '#DC2626'; // rouge — l'axe (d)
const BUILD_COLOR = '#64748B'; // ardoise — traits de construction
const M_COLOR = '#DB2777'; // rose — le point M suivi

function reflect(p: V2, u: V2): V2 {
  const d = p[0] * u[0] + p[1] * u[1];
  return [2 * d * u[0] - p[0], 2 * d * u[1] - p[1]];
}

function smooth(x: number) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

function v3(p: V2, z = 0): Vector3Tuple {
  return [p[0], p[1], z];
}

function triShape(pts: V2[]) {
  const s = new Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  s.lineTo(pts[1][0], pts[1][1]);
  s.lineTo(pts[2][0], pts[2][1]);
  s.closePath();
  return s;
}

export type SymetrieSceneProps = {
  /** Inclinaison de l'axe (d) par rapport à la verticale, en degrés. */
  angle: number;
  /** Sommet suivi (0 = A, 1 = B, 2 = C). */
  mIndex: number;
  /** Mode pliage : la figure se rabat sur son image. */
  fold: boolean;
};

export default function SymetrieScene({ angle, mIndex, fold }: SymetrieSceneProps) {
  const foldRef = useRef<Group>(null);
  const travelRef = useRef<Mesh>(null);
  const foldClock = useRef(0);

  const u = useMemo<V2>(() => {
    const a = (angle * Math.PI) / 180;
    return [-Math.sin(a), Math.cos(a)];
  }, [angle]);

  const img = useMemo(() => FIGURE.map((p) => reflect(p, u)), [u]);
  const axisVec = useMemo(() => new Vector3(u[0], u[1], 0), [u]);

  const idx = Math.min(2, Math.max(0, Math.round(mIndex)));
  const M = FIGURE[idx];
  const Mp = img[idx];

  // Pied de la perpendiculaire H (projeté de M sur l'axe) + normale unitaire.
  const { H, nrm } = useMemo(() => {
    const d = M[0] * u[0] + M[1] * u[1];
    const h: V2 = [d * u[0], d * u[1]];
    const dx = M[0] - h[0];
    const dy = M[1] - h[1];
    const L = Math.hypot(dx, dy) || 1;
    return { H: h, nrm: [dx / L, dy / L] as V2 };
  }, [M, u]);

  const axisPts = useMemo<Vector3Tuple[]>(
    () => [
      [-2.9 * u[0], -2.9 * u[1], 0.01],
      [2.9 * u[0], 2.9 * u[1], 0.01],
    ],
    [u],
  );
  const origOutline = useMemo<Vector3Tuple[]>(() => [...FIGURE, FIGURE[0]].map((p) => v3(p, 0.03)), []);
  const imgOutline = useMemo<Vector3Tuple[]>(() => [...img, img[0]].map((p) => v3(p, 0.015)), [img]);
  const perpPts = useMemo<Vector3Tuple[]>(() => [v3(M, 0.05), v3(Mp, 0.05)], [M, Mp]);

  const shapeOrig = useMemo(() => triShape(FIGURE), []);
  const shapeImg = useMemo(() => triShape(img), [img]);

  // Marques d'égale distance (un tiret perpendiculaire au milieu de [MH] et de [HM']).
  const ticks = useMemo(() => {
    const k = 0.11;
    const mk = (p: V2, q: V2): [Vector3Tuple, Vector3Tuple] => {
      const c: V2 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      return [
        [c[0] + k * u[0], c[1] + k * u[1], 0.06],
        [c[0] - k * u[0], c[1] - k * u[1], 0.06],
      ];
    };
    return [mk(M, H), mk(H, Mp)];
  }, [M, H, Mp, u]);

  // Petit carré d'angle droit en H.
  const square = useMemo(() => {
    const q = 0.17;
    const c1: Vector3Tuple = [H[0] + q * u[0], H[1] + q * u[1], 0.06];
    const c2: Vector3Tuple = [H[0] + q * (u[0] + nrm[0]), H[1] + q * (u[1] + nrm[1]), 0.06];
    const c3: Vector3Tuple = [H[0] + q * nrm[0], H[1] + q * nrm[1], 0.06];
    return { c1, c2, c3 };
  }, [H, u, nrm]);

  const I: V2 = [1.9 * u[0], 1.9 * u[1]];

  return (
    <LabScene cameraPosition={[0, 0, 7.6]} background="#F6F7FB" minDistance={4.5} maxDistance={12} groundY={null} postFx={false}>
      {/* Papier quadrillé + repère gradué */}
      <GraphPaper width={8} height={6} step={0.5} z={-0.05} color="#DBE3EE" />
      <Axes2D size={2.6} color="#94A3B8" ticks />

      {/* L'axe de symétrie (d) */}
      <PolyLine points={axisPts} color={AXIS_COLOR} width={4} />
      <Tag3D position={[2.9 * u[0] + 0.42, 2.9 * u[1] + 0.12, 0.05]} label="(d) axe de symétrie" tone="physique" />

      {/* Un point de l'axe est son propre symétrique */}
      <Marker position={v3(I, 0.05)} color="#F59E0B" size={0.09} />
      <Tag3D position={[I[0] + 0.72, I[1] - 0.26, 0.05]} label="I = I′ (sur l'axe)" tone="neutral" />

      {/* Figure image A′B′C′ (fixe) */}
      <mesh position={[0, 0, 0.005]}>
        <shapeGeometry args={[shapeImg]} />
        <meshStandardMaterial color={IMG_COLOR} side={DoubleSide} transparent opacity={0.32} roughness={0.9} />
      </mesh>
      <PolyLine points={imgOutline} color={IMG_COLOR} width={3} />
      {img.map((p, i) => (
        <Marker key={`i${i}`} position={v3(p, 0.04)} color={i === idx ? M_COLOR : IMG_COLOR} size={i === idx ? 0.1 : 0.075} />
      ))}
      {img.map((p, i) => (
        <Tag3D key={`it${i}`} position={[p[0] - 0.34, p[1] + 0.3, 0.05]} label={`${NAMES[i]}′`} tone="svt" />
      ))}

      {/* Figure d'origine ABC — pivote autour de (d) en mode pliage */}
      <group ref={foldRef}>
        <mesh position={[0, 0, 0.02]}>
          <shapeGeometry args={[shapeOrig]} />
          <meshStandardMaterial color={ORIG_COLOR} side={DoubleSide} transparent opacity={0.45} roughness={0.9} />
        </mesh>
        <PolyLine points={origOutline} color={ORIG_COLOR} width={3} />
        {FIGURE.map((p, i) => (
          <Marker key={`o${i}`} position={v3(p, 0.05)} color={i === idx ? M_COLOR : ORIG_COLOR} size={i === idx ? 0.11 : 0.08} />
        ))}
        {FIGURE.map((p, i) => (
          <Tag3D key={`ot${i}`} position={[p[0] + 0.32, p[1] + 0.3, 0.06]} label={NAMES[i]} tone="chimie" />
        ))}
      </group>

      {/* Traits de construction : perpendiculaire à (d), pied H, égales distances */}
      {!fold && (
        <>
          <PolyLine points={perpPts} color={BUILD_COLOR} width={2} dashed />
          <Marker position={v3(H, 0.06)} color={BUILD_COLOR} size={0.06} />
          <Segment a={square.c1} b={square.c2} color={BUILD_COLOR} width={0.014} />
          <Segment a={square.c3} b={square.c2} color={BUILD_COLOR} width={0.014} />
          {ticks.map((t, i) => (
            <Segment key={`tk${i}`} a={t[0]} b={t[1]} color={M_COLOR} width={0.02} />
          ))}
          <Tag3D position={[H[0] - 0.55 * nrm[0], H[1] - 0.55 * nrm[1] - 0.3, 0.06]} label="H : milieu de [MM′]" tone="maths" />
          {/* Point qui traverse l'axe de M vers M′ */}
          <mesh ref={travelRef}>
            <sphereGeometry args={[0.085, 20, 16]} />
            <meshStandardMaterial color={M_COLOR} emissive={M_COLOR} emissiveIntensity={0.45} />
          </mesh>
        </>
      )}

      <Animate
        fn={(state, delta) => {
          // Pliage : demi-tour autour de (d) → superposition sur l'image.
          let phi = 0;
          if (fold) {
            foldClock.current += delta;
            const t = foldClock.current % 5.4;
            if (t < 2) phi = Math.PI * smooth(t / 2);
            else if (t < 4) phi = Math.PI;
            else phi = Math.PI * (1 - smooth((t - 4) / 1.4));
          } else {
            foldClock.current = 0;
          }
          foldRef.current?.quaternion.setFromAxisAngle(axisVec, phi);

          // Report de la distance : le point voyage de M à M′.
          if (travelRef.current) {
            const c = state.clock.elapsedTime % 3.6;
            const s = c < 0.6 ? 0 : c < 2.4 ? smooth((c - 0.6) / 1.8) : 1;
            travelRef.current.position.set(M[0] + (Mp[0] - M[0]) * s, M[1] + (Mp[1] - M[1]) * s, 0.09);
          }
        }}
      />

      <SceneLabel
        position={[0, 2.95, 0.1]}
        title={fold ? 'Pliage : la figure se rabat sur son image' : `Axe (d) incliné de ${angle}°`}
        subtitle="Symétrie axiale · (d) est la médiatrice de [MM′]"
        tone="chimie"
      />
      <Readout position={[-2.9, -2.6, 0.1]} value={`(${M[0].toFixed(2)} ; ${M[1].toFixed(2)})`} caption={`M = ${NAMES[idx]}`} />
      <Readout position={[2.9, -2.6, 0.1]} value={`(${Mp[0].toFixed(2)} ; ${Mp[1].toFixed(2)})`} caption={`M′ = ${NAMES[idx]}′`} />
    </LabScene>
  );
}
