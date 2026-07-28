'use client';

import { useMemo, useRef } from 'react';
import { Group } from 'three';
import type { Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Molecule, MOLECULES, type AtomSpec, type BondSpec } from '@/components/lab3d/molecule';
import { SceneLabel, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — chimie organique : hydrocarbures en modèle CPK (Première S).
 *
 * Visualise un alcane (liaisons C–C simples : méthane CH₄, éthane C₂H₆) ou
 * un alcène (double liaison C=C : éthylène C₂H₄, via MOLECULES.C2H4 et son
 * Bond order={2}). L'élève bascule entre alcane et alcène et compare. La
 * molécule tourne doucement via <Animate>. Construit sur le kit lab3d.
 */

export type AlkaneSceneProps = { family: 'alcane' | 'alcene'; n: number };

// Éthane C₂H₆ — deux carbones liés par une liaison SIMPLE, conformation décalée.
const ETHANE: { atoms: AtomSpec[]; bonds: BondSpec[] } = {
  atoms: [
    { el: 'C', pos: [-0.77, 0, 0] },
    { el: 'C', pos: [0.77, 0, 0] },
    { el: 'H', pos: [-1.15, 0.9, 0.35] },
    { el: 'H', pos: [-1.15, -0.45, -0.95] },
    { el: 'H', pos: [-1.15, -0.45, 0.6] },
    { el: 'H', pos: [1.15, 0.45, -0.6] },
    { el: 'H', pos: [1.15, 0.45, 0.95] },
    { el: 'H', pos: [1.15, -0.9, -0.35] },
  ],
  bonds: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [1, 6], [1, 7]],
};

type MolInfo = { name: string; formula: string; atoms: AtomSpec[]; bonds: BondSpec[]; carbons: Vector3Tuple[] };

function pick(family: 'alcane' | 'alcene', n: number): MolInfo {
  if (family === 'alcene') {
    return { name: 'Éthylène (éthène)', formula: 'C₂H₄', atoms: MOLECULES.C2H4.atoms, bonds: MOLECULES.C2H4.bonds, carbons: [[-0.67, 0, 0], [0.67, 0, 0]] };
  }
  if (n >= 2) {
    return { name: 'Éthane', formula: 'C₂H₆', atoms: ETHANE.atoms, bonds: ETHANE.bonds, carbons: [[-0.77, 0, 0], [0.77, 0, 0]] };
  }
  return { name: 'Méthane', formula: 'CH₄', atoms: MOLECULES.CH4.atoms, bonds: MOLECULES.CH4.bonds, carbons: [[0, 0, 0]] };
}

export default function AlkaneScene({ family, n }: AlkaneSceneProps) {
  const mol = useRef<Group>(null);
  const info = useMemo(() => pick(family, n), [family, n]);
  const bondLabel: Vector3Tuple = useMemo(() => {
    const cs = info.carbons;
    if (cs.length < 2) return [0, -1.15, 0];
    return [(cs[0][0] + cs[1][0]) / 2, -1.15, 0];
  }, [info]);

  return (
    <LabScene cameraPosition={[0, 0.4, 6]} background="#F3EEFF" minDistance={3.5} maxDistance={10}>
      <group ref={mol}>
        <Molecule atoms={info.atoms} bonds={info.bonds} scale={1.05} />
      </group>

      {/* Repère le type de liaison entre carbones */}
      {info.carbons.length >= 2 && (
        <Tag3D
          position={bondLabel}
          label={family === 'alcene' ? 'Double liaison C=C' : 'Liaison simple C–C'}
          tone="chimie"
        />
      )}
      {/* Chaque carbone fait 4 liaisons */}
      <Tag3D position={[info.carbons[0][0], 0.95, 0]} label="C : 4 liaisons" tone="chimie" />

      <SceneLabel
        position={[0, 2, 0]}
        title={`${info.name} · ${info.formula}`}
        subtitle={family === 'alcene' ? 'Alcène · CₙH₂ₙ' : 'Alcane · CₙH₂ₙ₊₂'}
        tone="chimie"
      />

      {/* Rotation douce de la molécule (jamais useFrame hors Canvas) */}
      <Animate fn={(_, delta) => { if (mol.current) mol.current.rotation.y += delta * 0.35; }} />
    </LabScene>
  );
}
