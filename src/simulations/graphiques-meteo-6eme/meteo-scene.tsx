'use client';

import { useMemo, useRef } from 'react';
import type { Mesh, Vector3Tuple } from 'three';
import {
  Animate,
  Arrow3D,
  Bar,
  DataPoints,
  GraphPaper,
  LabBench,
  LabScene,
  PolyLine,
  Readout,
  SceneLabel,
  Tag3D,
} from '@/components/lab3d';

/**
 * Scène 3D — diagramme ombrothermique d'une ville du Sénégal (Maths, 6ème).
 *
 * Un VRAI graphique, lu ET construit par l'élève :
 *  - en abscisse : les 12 mois de l'année (une graduation = un mois) ;
 *  - axe de gauche (bleu) : la hauteur de pluie en mm, tracée en <Bar> ;
 *  - axe de droite (rouge) : la température moyenne en °C, dont l'élève
 *    place les points un par un (<DataPoints>) ; dès 2 points posés la
 *    <PolyLine> les relie et la courbe se construit sous ses yeux.
 *
 * L'échelle est IDENTIQUE pour les trois villes (400 mm et 40 °C en haut de
 * l'axe, un carreau = 50 mm = 5 °C) : c'est ce qui rend la comparaison
 * honnête. Chargée via next/dynamic({ ssr: false }) depuis module.tsx.
 */

export type MeteoSceneProps = {
  /** Nom de la ville affichée (Dakar, Ziguinchor, Podor). */
  cityName: string;
  /** Hauteurs de pluie mensuelles, en mm (12 valeurs, janvier → décembre). */
  rain: number[];
  /** Températures moyennes mensuelles, en °C (12 valeurs). */
  temp: number[];
  /** Mois pointé par l'élève (0 = janvier … 11 = décembre). */
  month: number;
  /** Indices des mois dont le point de température est déjà placé. */
  placed: number[];
};

const LETTER = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

const SLOT = 0.55; // largeur d'un mois sur l'axe des abscisses
const X0 = -3.3; // origine du repère
const H = 3.0; // hauteur utile de l'axe des ordonnées
const RAIN_MAX = 400; // mm en haut de l'axe de gauche
const TEMP_MAX = 40; // °C en haut de l'axe de droite
const BASE_Y = -1.55; // ordonnée de la ligne « zéro » dans la scène
const BENCH_Y = -1.95;

const px = (i: number) => X0 + (i + 0.5) * SLOT;
const hR = (mm: number) => (Math.min(mm, RAIN_MAX) / RAIN_MAX) * H;
const hT = (c: number) => (Math.min(c, TEMP_MAX) / TEMP_MAX) * H;

const DROPS = Array.from({ length: 6 }, (_, i) => ({
  dx: Math.cos(i * 2.3) * 0.16,
  dz: Math.sin(i * 1.9) * 0.14,
  phase: (i * 0.17) % 1,
}));

export default function MeteoScene({ cityName, rain, temp, month, placed }: MeteoSceneProps) {
  const drops = useRef<Array<Mesh | null>>([]);
  const ghost = useRef<Mesh>(null);

  const dots = useMemo<Vector3Tuple[]>(
    () => [...placed].sort((a, b) => a - b).map((i) => [px(i), hT(temp[i]), 0.3] as Vector3Tuple),
    [placed, temp],
  );

  const alreadyPlaced = placed.includes(month);

  return (
    <LabScene cameraPosition={[0, 0.6, 9.8]} background="#F0F7FF" minDistance={6} maxDistance={18} groundY={BENCH_Y}>
      <LabBench y={BENCH_Y} color="#E3E7EE" size={26} />

      <group position={[0, BASE_Y, 0]}>
        {/* Papier millimétré : 1 carreau = 50 mm de pluie = 5 °C */}
        <group position={[0, 1.6875, -0.3]}>
          <GraphPaper width={7.15} height={3.375} step={0.375} color="#D7E2F0" />
        </group>

        {/* Axes : abscisse (mois), ordonnée gauche (pluie), ordonnée droite (température) */}
        <Arrow3D from={[X0 - 0.3, 0, 0]} to={[3.72, 0, 0]} color="#334155" radius={0.018} headLength={0.2} />
        <Arrow3D from={[X0 - 0.15, -0.22, 0]} to={[X0 - 0.15, H + 0.6, 0]} color="#1D4ED8" radius={0.018} headLength={0.2} />
        <Arrow3D from={[3.45, -0.22, 0]} to={[3.45, H + 0.6, 0]} color="#DC2626" radius={0.018} headLength={0.2} />

        {/* Diagramme en barres : la pluie tombée pendant chaque mois */}
        {rain.map((mm, i) => (
          <Bar
            key={`bar-${i}`}
            x={px(i)}
            height={hR(mm)}
            width={0.36}
            depth={0.36}
            color={i === month ? '#F59E0B' : '#2563EB'}
          />
        ))}

        {/* Repère vertical du mois pointé */}
        <PolyLine
          points={[
            [px(month), 0, 0.24],
            [px(month), H + 0.35, 0.24],
          ]}
          color="#94A3B8"
          width={1.5}
          dashed
        />

        {/* Courbe des températures, construite point par point par l'élève */}
        {dots.length >= 2 && <PolyLine points={dots} color="#DC2626" width={3.5} />}
        <DataPoints points={dots} color="#DC2626" size={0.075} />

        {/* Cible clignotante : là où poser le prochain point */}
        {!alreadyPlaced && (
          <mesh ref={ghost} position={[px(month), hT(temp[month]), 0.3]}>
            <sphereGeometry args={[0.1, 18, 14]} />
            <meshStandardMaterial color="#FCA5A5" transparent opacity={0.55} emissive="#DC2626" emissiveIntensity={0.4} />
          </mesh>
        )}

        {/* Averse au-dessus de la barre du mois pointé */}
        {DROPS.map((_, i) => (
          <mesh
            key={`drop-${i}`}
            visible={false}
            ref={(el) => {
              drops.current[i] = el;
            }}
          >
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshStandardMaterial color="#38BDF8" roughness={0.15} transparent opacity={0.8} />
          </mesh>
        ))}

        {/* Graduations chiffrées des deux axes */}
        <Tag3D position={[X0 - 0.62, 0, 0]} label="0 mm" tone="maths" />
        <Tag3D position={[X0 - 0.62, 1.5, 0]} label="200 mm" tone="maths" />
        <Tag3D position={[X0 - 0.62, 3, 0]} label="400 mm" tone="maths" />
        <Tag3D position={[3.98, 0, 0]} label="0 °C" tone="physique" />
        <Tag3D position={[3.98, 1.5, 0]} label="20 °C" tone="physique" />
        <Tag3D position={[3.98, 3, 0]} label="40 °C" tone="physique" />

        {/* Noms des axes */}
        <Tag3D position={[-2.5, H + 0.82, 0]} label="pluie (mm)" tone="maths" />
        <Tag3D position={[2.35, H + 0.82, 0]} label="température (°C)" tone="physique" />
        <Tag3D position={[3.78, -0.62, 0]} label="mois" tone="neutral" />

        {/* Les 12 mois en abscisse */}
        {LETTER.map((l, i) => (
          <Tag3D key={`mois-${i}`} position={[px(i), -0.32, 0]} label={l} tone={i === month ? 'maths' : 'neutral'} />
        ))}

        <Readout position={[-1.7, H + 1.38, 0.3]} value={rain[month]} unit="mm" caption={`pluie · ${SHORT[month]}`} />
        <Readout position={[1.7, H + 1.38, 0.3]} value={temp[month]} unit="°C" caption={`temp. · ${SHORT[month]}`} />
        <SceneLabel
          position={[0, H + 2.05, 0]}
          title={cityName}
          subtitle={`Ombrothermique · ${placed.length}/12 points placés`}
          tone="maths"
        />
      </group>

      <Animate
        fn={(state) => {
          const el = state.clock.elapsedTime;
          const raining = rain[month] > 0;
          const bottom = BASE_Y + hR(rain[month]) + 0.07;
          const top = Math.min(BASE_Y + H + 0.45, bottom + 1.15);
          drops.current.forEach((m, i) => {
            if (!m) return;
            m.visible = raining;
            if (!raining) return;
            const j = DROPS[i];
            const p = (el * 0.85 + j.phase) % 1;
            m.position.set(px(month) + j.dx, top - p * (top - bottom), j.dz);
            m.scale.set(0.8, 1.7, 0.8);
          });
          ghost.current?.scale.setScalar(1 + Math.sin(el * 4.5) * 0.28);
        }}
      />
    </LabScene>
  );
}
