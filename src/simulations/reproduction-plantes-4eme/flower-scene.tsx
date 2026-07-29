'use client';

import { useRef } from 'react';
import { DoubleSide, Group, Mesh, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench, Segment } from '@/components/lab3d/environment';
import { PolyLine } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — dissection d'une fleur de bissap (hibiscus) et fécondation (SVT, 4ème).
 *
 * On recadre sur l'objet d'étude : la fleur, disséquée pièce par pièce.
 *   layer 0 — fleur entière : calice (sépales) + corolle (pétales), pollinisateur
 *             au travail (abeille) ou nuage de pollen porté par le vent (mil).
 *   layer 1 — pétales retirés : l'androcée, 8 étamines = filet + anthère chargée
 *             de grains de pollen.
 *   layer 2 — étamines retirées : le pistil seul (stigmate, style, ovaire).
 *   layer 3 — ovaire ouvert en coupe : 3 ovules ; le grain de pollen germe et son
 *             tube pollinique descend le style jusqu'à un ovule (fécondation).
 *   layer 4 — après fécondation : l'ovaire devient le fruit (mangue en coupe),
 *             l'ovule fécondé devient la graine (le noyau).
 *
 * Les pièces retirées sont posées sur la paillasse, comme en vraie dissection.
 */

export type FlowerSceneProps = {
  /** Étape de dissection, 0 → 4. */
  layer: number;
  /** Agent transporteur du pollen observé sur la fleur entière. */
  vector: 'insecte' | 'vent';
  /** Libellé du stade, affiché sous le titre de la scène. */
  stage: string;
};

const GROUND_Y = -1.7;
const OVARY_Y = 0.16;
const OVARY_R = 0.3;
const STYLE_TOP = 1.08;
const TUBE_BOTTOM = OVARY_Y + 0.12;

const PETAL_A = [0, 1, 2, 3, 4].map((i) => (i / 5) * Math.PI * 2);
const SEPAL_A = [0, 1, 2, 3, 4].map((i) => (i / 5) * Math.PI * 2 + Math.PI / 5);
const STAMEN_A = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (i / 8) * Math.PI * 2);

/** Les 3 ovules alignés sur le placenta, dans l'ovaire. */
const OVULES: Vector3Tuple[] = [
  [-0.13, OVARY_Y - 0.04, 0],
  [0, OVARY_Y + 0.05, 0],
  [0.13, OVARY_Y - 0.04, 0],
];

/** Pièces florales posées sur la paillasse après retrait. */
const FALLEN_PETALS = [
  { x: -1.5, z: 0.6, r: 0.4 },
  { x: -1.15, z: 1.05, r: -0.7 },
  { x: -1.8, z: -0.15, r: 1.2 },
];
const FALLEN_STAMENS = [
  { x: 1.35, z: 0.55, r: 0.3 },
  { x: 1.65, z: 1.0, r: -0.5 },
  { x: 1.15, z: 1.2, r: 0.9 },
];

/** Grains de pollen emportés par le vent (fleurs de mil, de maïs, de riz). */
const WIND_GRAINS: Vector3Tuple[] = [
  [0, 1.15, 0.3], [0.35, 1.35, -0.2], [0.7, 0.95, 0.15], [1.05, 1.25, 0.45],
  [0.2, 0.8, -0.4], [0.55, 1.5, 0.05], [0.9, 1.05, -0.35], [1.3, 1.4, 0.2],
  [-0.3, 1.2, -0.1], [0.15, 1.45, 0.5], [0.8, 1.6, -0.15], [1.2, 0.85, 0.35],
];

/** Nuage de pollen dérivant horizontalement : pollinisation par le vent. */
function WindPollen() {
  const cloud = useRef<Group>(null);
  return (
    <group ref={cloud}>
      {WIND_GRAINS.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.034, 10, 8]} />
          <meshStandardMaterial color="#FBBF24" emissive="#F59E0B" emissiveIntensity={0.45} roughness={0.4} />
        </mesh>
      ))}
      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime;
          if (!cloud.current) return;
          cloud.current.position.x = ((t * 0.85) % 5) - 2.9;
          cloud.current.position.y = Math.sin(t * 2.1) * 0.09;
        }}
      />
    </group>
  );
}

/** Abeille butineuse : corps segmenté, ailes battantes, pollen collé au thorax. */
function Bee() {
  const bee = useRef<Group>(null);
  const wingL = useRef<Group>(null);
  const wingR = useRef<Group>(null);
  const wing = (
    <>
      <mesh position={[0.15, 0, -0.01]} scale={[0.15, 0.011, 0.062]}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial color="#E0F2FE" transparent opacity={0.42} roughness={0.1} />
      </mesh>
      <mesh position={[0.1, -0.01, -0.09]} scale={[0.095, 0.009, 0.045]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color="#E0F2FE" transparent opacity={0.36} roughness={0.1} />
      </mesh>
    </>
  );
  return (
    <group ref={bee}>
      {/* abdomen rayé */}
      <mesh position={[0, 0, -0.13]} scale={[0.072, 0.068, 0.115]} castShadow>
        <sphereGeometry args={[1, 20, 16]} />
        <meshStandardMaterial color="#F59E0B" roughness={0.65} />
      </mesh>
      {[-0.06, -0.13, -0.2].map((z) => (
        <mesh key={z} position={[0, 0, z]} scale={[0.073, 0.069, 0.016]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color="#3F2A12" roughness={0.8} />
        </mesh>
      ))}
      {/* thorax velu + pollen accroché */}
      <mesh position={[0, 0.01, 0.02]} castShadow>
        <sphereGeometry args={[0.071, 18, 14]} />
        <meshStandardMaterial color="#8A5220" roughness={0.95} />
      </mesh>
      {[[0.045, 0.05, 0.03], [-0.03, 0.06, -0.02], [0.01, 0.02, 0.07]].map((p, i) => (
        <mesh key={i} position={p as Vector3Tuple}>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshStandardMaterial color="#FDE047" emissive="#F59E0B" emissiveIntensity={0.4} />
        </mesh>
      ))}
      {/* tête + yeux + antennes */}
      <mesh position={[0, 0.004, 0.1]}>
        <sphereGeometry args={[0.053, 16, 12]} />
        <meshStandardMaterial color="#1F2937" roughness={0.6} />
      </mesh>
      <mesh position={[0.034, 0.018, 0.125]}>
        <sphereGeometry args={[0.019, 10, 8]} />
        <meshStandardMaterial color="#0B1220" roughness={0.2} />
      </mesh>
      <mesh position={[-0.034, 0.018, 0.125]}>
        <sphereGeometry args={[0.019, 10, 8]} />
        <meshStandardMaterial color="#0B1220" roughness={0.2} />
      </mesh>
      <Segment a={[0.02, 0.04, 0.13]} b={[0.055, 0.11, 0.2]} color="#111827" width={0.006} />
      <Segment a={[-0.02, 0.04, 0.13]} b={[-0.055, 0.11, 0.2]} color="#111827" width={0.006} />
      {/* trois paires de pattes */}
      {[0.06, 0, -0.06].map((z) => (
        <group key={z}>
          <Segment a={[0.05, -0.03, z]} b={[0.11, -0.11, z - 0.03]} color="#111827" width={0.006} />
          <Segment a={[-0.05, -0.03, z]} b={[-0.11, -0.11, z - 0.03]} color="#111827" width={0.006} />
        </group>
      ))}
      {/* deux paires d'ailes */}
      <group ref={wingL} position={[0.03, 0.06, 0]}>{wing}</group>
      <group ref={wingR} position={[-0.03, 0.06, 0]} rotation={[0, Math.PI, 0]}>{wing}</group>
      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime;
          const a = t * 0.6;
          bee.current?.position.set(Math.cos(a) * 1.15, 0.98 + Math.sin(t * 3.2) * 0.07, Math.sin(a) * 1.15);
          if (bee.current) bee.current.rotation.y = -a;
          const flap = 0.6 * Math.sin(t * 42);
          if (wingL.current) wingL.current.rotation.z = flap;
          if (wingR.current) wingR.current.rotation.z = flap;
        }}
      />
    </group>
  );
}

/** Germination du grain de pollen : le tube pollinique descend le style. */
function PollenTube() {
  const tube = useRef<Mesh>(null);
  const grain = useRef<Mesh>(null);
  const H = STYLE_TOP - TUBE_BOTTOM;
  const path: Vector3Tuple[] = [[0, STYLE_TOP, 0], [0, TUBE_BOTTOM, 0]];
  return (
    <group>
      <PolyLine points={path} color="#94A3B8" width={1.5} dashed />
      <group position={[0, STYLE_TOP, 0]}>
        <mesh ref={tube} position={[0, -H / 2, 0]}>
          <cylinderGeometry args={[0.028, 0.028, H, 12]} />
          <meshStandardMaterial color="#22D3EE" emissive="#0E7490" emissiveIntensity={0.55} transparent opacity={0.92} />
        </mesh>
      </group>
      <mesh ref={grain} position={[0, STYLE_TOP, 0]}>
        <sphereGeometry args={[0.055, 16, 12]} />
        <meshStandardMaterial color="#F59E0B" emissive="#D97706" emissiveIntensity={0.6} roughness={0.4} />
      </mesh>
      <Animate
        fn={(state) => {
          const p = Math.min(1, (state.clock.elapsedTime % 5.4) / 4);
          if (tube.current) {
            tube.current.scale.y = Math.max(0.001, p);
            tube.current.position.y = -(H * p) / 2;
          }
          grain.current?.position.set(0, STYLE_TOP - H * p, 0);
        }}
      />
    </group>
  );
}

export default function FlowerScene({ layer, vector, stage }: FlowerSceneProps) {
  const showPetals = layer === 0;
  const showStamens = layer <= 1;
  const cut = layer === 3;
  const fruit = layer >= 4;

  return (
    <LabScene cameraPosition={[0.5, 0.9, 4.3]} background="#FDF2F8" minDistance={2.4} maxDistance={9} groundY={GROUND_Y}>
      <LabBench y={GROUND_Y} color="#E7DCC6" size={20} />

      {/* Tige et feuilles */}
      <mesh position={[0, GROUND_Y + 0.79, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.085, 1.58, 12]} />
        <meshStandardMaterial color="#15803D" roughness={0.8} />
      </mesh>
      <mesh position={[0.42, -0.72, 0.05]} rotation={[0, 0.3, -0.45]} scale={[0.36, 0.045, 0.19]} castShadow>
        <sphereGeometry args={[1, 18, 12]} />
        <meshStandardMaterial color="#166534" roughness={0.85} />
      </mesh>
      <mesh position={[-0.4, -1.1, -0.1]} rotation={[0, -0.5, 0.5]} scale={[0.32, 0.04, 0.17]} castShadow>
        <sphereGeometry args={[1, 18, 12]} />
        <meshStandardMaterial color="#166534" roughness={0.85} />
      </mesh>

      {/* Réceptacle floral */}
      <mesh position={[0, -0.1, 0]}>
        <sphereGeometry args={[0.15, 18, 14]} />
        <meshStandardMaterial color="#4D7C0F" roughness={0.75} />
      </mesh>

      {/* Calice : les sépales protègent, ils restent jusqu'au fruit */}
      {SEPAL_A.map((a, i) => (
        <group key={i} rotation={[0, a, 0]}>
          <mesh position={[0.27, -0.13, 0]} rotation={[0, 0, 0.55]} scale={[0.3, 0.045, 0.13]} castShadow>
            <sphereGeometry args={[1, 16, 12]} />
            <meshStandardMaterial color="#3F6212" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Corolle : les pétales colorés attirent les insectes */}
      {showPetals &&
        PETAL_A.map((a, i) => (
          <group key={i} rotation={[0, a, 0]}>
            <mesh position={[0.5, 0.17, 0]} rotation={[0, 0, -0.34]} scale={[0.52, 0.045, 0.31]} castShadow>
              <sphereGeometry args={[1, 24, 16]} />
              <meshStandardMaterial color="#E11D48" roughness={0.5} side={DoubleSide} />
            </mesh>
            <mesh position={[0.2, 0.14, 0]} rotation={[0, 0, -0.34]} scale={[0.22, 0.04, 0.13]}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshStandardMaterial color="#9F1239" roughness={0.55} />
            </mesh>
          </group>
        ))}

      {/* Androcée : 8 étamines = filet + anthère pleine de pollen */}
      {showStamens &&
        STAMEN_A.map((a, i) => (
          <group key={i} rotation={[0, a, 0]}>
            <Segment a={[0.1, 0.26, 0]} b={[0.4, 0.9, 0]} color="#FDE68A" width={0.017} />
            <mesh position={[0.43, 0.96, 0]} rotation={[0, 0, -0.45]} scale={[0.095, 0.055, 0.055]} castShadow>
              <sphereGeometry args={[1, 16, 12]} />
              <meshStandardMaterial color="#D97706" roughness={0.6} />
            </mesh>
            <mesh position={[0.46, 1.02, 0.02]}>
              <sphereGeometry args={[0.026, 10, 8]} />
              <meshStandardMaterial color="#FDE047" emissive="#F59E0B" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[0.4, 1.01, -0.03]}>
              <sphereGeometry args={[0.022, 10, 8]} />
              <meshStandardMaterial color="#FDE047" emissive="#F59E0B" emissiveIntensity={0.5} />
            </mesh>
          </group>
        ))}

      {/* Gynécée : stigmate + style + ovaire (ou fruit après fécondation) */}
      {!fruit && (
        <>
          <mesh position={[0, STYLE_TOP + 0.06, 0]} scale={[1, 0.55, 1]} castShadow>
            <sphereGeometry args={[0.12, 20, 16]} />
            <meshStandardMaterial color="#DB2777" roughness={0.35} emissive="#9D174D" emissiveIntensity={0.2} />
          </mesh>
          <mesh position={[0, (STYLE_TOP + OVARY_Y + 0.2) / 2, 0]}>
            <cylinderGeometry args={[0.045, 0.055, STYLE_TOP - OVARY_Y - 0.2, 14]} />
            <meshStandardMaterial color="#A3E635" roughness={0.5} transparent={cut} opacity={cut ? 0.32 : 1} />
          </mesh>
          <mesh position={[0, OVARY_Y, 0]} scale={[OVARY_R, OVARY_R * 0.86, OVARY_R]} castShadow>
            <sphereGeometry args={cut ? [1, 40, 28, Math.PI, Math.PI] : [1, 36, 26]} />
            <meshStandardMaterial color="#65A30D" roughness={0.6} side={cut ? DoubleSide : undefined} />
          </mesh>
        </>
      )}

      {/* Ovules dans l'ovaire ouvert + fécondation en cours */}
      {cut && (
        <>
          {OVULES.map((p, i) => (
            <mesh key={i} position={p}>
              <sphereGeometry args={[0.068, 18, 14]} />
              <meshStandardMaterial color="#FEF3C7" roughness={0.4} emissive="#FDE68A" emissiveIntensity={0.25} />
            </mesh>
          ))}
          <PollenTube />
        </>
      )}

      {/* Après la fécondation : le fruit en coupe et sa graine */}
      {fruit && (
        <>
          <mesh position={[0, 0.24, 0]} scale={[0.44, 0.36, 0.38]} castShadow>
            <sphereGeometry args={[1, 40, 28, Math.PI, Math.PI]} />
            <meshStandardMaterial color="#F97316" roughness={0.45} side={DoubleSide} />
          </mesh>
          <mesh position={[0, 0.24, 0]} scale={[0.39, 0.31, 0.33]}>
            <sphereGeometry args={[1, 36, 26, Math.PI, Math.PI]} />
            <meshStandardMaterial color="#FDE68A" roughness={0.6} side={DoubleSide} />
          </mesh>
          <mesh position={[0, 0.24, 0.02]} scale={[0.2, 0.15, 0.07]}>
            <sphereGeometry args={[1, 24, 18]} />
            <meshStandardMaterial color="#EAD9A5" roughness={0.75} />
          </mesh>
          {/* style desséché : trace du pistil au sommet du fruit */}
          <mesh position={[0, 0.62, 0]}>
            <cylinderGeometry args={[0.018, 0.03, 0.14, 10]} />
            <meshStandardMaterial color="#78350F" roughness={0.9} />
          </mesh>
        </>
      )}

      {/* Pièces retirées, posées sur la paillasse */}
      {layer >= 1 &&
        FALLEN_PETALS.map((f, i) => (
          <mesh key={i} position={[f.x, GROUND_Y + 0.04, f.z]} rotation={[0, f.r, 0]} scale={[0.34, 0.035, 0.2]}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshStandardMaterial color="#BE123C" roughness={0.7} side={DoubleSide} />
          </mesh>
        ))}
      {layer >= 2 &&
        FALLEN_STAMENS.map((f, i) => (
          <group key={i} position={[f.x, GROUND_Y + 0.04, f.z]} rotation={[0, f.r, 0]}>
            <Segment a={[-0.16, 0, 0]} b={[0.14, 0, 0]} color="#FDE68A" width={0.016} />
            <mesh position={[0.18, 0.01, 0]} scale={[0.08, 0.045, 0.045]}>
              <sphereGeometry args={[1, 14, 10]} />
              <meshStandardMaterial color="#D97706" roughness={0.6} />
            </mesh>
          </group>
        ))}

      {/* Agent pollinisateur (seulement sur la fleur entière) */}
      {layer === 0 && (vector === 'insecte' ? <Bee /> : <WindPollen />)}

      {/* Annotations */}
      <SceneLabel position={[0, 2.05, 0]} title={stage} subtitle="Dissection florale · bissap" tone="svt" />

      {layer === 0 && (
        <>
          <Tag3D position={[1.25, 0.42, 0.3]} label="Pétale (corolle)" tone="svt" />
          <Tag3D position={[-1.1, -0.3, 0.25]} label="Sépale (calice)" tone="neutral" />
          <Tag3D position={[0.95, 1.28, 0]} label="Étamine" tone="chimie" />
          <Tag3D position={[-0.85, 1.45, 0]} label="Stigmate" tone="physique" />
          <Tag3D
            position={[1.6, 1.75, 0]}
            label={vector === 'insecte' ? "Abeille : pollen collé au corps" : 'Vent : pollen léger et abondant'}
            tone="maths"
          />
        </>
      )}
      {layer === 1 && (
        <>
          <Tag3D position={[1.05, 1.2, 0]} label="Anthère (grains de pollen)" tone="chimie" />
          <Tag3D position={[0.85, 0.52, 0]} label="Filet" tone="neutral" />
          <Tag3D position={[-0.95, 0.95, 0]} label="Pistil" tone="svt" />
        </>
      )}
      {layer === 2 && (
        <>
          <Tag3D position={[-0.82, 1.32, 0]} label="Stigmate" tone="physique" />
          <Tag3D position={[-0.78, 0.66, 0]} label="Style" tone="neutral" />
          <Tag3D position={[-0.9, 0.12, 0]} label="Ovaire" tone="svt" />
        </>
      )}
      {layer === 3 && (
        <>
          <Tag3D position={[-1.05, 1.32, 0]} label="Grain de pollen" tone="chimie" />
          <Tag3D position={[1.0, 0.72, 0]} label="Tube pollinique" tone="maths" />
          <Tag3D position={[-0.9, 0.06, 0.25]} label="Ovule (cellule femelle)" tone="svt" />
        </>
      )}
      {layer === 4 && (
        <>
          <Tag3D position={[1.15, 0.36, 0]} label="Fruit = ovaire grossi" tone="svt" />
          <Tag3D position={[-1.15, 0.16, 0.25]} label="Graine = ovule fécondé" tone="chimie" />
          <Tag3D position={[-1.3, -0.35, 0.3]} label="Sépales restants" tone="neutral" />
        </>
      )}

      {layer <= 1 ? (
        <Readout position={[1.95, 1.55, 0]} value="≈ 500" unit="grains" caption="pollen par anthère" />
      ) : (
        <Readout
          position={[1.95, 1.55, 0]}
          value={3}
          unit={fruit ? 'graines' : 'ovules'}
          caption={fruit ? 'ovules fécondés' : "dans l'ovaire"}
        />
      )}
    </LabScene>
  );
}
