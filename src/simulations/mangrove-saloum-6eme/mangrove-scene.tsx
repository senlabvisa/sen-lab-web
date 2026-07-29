'use client';

import { useMemo, useRef, type MutableRefObject } from 'react';
import type { Group, Mesh, Vector3Tuple } from 'three';
import {
  Animate,
  Arrow3D,
  LabScene,
  Liquid,
  PolyLine,
  Readout,
  SceneLabel,
  Tag3D,
  Wire,
} from '@/components/lab3d';

/**
 * Scène 3D — la mangrove du Delta du Saloum (SVT, 6ème).
 *
 * Coupe transversale d'une berge de bolong à Toubacouta :
 *   terre ferme (village) → berge → vasière → chenal du bolong.
 *
 * Deux palétuviers réellement différenciés :
 *   - Rhizophora (palétuvier rouge), côté eau : arceaux de racines-échasses
 *     construits en tubes courbes, huîtres de mangrove fixées sur les arceaux,
 *     propagules pendantes (la « bouture flottante » caractéristique) ;
 *   - Avicennia (palétuvier blanc/gris), côté terre : nappe de pneumatophores
 *     verticaux sortant de la vase. À marée basse l'air (O₂) descend jusqu'à
 *     leurs pointes (lenticelles) ; à marée haute ils sont noyés.
 *
 * La marée pilote tout : le plan d'eau monte de 0 à 1,5 m au-dessus de la vase
 * (marnage réel du Saloum). Quand l'eau recouvre les racines-échasses, les
 * juvéniles de poissons et de crevettes entrent s'abriter entre les arceaux.
 *
 * Le témoin `mangrove` compare la berge boisée et la berge dont les palétuviers
 * ont été coupés : la berge recule alors nettement vers le village, ce que
 * matérialisent le trait de la berge d'origine et la flèche de recul.
 */

export type MangroveSceneProps = {
  /** Palétuviers en place (true) ou coupés pour le bois (false). */
  mangrove: boolean;
  /** Hauteur d'eau au-dessus de la vase, en mètres. */
  niveau: number;
  /** Juvéniles comptés dans un quadrat de 1 m² de racines. */
  juveniles: number;
  /** Recul mesuré de la berge, en m/an. */
  recul: number;
  title: string;
  subtitle: string;
};

const VASE_Y = -1.0; // surface de la vasière
const LAND_Y = -0.5; // sommet de la berge / terre ferme
const SCALE = 0.5; // 1 m réel = 0,5 unité de scène
const BERGE_REF = -0.6; // trait de la berge d'origine
const RECUL_U = 1.55; // recul visuel quand la mangrove est coupée
const CHANNEL_X = 3.6; // début du chenal du bolong
const RHIZO_X = 2.0; // palétuvier rouge (côté eau)
const AVI_X = 0.5; // palétuvier blanc (côté terre)

/** 8 arceaux principaux + 8 arceaux secondaires, disposés en couronne. */
const ARCHES = Array.from({ length: 8 }, (_, i) => (i * Math.PI * 2) / 8);
const ARCHES2 = ARCHES.map((a) => a + Math.PI / 8);

/** Pneumatophores : semis en spirale (angle d'or) → répartition régulière. */
const PNEUMOS: [number, number][] = Array.from({ length: 26 }, (_, i) => {
  const a = i * 2.399;
  const r = 0.34 + 0.62 * Math.sqrt((i + 1) / 26);
  return [r * Math.cos(a), r * Math.sin(a)];
});

const AIR_POS: [number, number][] = [
  [-0.55, 0.3],
  [0.1, -0.5],
  [0.62, 0.24],
  [-0.2, 0.66],
  [0.45, -0.72],
  [-0.78, -0.2],
];

const FOLIAGE: [number, number, number, number][] = [
  [0, 1.62, 0, 0.56],
  [0.44, 1.38, 0.2, 0.38],
  [-0.4, 1.45, -0.16, 0.4],
  [0.14, 2.0, -0.12, 0.34],
  [-0.16, 1.8, 0.32, 0.33],
];

const AVI_FOLIAGE: [number, number, number, number][] = [
  [0, 1.12, 0, 0.44],
  [0.33, 0.96, 0.14, 0.29],
  [-0.3, 1.02, -0.12, 0.3],
];

/** Palétuvier rouge : tronc + arceaux de racines-échasses + houppier. */
function Rhizophora() {
  return (
    <group>
      {ARCHES.map((a, i) => {
        const cx = Math.cos(a);
        const cz = Math.sin(a);
        const pts: Vector3Tuple[] = [
          [0, 0.66, 0],
          [0.24 * cx, 0.56, 0.24 * cz],
          [0.44 * cx, 0.34, 0.44 * cz],
          [0.56 * cx, 0.08, 0.56 * cz],
          [0.6 * cx, -0.16, 0.6 * cz],
        ];
        return <Wire key={`ech-${i}`} points={pts} color="#6B4226" radius={0.05} />;
      })}
      {ARCHES2.map((a, i) => {
        const cx = Math.cos(a);
        const cz = Math.sin(a);
        const pts: Vector3Tuple[] = [
          [0, 0.44, 0],
          [0.2 * cx, 0.34, 0.2 * cz],
          [0.34 * cx, 0.14, 0.34 * cz],
          [0.4 * cx, -0.14, 0.4 * cz],
        ];
        return <Wire key={`ech2-${i}`} points={pts} color="#7A4E2D" radius={0.034} />;
      })}

      {/* Tronc */}
      <mesh position={[0, 0.98, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.19, 0.86, 14]} />
        <meshStandardMaterial color="#7A5433" roughness={0.92} />
      </mesh>

      {/* Houppier : feuilles épaisses et cireuses, vert sombre */}
      {FOLIAGE.map(([x, y, z, r], i) => (
        <mesh key={`f-${i}`} position={[x, y, z]} scale={[1, 0.78, 1]} castShadow>
          <sphereGeometry args={[r, 18, 14]} />
          <meshStandardMaterial color={i % 2 ? '#1F6B45' : '#2C8455'} roughness={0.72} />
        </mesh>
      ))}

      {/* Propagules : longues « boutures-crayons » qui pendent du houppier */}
      {([[0.3, 1.15, 0.24], [-0.28, 1.06, -0.1], [0.05, 1.12, -0.34]] as Vector3Tuple[]).map((p, i) => (
        <mesh key={`prop-${i}`} position={p} castShadow>
          <cylinderGeometry args={[0.02, 0.03, 0.46, 8]} />
          <meshStandardMaterial color="#7FA24E" roughness={0.6} />
        </mesh>
      ))}

      {/* Huîtres de mangrove fixées sur les arceaux (récolte de Toubacouta) */}
      {ARCHES.slice(0, 5).map((a, i) => (
        <mesh
          key={`hu-${i}`}
          position={[0.5 * Math.cos(a), 0.14 + 0.04 * i, 0.5 * Math.sin(a)]}
          scale={[1, 0.5, 1]}
          castShadow
        >
          <dodecahedronGeometry args={[0.1, 0]} />
          <meshStandardMaterial color="#D8D2C4" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/** Palétuvier blanc/gris : tronc court + nappe de pneumatophores verticaux. */
function Avicennia({ airRefs }: { airRefs: MutableRefObject<(Mesh | null)[]> }) {
  return (
    <group>
      {PNEUMOS.map(([x, z], i) => (
        <mesh key={`pn-${i}`} position={[x, 0.07, z]} castShadow>
          <coneGeometry args={[0.036, 0.19, 7]} />
          <meshStandardMaterial color="#8A6A47" roughness={0.94} />
        </mesh>
      ))}

      <mesh position={[0, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.16, 0.84, 12]} />
        <meshStandardMaterial color="#9C8B72" roughness={0.95} />
      </mesh>

      {AVI_FOLIAGE.map(([x, y, z, r], i) => (
        <mesh key={`af-${i}`} position={[x, y, z]} scale={[1, 0.72, 1]} castShadow>
          <sphereGeometry args={[r, 16, 12]} />
          <meshStandardMaterial color={i ? '#7E9A76' : '#6E8C68'} roughness={0.8} />
        </mesh>
      ))}

      {/* Bulles d'air : l'O₂ descend vers les lenticelles à marée basse */}
      {AIR_POS.map(([x, z], i) => (
        <mesh
          key={`air-${i}`}
          ref={(el) => {
            airRefs.current[i] = el;
          }}
          position={[x, 0.4, z]}
        >
          <sphereGeometry args={[0.045, 12, 10]} />
          <meshStandardMaterial color="#F8FAFC" emissive="#BAE6FD" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** Souche laissée par la coupe du bois de palétuvier. */
function Souche({ x, z = 0 }: { x: number; z?: number }) {
  return (
    <group position={[x, VASE_Y, z]}>
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.22, 0.24, 12]} />
        <meshStandardMaterial color="#5C4326" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.245, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.02, 12]} />
        <meshStandardMaterial color="#C9A97A" roughness={0.9} />
      </mesh>
      {[0.4, 2.1, 4.0].map((a, i) => (
        <mesh
          key={i}
          position={[0.3 * Math.cos(a), 0.02, 0.3 * Math.sin(a)]}
          rotation={[0.9, a, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.035, 0.05, 0.28, 8]} />
          <meshStandardMaterial color="#6B4226" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/** Juvénile de poisson (corps fuselé argenté + queue). */
function Juvenile() {
  return (
    <group>
      <mesh scale={[1.7, 0.82, 0.55]} castShadow>
        <sphereGeometry args={[0.085, 14, 10]} />
        <meshStandardMaterial color="#C7D8E8" roughness={0.35} metalness={0.25} />
      </mesh>
      <mesh position={[-0.15, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.07, 0.12, 8]} />
        <meshStandardMaterial color="#8FA9C0" roughness={0.4} />
      </mesh>
    </group>
  );
}

export default function MangroveScene({
  mangrove,
  niveau,
  juveniles,
  recul,
  title,
  subtitle,
}: MangroveSceneProps) {
  const berge = mangrove ? BERGE_REF : BERGE_REF - RECUL_U;
  const yWater = VASE_Y + niveau * SCALE;
  const pneumoSecs = mangrove && yWater < VASE_Y + 0.19;
  const nagent = yWater > VASE_Y + 0.3;
  const visibles = Math.min(7, Math.max(0, Math.round(juveniles / 7)));

  const fish = useRef<(Group | null)[]>([]);
  const air = useRef<(Mesh | null)[]>([]);
  const crabs = useRef<(Group | null)[]>([]);

  const traitBerge = useMemo<Vector3Tuple[]>(
    () => [
      [BERGE_REF, LAND_Y + 0.28, 2.9],
      [BERGE_REF, VASE_Y - 0.1, 2.9],
    ],
    [],
  );

  return (
    <LabScene cameraPosition={[1.0, 1.1, 8.2]} background="#DCEEF6" minDistance={4.5} maxDistance={18} groundY={VASE_Y}>
      {/* ── Terre ferme + berge ─────────────────────────────────────── */}
      <mesh position={[(berge - 7) / 2, (LAND_Y + VASE_Y - 0.55) / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[berge + 7, LAND_Y - VASE_Y + 0.55, 7]} />
        <meshStandardMaterial color="#D9C79C" roughness={0.96} />
      </mesh>

      {/* Vasière (vase grise gorgée de sel) */}
      <mesh position={[(berge + CHANNEL_X) / 2, VASE_Y - 0.28, 0]} receiveShadow>
        <boxGeometry args={[CHANNEL_X - berge, 0.55, 7]} />
        <meshStandardMaterial color="#8B8574" roughness={0.99} />
      </mesh>

      {/* Fond du chenal (bolong) */}
      <mesh position={[(CHANNEL_X + 6.8) / 2, VASE_Y - 0.83, 0]} receiveShadow>
        <boxGeometry args={[6.8 - CHANNEL_X, 0.55, 7]} />
        <meshStandardMaterial color="#6F6A5C" roughness={0.99} />
      </mesh>

      {/* ── Eau saumâtre : nappe sur la vasière + chenal permanent ──── */}
      {yWater > VASE_Y + 0.02 && (
        <mesh position={[(berge + CHANNEL_X) / 2, (VASE_Y + yWater) / 2, 0]}>
          <boxGeometry args={[CHANNEL_X - berge, yWater - VASE_Y, 7]} />
          <Liquid color="#2E86AB" opacity={0.52} />
        </mesh>
      )}
      <mesh position={[(CHANNEL_X + 6.8) / 2, (VASE_Y - 0.55 + yWater) / 2, 0]}>
        <boxGeometry args={[6.8 - CHANNEL_X, yWater - VASE_Y + 0.55, 7]} />
        <Liquid color="#2E86AB" opacity={0.52} />
      </mesh>

      {/* ── Village (case de Toubacouta) ────────────────────────────── */}
      <group position={[-4.3, LAND_Y, 1.1]}>
        <mesh position={[0, 0.26, 0]} castShadow>
          <cylinderGeometry args={[0.42, 0.45, 0.52, 14]} />
          <meshStandardMaterial color="#E0CDA6" roughness={0.94} />
        </mesh>
        <mesh position={[0, 0.75, 0]} castShadow>
          <coneGeometry args={[0.62, 0.5, 14]} />
          <meshStandardMaterial color="#8A6234" roughness={0.95} />
        </mesh>
      </group>

      {/* ── Palétuviers ou souches ──────────────────────────────────── */}
      {mangrove ? (
        <>
          <group position={[RHIZO_X, VASE_Y, 0]}>
            <Rhizophora />
          </group>
          <group position={[RHIZO_X - 1.05, VASE_Y, -1.7]} scale={0.72}>
            <Rhizophora />
          </group>
          <group position={[AVI_X, VASE_Y, 0.35]}>
            <Avicennia airRefs={air} />
          </group>
        </>
      ) : (
        <>
          <Souche x={RHIZO_X} />
          <Souche x={RHIZO_X - 1.05} z={-1.7} />
          <Souche x={AVI_X} z={0.35} />
        </>
      )}

      {/* ── Juvéniles de poissons entre les arceaux ─────────────────── */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <group
          key={`j-${i}`}
          ref={(el) => {
            fish.current[i] = el;
          }}
        >
          <Juvenile />
        </group>
      ))}

      {/* ── Crabes violonistes sur la vase découverte ───────────────── */}
      {[0, 1].map((i) => (
        <group
          key={`cr-${i}`}
          ref={(el) => {
            crabs.current[i] = el;
          }}
          position={[1.0 + i * 1.6, VASE_Y + 0.06, i ? 1.9 : -1.4]}
        >
          <mesh scale={[1.3, 0.55, 1]} castShadow>
            <sphereGeometry args={[0.11, 12, 10]} />
            <meshStandardMaterial color="#C2410C" roughness={0.7} />
          </mesh>
          <mesh position={[0.15, 0.02, 0.1]} castShadow>
            <sphereGeometry args={[0.06, 10, 8]} />
            <meshStandardMaterial color="#EA580C" roughness={0.65} />
          </mesh>
        </group>
      ))}

      {/* ── Repère d'érosion : berge d'origine + flèche de recul ────── */}
      <PolyLine points={traitBerge} color="#DC2626" width={3} dashed />
      {!mangrove && (
        <>
          <Arrow3D
            from={[BERGE_REF, LAND_Y + 0.14, 2.9]}
            to={[berge, LAND_Y + 0.14, 2.9]}
            color="#DC2626"
            radius={0.035}
            headLength={0.28}
          />
          <Tag3D position={[BERGE_REF - RECUL_U / 2, LAND_Y + 0.62, 2.9]} label="la berge a reculé" tone="physique" />
        </>
      )}
      <Tag3D position={[BERGE_REF + 0.15, LAND_Y + 0.3, 2.9]} label="berge d'origine" tone="neutral" />

      {/* ── Étiquettes pédagogiques ─────────────────────────────────── */}
      {mangrove && (
        <>
          <Tag3D position={[RHIZO_X + 1.0, VASE_Y + 0.45, 0]} label="racines-échasses (Rhizophora)" tone="svt" />
          <Tag3D position={[RHIZO_X + 0.9, VASE_Y + 0.04, 0.8]} label="huîtres de mangrove" tone="neutral" />
          <Tag3D
            position={[AVI_X - 1.15, VASE_Y + 0.34, 0.35]}
            label={pneumoSecs ? 'pneumatophores à l’air : O₂' : 'pneumatophores noyés'}
            tone={pneumoSecs ? 'svt' : 'physique'}
          />
        </>
      )}
      <Tag3D position={[5.3, yWater + 0.4, 0]} label="bolong · eau saumâtre 25 g/L" tone="maths" />
      <Tag3D position={[-4.3, LAND_Y + 1.4, 1.1]} label="village" tone="neutral" />

      <Readout position={[-2.7, VASE_Y + 1.5, 0]} value={niveau.toFixed(2)} unit="m" caption="hauteur d'eau" />
      <Readout position={[RHIZO_X + 1.2, VASE_Y + 1.4, 0]} value={juveniles} unit="/m²" caption="juvéniles abrités" />
      <Readout position={[-2.7, VASE_Y + 0.8, 2.6]} value={recul.toFixed(1)} unit="m/an" caption="recul de la berge" />

      <SceneLabel position={[0.6, VASE_Y + 3.2, 0]} title={title} subtitle={subtitle} tone="svt" />

      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime;
          fish.current.forEach((g, i) => {
            if (!g) return;
            g.visible = nagent && i < visibles;
            if (!g.visible) return;
            const R = 0.62 + 0.24 * (i % 3);
            const th = t * (0.42 + 0.07 * i) + i * 1.31;
            const y = Math.min(yWater - 0.12, VASE_Y + 0.24 + 0.09 * Math.sin(t * 1.7 + i));
            g.position.set(RHIZO_X + R * Math.cos(th), y, R * Math.sin(th));
            g.rotation.y = -th - Math.PI / 2;
            g.rotation.z = 0.13 * Math.sin(t * 4.2 + i);
          });
          air.current.forEach((m, i) => {
            if (!m) return;
            m.visible = pneumoSecs;
            if (!m.visible) return;
            const k = (t * 0.55 + i * 0.17) % 1;
            m.position.y = 0.58 - k * 0.42;
          });
          crabs.current.forEach((g, i) => {
            if (!g) return;
            g.visible = yWater < VASE_Y + 0.14;
            g.position.x = 1.0 + i * 1.6 + 0.28 * Math.sin(t * 0.7 + i * 2.2);
            g.rotation.y = 0.4 * Math.cos(t * 0.7 + i * 2.2);
          });
        }}
      />
    </LabScene>
  );
}
