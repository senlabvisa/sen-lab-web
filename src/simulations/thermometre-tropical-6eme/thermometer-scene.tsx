'use client';

import { useMemo, useRef } from 'react';
import { DoubleSide, type Group, type Mesh } from 'three';
import {
  Animate,
  Glass,
  LabBench,
  LabScene,
  Liquid,
  Readout,
  SceneLabel,
  Tag3D,
} from '@/components/lab3d';

/**
 * Scène 3D — thermomètre à liquide plongé dans un milieu (6ème, mesure).
 *
 * Thermomètre de laboratoire réel : réservoir (bulbe), colonne d'alcool
 * coloré qui se dilate, échelle graduée de −10 °C à 60 °C. La colonne
 * rejoint la valeur cible avec une inertie thermique (lerp) : l'élève voit
 * qu'il faut attendre la stabilisation avant de lire.
 *
 * Milieux : glace pilée fondante (bécher), eau du canari (jarre en terre
 * cuite), air à l'ombre, sable en plein soleil.
 *
 * Doit être chargé via next/dynamic({ ssr: false }).
 */

export type MilieuKind = 'glace' | 'canari' | 'ombre' | 'sable';

export type ThermometerSceneProps = {
  /** Température du milieu en °C (valeur cible de la colonne). */
  temperature: number;
  /** Nom affiché du milieu mesuré. */
  milieuLabel: string;
  milieuKind: MilieuKind;
};

const T_MIN = -10;
const T_MAX = 60;
const COL_BOTTOM = -1.15;
const COL_TOP = 1.55;
const BENCH_Y = -1.8;

const LABELLED = [-10, 0, 10, 20, 30, 40, 50, 60];
const MINOR = Array.from({ length: 15 }, (_, i) => T_MIN + i * 5);
const ICE = [
  [-0.22, 0.16, 0.2],
  [0.24, 0.2, -0.14],
  [0.02, 0.3, 0.26],
  [-0.28, 0.28, -0.2],
] as const;

const BG: Record<MilieuKind, string> = {
  glace: '#E6F1FF',
  canari: '#EAF6FF',
  ombre: '#FDF3D8',
  sable: '#FFE7C4',
};

function tempToY(t: number): number {
  const r = (Math.min(T_MAX, Math.max(T_MIN, t)) - T_MIN) / (T_MAX - T_MIN);
  return COL_BOTTOM + r * (COL_TOP - COL_BOTTOM);
}

export default function ThermometerScene({ temperature, milieuLabel, milieuKind }: ThermometerSceneProps) {
  const column = useRef<Mesh>(null);
  const ice = useRef<Group>(null);
  const sun = useRef<Mesh>(null);
  const shown = useRef(temperature);

  const inLiquid = milieuKind === 'glace' || milieuKind === 'canari';
  const kelvin = useMemo(() => (temperature + 273.15).toFixed(1), [temperature]);

  return (
    <LabScene
      cameraPosition={[0.6, 0.9, 6.1]}
      background={BG[milieuKind]}
      minDistance={3.5}
      maxDistance={12}
      groundY={BENCH_Y}
    >
      <LabBench y={BENCH_Y} color="#E7DCC6" size={24} />

      {/* ── Milieu liquide : bécher de glace pilée / jarre (canari) ── */}
      {inLiquid && milieuKind === 'glace' && (
        <group position={[0, BENCH_Y, 0]}>
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.56, 0.56, 1.1, 36, 1, true]} />
            <Glass tint="#EAF2FF" thickness={0.2} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.56, 0.56, 0.04, 36]} />
            <Glass tint="#EAF2FF" thickness={0.2} />
          </mesh>
          <mesh position={[0, 0.38, 0]}>
            <cylinderGeometry args={[0.52, 0.52, 0.72, 36]} />
            <Liquid color="#BFDBFE" opacity={0.62} />
          </mesh>
          <group ref={ice}>
            {ICE.map((p, i) => (
              <mesh key={i} position={[p[0], p[1] + 0.42, p[2]]} rotation={[0.4 * i, 0.7 * i, 0.2 * i]} castShadow>
                <boxGeometry args={[0.19, 0.16, 0.18]} />
                <meshStandardMaterial color="#F1F8FF" roughness={0.25} metalness={0.05} transparent opacity={0.92} />
              </mesh>
            ))}
          </group>
        </group>
      )}

      {inLiquid && milieuKind === 'canari' && (
        <group position={[0, BENCH_Y, 0]}>
          {/* jarre en terre cuite, ouverte au sommet (demi-sphère tronquée) */}
          <mesh position={[0, 0.66, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.68, 32, 22, 0, Math.PI * 2, 0.62, Math.PI - 0.62]} />
            <meshStandardMaterial color="#B4652A" roughness={0.95} metalness={0.02} side={DoubleSide} />
          </mesh>
          <mesh position={[0, 1.06, 0]}>
            <torusGeometry args={[0.4, 0.045, 12, 32]} />
            <meshStandardMaterial color="#9A5423" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <cylinderGeometry args={[0.44, 0.44, 0.02, 32]} />
            <Liquid color="#7DD3FC" opacity={0.72} />
          </mesh>
        </group>
      )}

      {/* ── Milieu « air » : sol de sable + soleil (ou ombre) ── */}
      {!inLiquid && (
        <group position={[0, BENCH_Y, 0]}>
          <mesh position={[0, 0.09, 0]} receiveShadow>
            <cylinderGeometry args={[1.5, 1.7, 0.18, 40]} />
            <meshStandardMaterial color={milieuKind === 'sable' ? '#EBC375' : '#D8CBA8'} roughness={1} />
          </mesh>
          <mesh ref={sun} position={[2.4, 3.1, -1.6]}>
            <sphereGeometry args={[0.36, 24, 18]} />
            <meshStandardMaterial
              color={milieuKind === 'sable' ? '#FDE68A' : '#FCD9A0'}
              emissive={milieuKind === 'sable' ? '#F59E0B' : '#C2A46A'}
              emissiveIntensity={milieuKind === 'sable' ? 1.6 : 0.35}
            />
          </mesh>
          <Tag3D
            position={[2.4, 2.5, -1.6]}
            label={milieuKind === 'sable' ? 'Plein soleil' : 'Ciel voilé · ombre'}
            tone="physique"
          />
        </group>
      )}

      {/* ── Thermomètre : réservoir + colonne dilatable + tube de verre ── */}
      <mesh position={[0, COL_BOTTOM - 0.24, 0]} castShadow>
        <sphereGeometry args={[0.23, 28, 20]} />
        <meshStandardMaterial color="#DC2626" roughness={0.25} emissive="#7F1D1D" emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={column}>
        <cylinderGeometry args={[0.055, 0.055, 1, 20]} />
        <meshStandardMaterial color="#DC2626" roughness={0.22} emissive="#991B1B" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, (COL_TOP + COL_BOTTOM) / 2 + 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.13, COL_TOP - COL_BOTTOM + 0.5, 30]} />
        <Glass tint="#EDF4FF" thickness={0.22} />
      </mesh>

      {/* Échelle graduée en degrés Celsius */}
      {MINOR.map((t) => (
        <mesh key={`m${t}`} position={[0.19, tempToY(t), 0]}>
          <boxGeometry args={[0.09, 0.012, 0.012]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      ))}
      {LABELLED.map((t) => (
        <group key={`g${t}`}>
          <mesh position={[0.22, tempToY(t), 0]}>
            <boxGeometry args={[0.16, 0.018, 0.018]} />
            <meshStandardMaterial color="#0F172A" />
          </mesh>
          <Tag3D position={[0.52, tempToY(t), 0]} label={`${t}`} tone="neutral" distanceFactor={12} />
        </group>
      ))}

      {/* Repère de lecture : à hauteur des yeux, au sommet de la colonne */}
      <Tag3D position={[-0.62, tempToY(temperature), 0]} label={`${temperature.toFixed(1)} °C`} tone="physique" />

      <SceneLabel
        position={[-2.3, 1.9, 0]}
        title={milieuLabel}
        subtitle="milieu mesuré"
        tone="physique"
      />
      <Readout position={[2.3, 0.5, 0]} value={kelvin} unit="K" caption="T = θ + 273,15" />

      <Animate
        fn={(state, delta) => {
          // inertie thermique : la colonne rejoint la cible en ~1 s
          shown.current += (temperature - shown.current) * Math.min(1, delta * 2.4);
          const h = Math.max(0.02, tempToY(shown.current) - COL_BOTTOM);
          if (column.current) {
            column.current.scale.y = h;
            column.current.position.y = COL_BOTTOM + h / 2;
          }
          if (ice.current) ice.current.position.y = Math.sin(state.clock.elapsedTime * 1.6) * 0.025;
          if (sun.current) sun.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2.2) * 0.04);
        }}
      />
    </LabScene>
  );
}
