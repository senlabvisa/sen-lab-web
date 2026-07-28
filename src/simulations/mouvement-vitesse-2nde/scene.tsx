'use client';

import { useMemo, useRef } from 'react';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench, Segment } from '@/components/lab3d/environment';
import { Arrow3D, PolyLine, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — relativité du mouvement et vecteur vitesse (PC, Seconde).
 *
 * Un car « Ndiaga Ndiaye » roule sur une piste RECTILIGNE ou CIRCULAIRE
 * (au choix de l'élève). Son vecteur vitesse (Arrow3D) reste TANGENT à la
 * trajectoire et orienté dans le sens du mouvement : il garde une direction
 * fixe en rectiligne, mais tourne sans cesse en circulaire. Le référentiel
 * choisi (le sol / un passager) change la vitesse décrite affichée.
 * Animation via <Animate> (jamais useFrame au niveau composant).
 */

export type MobileSceneProps = {
  /** 'rectiligne' | 'circulaire' : forme de la trajectoire. */
  path: 'rectiligne' | 'circulaire';
  /** 'sol' | 'passager' : référentiel d'observation. */
  frame: 'sol' | 'passager';
  /** Vitesse du mobile en km/h. */
  speed: number;
};

const GROUND_Y = -1.5;
const R = 2.1; // rayon piste circulaire (unités scène)
const LINE_X = 3.4; // demi-longueur piste rectiligne
const ARROW_LEN = 1.15; // longueur visuelle du vecteur vitesse

export default function MobileScene({ path, frame, speed }: MobileSceneProps) {
  const bus = useRef<Group>(null);
  const vArrow = useRef<Group>(null); // group du vecteur vitesse (orienté à la frappe)

  const circular = path === 'circulaire';
  // Dans le référentiel du passager, le car est immobile (vitesse relative nulle).
  const relSpeed = frame === 'passager' ? 0 : speed;

  // Trajectoire dessinée (piste).
  const track = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    if (circular) {
      const N = 80;
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        pts.push([Math.cos(a) * R, GROUND_Y + 0.02, Math.sin(a) * R]);
      }
    } else {
      pts.push([-LINE_X, GROUND_Y + 0.02, 0], [LINE_X, GROUND_Y + 0.02, 0]);
    }
    return pts;
  }, [circular]);

  // Vitesse angulaire visuelle (proportionnelle à la vitesse, nulle si passager).
  const omega = (relSpeed / 60) * (circular ? 0.55 : 1.4);

  return (
    <LabScene cameraPosition={[0, 4.2, 6.2]} background="#E7F0FF" minDistance={4} maxDistance={13} groundY={GROUND_Y}>
      <LabBench y={GROUND_Y} color="#D7E3C8" size={26} />

      {/* Piste */}
      <PolyLine points={track} color="#1D4ED8" width={4} dashed={circular} />
      {!circular && (
        <>
          <Segment a={[-LINE_X, GROUND_Y + 0.01, -0.18]} b={[LINE_X, GROUND_Y + 0.01, -0.18]} color="#64748B" width={0.02} />
          <Segment a={[-LINE_X, GROUND_Y + 0.01, 0.18]} b={[LINE_X, GROUND_Y + 0.01, 0.18]} color="#64748B" width={0.02} />
        </>
      )}

      {/* Repère « sol » fixe (arbre baobab) — montre que le sol sert de référentiel */}
      <group position={[circular ? -R - 1.1 : -LINE_X - 0.6, GROUND_Y, circular ? 0 : -1.2]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.2, 0.7, 12]} />
          <meshStandardMaterial color="#6B4A2B" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.85, 0]} castShadow>
          <sphereGeometry args={[0.42, 18, 14]} />
          <meshStandardMaterial color="#3E8E41" roughness={0.7} />
        </mesh>
      </group>
      <Tag3D position={[circular ? -R - 1.1 : -LINE_X - 0.6, GROUND_Y + 1.5, circular ? 0 : -1.2]} label="référentiel sol" tone="svt" />

      {/* Mobile : car « Ndiaga Ndiaye » (silhouette crédible : caisse + cabine + roues) */}
      <group ref={bus}>
        <mesh position={[0, 0.32, 0]} castShadow>
          <boxGeometry args={[0.92, 0.42, 0.5]} />
          <meshStandardMaterial color="#F59E0B" roughness={0.45} metalness={0.15} />
        </mesh>
        <mesh position={[0.28, 0.66, 0]} castShadow>
          <boxGeometry args={[0.36, 0.3, 0.46]} />
          <meshStandardMaterial color="#1E3A8A" roughness={0.4} />
        </mesh>
        {/* roues */}
        {([[-0.3, 0.22], [0.3, 0.22]] as const).map(([x], i) => (
          <group key={i}>
            <mesh position={[x, 0.1, 0.26]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.13, 0.13, 0.08, 16]} />
              <meshStandardMaterial color="#111827" roughness={0.6} />
            </mesh>
            <mesh position={[x, 0.1, -0.26]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.13, 0.13, 0.08, 16]} />
              <meshStandardMaterial color="#111827" roughness={0.6} />
            </mesh>
          </group>
        ))}
        {/* passager (point de vue du référentiel mobile) */}
        <Marker position={[0.28, 0.66, 0]} color="#DC2626" size={0.07} />
      </group>

      {/* Vecteur vitesse : Arrow3D pointant +X localement, le group est orienté à la tangente */}
      <group ref={vArrow}>
        {relSpeed > 0 ? (
          <Arrow3D from={[0, 0, 0]} to={[ARROW_LEN, 0, 0]} color="#DC2626" radius={0.05} headLength={0.3} />
        ) : (
          <Marker position={[0, 0, 0]} color="#DC2626" size={0.12} />
        )}
      </group>
      <Tag3D position={[0, GROUND_Y + 2.6, 0]} label={relSpeed > 0 ? 'v⃗ (tangent à la trajectoire)' : 'v⃗ = 0⃗ (car immobile / passager)'} tone="physique" />

      {/* Animation : place le car et oriente le vecteur vitesse tangentiellement */}
      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime;
          if (circular) {
            const a = relSpeed > 0 ? t * omega : Math.PI * 0.15; // immobile si passager
            const x = Math.cos(a) * R;
            const z = Math.sin(a) * R;
            bus.current?.position.set(x, GROUND_Y, z);
            // le car regarde dans le sens du mouvement (tangente = a + 90°)
            bus.current?.rotation.set(0, -a - Math.PI / 2, 0);
            // vecteur vitesse : tangent, donc même orientation que la caisse
            vArrow.current?.position.set(x, GROUND_Y + 0.9, z);
            vArrow.current?.rotation.set(0, -a - Math.PI / 2, 0);
          } else {
            let x: number;
            if (relSpeed > 0) {
              const span = LINE_X * 2;
              x = ((((t * omega) % span) + span) % span) - LINE_X;
            } else {
              x = 0; // immobile dans le référentiel passager
            }
            bus.current?.position.set(x, GROUND_Y, 0);
            bus.current?.rotation.set(0, 0, 0);
            vArrow.current?.position.set(x, GROUND_Y + 0.9, 0);
            vArrow.current?.rotation.set(0, 0, 0); // direction constante (rectiligne uniforme)
          }
        }}
      />

      <SceneLabel
        position={[0, GROUND_Y + 3.5, 0]}
        title={`${circular ? 'Mouvement circulaire' : 'Mouvement rectiligne'} · réf. ${frame === 'sol' ? 'sol' : 'passager'}`}
        subtitle={circular ? 'la direction de v⃗ change sans cesse' : 'v⃗ garde une direction fixe'}
        tone="physique"
      />
      <Readout position={[circular ? R + 1.4 : LINE_X + 0.5, GROUND_Y + 1.7, 0]} value={relSpeed} unit="km/h" caption={`vitesse / réf. ${frame === 'sol' ? 'sol' : 'passager'}`} />
    </LabScene>
  );
}
