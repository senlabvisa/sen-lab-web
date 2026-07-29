'use client';

import { useMemo, useRef } from 'react';
import { CatmullRomCurve3, DoubleSide, Group, Mesh, Vector3, type Vector3Tuple } from 'three';
import { LabScene, Wire, PolyLine, SceneLabel, Tag3D, Readout, Animate } from '@/components/lab3d';

/**
 * Scène 3D — le neurone et l'arc réflexe (SVT, 3ème).
 *
 * Deux vues schématiques, comme dans le manuel :
 *
 *  • « neurone » : corps cellulaire (avec son noyau) + dendrites + axone
 *    entouré (ou non) d'une gaine de myéline interrompue par les nœuds de
 *    Ranvier, puis la synapse avec ses neurotransmetteurs. Le message
 *    nerveux animé RAMPE le long d'une fibre nue mais SAUTE de nœud en
 *    nœud sur une fibre myélinisée (conduction saltatoire) : la durée du
 *    trajet à l'écran suit la vitesse de conduction calculée.
 *
 *  • « arc » : la boucle du réflexe de retrait — récepteur de la peau →
 *    nerf sensitif → moelle épinière (centre nerveux) → nerf moteur →
 *    muscle effecteur, qui se contracte quand le message arrive. Le
 *    cerveau, prévenu ensuite, est relié en pointillés.
 *
 * Aucun personnage humain n'est représenté : on reste sur l'objet d'étude.
 */

export type NeuroneView = 'neurone' | 'arc';
export type NeuroneSceneProps = {
  view: NeuroneView;
  myelin: boolean;
  /** Vitesse de conduction en m/s (sert à cadencer l'animation). */
  speed: number;
  /** Temps du réflexe en ms (affiché dans la vue arc réflexe). */
  reflexMs: number;
};

// ── Géométrie du neurone ────────────────────────────────────────────────
const AX_START = -2.7; // cône d'émergence
const AX_END = 3.0; // arborisation terminale
const MYE_X0 = -2.35;
const MYE_X1 = 2.85;
const N_SEG = 6;
const PITCH = (MYE_X1 - MYE_X0) / N_SEG;

const SOMA = '#E7A2B8';
const AXON = '#F3CBD8';
const MYELIN = '#FDF4E3';
const SPARK = '#FDE047';

const DENDRITES: Vector3Tuple[][] = [
  [
    [-3.95, 0.4, 0],
    [-4.7, 0.95, 0],
    [-5.45, 1.25, 0.2],
  ],
  [
    [-4.65, 0.92, 0],
    [-5.15, 1.55, -0.15],
  ],
  [
    [-4.15, 0.02, 0],
    [-5.0, -0.12, 0.15],
    [-5.8, -0.06, 0.3],
  ],
  [
    [-3.95, -0.4, 0],
    [-4.7, -0.9, 0],
    [-5.4, -1.25, 0.1],
  ],
  [
    [-3.62, 0.6, 0],
    [-3.9, 1.3, 0],
    [-4.25, 1.9, 0],
  ],
];

const NT_OFFSET: Vector3Tuple[] = [
  [0, 0.3, 0.06],
  [0, 0.13, -0.1],
  [0, -0.04, 0.12],
  [0, -0.21, -0.05],
  [0, 0.36, -0.14],
  [0, -0.33, 0.09],
  [0, 0.02, -0.16],
  [0, 0.21, 0.15],
];

// ── Trajet de l'arc réflexe (une seule courbe continue) ──────────────────
const ARC_PATH: Vector3Tuple[] = [
  [-3.2, -1.25, 0.3],
  [-1.7, -0.5, 0],
  [0.2, 0.55, 0],
  [1.85, 0.9, 0],
  [2.5, 0.55, 0],
  [2.5, -0.35, 0],
  [1.85, -0.72, 0],
  [0.3, -1.2, 0],
  [-1.3, -1.95, 0],
  [-2.55, -2.4, 0],
];
const SENSITIF: Vector3Tuple[] = ARC_PATH.slice(0, 4);
const MOTEUR: Vector3Tuple[] = ARC_PATH.slice(6);
const VERS_CERVEAU: Vector3Tuple[] = [
  [2.5, 0.55, 0],
  [2.55, 1.5, 0],
  [2.6, 2.15, 0],
];

const _p = new Vector3();

// ════════════════════════════════════════════════════════════════════════
// Vue 1 — le neurone
// ════════════════════════════════════════════════════════════════════════

function NeuronView({ myelin, speed }: { myelin: boolean; speed: number }) {
  const pulse = useRef<Mesh>(null);
  const nts = useRef<Group>(null);

  const segX = useMemo(() => Array.from({ length: N_SEG }, (_, i) => MYE_X0 + PITCH * (i + 0.5)), []);
  const nodeX = useMemo(() => Array.from({ length: N_SEG - 1 }, (_, i) => MYE_X0 + PITCH * (i + 1)), []);
  /** Étapes du saut saltatoire : départ → nœuds de Ranvier → bouton terminal. */
  const jumps = useMemo(() => [AX_START, ...nodeX, AX_END], [nodeX]);
  /** Durée visible du trajet : d'autant plus courte que la conduction est rapide. */
  const period = useMemo(() => Math.min(5, Math.max(0.55, 2.4 / Math.pow(speed / 6, 0.45))), [speed]);

  return (
    <group>
      {/* Corps cellulaire (soma) + noyau */}
      <mesh position={[-3.6, 0, 0]} scale={[1, 0.95, 0.9]} castShadow>
        <sphereGeometry args={[0.64, 30, 22]} />
        <meshStandardMaterial color={SOMA} roughness={0.55} />
      </mesh>
      <mesh position={[-3.6, 0, 0.28]}>
        <sphereGeometry args={[0.26, 20, 16]} />
        <meshStandardMaterial color="#8B3A62" roughness={0.5} />
      </mesh>

      {/* Dendrites (reçoivent les messages des autres neurones) */}
      {DENDRITES.map((pts, i) => (
        <Wire key={i} points={pts} color={SOMA} radius={0.055} />
      ))}

      {/* Cône d'émergence + axone */}
      <mesh position={[-3.0, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.3, 0.55, 20]} />
        <meshStandardMaterial color={SOMA} roughness={0.55} />
      </mesh>
      <mesh position={[(AX_START + AX_END) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.11, 0.11, AX_END - AX_START, 20]} />
        <meshStandardMaterial color={AXON} roughness={0.5} />
      </mesh>

      {/* Gaine de myéline (cellules de Schwann) + nœuds de Ranvier */}
      {myelin && (
        <>
          {segX.map((x, i) => (
            <group key={i}>
              <mesh position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.27, 0.27, PITCH * 0.8, 22]} />
                <meshStandardMaterial color={MYELIN} roughness={0.45} />
              </mesh>
              <mesh position={[x, 0.23, 0.14]}>
                <sphereGeometry args={[0.075, 14, 12]} />
                <meshStandardMaterial color="#C7A17A" roughness={0.6} />
              </mesh>
            </group>
          ))}
          {nodeX.map((x, i) => (
            <mesh key={i} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[0.135, 0.032, 10, 22]} />
              <meshStandardMaterial color="#B45309" roughness={0.5} />
            </mesh>
          ))}
        </>
      )}

      {/* Arborisation terminale + boutons synaptiques */}
      <Wire
        points={[
          [2.9, 0, 0],
          [3.3, 0.22, 0],
          [3.62, 0.32, 0],
        ]}
        color={AXON}
        radius={0.06}
      />
      <Wire
        points={[
          [2.9, 0, 0],
          [3.3, -0.22, 0],
          [3.62, -0.32, 0],
        ]}
        color={AXON}
        radius={0.06}
      />
      {([0.32, -0.32] as number[]).map((y) => (
        <mesh key={y} position={[3.78, y, 0]} scale={[0.85, 1, 1]} castShadow>
          <sphereGeometry args={[0.24, 20, 16]} />
          <meshStandardMaterial color="#EFB0C2" roughness={0.5} />
        </mesh>
      ))}

      {/* Neurone suivant (de l'autre côté de la fente synaptique) */}
      <mesh position={[4.62, 0, 0]} scale={[0.55, 1.5, 1.1]} castShadow>
        <sphereGeometry args={[0.6, 24, 18]} />
        <meshStandardMaterial color="#A5B4FC" roughness={0.55} />
      </mesh>

      {/* Neurotransmetteurs libérés dans la fente synaptique */}
      <group ref={nts}>
        {NT_OFFSET.map((o, i) => (
          <mesh key={i} position={o}>
            <sphereGeometry args={[0.048, 10, 8]} />
            <meshStandardMaterial color="#22C55E" emissive="#16A34A" emissiveIntensity={0.7} />
          </mesh>
        ))}
      </group>

      {/* Message nerveux (influx) */}
      <mesh ref={pulse} position={[AX_START, 0, 0]}>
        <sphereGeometry args={[0.19, 20, 16]} />
        <meshStandardMaterial color={SPARK} emissive="#F59E0B" emissiveIntensity={1.4} roughness={0.2} />
      </mesh>

      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime;
          const p = (t % period) / period;
          let x: number;
          let scale = 1;
          if (myelin) {
            // Conduction saltatoire : l'influx ne « recharge » qu'aux nœuds.
            const i = Math.min(jumps.length - 1, Math.floor(p * jumps.length));
            x = jumps[i];
            scale = 1 + 0.4 * Math.abs(Math.sin(p * jumps.length * Math.PI));
          } else {
            // Fibre nue : proche en proche, lentement et sans à-coups.
            x = AX_START + p * (AX_END - AX_START);
            scale = 0.85;
          }
          pulse.current?.position.setX(x);
          pulse.current?.scale.setScalar(scale);

          // Diffusion des neurotransmetteurs à travers la fente synaptique.
          const g = nts.current;
          if (g) {
            const n = g.children.length;
            for (let i = 0; i < n; i++) {
              const u = (((t / (period * 0.45) + i / n) % 1) + 1) % 1;
              g.children[i].position.set(3.98 + u * 0.32, NT_OFFSET[i][1] * (0.4 + 0.6 * u), NT_OFFSET[i][2]);
            }
          }
        }}
      />

      {/* Étiquettes */}
      <Tag3D position={[-5.8, 1.55, 0]} label="Dendrites" tone="svt" />
      <Tag3D position={[-3.6, -1.05, 0]} label="Corps cellulaire" tone="svt" />
      <Tag3D position={[-3.6, 0.95, 0]} label="Noyau" tone="neutral" />
      <Tag3D position={[0.1, -0.72, 0]} label="Axone" tone="svt" />
      {myelin ? (
        <>
          <Tag3D position={[-1.35, 0.75, 0]} label="Gaine de myéline" tone="neutral" />
          <Tag3D position={[1.75, -1.15, 0]} label="Nœud de Ranvier" tone="physique" />
        </>
      ) : (
        <Tag3D position={[0.1, 0.68, 0]} label="Fibre nue : pas de myéline" tone="physique" />
      )}
      <Tag3D position={[4.15, 1.15, 0]} label="Synapse" tone="svt" />
      <Tag3D position={[4.15, -1.15, 0]} label="Neurotransmetteurs" tone="neutral" />

      <SceneLabel
        position={[-0.6, 2.75, 0]}
        title={myelin ? 'Fibre myélinisée — le message saute' : 'Fibre nue — le message rampe'}
        subtitle="Sens du message : corps cellulaire → axone → synapse"
        tone="svt"
      />
      <Readout position={[4.3, 2.4, 0]} value={speed.toFixed(0)} unit="m/s" caption="vitesse de conduction" />
    </group>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Vue 2 — l'arc réflexe
// ════════════════════════════════════════════════════════════════════════

function ArcView({ speed, reflexMs }: { speed: number; reflexMs: number }) {
  const msg = useRef<Mesh>(null);
  const muscle = useRef<Group>(null);

  const curve = useMemo(() => new CatmullRomCurve3(ARC_PATH.map((p) => new Vector3(...p))), []);
  const period = useMemo(() => Math.min(4.5, Math.max(0.9, 3.2 / Math.pow(speed / 6, 0.4))), [speed]);

  return (
    <group>
      {/* 3 — Moelle épinière : centre nerveux du réflexe */}
      <mesh position={[2.5, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.62, 0.62, 4.3, 26, 1, true]} />
        <meshStandardMaterial color="#EDE9FE" roughness={0.5} transparent opacity={0.5} side={DoubleSide} />
      </mesh>
      {/* substance grise (en papillon) */}
      <mesh position={[2.5, 0.55, 0]} scale={[0.55, 0.9, 0.55]}>
        <sphereGeometry args={[0.42, 18, 14]} />
        <meshStandardMaterial color="#8FA0B6" roughness={0.7} />
      </mesh>
      <mesh position={[2.5, -0.35, 0]} scale={[0.55, 0.9, 0.55]}>
        <sphereGeometry args={[0.42, 18, 14]} />
        <meshStandardMaterial color="#8FA0B6" roughness={0.7} />
      </mesh>
      <mesh position={[2.5, 0.1, 0]}>
        <boxGeometry args={[0.22, 0.75, 0.4]} />
        <meshStandardMaterial color="#8FA0B6" roughness={0.7} />
      </mesh>

      {/* Cerveau : prévenu APRÈS le réflexe */}
      <mesh position={[2.6, 2.75, 0]} scale={[1.2, 0.88, 0.95]} castShadow>
        <sphereGeometry args={[0.62, 26, 20]} />
        <meshStandardMaterial color="#F0A8C0" roughness={0.65} />
      </mesh>
      <PolyLine points={VERS_CERVEAU} color="#94A3B8" width={2.5} dashed />

      {/* 1 — La marmite brûlante et le récepteur de la peau */}
      <group position={[-3.35, -0.45, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.62, 0.5, 0.66, 26]} />
          <meshStandardMaterial color="#4B5563" roughness={0.35} metalness={0.65} />
        </mesh>
        <mesh position={[0, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.62, 0.055, 10, 30]} />
          <meshStandardMaterial color="#6B7280" roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0, -0.42, 0]}>
          <sphereGeometry args={[0.3, 18, 14]} />
          <meshStandardMaterial color="#F97316" emissive="#EA580C" emissiveIntensity={1.6} />
        </mesh>
      </group>
      {/* peau + terminaison sensitive enroulée */}
      <mesh position={[-3.35, -1.45, 0.15]} castShadow>
        <boxGeometry args={[2, 0.4, 1.1]} />
        <meshStandardMaterial color="#C98F6B" roughness={0.85} />
      </mesh>
      {([0, 1, 2] as number[]).map((i) => (
        <mesh key={i} position={[-3.5 + i * 0.16, -1.25 + i * 0.02, 0.35]} rotation={[Math.PI / 2, 0, 0.4]}>
          <torusGeometry args={[0.13, 0.032, 10, 20]} />
          <meshStandardMaterial color="#2563EB" roughness={0.5} />
        </mesh>
      ))}

      {/* 2 — Nerf sensitif (+ ganglion spinal) · 4 — Nerf moteur */}
      <Wire points={SENSITIF} color="#2563EB" radius={0.075} />
      <mesh position={[1.35, 0.82, 0]} castShadow>
        <sphereGeometry args={[0.19, 18, 14]} />
        <meshStandardMaterial color="#60A5FA" roughness={0.5} />
      </mesh>
      <Wire points={MOTEUR} color="#DC2626" radius={0.075} />

      {/* 5 — Muscle effecteur (fléchisseur du bras) */}
      <group ref={muscle} position={[-3.3, -2.6, 0]}>
        <mesh scale={[1.35, 0.52, 0.55]} castShadow>
          <sphereGeometry args={[0.82, 26, 20]} />
          <meshStandardMaterial color="#B91C1C" roughness={0.65} />
        </mesh>
        <mesh position={[1.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.42, 12]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.7} />
        </mesh>
        <mesh position={[-1.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.42, 12]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.7} />
        </mesh>
      </group>

      {/* Message nerveux qui parcourt la boucle */}
      <mesh ref={msg}>
        <sphereGeometry args={[0.16, 18, 14]} />
        <meshStandardMaterial color={SPARK} emissive="#F59E0B" emissiveIntensity={1.4} roughness={0.2} />
      </mesh>

      <Animate
        fn={(state) => {
          const cycle = period + 0.5; // petite pause entre deux stimulations
          const u = Math.min(1, ((state.clock.elapsedTime % cycle) / period) || 0);
          curve.getPoint(u, _p);
          msg.current?.position.copy(_p);
          msg.current?.scale.setScalar(0.85 + 0.3 * Math.sin(u * 18));
          // Le muscle se contracte quand le message arrive à l'effecteur.
          const k = u > 0.88 ? Math.sin(((u - 0.88) / 0.12) * Math.PI) : 0;
          muscle.current?.scale.set(1 - 0.16 * k, 1 + 0.3 * k, 1 + 0.2 * k);
        }}
      />

      {/* Étiquettes numérotées du trajet */}
      <Tag3D position={[-3.35, 0.55, 0]} label="Marmite brûlante (stimulus)" tone="physique" />
      <Tag3D position={[-3.35, -2.02, 0.4]} label="1 · Récepteur de la peau" tone="svt" />
      <Tag3D position={[-0.85, 0.5, 0]} label="2 · Nerf sensitif" tone="neutral" />
      <Tag3D position={[2.5, 1.55, 0]} label="3 · Moelle épinière" tone="svt" />
      <Tag3D position={[0.05, -1.85, 0]} label="4 · Nerf moteur" tone="neutral" />
      <Tag3D position={[-3.3, -3.35, 0]} label="5 · Muscle (effecteur)" tone="svt" />
      <Tag3D position={[2.6, 3.55, 0]} label="Cerveau : prévenu après — tu sens la douleur" tone="neutral" />

      <SceneLabel
        position={[-1.4, 2.75, 0]}
        title="Arc réflexe : la moelle décide toute seule"
        subtitle="récepteur → nerf sensitif → moelle → nerf moteur → muscle"
        tone="svt"
      />
      <Readout position={[4.55, 0.7, 0]} value={reflexMs.toFixed(0)} unit="ms" caption="temps du réflexe" />
      <Readout position={[4.55, -0.5, 0]} value={speed.toFixed(0)} unit="m/s" caption="vitesse du message" />
    </group>
  );
}

// ════════════════════════════════════════════════════════════════════════

export default function NeuroneScene({ view, myelin, speed, reflexMs }: NeuroneSceneProps) {
  return (
    <LabScene
      cameraPosition={view === 'neurone' ? [0, 0.3, 11.5] : [0.2, 0.2, 11]}
      background="#F0FDF4"
      minDistance={6}
      maxDistance={19}
      groundY={null}
    >
      {view === 'neurone' ? <NeuronView myelin={myelin} speed={speed} /> : <ArcView speed={speed} reflexMs={reflexMs} />}
    </LabScene>
  );
}
