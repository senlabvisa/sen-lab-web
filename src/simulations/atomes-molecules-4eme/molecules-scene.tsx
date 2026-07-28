'use client';

import { useMemo, useRef } from 'react';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Atom, Molecule, MOLECULES } from '@/components/lab3d/molecule';
import { SceneLabel, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — atomes & molécules (Physique-Chimie, 4ème).
 *
 * Modèle boules-bâtonnets CPK (O rouge, H blanc, C noir, N bleu) construit sur
 * le kit lab3d (Molecule + MOLECULES). L'élève choisit une molécule ; on affiche
 * sa formule, le détail de sa composition et — en mode « atome seul » — une
 * boule unique pour montrer la différence atome / molécule. La molécule tourne
 * doucement via <Animate> (refs mutées hors useFrame, règle du playbook).
 */

export type MolKey = 'H2O' | 'O2' | 'CO2' | 'CH4' | 'H2' | 'atome';

type Info = {
  formula: string;
  name: string;
  comp: string;
  context: string;
};

const INFO: Record<MolKey, Info> = {
  atome: { formula: 'O', name: 'Atome d’oxygène', comp: '1 atome seul (élément O)', context: 'La plus petite brique : un atome.' },
  H2O: { formula: 'H₂O', name: 'Molécule d’eau', comp: '2 atomes H + 1 atome O', context: 'L’eau que tu bois à la fontaine.' },
  O2: { formula: 'O₂', name: 'Dioxygène', comp: '2 atomes O', context: 'Le gaz de l’air que tu respires.' },
  CO2: { formula: 'CO₂', name: 'Dioxyde de carbone', comp: '1 atome C + 2 atomes O', context: 'Le gaz que tu expires.' },
  CH4: { formula: 'CH₄', name: 'Méthane', comp: '1 atome C + 4 atomes H', context: 'Le gaz du biodigesteur au village.' },
  H2: { formula: 'H₂', name: 'Dihydrogène', comp: '2 atomes H', context: 'Le plus léger des gaz.' },
};

export default function MoleculesScene({ molKey }: { molKey: MolKey }) {
  const spin = useRef<Group>(null);
  const info = INFO[molKey];
  const mol = molKey === 'atome' ? null : MOLECULES[molKey];

  // Repères des atomes pour poser des pastilles d'élément (composition lisible en 3D).
  const tags = useMemo(() => {
    if (!mol) return [{ pos: [0, 0.95, 0] as [number, number, number], label: 'O', tone: 'chimie' as const }];
    return mol.atoms.map((a) => ({
      pos: [a.pos[0], a.pos[1] + 0.55, a.pos[2]] as [number, number, number],
      label: a.el,
      tone: 'chimie' as const,
    }));
  }, [mol]);

  return (
    <LabScene cameraPosition={[0, 0.6, 5.5]} background="#F5F3FF" minDistance={3} maxDistance={9}>
      <group ref={spin} scale={1.1}>
        {mol ? (
          <Molecule atoms={mol.atoms} bonds={mol.bonds} />
        ) : (
          // Atome seul : une boule unique (pas d'assemblage) pour contraster avec une molécule.
          <Atom element="O" position={[0, 0, 0]} scale={1.3} />
        )}
        {tags.map((t, i) => (
          <Tag3D key={i} position={t.pos} label={t.label} tone={t.tone} />
        ))}
      </group>

      {/* Rotation douce — règle ⚠️ du playbook : <Animate> enfant de LabScene, mute une ref. */}
      <Animate fn={(_, delta) => spin.current?.rotateY(delta * 0.5)} />

      <SceneLabel position={[0, 2.2, 0]} title={`${info.name} · ${info.formula}`} subtitle={molKey === 'atome' ? 'Atome (boule seule)' : 'Molécule (atomes liés)'} tone="chimie" />
      <Tag3D position={[0, -1.7, 0]} label={info.comp} tone="chimie" />
    </LabScene>
  );
}
