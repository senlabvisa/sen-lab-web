'use client';

import { useMemo, useRef } from 'react';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench } from '@/components/lab3d/environment';
import { PolyLine, Marker, Axes2D, Arrow3D } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — cinématique (mouvement & vitesse, 3ème).
 *
 * Un car rapide sénégalais (carrosserie + cabine + roues, quelques
 * primitives) roule à vitesse constante sur la route Dakar–Thiès. Des
 * jalons (Marker) marquent sa position toutes les 2 s : à vitesse
 * constante ils sont équidistants (mouvement uniforme). Un petit graphe
 * position–temps d(t) trace une droite. v = d/t affiché via Readout.
 * Animé avec <Animate> (jamais useFrame au niveau composant).
 */

export type MotionSceneProps = { speed: number; running: boolean };

const ROAD_LEN = 9; // longueur visible de la route (unités scène)
const X0 = -ROAD_LEN / 2 + 0.4; // départ (Dakar, à gauche)
const X1 = ROAD_LEN / 2 - 0.4; // arrivée (Thiès, à droite)
const ROAD_Y = -1.5;
const VIS = 0.45; // m/s réels → unités/s à l'écran (lisible)

export default function MotionScene({ speed, running }: MotionSceneProps) {
  const car = useRef<Group>(null);
  const t0 = useRef(0);

  // Jalons équidistants : positions du car à intervalles de temps égaux.
  // À vitesse constante, Δx est constant → marqueurs équidistants.
  const markers = useMemo<[number, number, number][]>(() => {
    const n = 4;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= n; i++) pts.push([X0 + ((X1 - X0) * i) / n, ROAD_Y + 0.02, 0]);
    return pts;
  }, []);

  // Graphe position–temps d(t) = v·t → droite (mouvement uniforme).
  const graph = useMemo(() => {
    const gx = 2.7; // origine X du repère (à droite)
    const gy = -0.2; // origine Y du repère
    const w = 1.8; // largeur (axe temps)
    const h = 1.8; // hauteur (axe distance)
    const line: [number, number, number][] = [
      [gx, gy, 0],
      [gx + w, gy + h, 0],
    ];
    return { gx, gy, w, h, line };
  }, []);

  return (
    <LabScene cameraPosition={[0, 1.4, 6.6]} background="#FFF4E0" minDistance={4} maxDistance={11} groundY={ROAD_Y}>
      <LabBench y={ROAD_Y} color="#D9C9A3" size={24} />

      {/* Route bitumée Dakar → Thiès, avec bande centrale en pointillés */}
      <mesh position={[0, ROAD_Y + 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROAD_LEN, 1.4]} />
        <meshStandardMaterial color="#2B2F36" roughness={0.95} />
      </mesh>
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} position={[X0 + ((X1 - X0) * i) / 8, ROAD_Y + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.32, 0.06]} />
          <meshStandardMaterial color="#FCD34D" roughness={0.6} />
        </mesh>
      ))}

      {/* Panneaux villes */}
      <Tag3D position={[X0, ROAD_Y + 0.95, 0]} label="Dakar" tone="physique" />
      <Tag3D position={[X1, ROAD_Y + 0.95, 0]} label="Thiès" tone="physique" />

      {/* Jalons équidistants (positions à t = 0, 2, 4, 6, 8 s) */}
      {markers.map((p, i) => (
        <Marker key={i} position={p} color={i === 0 ? '#16A34A' : '#DC2626'} size={0.07} />
      ))}
      <Tag3D position={[(X0 + X1) / 2, ROAD_Y - 0.4, 0]} label="jalons toutes les 2 s — équidistants" tone="physique" />

      {/* Le car rapide (carrosserie + cabine + vitres + roues) */}
      <group ref={car} position={[X0, ROAD_Y + 0.18, 0]}>
        {/* châssis bas */}
        <mesh position={[0, 0.12, 0]} castShadow>
          <boxGeometry args={[0.92, 0.26, 0.5]} />
          <meshStandardMaterial color="#1D4ED8" roughness={0.4} metalness={0.25} />
        </mesh>
        {/* cabine surélevée */}
        <mesh position={[-0.05, 0.36, 0]} castShadow>
          <boxGeometry args={[0.66, 0.24, 0.46]} />
          <meshStandardMaterial color="#2563EB" roughness={0.4} metalness={0.25} />
        </mesh>
        {/* bande décorative type car rapide */}
        <mesh position={[0, 0.1, 0.251]}>
          <boxGeometry args={[0.92, 0.07, 0.01]} />
          <meshStandardMaterial color="#FACC15" emissive="#CA8A04" emissiveIntensity={0.2} />
        </mesh>
        {/* pare-brise */}
        <mesh position={[0.23, 0.36, 0]}>
          <boxGeometry args={[0.06, 0.18, 0.4]} />
          <meshStandardMaterial color="#BAE6FD" roughness={0.1} metalness={0.4} />
        </mesh>
        {/* phare avant */}
        <mesh position={[0.47, 0.14, 0.15]}>
          <sphereGeometry args={[0.05, 12, 10]} />
          <meshStandardMaterial color="#FEF9C3" emissive="#FDE68A" emissiveIntensity={0.6} />
        </mesh>
        {/* 4 roues */}
        {[
          [0.3, 0, 0.27],
          [0.3, 0, -0.27],
          [-0.3, 0, 0.27],
          [-0.3, 0, -0.27],
        ].map((w, i) => (
          <mesh key={i} position={w as [number, number, number]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.13, 0.13, 0.08, 18]} />
            <meshStandardMaterial color="#0F172A" roughness={0.7} />
          </mesh>
        ))}
      </group>

      {/* Animation : mouvement uniforme (vitesse constante) si running */}
      <Animate
        fn={(state, delta) => {
          const g = car.current;
          if (!g) return;
          if (!running) {
            t0.current = state.clock.elapsedTime;
            g.position.x = X0;
            return;
          }
          g.position.x += speed * VIS * delta;
          if (g.position.x > X1) g.position.x = X0; // boucle Dakar → Thiès
          // rotation des roues proportionnelle à la vitesse
          g.children.forEach((c, i) => {
            if (i >= g.children.length - 4) c.rotation.x += speed * delta * 2;
          });
        }}
      />

      {/* Mini-graphe position–temps : droite = mouvement uniforme */}
      <group>
        <Axes2D size={0} color="#475569" />
        <Arrow3D from={[graph.gx, graph.gy, 0]} to={[graph.gx + graph.w + 0.3, graph.gy, 0]} color="#64748B" radius={0.014} headLength={0.14} />
        <Arrow3D from={[graph.gx, graph.gy, 0]} to={[graph.gx, graph.gy + graph.h + 0.3, 0]} color="#64748B" radius={0.014} headLength={0.14} />
        <PolyLine points={graph.line} color="#16A34A" width={3} />
        <Tag3D position={[graph.gx + graph.w + 0.35, graph.gy - 0.18, 0]} label="t" tone="physique" />
        <Tag3D position={[graph.gx - 0.05, graph.gy + graph.h + 0.32, 0]} label="d" tone="physique" />
        <Tag3D position={[graph.gx + graph.w * 0.62, graph.gy + graph.h * 0.78, 0]} label="d(t) = v·t" tone="physique" />
      </group>

      <SceneLabel position={[0, 2.3, 0]} title={`v = ${speed.toFixed(1)} m/s ≈ ${(speed * 3.6).toFixed(0)} km/h`} subtitle="Car rapide · mouvement uniforme" tone="physique" />
      <Readout position={[-2.7, 1.5, 0]} value={speed.toFixed(1)} unit="m/s" caption="vitesse moyenne v = d/t" />
    </LabScene>
  );
}
