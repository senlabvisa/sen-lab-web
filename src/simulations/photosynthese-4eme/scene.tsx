'use client';

import { useMemo, useRef } from 'react';
import type { Mesh, Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench, GraphPaper } from '@/components/lab3d/environment';
import { Beaker } from '@/components/lab3d/glassware';
import { Bulb } from '@/components/lab3d/electric';
import { Metal } from '@/components/lab3d/materials';
import { Molecule, MOLECULES } from '@/components/lab3d/molecule';
import { Arrow3D, PolyLine, DataPoints, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — photosynthèse de l'élodée (SVT, 4ème).
 *
 * Paillasse : un brin d'élodée lesté au fond d'un bécher d'eau, éclairé par
 * une lampe de bureau réglable. Les bulles de dioxygène montent réellement
 * du limbe des feuilles jusqu'à la surface, d'autant plus vite et nombreuses
 * que l'éclairement est fort. À droite, le graphe se construit en direct :
 * courbe modèle (PolyLine), mesures de l'élève (DataPoints), point courant
 * (Marker) et asymptote de saturation en pointillés.
 *
 * Bilan chimique affiché : 6 CO₂ + 6 H₂O --(lumière, chlorophylle)--> C₆H₁₂O₆ + 6 O₂
 */

export type PhotoSceneProps = {
  /** Éclairement réglé par l'élève, en % (0 = obscurité). */
  light: number;
  /** Débit de bulles correspondant (bulles/min). */
  rate: number;
  /** Échelle verticale du graphe (bulles/min). */
  maxRate: number;
  /** Courbe modèle : couples (lumière %, bulles/min). */
  curve: [number, number][];
  /** Mesures enregistrées par l'élève : (lumière %, bulles/min). */
  points: [number, number][];
};

const GROUND_Y = -1.5;
const BEAKER_X = -1.8;
const WATER_TOP = 0.02; // niveau de l'eau (fill = 0.71)
const EMIT_Y = -0.62; // départ des bulles (feuilles de l'élodée)
const MAX_BUBBLES = 16;

const GX = 3.2; // longueur de l'axe des abscisses du graphe
const GY = 2.4; // hauteur de l'axe des ordonnées du graphe
const GRAPH_ORIGIN: Vector3Tuple = [1.85, -1.2, 0];
const LAMP_X = -3.15;
const LAMP_Y = 0.75;

/** Brin d'élodée : tige + verticilles de feuilles (3 feuilles par étage). */
function Elodee({ glow }: { glow: number }) {
  const whorls = useMemo(
    () => Array.from({ length: 7 }, (_, i) => ({ y: 0.2 + i * 0.19, rot: i * 1.05 })),
    [],
  );
  return (
    <group position={[BEAKER_X, GROUND_Y + 0.06, 0]}>
      {/* petit lest de gravier qui maintient le brin au fond */}
      <mesh position={[0, 0.03, 0]} scale={[1.6, 0.5, 1.2]} castShadow>
        <sphereGeometry args={[0.2, 18, 12]} />
        <meshStandardMaterial color="#8D8474" roughness={0.95} />
      </mesh>
      {/* tige */}
      <mesh position={[0, 0.78, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 1.5, 12]} />
        <meshStandardMaterial color="#15803D" roughness={0.7} />
      </mesh>
      {whorls.map((w, i) => (
        <group key={i} position={[0, w.y, 0]} rotation={[0, w.rot, 0]}>
          {[0, 2.094, 4.189].map((a, j) => (
            <mesh
              key={j}
              position={[Math.cos(a) * 0.2, 0.05, Math.sin(a) * 0.2]}
              rotation={[0, -a, 0.35]}
              scale={[1.9, 0.22, 0.85]}
              castShadow
            >
              <sphereGeometry args={[0.14, 14, 10]} />
              <meshStandardMaterial
                color="#16A34A"
                roughness={0.55}
                emissive="#166534"
                emissiveIntensity={0.08 + glow * 0.45}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Lampe de bureau orientable (pied + tige + abat-jour + ampoule du kit). */
function Lampe({ level }: { level: number }) {
  return (
    <group>
      <mesh position={[-4, GROUND_Y + 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.46, 0.1, 24]} />
        <Metal color="#6B7280" roughness={0.5} />
      </mesh>
      <mesh position={[-4, GROUND_Y + 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 2.6, 16]} />
        <Metal color="#AEB6C2" roughness={0.3} />
      </mesh>
      <mesh position={[(LAMP_X - 4) / 2, GROUND_Y + 2.65, 0]} castShadow>
        <boxGeometry args={[4 + LAMP_X, 0.09, 0.09]} />
        <Metal color="#AEB6C2" roughness={0.3} />
      </mesh>
      {/* abat-jour (tronc de cône ouvert) */}
      <mesh position={[LAMP_X, LAMP_Y + 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.62, 0.52, 28, 1, true]} />
        <Metal color="#D1D5DB" roughness={0.35} />
      </mesh>
      <Bulb position={[LAMP_X, LAMP_Y, 0]} on={level > 0.02} brightness={level} />
    </group>
  );
}

export default function PhotoScene({ light, rate, maxRate, curve, points }: PhotoSceneProps) {
  const bubbles = useRef<(Mesh | null)[]>([]);
  const level = Math.max(0, Math.min(1, light / 100));

  // Dispersion déterministe des bulles (angle d'or) — pas de Math.random au rendu.
  const jitter = useMemo(
    () =>
      Array.from({ length: MAX_BUBBLES }, (_, i) => {
        const a = i * 2.399963;
        const r = 0.1 + 0.32 * ((i % 5) / 4);
        return {
          x: Math.cos(a) * r,
          z: Math.sin(a) * r,
          s: 0.032 + 0.018 * ((i % 3) / 2),
          ph: (i * 0.6180339) % 1,
        };
      }),
    [],
  );

  const visible = Math.round(Math.max(0, Math.min(1, rate / maxRate)) * MAX_BUBBLES);

  const curvePts = useMemo<Vector3Tuple[]>(
    () => curve.map(([l, b]) => [(l / 100) * GX, (b / maxRate) * GY, 0]),
    [curve, maxRate],
  );
  const dataPts = useMemo<Vector3Tuple[]>(
    () => points.map(([l, b]) => [(l / 100) * GX, (b / maxRate) * GY, 0]),
    [points, maxRate],
  );
  const plateauY = curvePts.length ? curvePts[curvePts.length - 1][1] : 0;

  return (
    <LabScene cameraPosition={[0.3, 0.6, 10]} background="#EAF7EF" minDistance={6} maxDistance={18} groundY={GROUND_Y}>
      <LabBench y={GROUND_Y} color="#E4E9DC" size={26} />

      <Lampe level={level} />

      {/* faisceau lumineux : rayons vers le bécher, d'autant plus marqués que la lampe est forte */}
      {level > 0.05 &&
        [0.45, 0.05, -0.35].map((dy, i) => (
          <PolyLine
            key={i}
            points={[
              [LAMP_X + 0.2, LAMP_Y + dy * 0.3, 0],
              [BEAKER_X - 0.85, LAMP_Y - 0.3 + dy, 0],
            ]}
            color="#F59E0B"
            width={1 + level * 3}
            dashed
          />
        ))}

      {/* Bécher d'eau + élodée */}
      <Beaker position={[BEAKER_X, -0.4, 0]} radius={1.05} height={2.2} fill={0.71} liquidColor="#8ED0F5" />
      <Elodee glow={level} />

      {/* Bulles de dioxygène qui montent du limbe jusqu'à la surface */}
      {jitter.map((b, i) => (
        <mesh
          key={i}
          visible={false}
          ref={(el) => {
            bubbles.current[i] = el;
          }}
        >
          <sphereGeometry args={[b.s, 12, 10]} />
          <meshStandardMaterial
            color="#EAF9FF"
            roughness={0.12}
            metalness={0.1}
            transparent
            opacity={0.9}
            emissive="#BAE6FD"
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime;
          const speed = 0.22 + Math.max(0, Math.min(1, rate / maxRate)) * 0.85;
          for (let i = 0; i < MAX_BUBBLES; i++) {
            const m = bubbles.current[i];
            if (!m) continue;
            const on = i < visible;
            m.visible = on;
            if (!on) continue;
            const p = (t * speed + jitter[i].ph) % 1;
            m.position.set(BEAKER_X + jitter[i].x, EMIT_Y + p * (WATER_TOP - EMIT_Y), jitter[i].z);
            m.scale.setScalar(0.6 + 0.5 * p);
          }
        }}
      />

      {/* Réactif : CO₂ dissous dans l'eau */}
      <group position={[BEAKER_X - 0.6, -1.02, 0.3]}>
        <Molecule atoms={MOLECULES.CO2.atoms} bonds={MOLECULES.CO2.bonds} scale={0.26} />
      </group>
      <Tag3D position={[BEAKER_X - 0.6, -0.72, 0.3]} label="CO₂ dissous" tone="chimie" />

      {/* Produit : O₂ libéré au-dessus de la surface */}
      <Arrow3D from={[BEAKER_X + 0.5, 0.15, 0]} to={[BEAKER_X + 0.72, 0.78, 0]} color="#0EA5E9" radius={0.028} headLength={0.2} />
      <group position={[BEAKER_X + 0.82, 1.05, 0]}>
        <Molecule atoms={MOLECULES.O2.atoms} bonds={MOLECULES.O2.bonds} scale={0.3} />
      </group>
      <Tag3D position={[BEAKER_X + 0.82, 1.4, 0]} label="O₂ libéré" tone="svt" />

      <Readout position={[BEAKER_X, 2.05, 0]} value={rate.toFixed(1)} unit="/min" caption="bulles d'O₂" />

      {/* Graphe : bulles/min = f(lumière) */}
      <group position={GRAPH_ORIGIN}>
        <group position={[GX / 2, GY / 2, -0.09]}>
          <GraphPaper width={GX + 0.8} height={GY + 0.8} step={GX / 8} z={0} color="#D6E4DA" />
        </group>
        <Arrow3D from={[-0.2, 0, 0]} to={[GX + 0.35, 0, 0]} color="#334155" radius={0.02} headLength={0.18} />
        <Arrow3D from={[0, -0.2, 0]} to={[0, GY + 0.35, 0]} color="#334155" radius={0.02} headLength={0.18} />
        <PolyLine points={[[0, plateauY, 0], [GX, plateauY, 0]]} color="#94A3B8" width={1.5} dashed />
        <PolyLine points={curvePts} color="#16A34A" width={3.5} />
        <DataPoints points={dataPts} color="#0EA5E9" size={0.075} />
        <Marker position={[(light / 100) * GX, (rate / maxRate) * GY, 0]} color="#DC2626" size={0.09} />
        <Tag3D position={[GX + 0.1, -0.4, 0]} label="lumière (%)" tone="neutral" />
        <Tag3D position={[0.25, GY + 0.6, 0]} label="bulles d'O₂ / min" tone="svt" />
        <Tag3D position={[GX - 0.45, plateauY + 0.3, 0]} label="plateau (saturation)" tone="neutral" />
      </group>

      <SceneLabel
        position={[0.4, 3.05, 0]}
        title="6 CO₂ + 6 H₂O → C₆H₁₂O₆ + 6 O₂"
        subtitle={`photosynthèse · chlorophylle · lumière ${Math.round(light)} %`}
        tone="svt"
      />
    </LabScene>
  );
}
