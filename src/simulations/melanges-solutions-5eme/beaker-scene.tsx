'use client';

import { useMemo, useRef } from 'react';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench, Stand } from '@/components/lab3d/environment';
import { Beaker, Erlenmeyer } from '@/components/lab3d/glassware';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — mélanges et séparation (Physique-Chimie, 5ème).
 *
 * Deux mélanges : eau + sable (hétérogène, particules visibles) ou eau + sel
 * (homogène, transparent). Deux techniques : filtration (entonnoir + filtre
 * au-dessus d'un Erlenmeyer → le filtrat passe, le sable reste sur le filtre)
 * et décantation (les grains tombent au fond du bécher). L'animation est gérée
 * par <Animate> (enfant de LabScene) qui mute des refs de groupes de particules.
 * Construite sur le kit lab3d (verrerie réaliste, tone chimie).
 */

export type BeakerSceneProps = {
  melange: 'sable' | 'sel';
  technique: 'aucune' | 'filtration' | 'decantation';
  running: boolean;
};

const GROUND_Y = -1.5;
const NB_GRAINS = 26;

// Positions stables des grains de sable (suspendus dans le mélange au départ).
const GRAINS = Array.from({ length: NB_GRAINS }, (_, i) => {
  const a = (i / NB_GRAINS) * Math.PI * 2 * 3.1;
  const r = 0.18 + ((i * 37) % 70) / 100;
  return {
    x: Math.cos(a) * r,
    z: Math.sin(a) * r,
    y0: ((i * 53) % 90) / 100, // hauteur relative initiale dans le liquide
    s: 0.035 + ((i * 17) % 30) / 1000,
  };
});

export default function BeakerScene({ melange, technique, running }: BeakerSceneProps) {
  const grains = useRef<Group>(null);
  const filtrate = useRef<Group>(null);
  const t0 = useRef<number | null>(null);
  const heterogene = melange === 'sable';

  // Couleur du liquide : eau salée = limpide bleutée ; eau + sable = trouble ocre.
  const liquidColor = heterogene ? '#C2B280' : '#BFE3FF';

  // Bornes verticales du liquide dans le bécher (pour placer les grains).
  const { yLiquidBottom, yLiquidTop } = useMemo(() => {
    const height = 2.2;
    const fill = 0.6;
    const liquidH = fill * (height - 0.12);
    const bottom = -height / 2 + 0.04;
    return { yLiquidBottom: bottom, yLiquidTop: bottom + liquidH };
  }, []);

  return (
    <LabScene cameraPosition={[2.6, 1.1, 5]} background="#F3EEFF" minDistance={3.5} maxDistance={11} groundY={GROUND_Y}>
      <LabBench y={GROUND_Y} color="#E6E0F0" size={24} />

      {/* ── Bécher du mélange (à gauche) ───────────────────────────── */}
      <group position={[-1.6, GROUND_Y + 1.1, 0]}>
        <Beaker position={[0, 0, 0]} radius={1.0} height={2.2} fill={0.6} liquidColor={liquidColor} />

        {/* Sable : grains suspendus (hétérogène) qui décantent quand on lance. */}
        {heterogene && (
          <group ref={grains}>
            {GRAINS.map((g, i) => (
              <mesh key={i} position={[g.x, yLiquidBottom + g.y0 * (yLiquidTop - yLiquidBottom), g.z]} castShadow>
                <dodecahedronGeometry args={[g.s, 0]} />
                <meshStandardMaterial color="#8A6D3B" roughness={0.95} metalness={0.02} />
              </mesh>
            ))}
          </group>
        )}

        <Tag3D position={[0, 1.45, 0]} label={heterogene ? 'Eau + sable' : 'Eau + sel'} tone="chimie" />
      </group>

      {/* ── Dispositif de séparation (à droite) ────────────────────── */}
      {technique === 'filtration' && (
        <group position={[1.6, GROUND_Y, 0]}>
          <Stand position={[0.4, 1.6, 0]} height={3.2} />

          {/* Entonnoir (cône) posé au-dessus de l'Erlenmeyer */}
          <group position={[0, 1.95, 0]}>
            <mesh castShadow>
              <coneGeometry args={[0.55, 0.7, 28, 1, true]} />
              <meshStandardMaterial color="#E2E8F0" transparent opacity={0.45} roughness={0.1} metalness={0.05} side={2} />
            </mesh>
            {/* Papier filtre (cône blanc à l'intérieur) */}
            <mesh position={[0, 0.05, 0]}>
              <coneGeometry args={[0.46, 0.55, 24, 1, true]} />
              <meshStandardMaterial color="#FAFAF5" roughness={0.95} side={2} />
            </mesh>
            {/* Résidu : sable retenu sur le filtre (apparaît si hétérogène) */}
            {heterogene && (
              <mesh position={[0, -0.12, 0]}>
                <coneGeometry args={[0.32, 0.22, 20]} />
                <meshStandardMaterial color="#8A6D3B" roughness={0.95} />
              </mesh>
            )}
            {/* Tige de l'entonnoir */}
            <mesh position={[0, -0.5, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.35, 16, 1, true]} />
              <meshStandardMaterial color="#E2E8F0" transparent opacity={0.45} roughness={0.1} />
            </mesh>
          </group>

          {/* Erlenmeyer récepteur : se remplit du filtrat limpide */}
          <Erlenmeyer position={[0, 1.05, 0]} fill={running ? 0.32 : 0.02} liquidColor="#BFE3FF" height={2.2} />

          {/* Filet de filtrat qui s'écoule (animé en Y) */}
          <group ref={filtrate} visible={false}>
            <mesh>
              <cylinderGeometry args={[0.03, 0.03, 0.6, 10]} />
              <meshStandardMaterial color="#BFE3FF" transparent opacity={0.8} />
            </mesh>
          </group>

          <Tag3D position={[0.1, 2.9, 0]} label="Filtre" tone="chimie" />
          <Tag3D position={[0, 0.1, 0]} label="Filtrat" tone="chimie" />
        </group>
      )}

      {/* ── Résultats / titres ─────────────────────────────────────── */}
      <SceneLabel
        position={[0, 2.6, 0]}
        title={heterogene ? 'Mélange hétérogène' : 'Mélange homogène'}
        subtitle={
          technique === 'aucune'
            ? 'Choisis une technique de séparation'
            : technique === 'filtration'
              ? 'Filtration'
              : 'Décantation'
        }
        tone="chimie"
      />

      {technique !== 'aucune' && (
        <Readout
          position={[2.7, 0.4, 0]}
          value={heterogene ? (running ? 'séparé' : 'en cours') : 'sel dissous'}
          caption={heterogene ? (technique === 'filtration' ? 'résidu / filtrat' : 'dépôt au fond') : 'reste mélangé'}
        />
      )}

      {/* ── Animation (enfant de LabScene → useFrame sûr) ──────────── */}
      <Animate
        fn={(state) => {
          if (!running) {
            t0.current = null;
            return;
          }
          if (t0.current === null) t0.current = state.clock.elapsedTime;
          const t = Math.min(1, (state.clock.elapsedTime - t0.current) / 2.4); // 0→1 sur ~2,4 s

          // Décantation OU phase de chute dans la filtration : les grains descendent.
          if (grains.current && heterogene) {
            grains.current.children.forEach((child, i) => {
              const g = GRAINS[i];
              const startY = yLiquidBottom + g.y0 * (yLiquidTop - yLiquidBottom);
              const restY = yLiquidBottom + 0.04 + g.s; // au fond, empilés
              child.position.y = startY + (restY - startY) * t;
            });
          }

          // Filet de filtrat qui descend dans l'Erlenmeyer (filtration uniquement).
          if (filtrate.current && technique === 'filtration') {
            filtrate.current.visible = t > 0.05 && t < 0.98;
            const top = GROUND_Y + 3.2;
            filtrate.current.position.set(1.6, top - t * 1.2, 0);
          }
        }}
      />
    </LabScene>
  );
}
