'use client';

import { useMemo, useRef } from 'react';
import { Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Animate } from '@/components/lab3d/anim';
import { LabBench } from '@/components/lab3d/environment';
import { Battery, Bulb, Wire, Meter } from '@/components/lab3d/electric';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';

/**
 * Scène 3D — mesure de l'intensité et de la tension (Physique-Chimie, 4ème).
 *
 * Circuit réel : pile → ampèremètre (EN SÉRIE, mesure I en A) → ampoule,
 * retour à la pile. Le voltmètre est branché EN DÉRIVATION aux bornes de
 * l'ampoule (mesure U en V). Les aiguilles des deux instruments bougent
 * selon les valeurs ; l'ampoule brille d'autant plus que I est grande.
 * Construit sur le kit lab3d. Contexte : installation électrique scolaire.
 */

export type MultimeterSceneProps = { voltage: number; intensity: number; uBulb: number };

const I_MAX = 0.5; // calibre ampèremètre (A)
const U_MAX = 6; // calibre voltmètre (V)

export default function MultimeterScene({ voltage, intensity, uBulb }: MultimeterSceneProps) {
  const electron = useRef<Mesh>(null);
  const brightness = Math.max(0, Math.min(1, intensity / I_MAX));

  // boucle série : pile(+) → ampèremètre → ampoule → retour pile(-)
  const loop = useMemo<[number, number, number][]>(
    () => [
      [-2.2, 0.9, 0],
      [-0.6, 0.9, 0], // vers l'ampèremètre (en série)
      [0.9, 0.9, 0], // ampèremètre → ampoule
      [2.2, 0.9, 0],
      [2.2, -0.9, 0],
      [-2.2, -0.9, 0],
      [-2.2, 0.9, 0],
    ],
    [],
  );

  // dérivation : bornes de l'ampoule → voltmètre (à l'écart, en dérivation)
  const branch = useMemo<[number, number, number][]>(
    () => [
      [2.05, 0.55, 0],
      [3.3, 0.55, 0],
      [3.3, -1.7, 0],
      [2.05, -1.7, 0],
    ],
    [],
  );

  // électron qui parcourt la boucle série (matérialise le courant)
  const total = useMemo(() => {
    let len = 0;
    for (let i = 0; i < loop.length - 1; i++) {
      const dx = loop[i + 1][0] - loop[i][0];
      const dy = loop[i + 1][1] - loop[i][1];
      len += Math.hypot(dx, dy);
    }
    return len;
  }, [loop]);

  return (
    <LabScene cameraPosition={[0.2, 0.4, 7.2]} background="#FEF3C7" minDistance={4.5} maxDistance={12} groundY={-1.9}>
      <LabBench y={-1.9} color="#E7D8B8" size={26} />

      {/* Pile (générateur) — borne + en haut */}
      <Battery position={[-2.6, 0, 0]} voltage={voltage} />
      <Tag3D position={[-2.6, -1.2, 0]} label={`Pile ${voltage.toFixed(1)} V`} tone="physique" />

      {/* Conducteurs du circuit principal (série) */}
      <Wire points={loop} color="#B45309" radius={0.05} />
      {/* Conducteurs de la dérivation (voltmètre) */}
      <Wire points={branch} color="#2563EB" radius={0.04} />

      {/* Ampèremètre — EN SÉRIE sur le circuit */}
      <Meter position={[0.1, 1.55, 0]} kind="A" value={intensity} max={I_MAX} />
      <Tag3D position={[0.1, 2.25, 0]} label="Ampèremètre · en série" tone="physique" />
      <Readout position={[0.1, 0.35, 0]} value={intensity.toFixed(2)} unit="A" caption="intensité I" />

      {/* Ampoule — brille selon l'intensité */}
      <Bulb position={[2.2, 1.45, 0]} on={brightness > 0.02} brightness={brightness} />
      <Tag3D position={[2.2, 2.2, 0]} label="Ampoule" tone="physique" />

      {/* Voltmètre — EN DÉRIVATION aux bornes de l'ampoule */}
      <Meter position={[3.3, -2.05, 0]} kind="V" value={uBulb} max={U_MAX} color="#1D4ED8" />
      <Tag3D position={[4.55, -2.05, 0]} label="Voltmètre · en dérivation" tone="physique" />
      <Readout position={[3.3, -1.2, 0]} value={uBulb.toFixed(1)} unit="V" caption="tension U" />

      {/* Porteur de charge animé (le courant) */}
      <mesh ref={electron}>
        <sphereGeometry args={[0.08, 16, 12]} />
        <meshStandardMaterial color="#FBBF24" emissive="#F59E0B" emissiveIntensity={0.9} />
      </mesh>

      <SceneLabel
        position={[0.2, 2.95, 0]}
        title={`U = ${uBulb.toFixed(1)} V · I = ${intensity.toFixed(2)} A`}
        subtitle="Circuit série · voltmètre en dérivation"
        tone="physique"
      />

      <Animate fn={(state) => {
        if (!electron.current) return;
        const speed = 0.4 + brightness * 1.8; // plus I est grande, plus vite
        let d = ((state.clock.elapsedTime * speed) % total);
        for (let i = 0; i < loop.length - 1; i++) {
          const a = loop[i];
          const b = loop[i + 1];
          const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (d <= seg) {
            const t = d / seg;
            electron.current.position.set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0.05);
            return;
          }
          d -= seg;
        }
      }} />
    </LabScene>
  );
}
