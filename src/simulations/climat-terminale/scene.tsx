'use client';

import { useMemo, useRef } from 'react';
import type { Group, Mesh, Vector3Tuple } from 'three';
import {
  Animate,
  Arrow3D,
  GraphPaper,
  LabScene,
  Molecule,
  MOLECULES,
  PolyLine,
  Marker,
  Readout,
  SceneLabel,
  Tag3D,
} from '@/components/lab3d';
import { budget, OBSERVED, PROJECTED, yearForCo2 } from './physics';

/**
 * Scène 3D — bilan radiatif de la Terre et effet de serre (SVT, Terminale).
 *
 * À gauche : une coupe verticale « sol → atmosphère → espace ». Les flèches
 * <Arrow3D> sont de VRAIS flux d'énergie, leur épaisseur est proportionnelle
 * au nombre de W·m⁻² : solaire incident, part réfléchie (albédo), infrarouge
 * émis par le sol, infrarouge qui s'échappe, contre-rayonnement renvoyé vers
 * le sol. La couche atmosphérique s'opacifie quand l'élève ajoute du CO₂, et
 * des molécules de CO₂ (<Molecule> MOLECULES.CO2) y flottent.
 *
 * À droite : les courbes réelles du CO₂ et de la température (<PolyLine>),
 * trait plein jusqu'à 2024, pointillé pour le scénario à fortes émissions.
 * Un <Marker> montre où se place le réglage de l'élève.
 */

export type ClimatSceneProps = { co2: number; albedo: number };

const GROUND_Y = -1.55; // haut du sol
const TOA_Y = 1.35; // sommet de l'atmosphère
const SPACE_Y = 2.55;

/** Rayon de flèche proportionnel au flux (W·m⁻²). */
const rad = (flux: number) => 0.016 + (Math.min(flux, 450) / 450) * 0.062;

/** Molécules de CO₂ : positions déterministes dans la couche atmosphérique. */
const SLOTS = Array.from({ length: 9 }, (_, i) => ({
  pos: [-1.75 + ((i * 7) % 9) * 0.42, -0.85 + ((i * 5) % 7) * 0.34, -0.55 + ((i * 3) % 5) * 0.32] as Vector3Tuple,
  spin: 0.25 + (i % 4) * 0.16,
  phase: i * 0.73,
}));

// Repère du graphe de droite
const GX = (year: number) => ((year - 1850) / 250) * 3.5 - 1.75;
const GY_CO2 = (ppm: number) => ((ppm - 270) / 550) * 2.8 - 1.3;
const GY_T = (dT: number) => ((dT + 0.3) / 5) * 2.8 - 1.3;

const CURVE_CO2_OBS = OBSERVED.map((p) => [GX(p.year), GY_CO2(p.co2), 0] as Vector3Tuple);
const CURVE_CO2_PROJ = PROJECTED.map((p) => [GX(p.year), GY_CO2(p.co2), 0] as Vector3Tuple);
const CURVE_T_OBS = OBSERVED.map((p) => [GX(p.year), GY_T(p.dT), 0.05] as Vector3Tuple);
const CURVE_T_PROJ = PROJECTED.map((p) => [GX(p.year), GY_T(p.dT), 0.05] as Vector3Tuple);

export default function ClimatScene({ co2, albedo }: ClimatSceneProps) {
  const b = useMemo(() => budget(co2, albedo), [co2, albedo]);

  const molecules = useRef<Array<Group | null>>([]);
  const photon = useRef<Mesh>(null);
  const irPacket = useRef<Mesh>(null);

  // Densité visible de CO₂ : 3 molécules à 280 ppm, 9 à 800 ppm.
  const nMol = Math.max(3, Math.min(9, 3 + Math.round(((co2 - 280) / 520) * 6)));
  const haze = 0.08 + b.eps * 0.42; // opacité de la couche (lisible à l'écran)
  const yearNow = yearForCo2(co2);
  const hot = b.tsC > 16.5;

  return (
    <LabScene cameraPosition={[0.4, 0.3, 10.4]} background="#0A1626" minDistance={6} maxDistance={17} groundY={null}>
      {/* ────────── Panneau gauche : bilan radiatif ────────── */}
      <group position={[-2.6, 0, 0]}>
        {/* Océan puis terre émergée (Sénégal en coupe) */}
        <mesh position={[-1.05, GROUND_Y - 0.28, 0]} receiveShadow>
          <boxGeometry args={[2.1, 0.56, 2.4]} />
          <meshStandardMaterial color="#0E6E8C" roughness={0.25} metalness={0.15} />
        </mesh>
        <mesh position={[1.05, GROUND_Y - 0.24, 0]} receiveShadow>
          <boxGeometry args={[2.1, 0.64, 2.4]} />
          <meshStandardMaterial color={hot ? '#B4763C' : '#8C7A4A'} roughness={0.95} />
        </mesh>
        {/* Bande de végétation (Grande Muraille Verte) */}
        <mesh position={[1.05, GROUND_Y + 0.04, 0.7]}>
          <boxGeometry args={[2.05, 0.09, 0.5]} />
          <meshStandardMaterial color="#2F7D3A" roughness={0.9} />
        </mesh>

        {/* Couche atmosphérique : opaque à l'IR quand le CO₂ monte */}
        <mesh position={[0, (GROUND_Y + TOA_Y) / 2 + 0.1, 0]}>
          <boxGeometry args={[4.3, TOA_Y - GROUND_Y - 0.2, 2.3]} />
          <meshStandardMaterial
            color={hot ? '#F87171' : '#7DD3FC'}
            transparent
            opacity={haze}
            depthWrite={false}
            emissive={hot ? '#DC2626' : '#0EA5E9'}
            emissiveIntensity={0.12 + b.eps * 0.2}
          />
        </mesh>
        {/* Sommet de l'atmosphère */}
        <PolyLine
          points={[
            [-2.15, TOA_Y, 0],
            [2.15, TOA_Y, 0],
          ]}
          color="#64748B"
          width={1.5}
          dashed
        />

        {/* Molécules de CO₂ piégeant l'infrarouge */}
        {SLOTS.slice(0, nMol).map((s, i) => (
          <group
            key={`co2-${i}`}
            position={s.pos}
            ref={(el) => {
              molecules.current[i] = el;
            }}
          >
            <Molecule atoms={MOLECULES.CO2.atoms} bonds={MOLECULES.CO2.bonds} scale={0.2} />
          </group>
        ))}

        {/* Soleil */}
        <mesh position={[-1.95, SPACE_Y + 0.15, -0.4]}>
          <sphereGeometry args={[0.34, 24, 18]} />
          <meshStandardMaterial color="#FDE68A" emissive="#FBBF24" emissiveIntensity={1.4} />
        </mesh>

        {/* 1 — rayonnement solaire incident (visible) */}
        <Arrow3D from={[-1.75, SPACE_Y, 0.5]} to={[-0.95, GROUND_Y + 0.04, 0.5]} color="#FACC15" radius={rad(b.incoming)} headLength={0.3} />
        {/* 2 — part réfléchie vers l'espace (albédo : nuages, sable, océan) */}
        <Arrow3D from={[-0.8, GROUND_Y + 0.06, 0.5]} to={[-0.1, SPACE_Y, 0.5]} color="#BAE6FD" radius={rad(b.reflected)} headLength={0.28} />
        {/* 3 — infrarouge émis par le sol chauffé */}
        <Arrow3D from={[0.62, GROUND_Y + 0.06, 0.3]} to={[0.62, TOA_Y - 0.15, 0.3]} color="#FB923C" radius={rad(b.surfEmit)} headLength={0.26} />
        {/* 4 — infrarouge qui parvient à s'échapper vers l'espace */}
        <Arrow3D from={[0.62, TOA_Y + 0.12, 0.3]} to={[0.62, SPACE_Y, 0.3]} color="#FDBA74" radius={rad(b.absorbed)} headLength={0.26} />
        {/* 5 — contre-rayonnement : l'atmosphère renvoie l'IR vers le sol */}
        <Arrow3D from={[1.62, TOA_Y - 0.2, 0.3]} to={[1.62, GROUND_Y + 0.06, 0.3]} color="#EF4444" radius={rad(b.back)} headLength={0.26} />

        {/* Photon solaire + paquet d'IR piégé */}
        <mesh ref={photon}>
          <sphereGeometry args={[0.075, 14, 12]} />
          <meshStandardMaterial color="#FEF3C7" emissive="#FACC15" emissiveIntensity={1.2} />
        </mesh>
        <mesh ref={irPacket}>
          <sphereGeometry args={[0.075, 14, 12]} />
          <meshStandardMaterial color="#FECACA" emissive="#EF4444" emissiveIntensity={1.1} />
        </mesh>

        <Tag3D position={[-1.95, SPACE_Y - 0.55, 0.5]} label={`Soleil ${b.incoming.toFixed(0)} W/m²`} tone="physique" />
        <Tag3D position={[-0.02, SPACE_Y - 0.5, 0.5]} label={`Réfléchi ${b.reflected.toFixed(0)} W/m²`} tone="neutral" />
        <Tag3D position={[-0.35, GROUND_Y + 0.55, 0.3]} label={`IR du sol ${b.surfEmit.toFixed(0)} W/m²`} tone="svt" />
        <Tag3D position={[0.62, SPACE_Y - 0.32, 0.3]} label={`Fuite IR ${b.absorbed.toFixed(0)} W/m²`} tone="neutral" />
        <Tag3D position={[1.72, GROUND_Y + 0.62, 0.3]} label={`Renvoyé au sol ${b.back.toFixed(0)} W/m²`} tone="svt" />
        <Tag3D position={[-1.15, GROUND_Y - 0.72, 1.2]} label="Océan · Langue de Barbarie" tone="physique" />
        <Tag3D position={[1.2, GROUND_Y - 0.72, 1.2]} label="Ferlo · Muraille Verte" tone="svt" />

        <Readout position={[0.1, GROUND_Y + 1.05, 1.3]} value={b.tsC.toFixed(1)} unit="°C" caption="T d'équilibre au sol" />
        <Readout position={[-1.55, GROUND_Y + 1.05, 1.3]} value={b.teffC.toFixed(1)} unit="°C" caption="sans effet de serre" />
      </group>

      {/* ────────── Panneau droit : courbes CO₂ et température ────────── */}
      <group position={[3.15, 0.05, 0]}>
        <group position={[0.05, 0.1, -0.25]}>
          <GraphPaper width={3.9} height={3.1} step={0.39} color="#1E3A5F" />
        </group>
        <Arrow3D from={[-1.9, -1.35, 0]} to={[2.0, -1.35, 0]} color="#94A3B8" radius={0.015} headLength={0.18} />
        <Arrow3D from={[-1.85, -1.45, 0]} to={[-1.85, 1.75, 0]} color="#94A3B8" radius={0.015} headLength={0.18} />

        {/* CO₂ mesuré puis projeté */}
        <PolyLine points={CURVE_CO2_OBS} color="#38BDF8" width={3.2} />
        <PolyLine points={CURVE_CO2_PROJ} color="#38BDF8" width={2.4} dashed />
        {/* Anomalie de température mesurée puis projetée */}
        <PolyLine points={CURVE_T_OBS} color="#F87171" width={3.2} />
        <PolyLine points={CURVE_T_PROJ} color="#F87171" width={2.4} dashed />

        {/* Niveau de référence préindustriel */}
        <PolyLine
          points={[
            [-1.85, GY_CO2(280), 0],
            [1.85, GY_CO2(280), 0],
          ]}
          color="#475569"
          width={1.2}
          dashed
        />

        {/* Où se situe le réglage de l'élève */}
        <PolyLine
          points={[
            [-1.85, GY_CO2(co2), 0.1],
            [1.85, GY_CO2(co2), 0.1],
          ]}
          color="#FDE047"
          width={1.6}
          dashed
        />
        <Marker position={[GX(yearNow), GY_CO2(co2), 0.12]} color="#FDE047" size={0.1} />

        <Tag3D position={[-1.55, -1.62, 0]} label="1850" tone="neutral" />
        <Tag3D position={[GX(2024), -1.62, 0]} label="2024" tone="neutral" />
        <Tag3D position={[1.75, -1.62, 0]} label="2100" tone="neutral" />
        <Tag3D position={[-1.0, 1.55, 0]} label="CO₂ (ppm)" tone="physique" />
        <Tag3D position={[1.05, 1.55, 0]} label="ΔT (°C)" tone="svt" />
        <Tag3D position={[GX(yearNow), GY_CO2(co2) + 0.36, 0.12]} label={`≈ ${yearNow}`} tone="maths" />
        <Tag3D position={[0.95, GY_CO2(280) + 0.2, 0]} label="280 ppm — ère préindustrielle" tone="neutral" />
      </group>

      <SceneLabel
        position={[-2.6, SPACE_Y + 0.95, 0]}
        title={`[CO₂] = ${co2} ppm · albédo = ${(albedo * 100).toFixed(0)} %`}
        subtitle={`Effet de serre : +${b.greenhouse.toFixed(1)} °C · forçage ${b.forcing >= 0 ? '+' : ''}${b.forcing.toFixed(2)} W/m²`}
        tone={hot ? 'physique' : 'svt'}
      />

      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime;
          molecules.current.forEach((g, i) => {
            if (!g) return;
            const s = SLOTS[i];
            g.rotation.y = t * s.spin;
            g.rotation.z = Math.sin(t * 0.6 + s.phase) * 0.4;
            g.position.y = s.pos[1] + Math.sin(t * 0.8 + s.phase) * 0.12;
          });
          // Photon solaire : descend du Soleil jusqu'au sol, en boucle.
          const p = (t * 0.42) % 1;
          photon.current?.position.set(-1.75 + p * 0.8, SPACE_Y - p * (SPACE_Y - GROUND_Y - 0.04), 0.5);
          // Paquet d'IR : monte, puis est renvoyé vers le sol par la couche.
          const q = (t * 0.34) % 1;
          const climb = TOA_Y - 0.2 - GROUND_Y;
          if (q < 0.5) {
            irPacket.current?.position.set(1.1, GROUND_Y + (q / 0.5) * climb, 0.3);
          } else {
            irPacket.current?.position.set(1.1, GROUND_Y + (1 - (q - 0.5) / 0.5) * climb, 0.3);
          }
        }}
      />
    </LabScene>
  );
}
