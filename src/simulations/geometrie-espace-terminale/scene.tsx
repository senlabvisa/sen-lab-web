'use client';

import { useEffect, useMemo, useRef } from 'react';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, type Mesh, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Segment } from '@/components/lab3d/environment';
import { Arrow3D, PolyLine, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';
import {
  CUBE_EDGES,
  CUBE_VERTICES,
  lineAGvsPlane,
  planeEquation,
  planeVsBase,
  sectionPolygon,
  shapeName,
  normalLength,
  distanceToPlane,
  type V3,
} from './geometry';

/**
 * Scène 3D — cube unité coupé par un plan mobile (Terminale S, Bac).
 *
 * Repère (A ; i, j, k) : le cube ABCDEFGH occupe [0;1]³ en coordonnées maths
 * (z vertical). Le plan (P) : ax + by + cz + d = 0 est piloté par l'élève.
 * La SECTION est calculée exactement (intersection du plan avec chaque arête)
 * puis remplie ; le vecteur normal n(a;b;c) part du centre de la section et
 * est bien perpendiculaire au plan. La grande diagonale (AG) montre la
 * position relative droite/plan.
 */

export type SpaceSceneProps = { a: number; b: number; c: number; d: number };

const S = 2.6; // côté du cube en unités de scène
const GROUND_Y = -1.45;

/** Coordonnées maths (x;y;z) → scène three (z vertical), cube centré sur l'origine. */
function toScene(p: V3): Vector3Tuple {
  return [(p[0] - 0.5) * S, (p[2] - 0.5) * S, -(p[1] - 0.5) * S];
}
/** Partie linéaire (pour les vecteurs, sans la translation). */
function dirToScene(p: V3): Vector3Tuple {
  return [p[0] * S, p[2] * S, -p[1] * S];
}

const LABELLED = [0, 1, 3, 4, 6]; // A, B, D, E, G
const NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function SpaceScene({ a, b, c, d }: SpaceSceneProps) {
  const runner = useRef<Mesh>(null);
  const poly = useMemo(() => sectionPolygon(a, b, c, d), [a, b, c, d]);
  const nLen = normalLength(a, b, c);
  const valide = nLen > 1e-9;
  const line = useMemo(() => lineAGvsPlane(a, b, c, d), [a, b, c, d]);
  const base = useMemo(() => planeVsBase(a, b, c), [a, b, c]);
  const distG = distanceToPlane(a, b, c, d, [1, 1, 1]);

  const scenePoly = useMemo(() => poly.map(toScene), [poly]);

  /** Remplissage de la section : éventail de triangles depuis le 1er sommet. */
  const fill = useMemo(() => {
    if (scenePoly.length < 3) return null;
    const verts: number[] = [];
    for (let i = 1; i + 1 < scenePoly.length; i++) {
      verts.push(...scenePoly[0], ...scenePoly[i], ...scenePoly[i + 1]);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(verts, 3));
    g.computeVertexNormals();
    return g;
  }, [scenePoly]);

  useEffect(() => () => fill?.dispose(), [fill]);

  /** Centre de la section + pointe du vecteur normal (unitaire, à l'échelle scène). */
  const { centre, tipN } = useMemo(() => {
    if (scenePoly.length < 3 || nLen < 1e-9) return { centre: null, tipN: null };
    const g: Vector3Tuple = [
      scenePoly.reduce((s, p) => s + p[0], 0) / scenePoly.length,
      scenePoly.reduce((s, p) => s + p[1], 0) / scenePoly.length,
      scenePoly.reduce((s, p) => s + p[2], 0) / scenePoly.length,
    ];
    const u = dirToScene([a / nLen, b / nLen, c / nLen]);
    const k = 0.42; // longueur d'affichage de n
    return { centre: g, tipN: [g[0] + u[0] * k, g[1] + u[1] * k, g[2] + u[2] * k] as Vector3Tuple };
  }, [scenePoly, a, b, c, nLen]);

  const agPoints = useMemo<Vector3Tuple[]>(
    () => [toScene([-0.18, -0.18, -0.18]), toScene([1.18, 1.18, 1.18])],
    [],
  );

  const inter =
    line.kind === 'secante' && line.t >= -0.18 && line.t <= 1.18 ? toScene(line.point) : null;

  const subtitle =
    nLen < 1e-9
      ? 'n est nul : ce n’est pas un plan'
      : poly.length >= 3
        ? `Section : ${shapeName(poly.length)} (${poly.length} côtés)`
        : 'Le plan ne coupe pas le cube';

  return (
    <LabScene cameraPosition={[3.6, 2.7, 4.6]} background="#F5F3FF" minDistance={4} maxDistance={14} groundY={GROUND_Y}>
      {/* Cube translucide : on voit la section à l'intérieur */}
      <mesh>
        <boxGeometry args={[S, S, S]} />
        <meshStandardMaterial color="#A78BFA" transparent opacity={0.1} roughness={0.5} side={DoubleSide} depthWrite={false} />
      </mesh>

      {/* Les 12 arêtes (segments, jamais des chapelets de sphères) */}
      {CUBE_EDGES.map(([i, j], k) => (
        <Segment key={`e${k}`} a={toScene(CUBE_VERTICES[i])} b={toScene(CUBE_VERTICES[j])} color="#6D28D9" width={0.018} />
      ))}

      {/* Les 8 sommets */}
      {CUBE_VERTICES.map((v, i) => (
        <Marker key={`v${i}`} position={toScene(v)} color="#4C1D95" size={0.055} />
      ))}
      {LABELLED.map((i) => {
        const p = toScene(CUBE_VERTICES[i]);
        const n = Math.hypot(p[0], p[1], p[2]) || 1;
        return (
          <Tag3D
            key={`t${i}`}
            position={[p[0] * (1 + 0.16 / n), p[1] * (1 + 0.16 / n), p[2] * (1 + 0.16 / n)]}
            label={NAMES[i]}
            tone="maths"
          />
        );
      })}

      {/* Repère orthonormé (A ; i, j, k) */}
      <Arrow3D from={toScene([0, 0, 0])} to={toScene([1.35, 0, 0])} color="#DC2626" radius={0.022} headLength={0.2} />
      <Arrow3D from={toScene([0, 0, 0])} to={toScene([0, 1.35, 0])} color="#16A34A" radius={0.022} headLength={0.2} />
      <Arrow3D from={toScene([0, 0, 0])} to={toScene([0, 0, 1.35])} color="#2563EB" radius={0.022} headLength={0.2} />
      <Tag3D position={toScene([1.5, 0, 0])} label="x" tone="physique" />
      <Tag3D position={toScene([0, 1.5, 0])} label="y" tone="svt" />
      <Tag3D position={toScene([0, 0, 1.5])} label="z" tone="maths" />

      {/* Grande diagonale (AG) : x = t, y = t, z = t — un point M(t) la parcourt */}
      <PolyLine points={agPoints} color="#0EA5E9" width={2.5} dashed />
      <mesh ref={runner}>
        <sphereGeometry args={[0.075, 18, 14]} />
        <meshStandardMaterial color="#0EA5E9" emissive="#0284C7" emissiveIntensity={0.45} roughness={0.3} />
      </mesh>
      <Animate
        fn={(state) => {
          const u = (state.clock.elapsedTime * 0.35) % 2;
          const t = -0.15 + 1.3 * (u < 1 ? u : 2 - u); // aller-retour sur (AG)
          runner.current?.position.set(...toScene([t, t, t]));
        }}
      />
      {inter && <Marker position={inter} color="#F59E0B" size={0.1} />}
      {inter && <Tag3D position={[inter[0] + 0.28, inter[1] + 0.22, inter[2]]} label="(AG) ∩ (P)" tone="neutral" />}

      {/* Section du cube par le plan */}
      {fill && (
        <mesh geometry={fill}>
          <meshStandardMaterial color="#F97316" transparent opacity={0.55} side={DoubleSide} roughness={0.35} emissive="#EA580C" emissiveIntensity={0.15} />
        </mesh>
      )}
      {scenePoly.length >= 3 && <PolyLine points={[...scenePoly, scenePoly[0]]} color="#C2410C" width={4} />}

      {/* Vecteur normal n(a ; b ; c), perpendiculaire à la section */}
      {centre && tipN && (
        <>
          <Arrow3D from={centre} to={tipN} color="#DC2626" radius={0.04} headLength={0.26} />
          <Tag3D position={[tipN[0], tipN[1] + 0.26, tipN[2]]} label={`n⃗(${a} ; ${b} ; ${c})`} tone="physique" />
        </>
      )}

      <SceneLabel position={[0, 2.55, 0]} title={planeEquation(a, b, c, d)} subtitle={subtitle} tone="maths" />
      <Readout position={[2.85, 1.1, 0]} value={Number.isFinite(distG) ? distG.toFixed(2) : '—'} unit="u" caption="distance de G au plan" />
      <Readout
        position={[2.85, 0.25, 0]}
        value={Number.isFinite(base.angle) ? base.angle.toFixed(0) : '—'}
        unit="°"
        caption={base.parallel ? 'plan ∥ à la base' : 'angle avec la base'}
      />
      {valide && (
      <Tag3D
        position={[-2.9, 1.1, 0]}
        label={
          line.kind === 'secante'
            ? '(AG) sécante au plan'
            : line.kind === 'incluse'
              ? '(AG) incluse dans le plan'
              : '(AG) ∥ au plan'
        }
        tone="neutral"
      />
      )}
    </LabScene>
  );
}
