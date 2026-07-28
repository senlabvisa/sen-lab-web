'use client';

import { useMemo, useRef } from 'react';
import { DoubleSide, Group, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench } from '@/components/lab3d/environment';
import { PolyLine } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — l'œuf de poule en couveuse, ouvert en coupe (SVT, 6ème).
 *
 * On ne dessine pas un « bonhomme-poule » : on recadre sur l'objet d'étude,
 * l'œuf couvé, ouvert en demi-coquille pour voir l'intérieur. Le jour
 * d'incubation (0 → 21) pilote : la taille de la chambre à air, le volume du
 * jaune (réserve consommée), l'apparition des vaisseaux sanguins (j3), des
 * bourgeons d'ailes et de pattes (j6), du bec (j9), du duvet jaune (j14), puis
 * la fêlure de la coquille à l'éclosion (j21). Données conformes au
 * développement réel de l'embryon de poule.
 */

export type IncubationSceneProps = {
  /** Jour d'incubation, 0 → 21. */
  day: number;
  /** Longueur de l'embryon en mm (calculée par le module). */
  sizeMm: number;
  /** Libellé du stade en cours (affiché sous le titre). */
  stage: string;
};

const GROUND_Y = -1.45;
const EGG_RX = 0.8; // demi-largeur de l'œuf (unités scène)
const EGG_RY = 1.06; // demi-hauteur
const YOLK: Vector3Tuple = [0, -0.2, -0.05];

export default function IncubationScene({ day, sizeMm, stage }: IncubationSceneProps) {
  const egg = useRef<Group>(null);
  const embryo = useRef<Group>(null);

  const t = Math.min(1, Math.max(0, day / 21));
  const hatched = day >= 21;
  const yolkR = 0.55 - 0.42 * Math.pow(t, 1.3); // la réserve est consommée
  const airR = 0.17 + 0.22 * t; // la chambre à air grossit
  const embryoScale = 0.1 + 0.9 * (sizeMm / 80);
  const downy = day >= 14; // duvet jaune
  const skin = downy ? '#FBBF24' : '#F3B8AE';

  // Vaisseaux sanguins rayonnant sur le vitellus (visibles dès le 3e jour)
  const vessels = useMemo(() => {
    const out: Vector3Tuple[][] = [];
    const r = yolkR * 1.04;
    for (const az0 of [-0.8, -0.05, 0.75]) {
      const pts: Vector3Tuple[] = [];
      for (let i = 0; i <= 26; i++) {
        const u = i / 26;
        const lat = -1.05 + u * 2.1;
        const az = az0 + 0.5 * Math.sin(u * 3.4);
        pts.push([
          YOLK[0] + r * Math.cos(lat) * Math.sin(az),
          YOLK[1] + r * Math.sin(lat),
          YOLK[2] + r * Math.cos(lat) * Math.cos(az),
        ]);
      }
      out.push(pts);
    }
    return out;
  }, [yolkR]);

  // Fêlure en zigzag sur la coquille au moment de l'éclosion
  const crack = useMemo<Vector3Tuple[]>(() => {
    const pts: Vector3Tuple[] = [];
    for (let k = 0; k <= 12; k++) {
      const y = 0.18 + (k % 2 === 0 ? 0.11 : -0.11);
      const rr = EGG_RX * Math.sqrt(Math.max(0.05, 1 - (y / EGG_RY) ** 2)) * 0.97;
      const u = Math.PI + (k / 12) * Math.PI;
      pts.push([rr * Math.cos(u), y, rr * Math.sin(u)]);
    }
    return pts;
  }, []);

  return (
    <LabScene cameraPosition={[0, 0.5, 4.6]} background="#FFF3E0" minDistance={3} maxDistance={9} groundY={GROUND_Y}>
      <LabBench y={GROUND_Y} color="#E3D3B4" size={20} />

      {/* Lampe de la couveuse : chaleur constante à 37,8 °C */}
      <mesh position={[0, 2.15, 0.3]}>
        <sphereGeometry args={[0.17, 20, 16]} />
        <meshStandardMaterial color="#FFE9B0" emissive="#F59E0B" emissiveIntensity={1.6} />
      </mesh>
      <pointLight position={[0, 2.05, 0.35]} intensity={6} color="#FFCC80" distance={9} decay={2} />

      {/* Nid de paille */}
      <mesh position={[0, GROUND_Y + 0.32, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <torusGeometry args={[0.95, 0.3, 12, 30]} />
        <meshStandardMaterial color="#C9A257" roughness={0.95} />
      </mesh>

      <group ref={egg} position={[0, 0.02, 0]}>
        {/* Demi-coquille arrière : l'avant est retiré pour voir l'intérieur */}
        <mesh scale={[EGG_RX, EGG_RY, EGG_RX]} castShadow>
          <sphereGeometry args={[1, 48, 34, Math.PI, Math.PI]} />
          <meshStandardMaterial color="#F3E2C6" roughness={0.85} side={DoubleSide} />
        </mesh>

        {/* Blanc de l'œuf (albumen) — se réduit au fil de l'incubation */}
        <mesh scale={[EGG_RX * 0.9, EGG_RY * 0.9, EGG_RX * 0.9]}>
          <sphereGeometry args={[1, 32, 24]} />
          <meshStandardMaterial color="#F8FAFC" transparent opacity={0.3 * (1 - 0.75 * t)} roughness={0.15} />
        </mesh>

        {/* Chambre à air (au gros bout, en haut) */}
        <mesh position={[0, EGG_RY - airR * 0.55, 0]} scale={[1, 0.42, 1]}>
          <sphereGeometry args={[airR, 24, 18]} />
          <meshStandardMaterial color="#E2E8F0" transparent opacity={0.45} roughness={0.2} />
        </mesh>

        {/* Vitellus : la réserve de nourriture de l'embryon */}
        <mesh position={YOLK}>
          <sphereGeometry args={[yolkR, 28, 22]} />
          <meshStandardMaterial color="#F6A623" roughness={0.45} emissive="#B45309" emissiveIntensity={0.18} />
        </mesh>
        {day >= 3 && vessels.map((v, i) => <PolyLine key={i} points={v} color="#DC2626" width={2} />)}

        {/* Embryon : tête volumineuse, corps recourbé, œil énorme (réel) */}
        {day >= 2 && (
          <group ref={embryo} position={[0.12, 0.28, 0.3]} scale={embryoScale}>
            <mesh position={[0.2, 0.16, 0]} castShadow>
              <sphereGeometry args={[0.3, 22, 18]} />
              <meshStandardMaterial color={skin} roughness={0.55} />
            </mesh>
            <mesh position={[0.32, 0.19, 0.15]}>
              <sphereGeometry args={[0.115, 16, 12]} />
              <meshStandardMaterial color="#1F2937" roughness={0.25} />
            </mesh>
            <mesh position={[0, 0, 0]} scale={[1, 0.92, 0.9]} castShadow>
              <sphereGeometry args={[0.27, 20, 16]} />
              <meshStandardMaterial color={skin} roughness={0.55} />
            </mesh>
            <mesh position={[-0.24, -0.18, 0]} castShadow>
              <sphereGeometry args={[0.21, 18, 14]} />
              <meshStandardMaterial color={skin} roughness={0.55} />
            </mesh>
            <mesh position={[-0.36, -0.44, 0]}>
              <sphereGeometry args={[0.15, 16, 12]} />
              <meshStandardMaterial color={skin} roughness={0.55} />
            </mesh>
            <mesh position={[-0.27, -0.63, 0]}>
              <sphereGeometry args={[0.1, 14, 10]} />
              <meshStandardMaterial color={skin} roughness={0.55} />
            </mesh>
            {day >= 6 && (
              <>
                {/* bourgeon d'aile */}
                <mesh position={[-0.06, 0.08, 0.18]} scale={[1.5, 0.45, 0.9]}>
                  <sphereGeometry args={[0.14, 14, 10]} />
                  <meshStandardMaterial color={skin} roughness={0.6} />
                </mesh>
                {/* bourgeon de patte */}
                <mesh position={[-0.26, -0.32, 0.16]} scale={[0.55, 1.5, 0.6]}>
                  <sphereGeometry args={[0.12, 14, 10]} />
                  <meshStandardMaterial color={downy ? '#EA8C1F' : skin} roughness={0.6} />
                </mesh>
              </>
            )}
            {day >= 9 && (
              <mesh position={[0.46, 0.12, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <coneGeometry args={[0.07, 0.17, 10]} />
                <meshStandardMaterial color="#EA580C" roughness={0.5} />
              </mesh>
            )}
          </group>
        )}

        {hatched && <PolyLine points={crack} color="#92400E" width={4} />}
      </group>

      {/* Battement du cœur (dès j2) puis balancement de l'œuf à l'éclosion */}
      <Animate
        fn={(state) => {
          const time = state.clock.elapsedTime;
          if (embryo.current) {
            embryo.current.scale.setScalar(embryoScale * (1 + 0.035 * Math.sin(time * 6.5)));
          }
          if (egg.current) {
            egg.current.rotation.z = hatched ? Math.sin(time * 5) * 0.06 : 0;
          }
        }}
      />

      <SceneLabel position={[0, 1.95, 0]} title={`Jour ${day} / 21`} subtitle={stage} tone="svt" />
      <Tag3D position={[-1.35, 0.65, 0]} label="Coquille" tone="neutral" />
      <Tag3D position={[0, 1.35, 0.4]} label="Chambre à air" tone="maths" />
      <Tag3D position={[-1.05, -0.55, 0.35]} label="Jaune (réserve)" tone="svt" />
      {day >= 2 && <Tag3D position={[1.2, 0.55, 0.4]} label={hatched ? 'Poussin — le cycle repart' : 'Embryon'} tone="physique" />}
      <Readout position={[1.75, -0.5, 0]} value={sizeMm.toFixed(0)} unit="mm" caption="taille embryon" />
    </LabScene>
  );
}
