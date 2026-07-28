'use client';

import { useMemo, useRef } from 'react';
import { CatmullRomCurve3, Group, Mesh, Vector3, type Vector3Tuple } from 'three';
import {
  Animate,
  Drop,
  LabBench,
  LabScene,
  Readout,
  SceneLabel,
  Tag3D,
  TestTube,
  Wire,
} from '@/components/lab3d';

/**
 * Scènes 3D — TP « Digestion » (SVT, 5ème).
 *
 * Deux vues dans un même fichier (une seule montée à la fois) :
 *  - view="tube"   : l'appareil digestif en volume (bouche → œsophage →
 *                    estomac → intestin grêle → gros intestin). Le bol
 *                    alimentaire suit une vraie courbe (CatmullRom) le long
 *                    du tube, rétrécit au fur et à mesure qu'il est digéré,
 *                    et des nutriments passent dans le sang au niveau du grêle.
 *  - view="enzyme" : l'expérience de digestion enzymatique — deux tubes à
 *                    essai (amidon + salive / amidon + eau) testés à l'eau
 *                    iodée après incubation à 37 °C.
 *
 * Le tube digestif est modelé avec <Wire> (kit lab3d) : c'est le primitif
 * « tube le long d'une polyligne » (tubeGeometry sur CatmullRomCurve3).
 * Aucune silhouette humaine : on recadre sur l'organe.
 */

export type DigestiveSceneProps = {
  view?: 'tube' | 'enzyme';
  /** Index d'organe visité (0 = bouche … 4 = gros intestin). */
  organ?: number;
  /** Durée d'incubation à 37 °C, en minutes (vue enzyme). */
  minutes?: number;
  /** Eau iodée versée dans les deux tubes (vue enzyme). */
  iodine?: boolean;
};

// ──────────────────────────────────────────────────────────────────────
// Anatomie : ligne moyenne du tube digestif (38 points)
// ──────────────────────────────────────────────────────────────────────

const PATH: Vector3Tuple[] = [
  // bouche → pharynx (0-1)
  [0, 2.42, 0.26], [0, 2.16, 0.06],
  // œsophage (2-5)
  [0.02, 1.9, 0], [0.02, 1.58, 0], [0.02, 1.26, 0], [0, 1.0, 0],
  // estomac, en J (6-10)
  [-0.26, 0.92, 0.05], [-0.58, 0.72, 0.07], [-0.68, 0.42, 0.07], [-0.44, 0.22, 0.04], [-0.06, 0.26, 0.01],
  // duodénum + intestin grêle pelotonné (11-25)
  [0.3, 0.18, 0], [0.5, -0.08, 0.02],
  [0.62, -0.42, 0.06], [0.18, -0.52, 0.14], [-0.32, -0.44, 0.06], [-0.64, -0.58, -0.04],
  [-0.34, -0.8, -0.1], [0.16, -0.72, -0.02], [0.6, -0.84, 0.06],
  [0.34, -1.06, 0.12], [-0.14, -0.98, 0.1], [-0.58, -1.1, 0.02],
  [-0.22, -1.3, -0.06], [0.28, -1.24, -0.02], [0.62, -1.36, 0.02],
  // gros intestin : cæcum → côlon ascendant, transverse, descendant → rectum (26-37)
  [0.88, -1.52, -0.16], [1.04, -1.12, -0.22], [1.08, -0.62, -0.22], [1.0, -0.22, -0.22],
  [0.5, -0.08, -0.22], [-0.2, -0.08, -0.22], [-0.9, -0.2, -0.22],
  [-1.06, -0.7, -0.22], [-1.02, -1.2, -0.22], [-0.78, -1.56, -0.18],
  [-0.34, -1.8, -0.08], [0, -2.0, 0],
];

/** t ∈ [0,1] du bol alimentaire pour chaque organe + couleur du bol. */
const ORGANS = [
  { name: 'Bouche', t: 0.02, bolus: '#8B5E34' },
  { name: 'Œsophage', t: 0.1, bolus: '#8B5E34' },
  { name: 'Estomac', t: 0.225, bolus: '#A97142' },
  { name: 'Intestin grêle', t: 0.58, bolus: '#D9A441' },
  { name: 'Gros intestin', t: 0.96, bolus: '#6B4423' },
];

const STAY = ['≈ 1 min', '≈ 5 s', '≈ 4 h', '≈ 5 h', '≈ 20 h'];

function Mouth({ position }: { position: Vector3Tuple }) {
  return (
    <group position={position}>
      {/* cavité buccale */}
      <mesh castShadow>
        <sphereGeometry args={[0.36, 28, 22]} />
        <meshStandardMaterial color="#F6C9C4" roughness={0.55} transparent opacity={0.55} />
      </mesh>
      {/* langue */}
      <mesh position={[0, -0.08, 0.07]} scale={[0.85, 0.42, 1.3]}>
        <sphereGeometry args={[0.2, 20, 16]} />
        <meshStandardMaterial color="#D9544D" roughness={0.5} />
      </mesh>
      {/* arcade dentaire (mastication) */}
      {Array.from({ length: 9 }, (_, i) => {
        const a = -Math.PI * 0.44 + (i * Math.PI * 0.88) / 8;
        return (
          <mesh key={i} position={[Math.sin(a) * 0.29, 0.03, Math.cos(a) * 0.27]} rotation={[0, a, 0]} castShadow>
            <boxGeometry args={[0.075, 0.11, 0.055]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.25} />
          </mesh>
        );
      })}
    </group>
  );
}

function TubeView({ organ }: { organ: number }) {
  const bolus = useRef<Mesh>(null);
  const nutri = useRef<Group>(null);
  const tRef = useRef(ORGANS[0].t);
  const idx = Math.max(0, Math.min(ORGANS.length - 1, organ));

  const curve = useMemo(
    () => new CatmullRomCurve3(PATH.map((p) => new Vector3(...p)), false, 'catmullrom', 0.25),
    [],
  );

  return (
    <LabScene cameraPosition={[0.4, 0.15, 6.4]} background="#FFF1F2" minDistance={3.5} maxDistance={12} groundY={null}>
      <group position={[0, -0.2, 0]} scale={0.86}>
        <Mouth position={PATH[0]} />

        {/* Œsophage — tube fin et musculeux */}
        <Wire points={PATH.slice(1, 6)} color="#E9A0A0" radius={0.1} />

        {/* Estomac — poche en J + grosse tubérosité */}
        <Wire points={PATH.slice(5, 11)} color="#E4736A" radius={0.26} />
        <mesh position={[-0.52, 0.8, 0.06]} scale={[1, 0.85, 0.8]} castShadow>
          <sphereGeometry args={[0.34, 26, 20]} />
          <meshStandardMaterial color="#E4736A" roughness={0.45} metalness={0.05} />
        </mesh>

        {/* Intestin grêle — 6 m repliés en anses */}
        <Wire points={PATH.slice(10, 26)} color="#EFA184" radius={0.125} />

        {/* Gros intestin — cadre colique, plus large */}
        <Wire points={PATH.slice(25, 38)} color="#C98B6B" radius={0.185} />

        {/* Bol alimentaire animé */}
        <mesh ref={bolus} castShadow>
          <sphereGeometry args={[0.16, 20, 16]} />
          <meshStandardMaterial
            color={ORGANS[idx].bolus}
            roughness={0.7}
            emissive={ORGANS[idx].bolus}
            emissiveIntensity={0.25}
          />
        </mesh>

        {/* Nutriments qui franchissent la paroi du grêle et passent dans le sang */}
        {idx >= 3 && (
          <group ref={nutri}>
            {([[-0.16, 0, 0.04], [0.04, 0.09, -0.05], [0.15, -0.07, 0.08]] as Vector3Tuple[]).map((p, i) => (
              <mesh key={i} position={p}>
                <sphereGeometry args={[0.055, 12, 10]} />
                <meshStandardMaterial color="#F59E0B" emissive="#B45309" emissiveIntensity={0.6} />
              </mesh>
            ))}
          </group>
        )}

        <Animate
          fn={(state, delta) => {
            // le bol progresse en douceur jusqu'à l'organe sélectionné
            tRef.current += (ORGANS[idx].t - tRef.current) * Math.min(1, delta * 1.2);
            const p = curve.getPoint(Math.max(0, Math.min(1, tRef.current)));
            bolus.current?.position.set(p.x, p.y, p.z);
            // péristaltisme : le bol est brassé, et il fond au fil de la digestion
            const wob = 1 + 0.12 * Math.sin(state.clock.elapsedTime * 4);
            bolus.current?.scale.setScalar((1 - 0.45 * tRef.current) * wob);
            if (nutri.current) {
              const k = (state.clock.elapsedTime % 2.2) / 2.2;
              nutri.current.position.set(0.2 + k * 1.0, -0.9 + k * 0.55, 0.3 + k * 0.5);
              nutri.current.scale.setScalar(0.35 + Math.sin(Math.PI * k) * 0.9);
            }
          }}
        />

        <Tag3D position={[0.95, 2.45, 0.2]} label="Bouche · dents + salive" tone="svt" />
        <Tag3D position={[0.85, 1.6, 0]} label="Œsophage" tone="svt" />
        <Tag3D position={[-1.6, 0.85, 0]} label="Estomac" tone="svt" />
        <Tag3D position={[0, -0.68, 0.85]} label="Intestin grêle" tone="svt" />
        <Tag3D position={[1.85, -0.9, -0.2]} label="Gros intestin" tone="svt" />
        {idx >= 3 && <Tag3D position={[1.5, -0.3, 0.8]} label="nutriments → sang" tone="physique" />}
      </group>

      <SceneLabel position={[0, 2.4, 0]} title={ORGANS[idx].name} subtitle="Trajet du bol alimentaire" tone="svt" />
      <Readout position={[2.35, 1.35, 0]} value={STAY[idx]} caption="temps de séjour" />
    </LabScene>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Vue « expérience » : amidon + salive vs amidon + eau, révélés à l'eau iodée
// ──────────────────────────────────────────────────────────────────────

const BLEU_NOIR = '#1E1B4B'; // eau iodée + amidon
const ORANGE = '#C2410C'; // eau iodée seule (plus d'amidon)
const LAITEUX = '#F3EFE2'; // empois d'amidon avant le test

function lerpHex(a: string, b: string, k: number) {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const ch = (s: number) => {
    const va = (na >> s) & 255;
    const vb = (nb >> s) & 255;
    return Math.round(va + (vb - va) * Math.max(0, Math.min(1, k)));
  };
  return `#${((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1)}`;
}

function Pipette({ x }: { x: number }) {
  return (
    <group position={[x, 1.55, 0]}>
      <mesh>
        <cylinderGeometry args={[0.075, 0.075, 0.6, 20, 1, true]} />
        <meshStandardMaterial color="#DCEBFF" roughness={0.1} transparent opacity={0.4} />
      </mesh>
      <mesh position={[0, -0.42, 0]}>
        <cylinderGeometry args={[0.02, 0.055, 0.28, 16, 1, true]} />
        <meshStandardMaterial color="#DCEBFF" roughness={0.1} transparent opacity={0.45} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <sphereGeometry args={[0.14, 20, 16]} />
        <meshStandardMaterial color="#E8843F" roughness={0.6} />
      </mesh>
    </group>
  );
}

function EnzymeView({ minutes, iodine }: { minutes: number; iodine: boolean }) {
  const dropA = useRef<Group>(null);
  const dropB = useRef<Group>(null);

  // amylase salivaire : hydrolyse de l'amidon, k ≈ 0,15 min⁻¹ à 37 °C
  const starch = Math.exp(-0.15 * minutes);
  const colSalive = iodine ? lerpHex(ORANGE, BLEU_NOIR, starch) : LAITEUX;
  const colTemoin = iodine ? BLEU_NOIR : LAITEUX;

  return (
    <LabScene cameraPosition={[0, 0.2, 6.2]} background="#ECFDF5" minDistance={3.5} maxDistance={11} groundY={-1.5}>
      <LabBench y={-1.5} color="#E6E9DC" size={20} />

      {/* Portoir en bois */}
      <mesh position={[0, -1.32, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 0.3, 0.8]} />
        <meshStandardMaterial color="#B98A5A" roughness={0.85} />
      </mesh>

      <TestTube position={[-0.9, -0.25, 0]} fill={0.55} liquidColor={colSalive} radius={0.36} height={2.5} />
      <TestTube position={[0.9, -0.25, 0]} fill={0.55} liquidColor={colTemoin} radius={0.36} height={2.5} />

      {iodine && (
        <>
          <Pipette x={-0.9} />
          <Pipette x={0.9} />
          <group ref={dropA}>
            <Drop position={[-0.9, 0, 0]} color="#B45309" size={0.075} />
          </group>
          <group ref={dropB}>
            <Drop position={[0.9, 0, 0]} color="#B45309" size={0.075} />
          </group>
          <Animate
            fn={(state) => {
              const k = (state.clock.elapsedTime % 1.6) / 1.6;
              const y = 1.05 - k * 1.35;
              dropA.current?.position.setY(y);
              dropB.current?.position.setY(y - 0.25);
            }}
          />
        </>
      )}

      <Tag3D position={[-0.9, 1.25, 0]} label="Amidon + SALIVE" tone="svt" />
      <Tag3D position={[0.9, 1.25, 0]} label="Amidon + EAU (témoin)" tone="neutral" />

      {iodine && (
        <>
          <Tag3D
            position={[-0.95, -1.85, 0]}
            label={starch < 0.2 ? 'Jaune-orangé : plus d’amidon' : 'Encore bleu : amidon restant'}
            tone={starch < 0.2 ? 'svt' : 'chimie'}
          />
          <Tag3D position={[0.95, -2.2, 0]} label="Bleu-noir : amidon intact" tone="chimie" />
        </>
      )}

      <SceneLabel
        position={[0, 2.2, 0]}
        title={iodine ? 'Test à l’eau iodée' : 'Incubation à 37 °C'}
        subtitle="Empois d’amidon de mil"
        tone="svt"
      />
      <Readout position={[2.5, 0.5, 0]} value={minutes} unit="min" caption="incubation 37 °C" />
      <Readout position={[2.5, -0.35, 0]} value={`${Math.round(starch * 100)}`} unit="%" caption="amidon restant (salive)" />
    </LabScene>
  );
}

export default function DigestiveScene({ view = 'tube', organ = 0, minutes = 0, iodine = false }: DigestiveSceneProps) {
  return view === 'enzyme' ? <EnzymeView minutes={minutes} iodine={iodine} /> : <TubeView organ={organ} />;
}
