'use client';

import { useMemo, useRef } from 'react';
import { Color, Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench } from '@/components/lab3d/environment';
import { Beaker, Drop } from '@/components/lab3d/glassware';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — préparation d'une solution de bissap (Physique-Chimie, Seconde).
 *
 * Un bécher où l'on dissout un soluté : la quantité de matière n (mol) est
 * figurée par des « grains » colorés qui flottent dans le liquide, le volume V
 * (L) pilote le niveau de liquide (`fill`). La teinte du liquide s'intensifie
 * avec la concentration C = n/V (mol/L), affichée via <Readout>. Quand on
 * dilue (V augmente), la couleur pâlit → C diminue. Construit sur le kit lab3d.
 */

export type MoleSceneProps = {
  /** quantité de matière de soluté, en mol */
  moles: number;
  /** volume de solution, en mL */
  volume: number;
  /** concentration molaire C = n/V, en mol/L */
  concentration: number;
  /** true pendant qu'on ajoute de l'eau (dilution) → goutte animée */
  diluting?: boolean;
};

// Géométrie du bécher (cohérente avec le composant Beaker du kit)
const BEAKER_R = 1.1;
const BEAKER_H = 2.2;
const GROUND_Y = -1.5;
const BEAKER_Y = GROUND_Y + BEAKER_H / 2; // pose le fond sur la paillasse
const VOL_MAX = 500; // mL → fill = 1

// Teinte bissap : du rose très pâle (dilué) au rouge profond (concentré).
const PALE = new Color('#FBE3EC');
const DEEP = new Color('#B0123C');

export default function MoleScene({ moles, volume, concentration, diluting = false }: MoleSceneProps) {
  const drop = useRef<Mesh>(null);
  const grains = useRef<(Mesh | null)[]>([]);

  const fill = Math.max(0.06, Math.min(1, volume / VOL_MAX));
  const liquidColor = useMemo(() => PALE.clone().lerp(DEEP, Math.min(1, concentration / 1.2)).getStyle(), [concentration]);

  // Hauteur réelle du liquide dans le bécher (mêmes constantes que Beaker).
  const liquidTopY = useMemo(() => {
    const liquidH = fill * (BEAKER_H - 0.12);
    return BEAKER_Y - BEAKER_H / 2 + 0.04 + liquidH;
  }, [fill]);

  // Nb de grains visibles ∝ n (quantité de matière de soluté).
  const grainCount = Math.max(0, Math.min(26, Math.round(moles * 80)));
  const grainSeeds = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const a = (i * 2.399963); // angle d'or → répartition régulière
        const r = (0.18 + 0.62 * ((i * 37) % 100) / 100) * BEAKER_R * 0.82;
        return { x: Math.cos(a) * r, z: Math.sin(a) * r, phase: (i % 7) * 0.9, speed: 0.5 + (i % 5) * 0.18 };
      }),
    [],
  );

  return (
    <LabScene cameraPosition={[1.6, 0.7, 5.2]} background="#F3EEFF" minDistance={3.5} maxDistance={10} groundY={GROUND_Y}>
      <LabBench y={GROUND_Y} color="#E7E0F5" size={24} />

      {/* Bécher + solution de bissap (niveau piloté par V, teinte par C) */}
      <Beaker position={[0, BEAKER_Y, 0]} radius={BEAKER_R} height={BEAKER_H} fill={fill} liquidColor={liquidColor} />

      {/* Grains de soluté en suspension (figurent n) — flottent doucement */}
      {grainSeeds.map((g, i) => (
        <mesh
          key={i}
          ref={(m) => { grains.current[i] = m; }}
          position={[g.x, liquidTopY - 0.4, g.z]}
          visible={i < grainCount}
          castShadow
        >
          <dodecahedronGeometry args={[0.05]} />
          <meshStandardMaterial color="#7A0A28" roughness={0.55} emissive="#3D0514" emissiveIntensity={0.3} />
        </mesh>
      ))}

      {/* Goutte d'eau pour la dilution (V augmente → C diminue) */}
      <Drop position={[0, liquidTopY + 1.1, 0]} color="#BFE3FF" size={0.08} />
      <mesh ref={drop} position={[0, liquidTopY + 0.7, 0]} visible={diluting}>
        <sphereGeometry args={[0.07, 14, 12]} />
        <meshPhysicalMaterial color="#BFE3FF" transparent opacity={0.85} transmission={0.5} roughness={0.1} ior={1.33} />
      </mesh>

      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime;
          // grains : léger flottement vertical + rotation pour un effet « en suspension »
          for (let i = 0; i < grainCount; i++) {
            const m = grains.current[i];
            if (!m) continue;
            const s = grainSeeds[i];
            const span = Math.max(0.12, (liquidTopY - (BEAKER_Y - BEAKER_H / 2)) - 0.18);
            const y = BEAKER_Y - BEAKER_H / 2 + 0.12 + ((Math.sin(t * s.speed + s.phase) * 0.5 + 0.5) * span);
            m.position.y = y;
            m.rotation.x = t * 0.6 + s.phase;
            m.rotation.y = t * 0.4 + s.phase;
          }
          // goutte de dilution : chute répétée vers la surface
          if (drop.current) {
            const top = liquidTopY + 0.9;
            const fallen = ((t * 1.4) % 1) * (top - liquidTopY);
            drop.current.position.y = top - fallen;
          }
        }}
      />

      <SceneLabel
        position={[0, 2.55, 0]}
        title={`n = ${moles.toFixed(2)} mol · V = ${(volume / 1000).toFixed(2)} L`}
        subtitle="Solution de bissap · C = n / V"
        tone="chimie"
      />
      <Tag3D position={[-1.5, BEAKER_Y + 0.2, 0]} label="soluté (n)" tone="chimie" />
      <Readout position={[2.2, BEAKER_Y + 0.3, 0]} value={concentration.toFixed(2)} unit="mol/L" caption="concentration C" />
    </LabScene>
  );
}
