'use client';

import { useMemo, useRef } from 'react';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Animate } from '@/components/lab3d/anim';
import { LabBench } from '@/components/lab3d/environment';
import { Battery, Bulb, Resistor, Meter, Wire } from '@/components/lab3d/electric';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';

/**
 * Scène 3D — puissance et énergie électrique (Physique-Chimie, 3ème).
 *
 * Circuit réel : une pile (générateur), l'appareil branché (ampoule pour la
 * lampe, résistance chauffante pour le fer/la télé), un ampèremètre à aiguille
 * et un fil fermé. Des électrons (points bleus) circulent le long du fil ;
 * leur vitesse est proportionnelle à l'intensité I. La puissance P = U·I est
 * affichée façon afficheur du compteur Woyofal. Construit sur le kit lab3d.
 */

export type MeterSceneProps = {
  u: number; // tension (V)
  i: number; // intensité (A)
  heating?: boolean; // true = appareil chauffant (résistance), false = lampe (ampoule)
};

const GROUND_Y = -1.5;

// Boucle fermée du fil (rectangle posé sur la paillasse)
const LOOP: [number, number, number][] = [
  [-2.4, GROUND_Y + 0.18, 0.9],
  [2.4, GROUND_Y + 0.18, 0.9],
  [2.4, GROUND_Y + 0.18, -0.9],
  [-2.4, GROUND_Y + 0.18, -0.9],
  [-2.4, GROUND_Y + 0.18, 0.9],
];

export default function MeterScene({ u, i, heating = false }: MeterSceneProps) {
  const electrons = useRef<Group>(null);
  const power = u * i; // watts
  // luminosité / vitesse normalisées sur une puissance « héros » de ~120 W
  const intensityRatio = Math.max(0, Math.min(1, power / 120));

  // points équidistants le long de la boucle pour animer les électrons
  const path = useMemo(() => {
    const segs: { a: [number, number, number]; b: [number, number, number]; len: number }[] = [];
    let total = 0;
    for (let s = 0; s < LOOP.length - 1; s++) {
      const a = LOOP[s];
      const b = LOOP[s + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      segs.push({ a, b, len });
      total += len;
    }
    return { segs, total };
  }, []);

  const N = 14;
  function pointAt(d: number): [number, number, number] {
    let rem = ((d % path.total) + path.total) % path.total;
    for (const seg of path.segs) {
      if (rem <= seg.len) {
        const t = rem / seg.len;
        return [
          seg.a[0] + (seg.b[0] - seg.a[0]) * t,
          seg.a[1] + (seg.b[1] - seg.a[1]) * t,
          seg.a[2] + (seg.b[2] - seg.a[2]) * t,
        ];
      }
      rem -= seg.len;
    }
    return path.segs[0].a;
  }

  return (
    <LabScene cameraPosition={[0, 2.4, 6.4]} background="#FEF3C7" minDistance={4} maxDistance={12} groundY={GROUND_Y}>
      <LabBench y={GROUND_Y} color="#E7D8B8" size={24} />

      {/* Fil conducteur (boucle fermée) */}
      <Wire points={LOOP} color="#0F172A" radius={0.05} />

      {/* Électrons en mouvement (vitesse ∝ I) */}
      <group ref={electrons}>
        {Array.from({ length: N }).map((_, k) => (
          <mesh key={k}>
            <sphereGeometry args={[0.07, 12, 10]} />
            <meshStandardMaterial color="#38BDF8" emissive="#0EA5E9" emissiveIntensity={0.6} />
          </mesh>
        ))}
      </group>

      {/* Générateur (pile) à gauche */}
      <group position={[-2.4, GROUND_Y + 0.9, 0]}>
        <Battery voltage={u} />
      </group>
      <Tag3D position={[-2.4, GROUND_Y + 2, 0]} label={`Générateur ${u} V`} tone="physique" />

      {/* Ampèremètre (aiguille ∝ I) en bas */}
      <group position={[0, GROUND_Y + 0.7, 0.9]}>
        <Meter kind="A" value={i} max={10} />
      </group>
      <Tag3D position={[0, GROUND_Y + 1.6, 0.9]} label={`I = ${i.toFixed(1)} A`} tone="physique" />

      {/* Appareil branché à droite : résistance chauffante OU ampoule */}
      {heating ? (
        <group position={[2.4, GROUND_Y + 0.7, 0]}>
          <Resistor rotation={[0, 0, 0]} bands={['#DC2626', '#F59E0B', '#DC2626']} />
          {/* halo de chaleur quand la puissance est élevée */}
          {intensityRatio > 0.3 && <pointLight position={[0, 0, 0]} intensity={intensityRatio * 1.8} distance={3} color="#FB923C" />}
        </group>
      ) : (
        <group position={[2.4, GROUND_Y + 0.95, 0]}>
          <Bulb on brightness={intensityRatio} />
        </group>
      )}
      <Tag3D position={[2.4, GROUND_Y + 2, 0]} label={heating ? 'Appareil chauffant' : 'Lampe'} tone="physique" />

      {/* Afficheur du compteur Woyofal : la puissance instantanée */}
      <SceneLabel
        position={[0, 2.6, 0]}
        title={`P = U × I = ${power.toFixed(0)} W`}
        subtitle="Compteur Woyofal · Senelec"
        tone="physique"
      />
      <Readout position={[0, GROUND_Y + 2.5, 0]} value={power.toFixed(0)} unit="W" caption="puissance" />

      <Animate fn={(state) => {
        const g = electrons.current;
        if (!g) return;
        // la vitesse de défilement suit l'intensité I (courant fort = électrons rapides)
        const speed = 0.4 + i * 0.9;
        const base = (state.clock.elapsedTime * speed) % path.total;
        for (let k = 0; k < g.children.length; k++) {
          const d = base + (k / N) * path.total;
          const [x, y, z] = pointAt(d);
          g.children[k].position.set(x, y, z);
        }
      }} />
    </LabScene>
  );
}
