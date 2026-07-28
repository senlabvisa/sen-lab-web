'use client';

import { useMemo, useRef } from 'react';
import { Group } from 'three';
import type { Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Atom } from '@/components/lab3d/molecule';
import type { Element } from '@/components/lab3d/materials';
import { PolyLine } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — modèle de l'atome (classification périodique, Seconde).
 *
 * Noyau (Atom CPK) entouré de ses couches électroniques K, L, M. Chaque
 * couche est une orbite circulaire réelle (PolyLine, pas des sphères), sur
 * laquelle tournent les électrons (petites sphères animées via <Animate>).
 * Le nombre d'électrons = Z (atome neutre) ; la répartition respecte les
 * règles de remplissage K(2) → L(8) → M.
 */

export type AtomSceneProps = { element: ElementKey };

export type ElementKey = 'H' | 'He' | 'C' | 'O' | 'Na' | 'Cl';

type ElData = {
  Z: number;
  name: string;
  family: string;
  shells: number[]; // électrons par couche K, L, M…
  config: string; // ex. (K)2(L)4
  tone: 'physique' | 'chimie';
};

export const ELEMENTS: Record<ElementKey, ElData> = {
  H: { Z: 1, name: 'Hydrogène', family: '—', shells: [1], config: '(K)1', tone: 'chimie' },
  He: { Z: 2, name: 'Hélium', family: 'Gaz noble', shells: [2], config: '(K)2', tone: 'chimie' },
  C: { Z: 6, name: 'Carbone', family: '—', shells: [2, 4], config: '(K)2(L)4', tone: 'chimie' },
  O: { Z: 8, name: 'Oxygène', family: '—', shells: [2, 6], config: '(K)2(L)6', tone: 'chimie' },
  Na: { Z: 11, name: 'Sodium', family: 'Alcalin', shells: [2, 8, 1], config: '(K)2(L)8(M)1', tone: 'chimie' },
  Cl: { Z: 17, name: 'Chlore', family: 'Halogène', shells: [2, 8, 7], config: '(K)2(L)8(M)7', tone: 'chimie' },
};

const SHELL_LABEL = ['K', 'L', 'M'];
const SHELL_RADIUS = [1.1, 1.85, 2.6]; // rayon de chaque orbite
const SHELL_TILT = [0.18, -0.42, 0.62]; // léger basculement (lecture 3D)
const SPEED = [1.1, 0.7, 0.5]; // vitesse angulaire décroissante vers l'extérieur

/** Cercle (orbite) échantillonné dans un plan basculé autour de X. */
function orbitPoints(radius: number, tilt: number): Vector3Tuple[] {
  const pts: Vector3Tuple[] = [];
  const N = 72;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const yz = Math.sin(a) * radius;
    pts.push([x, yz * Math.sin(tilt), yz * Math.cos(tilt)]);
  }
  return pts;
}

export default function AtomScene({ element }: AtomSceneProps) {
  const d = ELEMENTS[element];

  // Un groupe par couche : on le fait tourner sur lui-même (les électrons,
  // posés en cercle dans le groupe, décrivent ainsi leur orbite).
  const shellRefs = useRef<(Group | null)[]>([]);

  // Position de repos des électrons (cercle dans le plan XZ basculé).
  const electronLayout = useMemo(() => {
    return d.shells.map((count, s) => {
      const r = SHELL_RADIUS[s] ?? SHELL_RADIUS[SHELL_RADIUS.length - 1] + (s - 2) * 0.7;
      const tilt = SHELL_TILT[s] ?? 0;
      const positions: Vector3Tuple[] = [];
      for (let e = 0; e < count; e++) {
        const a = (e / count) * Math.PI * 2;
        const x = Math.cos(a) * r;
        const yz = Math.sin(a) * r;
        positions.push([x, yz * Math.sin(tilt), yz * Math.cos(tilt)]);
      }
      return { r, tilt, positions };
    });
  }, [d.shells]);

  return (
    <LabScene cameraPosition={[0, 1.4, 6.4]} background="#EEF2FF" minDistance={4} maxDistance={11} groundY={null} postFx>
      {/* Noyau : Z protons (+ neutrons). Couleur CPK de l'élément. */}
      <Atom element={element as Element} position={[0, 0, 0]} scale={1.6} />
      <Tag3D position={[0, -0.95, 0]} label={`noyau · ${d.Z} protons`} tone={d.tone} />

      {/* Couches électroniques : orbite (PolyLine) + électrons animés */}
      {electronLayout.map((shell, s) => (
        <group key={s}>
          {/* Orbite réelle (cercle lissé) */}
          <PolyLine points={orbitPoints(shell.r, shell.tilt)} color="#94A3B8" width={1.5} dashed />
          {/* Nom de la couche, posé sur la droite de l'orbite */}
          <Tag3D position={[shell.r + 0.18, 0.08, 0]} label={`${SHELL_LABEL[s] ?? '?'}: ${d.shells[s]}`} tone="physique" />
          {/* Électrons (tournent : le groupe pivote sur Y) */}
          <group ref={(g) => { shellRefs.current[s] = g; }}>
            {shell.positions.map((p, e) => (
              <mesh key={e} position={p}>
                <sphereGeometry args={[0.12, 16, 12]} />
                <meshStandardMaterial color="#1D4ED8" emissive="#1D4ED8" emissiveIntensity={0.55} roughness={0.3} />
              </mesh>
            ))}
          </group>
        </group>
      ))}

      {/* Animation : chaque couche tourne autour de l'axe vertical. */}
      <Animate
        fn={(_, delta) => {
          for (let s = 0; s < shellRefs.current.length; s++) {
            const g = shellRefs.current[s];
            if (g) g.rotation.y += (SPEED[s] ?? 0.4) * delta;
          }
        }}
      />

      <SceneLabel
        position={[0, 3.1, 0]}
        title={`${d.name} (${element}) · Z = ${d.Z}`}
        subtitle={d.family !== '—' ? `Famille : ${d.family}` : 'Structure de l’atome'}
        tone={d.tone}
      />
      <Readout position={[2.9, 1.9, 0]} value={d.config} caption="config. électronique" />
      <Readout position={[2.9, 1.0, 0]} value={d.Z} caption="protons = électrons" />
    </LabScene>
  );
}
