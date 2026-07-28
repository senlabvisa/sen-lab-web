'use client';

import { useMemo, useRef } from 'react';
import { Mesh, MeshStandardMaterial, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench } from '@/components/lab3d/environment';
import { Battery, Bulb, Switch, Wire } from '@/components/lab3d/electric';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — circuits électriques simples (Physique-Chimie, 5ème).
 *
 * Une pile (style Woyofal), deux ampoules, un interrupteur, des fils en
 * boucle fermée. Montage SÉRIE (une seule boucle) ou DÉRIVATION (deux
 * branches indépendantes). Interrupteur ouvert = circuit coupé. Si une
 * ampoule grille : en série tout s'éteint, en dérivation l'autre reste
 * allumée. Construit sur le kit lab3d.
 */

export type Mode = 'serie' | 'derivation';

export type CircuitSceneProps = {
  mode: Mode;
  closed: boolean;
  /** Ampoule grillée : 0 = aucune, 1 = lampe gauche, 2 = lampe droite. */
  grilled: 0 | 1 | 2;
};

const GROUND_Y = -1.5;
const WIRE_ON = '#F59E0B'; // fil parcouru par le courant (cuivre chaud)
const WIRE_OFF = '#475569'; // fil sans courant (gris)

export default function CircuitScene({ mode, closed, grilled }: CircuitSceneProps) {
  // Positions clés
  const batPos: Vector3Tuple = [-2.6, GROUND_Y + 0.9, 0];
  const swPos: Vector3Tuple = [0, GROUND_Y + 1.9, 0];
  const lamp1: Vector3Tuple = mode === 'serie' ? [1.6, GROUND_Y + 1.55, 0] : [1.6, GROUND_Y + 2.2, 0];
  const lamp2: Vector3Tuple = mode === 'serie' ? [1.6, GROUND_Y + 0.35, 0] : [1.6, GROUND_Y + 0.4, 0];

  // Logique électrique juste
  const lit1 = closed && grilled !== 1 && (mode === 'derivation' || grilled === 0);
  const lit2 = closed && grilled !== 2 && (mode === 'derivation' || grilled === 0);
  // En série, le courant passe seulement si les deux lampes sont saines.
  const seriesCurrent = mode === 'serie' && closed && grilled === 0;
  // En dérivation, le courant circule dès qu'une branche est alimentée.
  const anyCurrent = seriesCurrent || lit1 || lit2;

  // Filaments (scintillement léger des ampoules allumées)
  const f1 = useRef<Mesh>(null);
  const f2 = useRef<Mesh>(null);

  // Tracé des fils (boucle fermée). Couleur = courant ou non.
  const wires = useMemo(() => {
    const onColor = WIRE_ON;
    const segs: { pts: Vector3Tuple[]; on: boolean }[] = [];
    if (mode === 'serie') {
      // pile (+) → interrupteur → lampe1 → lampe2 → pile (-) : UNE seule boucle
      segs.push({ pts: [[batPos[0], batPos[1] + 0.9, 0], [batPos[0], swPos[1], 0], [swPos[0] - 0.4, swPos[1], 0]], on: closed });
      segs.push({ pts: [[swPos[0] + 0.4, swPos[1], 0], [lamp1[0], swPos[1], 0], [lamp1[0], lamp1[1] + 0.45, 0]], on: seriesCurrent });
      segs.push({ pts: [[lamp1[0], lamp1[1] - 0.45, 0], [lamp1[0], lamp2[1] + 0.45, 0]], on: seriesCurrent });
      segs.push({ pts: [[lamp2[0], lamp2[1] - 0.45, 0], [lamp2[0], batPos[1] - 0.9, 0], [batPos[0], batPos[1] - 0.9, 0]], on: seriesCurrent });
    } else {
      // pile (+) → interrupteur → NŒUD ; deux branches parallèles vers la pile (-)
      const nodeX = 0.7;
      segs.push({ pts: [[batPos[0], batPos[1] + 0.9, 0], [batPos[0], swPos[1], 0], [swPos[0] - 0.4, swPos[1], 0]], on: closed });
      segs.push({ pts: [[swPos[0] + 0.4, swPos[1], 0], [nodeX, swPos[1], 0]], on: closed });
      // branche haute (lampe1)
      segs.push({ pts: [[nodeX, swPos[1], 0], [nodeX, lamp1[1], 0], [lamp1[0] - 0.28, lamp1[1], 0]], on: closed });
      segs.push({ pts: [[lamp1[0] + 0.28, lamp1[1], 0], [lamp1[0] + 0.7, lamp1[1], 0], [lamp1[0] + 0.7, batPos[1] - 0.9, 0]], on: lit1 });
      // branche basse (lampe2)
      segs.push({ pts: [[nodeX, swPos[1], 0], [nodeX, lamp2[1], 0], [lamp2[0] - 0.28, lamp2[1], 0]], on: closed });
      segs.push({ pts: [[lamp2[0] + 0.28, lamp2[1], 0], [lamp2[0] + 0.7, lamp2[1], 0], [lamp2[0] + 0.7, batPos[1] - 0.9, 0]], on: lit2 });
      // retour commun vers la pile (-)
      segs.push({ pts: [[lamp2[0] + 0.7, batPos[1] - 0.9, 0], [batPos[0], batPos[1] - 0.9, 0]], on: lit1 || lit2 });
    }
    return segs.map((s) => ({ ...s, color: s.on ? onColor : WIRE_OFF }));
  }, [mode, closed, seriesCurrent, lit1, lit2, batPos, swPos, lamp1, lamp2]);

  return (
    <LabScene cameraPosition={[0, 0.4, 7.2]} background="#FEF3C7" minDistance={4.5} maxDistance={12} groundY={GROUND_Y}>
      <LabBench y={GROUND_Y} color="#E7D8B8" size={24} />

      {/* Pile Woyofal */}
      <Battery position={batPos} voltage={4.5} />
      <Tag3D position={[batPos[0], batPos[1] - 1.25, 0]} label="Pile 4,5 V" tone="physique" />

      {/* Interrupteur */}
      <Switch position={swPos} closed={closed} />
      <Tag3D position={[swPos[0], swPos[1] - 0.5, 0]} label={closed ? 'Fermé' : 'Ouvert'} tone="physique" />

      {/* Ampoules */}
      <Bulb position={lamp1} on={lit1} brightness={lit1 ? 1 : 0} />
      <mesh ref={f1} position={lamp1}>
        <torusGeometry args={[0.13, 0.018, 8, 24]} />
        <meshStandardMaterial color="#FBBF24" emissive="#FF9500" emissiveIntensity={0} />
      </mesh>
      <Tag3D position={[lamp1[0] + 0.95, lamp1[1] + 0.1, 0]} label={grilled === 1 ? 'L1 grillée' : 'Lampe L1'} tone="physique" />

      <Bulb position={lamp2} on={lit2} brightness={lit2 ? 1 : 0} />
      <mesh ref={f2} position={lamp2}>
        <torusGeometry args={[0.13, 0.018, 8, 24]} />
        <meshStandardMaterial color="#FBBF24" emissive="#FF9500" emissiveIntensity={0} />
      </mesh>
      <Tag3D position={[lamp2[0] + 0.95, lamp2[1] + 0.1, 0]} label={grilled === 2 ? 'L2 grillée' : 'Lampe L2'} tone="physique" />

      {/* Fils en boucle fermée */}
      {wires.map((w, i) => (
        <Wire key={i} points={w.pts} color={w.color} radius={0.05} />
      ))}

      {/* Scintillement des filaments allumés */}
      <Animate
        fn={(state) => {
          const flick = 0.9 + Math.sin(state.clock.elapsedTime * 6) * 0.1;
          if (f1.current) (f1.current.material as MeshStandardMaterial).emissiveIntensity = lit1 ? flick * 3 : 0;
          if (f2.current) (f2.current.material as MeshStandardMaterial).emissiveIntensity = lit2 ? flick * 3 : 0;
        }}
      />

      <SceneLabel
        position={[-0.2, GROUND_Y + 3.5, 0]}
        title={mode === 'serie' ? 'Montage en SÉRIE' : 'Montage en DÉRIVATION'}
        subtitle="Éclairage d'une maison · Woyofal"
        tone="physique"
      />
      <Readout
        position={[-2.6, GROUND_Y + 3.2, 0]}
        value={anyCurrent ? 'OUI' : 'NON'}
        caption="le courant circule ?"
      />
    </LabScene>
  );
}
