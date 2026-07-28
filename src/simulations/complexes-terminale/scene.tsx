'use client';

import { useMemo } from 'react';
import type { Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Axes2D, Arrow3D, PolyLine, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';

/**
 * Scène 3D — plan complexe d'Argand (nombres complexes, Terminale, Bac).
 *
 * Repère réel/imaginaire (Axes2D). Le point M d'affixe z = a + bi (Marker),
 * le vecteur OM en vraie flèche conique (Arrow3D, PAS un box pivoté). Un arc
 * (PolyLine) matérialise l'argument arg(z) = angle (Ox, OM). Le conjugué
 * z̄ = a − bi est tracé en symétrique par rapport à l'axe réel (2ᵉ Marker).
 * Maths justes : |z| = √(a²+b²) = OM, arg(z) = atan2(b, a).
 */

export type ComplexSceneProps = { real: number; imag: number };

const SKY = '#0EA5E9';
const ROSE = '#F43F5E';
const SLATE = '#64748B';

export default function ComplexScene({ real, imag }: ComplexSceneProps) {
  const mod = Math.sqrt(real * real + imag * imag);
  const arg = Math.atan2(imag, real); // radians, (Ox, OM)
  const argDeg = (arg * 180) / Math.PI;

  const M: Vector3Tuple = [real, imag, 0];
  const Mconj: Vector3Tuple = [real, -imag, 0];

  // Arc de l'argument : de l'axe Ox jusqu'au vecteur OM (rayon réduit, près de O).
  const arc = useMemo<Vector3Tuple[]>(() => {
    const radius = Math.min(0.85, Math.max(0.35, mod * 0.5));
    const steps = 40;
    const pts: Vector3Tuple[] = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * arg;
      pts.push([radius * Math.cos(a), radius * Math.sin(a), 0]);
    }
    return pts;
  }, [arg, mod]);

  // Pointillé de projection : abscisse a (partie réelle) et ordonnée b (partie imaginaire).
  const projReal: Vector3Tuple[] = [M, [real, 0, 0]];
  const projImag: Vector3Tuple[] = [M, [0, imag, 0]];

  return (
    <LabScene cameraPosition={[0, 0.2, 6]} background="#F5F9FF" minDistance={4} maxDistance={11} groundY={null}>
      {/* Repère d'Argand : Ox = axe réel, Oy = axe imaginaire */}
      <Axes2D size={3} color={SLATE} ticks />
      <Tag3D position={[3.25, -0.32, 0]} label="Re (axe réel)" tone="maths" />
      <Tag3D position={[0.62, 3.2, 0]} label="Im (axe imaginaire)" tone="maths" />

      {/* Projections a et b (pointillés) */}
      <PolyLine points={projReal} color={SLATE} width={1.5} dashed />
      <PolyLine points={projImag} color={SLATE} width={1.5} dashed />
      <Tag3D position={[real, -0.3, 0]} label={`a = ${real.toFixed(1)}`} tone="maths" />
      <Tag3D position={[-0.42, imag, 0]} label={`b = ${imag.toFixed(1)}`} tone="maths" />

      {/* Arc de l'argument + vecteur OM (vraie flèche) */}
      {Math.abs(arg) > 0.04 && mod > 0.15 && <PolyLine points={arc} color="#A855F7" width={2.5} />}
      <Arrow3D from={[0, 0, 0]} to={M} color={SKY} radius={0.035} headLength={0.3} />

      {/* Point M (affixe z) */}
      <Marker position={M} color={ROSE} size={0.14} />
      <Tag3D position={[real + 0.34, imag + 0.28, 0]} label={`M(${real.toFixed(1)} ; ${imag.toFixed(1)})`} tone="maths" />

      {/* Conjugué z̄ = a − bi (symétrique / axe réel) */}
      <Marker position={Mconj} color="#94A3B8" size={0.11} />
      <Tag3D position={[real + 0.34, -imag - 0.28, 0]} label="z̄ = a − bi" tone="neutral" />

      <SceneLabel
        position={[0, 3.85, 0]}
        title={`z = ${real.toFixed(1)} ${imag < 0 ? '−' : '+'} ${Math.abs(imag).toFixed(1)} i`}
        subtitle="Plan d'Argand · affixe du point M"
        tone="maths"
      />
      <Readout position={[2.65, 2.2, 0]} value={mod.toFixed(2)} caption="|z| = √(a²+b²)" />
      <Readout position={[2.65, 1.5, 0]} value={`${argDeg.toFixed(0)}°`} caption="arg(z) = (Ox, OM)" />
    </LabScene>
  );
}
