'use client';

import { useMemo, useRef } from 'react';
import { Group, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Atom, Molecule, MOLECULES } from '@/components/lab3d/molecule';
import { Segment } from '@/components/lab3d/environment';
import { Arrow3D, PolyLine } from '@/components/lab3d/plot';
import { Readout, SceneLabel, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — LA MOLÉCULE D'EAU H₂O (Physique-Chimie, 4ème).
 *
 * Quatre vues d'une seule et même molécule (le TP frère « atomes-molecules »
 * compare plusieurs molécules ; ici on étudie H₂O en profondeur) :
 *  - « modele »   : rapporteur virtuel — l'élève ouvre deux rayons et cherche
 *                   à les superposer aux liaisons O–H (angle réel 104,5°) ;
 *  - « polarite » : charges partielles δ− / δ+ et moment dipolaire ;
 *  - « solvant »  : solvatation de Na⁺ et Cl⁻ (le sel qui se dissout) ;
 *  - « synthese » : électrolyse 2 H₂O → 2 H₂ + O₂ (conservation des atomes).
 *
 * Géométrie exacte du kit : MOLECULES.H2O place les H à (±0,76 ; 0,59), soit
 * une liaison O–H de 0,96 Å et un angle H–O–H de 104,4° — valeurs réelles.
 * Animation via <Animate> (jamais useFrame hors Canvas — règle du playbook).
 */

export type WaterMode = 'modele' | 'polarite' | 'solvant' | 'synthese';
export type WaterSceneProps = { mode: WaterMode; angle: number };

const REAL_ANGLE = 104.5;
const D2R = Math.PI / 180;
const S = 1.5; // agrandissement du modèle héros

const O_POS: Vector3Tuple = [0, 0, 0];
const H_R: Vector3Tuple = [0.76 * S, 0.59 * S, 0];
const H_L: Vector3Tuple = [-0.76 * S, 0.59 * S, 0];

const HEAD: Record<WaterMode, { title: string; subtitle: string }> = {
  modele: { title: 'H₂O — molécule coudée', subtitle: 'Rapporteur : cherche l’angle H–O–H' },
  polarite: { title: 'H₂O — molécule polaire', subtitle: 'L’oxygène attire les électrons' },
  solvant: { title: 'L’eau dissout le sel', subtitle: 'Na⁺ et Cl⁻ entourés de molécules d’eau' },
  synthese: { title: '2 H₂O → 2 H₂ + O₂', subtitle: 'Électrolyse : les atomes se conservent' },
};

/** Une molécule d'eau posée/orientée (réutilisée pour la solvatation). */
function Water({ position, rotationZ = 0, scale = 1 }: { position: Vector3Tuple; rotationZ?: number; scale?: number }) {
  return (
    <group position={position} rotation={[0, 0, rotationZ]}>
      <Molecule atoms={MOLECULES.H2O.atoms} bonds={MOLECULES.H2O.bonds} scale={scale} />
    </group>
  );
}

// Solvatation : l'oxygène (δ−) se tourne vers Na⁺, les hydrogènes (δ+) vers Cl⁻.
const AUTOUR_NA: { pos: Vector3Tuple; rz: number }[] = [
  { pos: [-2.4, 1.5, 0], rz: 0 },
  { pos: [-3.7, -0.75, 0], rz: 120 * D2R },
  { pos: [-1.1, -0.75, 0], rz: 240 * D2R },
];
const AUTOUR_CL: { pos: Vector3Tuple; rz: number }[] = [
  { pos: [2.4, -1.5, 0], rz: 0 },
  { pos: [3.7, 0.75, 0], rz: 120 * D2R },
  { pos: [1.1, 0.75, 0], rz: 240 * D2R },
];

export default function WaterScene({ mode, angle }: WaterSceneProps) {
  const rock = useRef<Group>(null);
  const head = HEAD[mode];
  const ok = Math.abs(angle - REAL_ANGLE) <= 2;

  // Rapporteur virtuel : deux rayons + arc, ouverts de `angle` autour de l'axe vertical.
  const { rayA, rayB, arc } = useMemo(() => {
    const ha = (angle / 2) * D2R;
    const R = 2.35;
    const pts: Vector3Tuple[] = [];
    for (let i = 0; i <= 48; i++) {
      const t = -ha + (i / 48) * 2 * ha;
      pts.push([Math.sin(t) * 1.6, Math.cos(t) * 1.6, 0]);
    }
    return {
      rayA: [Math.sin(ha) * R, Math.cos(ha) * R, 0] as Vector3Tuple,
      rayB: [-Math.sin(ha) * R, Math.cos(ha) * R, 0] as Vector3Tuple,
      arc: pts,
    };
  }, [angle]);

  return (
    <LabScene cameraPosition={[0, 0.4, 7.6]} background="#EEF6FF" minDistance={4} maxDistance={14} groundY={null}>
      <group ref={rock}>
        {mode === 'modele' && (
          <>
            <Molecule atoms={MOLECULES.H2O.atoms} bonds={MOLECULES.H2O.bonds} scale={S} />
            <Tag3D position={[0, -0.95, 0]} label="O — oxygène" tone="chimie" />
            <Tag3D position={[H_R[0] + 0.4, H_R[1] + 0.45, 0]} label="H" tone="chimie" />
            <Tag3D position={[H_L[0] - 0.4, H_L[1] + 0.45, 0]} label="H" tone="chimie" />
            {/* rapporteur : rayons réglés par l'élève */}
            <Segment a={O_POS} b={rayA} color={ok ? '#16A34A' : '#F59E0B'} width={0.028} />
            <Segment a={O_POS} b={rayB} color={ok ? '#16A34A' : '#F59E0B'} width={0.028} />
            <PolyLine points={arc} color={ok ? '#16A34A' : '#F59E0B'} width={3} />
            {ok && <Tag3D position={[0, 2.75, 0]} label="Rayons superposés aux liaisons O–H ✓" tone="svt" />}
          </>
        )}

        {mode === 'polarite' && (
          <>
            <Molecule atoms={MOLECULES.H2O.atoms} bonds={MOLECULES.H2O.bonds} scale={S} />
            <Tag3D position={[-1.15, -0.35, 0]} label="δ− (oxygène)" tone="chimie" />
            <Tag3D position={[H_R[0] + 0.55, H_R[1] + 0.4, 0]} label="δ+" tone="physique" />
            <Tag3D position={[H_L[0] - 0.55, H_L[1] + 0.4, 0]} label="δ+" tone="physique" />
            {/* moment dipolaire : orienté du pôle δ+ vers le pôle δ− */}
            <Arrow3D from={[0, 1.0, 0]} to={[0, -1.85, 0]} color="#7C3AED" radius={0.05} headLength={0.34} />
            <Tag3D position={[1.15, -1.7, 0]} label="moment dipolaire" tone="chimie" />
          </>
        )}

        {mode === 'solvant' && (
          <group scale={0.8}>
            <Atom element="Na" position={[-2.4, 0, 0]} scale={1.35} />
            <Atom element="Cl" position={[2.4, 0, 0]} scale={1.35} />
            <Tag3D position={[-2.4, -1.0, 0]} label="Na⁺ (ion sodium)" tone="chimie" />
            <Tag3D position={[2.4, -1.0, 0]} label="Cl⁻ (ion chlorure)" tone="chimie" />
            {AUTOUR_NA.map((w, i) => (
              <Water key={`na${i}`} position={w.pos} rotationZ={w.rz} scale={0.85} />
            ))}
            {AUTOUR_CL.map((w, i) => (
              <Water key={`cl${i}`} position={w.pos} rotationZ={w.rz} scale={0.85} />
            ))}
            <Tag3D position={[-2.4, 2.9, 0]} label="les O (δ−) se tournent vers Na⁺" tone="svt" />
            <Tag3D position={[2.4, 2.9, 0]} label="les H (δ+) se tournent vers Cl⁻" tone="svt" />
          </group>
        )}

        {mode === 'synthese' && (
          <>
            <Water position={[-3.0, 0.95, 0]} scale={0.85} />
            <Water position={[-3.0, -1.0, 0]} scale={0.85} />
            <Tag3D position={[-3.0, -2.1, 0]} label="2 H₂O (4 H + 2 O)" tone="chimie" />
            <Arrow3D from={[-1.35, 0, 0]} to={[0.35, 0, 0]} color="#7C3AED" radius={0.045} headLength={0.32} />
            <Tag3D position={[-0.5, 0.55, 0]} label="courant électrique" tone="physique" />
            <group position={[2.0, 1.0, 0]}>
              <Molecule atoms={MOLECULES.H2.atoms} bonds={MOLECULES.H2.bonds} scale={0.95} />
            </group>
            <group position={[2.0, 0.05, 0]}>
              <Molecule atoms={MOLECULES.H2.atoms} bonds={MOLECULES.H2.bonds} scale={0.95} />
            </group>
            <Tag3D position={[3.4, 0.55, 0]} label="2 H₂" tone="chimie" />
            <group position={[2.0, -1.25, 0]}>
              <Molecule atoms={MOLECULES.O2.atoms} bonds={MOLECULES.O2.bonds} scale={0.95} />
            </group>
            <Tag3D position={[3.4, -1.25, 0]} label="O₂" tone="chimie" />
          </>
        )}
      </group>

      {/* Balancement doux : la molécule reste lisible tout en montrant le relief 3D. */}
      <Animate
        fn={(state) => {
          if (rock.current) rock.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.45) * 0.25;
        }}
      />

      <SceneLabel position={[0, 3.25, 0]} title={head.title} subtitle={head.subtitle} tone="chimie" />
      {mode === 'modele' && (
        <Readout position={[3.5, 1.9, 0]} value={angle.toFixed(1)} unit="°" caption="angle H–O–H réglé" />
      )}
      {mode === 'polarite' && (
        <Readout position={[3.5, 1.9, 0]} value="104,5" unit="°" caption="angle réel · liaison 96 pm" />
      )}
    </LabScene>
  );
}
