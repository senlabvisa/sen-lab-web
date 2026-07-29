'use client';

import { useRef } from 'react';
import { DoubleSide, Group, Mesh, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench, Segment } from '@/components/lab3d/environment';
import { Bar, PolyLine } from '@/components/lab3d/plot';
import { Readout, SceneLabel, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — reproduction sexuée animale (SVT, 4ème).
 *
 * On recadre sur l'objet d'étude réel : les GAMÈTES, la CELLULE-ŒUF et
 * l'EMBRYON — jamais sur une silhouette d'animal bâclée.
 *
 *   stage 0 — les gamètes : ovule (membrane, cytoplasme, vitellus, noyau)
 *             face aux spermatozoïdes (tête + pièce intermédiaire + flagelle
 *             ondulant). La taille de l'ovule change selon l'espèce car les
 *             réserves (vitellus) changent.
 *   stage 1 — la rencontre : dans l'eau du fleuve (fécondation EXTERNE, tilapia)
 *             ou dans les voies génitales de la femelle (fécondation INTERNE,
 *             tortue verte et mouton Ladoum).
 *   stage 2 — la fécondation : un seul spermatozoïde entre, les deux noyaux
 *             fusionnent → la cellule-œuf.
 *   stage 3 — le développement : œuf de tilapia dans l'eau, œuf de tortue
 *             enfoui dans le sable (en coupe), ou utérus de brebis en coupe
 *             avec fœtus, cordon ombilical et placenta.
 *   stage 4 — les jeunes : diagramme du nombre de descendants (échelle log).
 */

export type Species = 'tilapia' | 'tortue' | 'mouton';

export type FecondationSceneProps = {
  /** Espèce sénégalaise observée. */
  species: Species;
  /** Étape du TP, 0 → 4. */
  stage: number;
  /** Libellé de l'étape affiché dans la scène. */
  label: string;
};

const GROUND_Y = -1.8;
const TAIL_N = 8;
const TAIL_LEN = 0.55;

type SpecCfg = {
  nom: string;
  externe: boolean;
  vivipare: boolean;
  /** Part du volume de l'ovule occupée par le vitellus (réserves). */
  vitellus: number;
  ovule: string;
  bench: string;
  fond: string;
  descendants: number;
  survivants: string;
};

const CFG: Record<Species, SpecCfg> = {
  tilapia: {
    nom: 'Tilapia du fleuve',
    externe: true,
    vivipare: false,
    vitellus: 0.78,
    ovule: '2',
    bench: '#C7B48A',
    fond: '#DCF2FB',
    descendants: 1000,
    survivants: '≈ 30',
  },
  tortue: {
    nom: 'Tortue verte',
    externe: false,
    vivipare: false,
    vitellus: 0.86,
    ovule: '30',
    bench: '#EBDDB6',
    fond: '#FDF6E3',
    descendants: 110,
    survivants: '≈ 0,1',
  },
  mouton: {
    nom: 'Mouton Ladoum',
    externe: false,
    vivipare: true,
    vitellus: 0.0,
    ovule: '0,12',
    bench: '#E4D8C8',
    fond: '#FDF2F8',
    descendants: 1.5,
    survivants: '≈ 1,4',
  },
};

/** Cellules folliculaires (corona radiata) réparties sur une sphère unité. */
const CORONA: Vector3Tuple[] = Array.from({ length: 26 }).map((_, i) => {
  const y = 1 - (i / 25) * 2;
  const rad = Math.sqrt(Math.max(0, 1 - y * y));
  const th = i * 2.39996;
  return [Math.cos(th) * rad, y, Math.sin(th) * rad];
});

// ── Spermatozoïde : tête, pièce intermédiaire, flagelle ondulant ──────────

function Sperm({ phase = 0 }: { phase?: number }) {
  const segs = useRef<(Mesh | null)[]>([]);
  const seg = TAIL_LEN / TAIL_N;
  return (
    <group>
      {/* acrosome + noyau haploïde : la tête */}
      <mesh position={[0.09, 0, 0]} scale={[0.075, 0.052, 0.052]} castShadow>
        <sphereGeometry args={[1, 18, 14]} />
        <meshStandardMaterial color="#1D4ED8" roughness={0.3} emissive="#1E3A8A" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0.15, 0, 0]} scale={[0.036, 0.044, 0.044]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#BFDBFE" roughness={0.2} />
      </mesh>
      {/* pièce intermédiaire : les mitochondries, moteur du flagelle */}
      <mesh position={[0.01, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.024, 0.032, 0.08, 10]} />
        <meshStandardMaterial color="#60A5FA" roughness={0.4} />
      </mesh>
      {/* flagelle : segments animés en onde sinusoïdale progressive */}
      {Array.from({ length: TAIL_N }).map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            segs.current[i] = m;
          }}
        >
          <cylinderGeometry args={[0.013, 0.009, seg * 1.2, 8]} />
          <meshStandardMaterial color="#93C5FD" roughness={0.45} />
        </mesh>
      ))}
      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime * 9 + phase;
          for (let i = 0; i < TAIL_N; i++) {
            const m = segs.current[i];
            if (!m) continue;
            const x = -0.03 - (i + 0.5) * seg;
            const amp = 0.03 + i * 0.014;
            const y = amp * Math.sin(11 * x + t);
            const dy = amp * 11 * Math.cos(11 * x + t);
            m.position.set(x, y, 0);
            m.rotation.z = Math.atan2(dy, 1) - Math.PI / 2;
          }
        }}
      />
    </group>
  );
}

/** Nuée de spermatozoïdes convergeant vers l'ovule. */
function SpermSwarm({ count, spread, speed }: { count: number; spread: number; speed: number }) {
  const grps = useRef<(Group | null)[]>([]);
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <group
          key={i}
          ref={(g) => {
            grps.current[i] = g;
          }}
        >
          <Sperm phase={i * 1.7} />
        </group>
      ))}
      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime;
          for (let i = 0; i < count; i++) {
            const g = grps.current[i];
            if (!g) continue;
            const a = (i / count) * Math.PI * 2;
            const p = (t * speed + i * 0.41) % 1;
            const r = 0.95 + spread * (1 - p);
            const x = Math.cos(a + p * 0.9) * r;
            const y = Math.sin(a * 1.7 + i) * spread * 0.35 * (1 - p) + 0.05;
            const z = Math.sin(a + p * 0.9) * r * 0.55;
            g.position.set(x, y, z);
            g.rotation.set(0, Math.atan2(z, -x), Math.atan2(-y, r));
          }
        }}
      />
    </group>
  );
}

// ── Ovule : membrane, cytoplasme, vitellus, noyau, corona radiata ─────────

function Ovule({
  vitellus,
  corona,
  r = 0.85,
  feconde = false,
}: {
  vitellus: number;
  corona: boolean;
  r?: number;
  feconde?: boolean;
}) {
  return (
    <group>
      <mesh castShadow>
        <sphereGeometry args={[r, 40, 28]} />
        <meshStandardMaterial
          color={feconde ? '#FCD34D' : '#FBCFE8'}
          transparent
          opacity={0.32}
          roughness={0.12}
          side={DoubleSide}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[r * 0.92, 36, 26]} />
        <meshStandardMaterial color="#FBD7E4" transparent opacity={0.5} roughness={0.3} />
      </mesh>
      {vitellus > 0.05 && (
        <mesh position={[0, -r * 0.06, 0]}>
          <sphereGeometry args={[r * vitellus, 32, 24]} />
          <meshStandardMaterial color="#F59E0B" roughness={0.55} emissive="#B45309" emissiveIntensity={0.18} />
        </mesh>
      )}
      <mesh position={[0, r * 0.52, r * 0.12]}>
        <sphereGeometry args={[r * 0.19, 22, 16]} />
        <meshStandardMaterial color="#7C3AED" roughness={0.3} emissive="#4C1D95" emissiveIntensity={0.35} />
      </mesh>
      {corona &&
        CORONA.map((d, i) => (
          <mesh key={i} position={[d[0] * r * 1.06, d[1] * r * 1.06, d[2] * r * 1.06]}>
            <sphereGeometry args={[r * 0.085, 12, 10]} />
            <meshStandardMaterial color="#F9A8D4" roughness={0.6} />
          </mesh>
        ))}
    </group>
  );
}

/** Un seul spermatozoïde entre : les deux noyaux fusionnent → cellule-œuf. */
function Fecondation({ vitellus }: { vitellus: number }) {
  const sperm = useRef<Group>(null);
  const male = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);
  return (
    <group>
      <Ovule vitellus={vitellus} corona={false} r={0.85} feconde />
      {/* membrane de fécondation : bloque les autres spermatozoïdes */}
      <mesh ref={halo}>
        <sphereGeometry args={[0.95, 32, 22]} />
        <meshStandardMaterial color="#FDE68A" transparent opacity={0.22} side={DoubleSide} />
      </mesh>
      {/* pronucléus femelle (fixe) et pronucléus mâle (apporté par la tête) */}
      <mesh position={[0.3, 0.12, 0]}>
        <sphereGeometry args={[0.15, 20, 14]} />
        <meshStandardMaterial color="#7C3AED" emissive="#4C1D95" emissiveIntensity={0.4} roughness={0.3} />
      </mesh>
      <mesh ref={male} position={[-0.55, 0.12, 0]}>
        <sphereGeometry args={[0.13, 20, 14]} />
        <meshStandardMaterial color="#2563EB" emissive="#1E3A8A" emissiveIntensity={0.4} roughness={0.3} />
      </mesh>
      <group ref={sperm}>
        <Sperm phase={0.4} />
      </group>
      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime % 7;
          const p = Math.min(1, t / 3);
          const q = Math.max(0, Math.min(1, (t - 3.4) / 2.2));
          if (sperm.current) {
            sperm.current.position.set(-2.5 + p * 1.6, 0.12, 0);
            sperm.current.visible = t < 3.3;
          }
          male.current?.position.set(-0.55 + q * 0.83, 0.12, 0);
          if (halo.current) {
            const s = t > 3.1 ? 1 : 0.001;
            halo.current.scale.setScalar(s);
          }
        }}
      />
    </group>
  );
}

/** Bulles qui remontent : on est bien dans l'eau du fleuve. */
function Bulles() {
  const g = useRef<Group>(null);
  const pts: Vector3Tuple[] = [
    [-2.2, -1.2, -0.5], [-1.6, -1.6, 0.4], [1.9, -1.4, -0.3],
    [2.4, -1.7, 0.5], [-2.6, -1.5, 0.2], [1.4, -1.75, -0.6],
  ];
  return (
    <group ref={g}>
      {pts.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.045 + (i % 3) * 0.016, 12, 10]} />
          <meshStandardMaterial color="#E0F2FE" transparent opacity={0.55} roughness={0.05} />
        </mesh>
      ))}
      <Animate
        fn={(state) => {
          if (g.current) g.current.position.y = (state.clock.elapsedTime * 0.5) % 3.2;
        }}
      />
    </group>
  );
}

/** Oviducte translucide en coupe : lieu de la fécondation interne. */
function Oviducte() {
  return (
    <group rotation={[0, 0, 0.14]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.35, 1.35, 5.4, 40, 1, true]} />
        <meshStandardMaterial color="#F472B6" transparent opacity={0.2} roughness={0.35} side={DoubleSide} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.22, 1.22, 5.4, 40, 1, true]} />
        <meshStandardMaterial color="#FBCFE8" transparent opacity={0.3} roughness={0.6} side={DoubleSide} />
      </mesh>
    </group>
  );
}

/** Embryon recroquevillé (fœtus d'agneau ou tortillon de tortue). */
function Embryon({ color, tete = '#F5D0C0' }: { color: string; tete?: string }) {
  const corps: Array<{ p: Vector3Tuple; r: number }> = [
    { p: [-0.05, 0.3, 0], r: 0.26 },
    { p: [0.24, 0.2, 0], r: 0.26 },
    { p: [0.41, -0.05, 0], r: 0.24 },
    { p: [0.38, -0.31, 0], r: 0.2 },
    { p: [0.19, -0.47, 0], r: 0.15 },
    { p: [-0.04, -0.51, 0], r: 0.1 },
  ];
  const pattes: Array<{ p: Vector3Tuple; s: Vector3Tuple }> = [
    { p: [0.06, -0.26, 0.17], s: [0.07, 0.19, 0.07] },
    { p: [0.06, -0.26, -0.17], s: [0.07, 0.19, 0.07] },
    { p: [-0.17, 0.02, 0.18], s: [0.06, 0.17, 0.06] },
    { p: [-0.17, 0.02, -0.18], s: [0.06, 0.17, 0.06] },
  ];
  return (
    <group>
      {corps.map((c, i) => (
        <mesh key={i} position={c.p} castShadow>
          <sphereGeometry args={[c.r, 20, 16]} />
          <meshStandardMaterial color={color} roughness={0.75} />
        </mesh>
      ))}
      <mesh position={[-0.34, 0.19, 0]} castShadow>
        <sphereGeometry args={[0.27, 22, 18]} />
        <meshStandardMaterial color={tete} roughness={0.7} />
      </mesh>
      <mesh position={[-0.55, 0.06, 0]} scale={[0.15, 0.11, 0.11]}>
        <sphereGeometry args={[1, 18, 14]} />
        <meshStandardMaterial color={tete} roughness={0.7} />
      </mesh>
      <mesh position={[-0.44, 0.29, 0.17]}>
        <sphereGeometry args={[0.045, 12, 10]} />
        <meshStandardMaterial color="#1F2937" roughness={0.2} />
      </mesh>
      {pattes.map((l, i) => (
        <mesh key={i} position={l.p} scale={l.s}>
          <sphereGeometry args={[1, 14, 12]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** Alevin de tilapia enroulé autour de sa vésicule vitelline, dans l'œuf. */
function Alevin() {
  const body = useRef<Group>(null);
  const seg: Array<{ p: Vector3Tuple; r: number }> = [
    { p: [-0.22, 0.32, 0], r: 0.075 },
    { p: [0.04, 0.4, 0], r: 0.08 },
    { p: [0.3, 0.32, 0], r: 0.072 },
    { p: [0.46, 0.12, 0], r: 0.058 },
    { p: [0.5, -0.1, 0], r: 0.042 },
    { p: [0.44, -0.29, 0], r: 0.028 },
  ];
  return (
    <group ref={body}>
      {seg.map((s, i) => (
        <mesh key={i} position={s.p}>
          <sphereGeometry args={[s.r, 16, 12]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.5} transparent opacity={0.9} />
        </mesh>
      ))}
      <mesh position={[-0.42, 0.24, 0]} scale={[0.12, 0.1, 0.1]}>
        <sphereGeometry args={[1, 18, 14]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.45} />
      </mesh>
      <mesh position={[-0.47, 0.28, 0.07]}>
        <sphereGeometry args={[0.04, 12, 10]} />
        <meshStandardMaterial color="#0F172A" roughness={0.15} />
      </mesh>
      <mesh position={[0.44, -0.42, 0]} scale={[0.05, 0.13, 0.02]}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial color="#E2E8F0" transparent opacity={0.75} />
      </mesh>
      <Animate
        fn={(state) => {
          if (body.current) body.current.rotation.z = Math.sin(state.clock.elapsedTime * 2.4) * 0.11;
        }}
      />
    </group>
  );
}

/** Diagramme du nombre de descendants (échelle logarithmique). */
function DiagrammeDescendants({ species }: { species: Species }) {
  const ordre: Species[] = ['tilapia', 'tortue', 'mouton'];
  const xs = [-1.5, 0, 1.5];
  return (
    <group position={[0, GROUND_Y + 0.02, 0]}>
      <Segment a={[-2.4, 0, 0]} b={[2.4, 0, 0]} color="#475569" width={0.02} />
      {ordre.map((sp, i) => {
        const n = CFG[sp].descendants;
        const h = Math.log10(n) * 0.78 + 0.22;
        const on = sp === species;
        return (
          <group key={sp} position={[xs[i], 0, 0]}>
            <Bar x={0} height={h} width={0.72} depth={0.72} color={on ? '#16A34A' : '#94A3B8'} />
            <Tag3D
              position={[0, h + 0.3, 0]}
              label={n >= 10 ? `${n} par ponte` : `${n} agneau(x)`}
              tone={on ? 'svt' : 'neutral'}
            />
            <Tag3D position={[0, -0.32, 0.4]} label={CFG[sp].nom} tone="neutral" />
          </group>
        );
      })}
    </group>
  );
}

export default function FecondationScene({ species, stage, label }: FecondationSceneProps) {
  const c = CFG[species];

  return (
    <LabScene
      cameraPosition={[0, 0.6, 5.6]}
      background={c.fond}
      minDistance={2.8}
      maxDistance={12}
      groundY={GROUND_Y}
    >
      <LabBench y={GROUND_Y} color={stage === 3 && species === 'tortue' ? '#E8CFA0' : c.bench} size={22} />

      {/* ── Étape 0 : les deux gamètes côte à côte ───────────────────── */}
      {stage === 0 && (
        <>
          <group position={[0.75, 0.15, 0]}>
            <Ovule vitellus={c.vitellus} corona={species === 'mouton'} r={0.9} />
          </group>
          <group position={[-1.9, 0.15, 0]}>
            <Sperm phase={0} />
          </group>
          <group position={[-1.9, -0.55, 0.4]} scale={0.9}>
            <Sperm phase={2.1} />
          </group>
          <group position={[-2.0, 0.85, -0.3]} scale={0.85}>
            <Sperm phase={4.2} />
          </group>
          <Tag3D position={[-1.8, 1.35, 0]} label="Spermatozoïde = gamète mâle" tone="physique" />
          <Tag3D position={[1.85, 1.15, 0]} label="Ovule = gamète femelle" tone="svt" />
          <Tag3D position={[1.55, 0.72, 0.5]} label="Noyau" tone="chimie" />
          {c.vitellus > 0.05 ? (
            <Tag3D position={[0.7, -0.85, 0.6]} label="Vitellus : les réserves du futur embryon" tone="maths" />
          ) : (
            <Tag3D position={[0.7, -0.9, 0.6]} label="Presque pas de réserves : le placenta nourrira" tone="maths" />
          )}
          <Readout position={[2.6, -0.55, 0]} value={c.ovule} unit="mm" caption="diamètre de l'ovule" />
        </>
      )}

      {/* ── Étape 1 : où les gamètes se rencontrent-ils ? ─────────────── */}
      {stage === 1 && (
        <>
          {c.externe ? (
            <>
              <Bulles />
              <group position={[-1.5, 0.2, -0.4]} scale={0.42}>
                <Ovule vitellus={c.vitellus} corona={false} r={0.9} />
              </group>
              <group position={[1.6, -0.5, 0.5]} scale={0.42}>
                <Ovule vitellus={c.vitellus} corona={false} r={0.9} />
              </group>
              <group position={[0.1, 0.25, 0]} scale={0.8}>
                <Ovule vitellus={c.vitellus} corona={false} r={0.9} />
                <SpermSwarm count={10} spread={2.4} speed={0.22} />
              </group>
              <Tag3D position={[0, 1.75, 0]} label="Eau du fleuve : fécondation EXTERNE" tone="maths" />
              <Tag3D position={[-2.1, 0.75, 0]} label="Ovules lâchés dans l'eau" tone="svt" />
              <Readout position={[2.5, 1.15, 0]} value="≈ 1 000" unit="ovules" caption="lâchés en une ponte" />
            </>
          ) : (
            <>
              <Oviducte />
              <group position={[0.9, 0.1, 0]} scale={0.78}>
                <Ovule vitellus={c.vitellus} corona={species === 'mouton'} r={0.9} />
                <SpermSwarm count={7} spread={2.2} speed={0.2} />
              </group>
              <Tag3D position={[-1.5, 1.6, 0]} label="Voies génitales de la femelle" tone="chimie" />
              <Tag3D position={[0, -1.35, 0]} label="Fécondation INTERNE : à l'abri, dans le corps" tone="maths" />
              <Readout position={[2.6, 1.1, 0]} value={1} unit="ovule" caption="libéré à la fois" />
            </>
          )}
        </>
      )}

      {/* ── Étape 2 : la fécondation, un seul spermatozoïde entre ─────── */}
      {stage === 2 && (
        <>
          <Fecondation vitellus={c.vitellus} />
          <Tag3D position={[-1.85, 0.75, 0]} label="Un seul spermatozoïde entre" tone="physique" />
          <Tag3D position={[1.85, 0.55, 0]} label="Les 2 noyaux fusionnent" tone="chimie" />
          <Tag3D position={[0, -1.35, 0]} label="Résultat : la cellule-œuf (1 seule cellule)" tone="svt" />
          <Readout position={[2.55, -0.75, 0]} value={2} unit="noyaux → 1" caption="fusion des gamètes" />
        </>
      )}

      {/* ── Étape 3 : où grandit l'embryon ? ──────────────────────────── */}
      {stage === 3 && species === 'tilapia' && (
        <>
          <Bulles />
          <mesh position={[0, 0.15, 0]} castShadow>
            <sphereGeometry args={[0.95, 40, 28]} />
            <meshStandardMaterial color="#DBEAFE" transparent opacity={0.28} roughness={0.05} side={DoubleSide} />
          </mesh>
          <group position={[0, 0.15, 0]}>
            <mesh position={[0, -0.18, 0]}>
              <sphereGeometry args={[0.46, 32, 24]} />
              <meshStandardMaterial color="#F59E0B" roughness={0.5} emissive="#B45309" emissiveIntensity={0.2} />
            </mesh>
            <Alevin />
          </group>
          <Tag3D position={[1.75, 0.85, 0]} label="Œuf transparent, dans l'eau" tone="maths" />
          <Tag3D position={[-1.75, -0.5, 0]} label="Vésicule vitelline : la nourriture" tone="svt" />
          <Tag3D position={[1.6, -0.75, 0.4]} label="Embryon (futur alevin)" tone="physique" />
          <Readout position={[-2.4, 1.1, 0]} value="3 à 5" unit="jours" caption="avant l'éclosion" />
        </>
      )}

      {stage === 3 && species === 'tortue' && (
        <>
          {/* nid enfoui : les œufs voisins, à demi dans le sable */}
          {[
            [-1.75, 0.1, -0.5], [-1.25, 0.02, 0.35], [1.35, 0.05, -0.4], [1.85, 0.0, 0.4],
          ].map((p, i) => (
            <mesh key={i} position={[p[0], GROUND_Y + 0.28, p[2]]} scale={[0.34, 0.36, 0.34]} castShadow>
              <sphereGeometry args={[1, 22, 16]} />
              <meshStandardMaterial color="#FAF5EA" roughness={0.85} />
            </mesh>
          ))}
          {/* œuf ouvert en coupe : coquille souple, albumen, jaune, embryon */}
          <group position={[0, -0.15, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[1.02, 40, 28, Math.PI, Math.PI]} />
              <meshStandardMaterial color="#F5EEDC" roughness={0.9} side={DoubleSide} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.95, 36, 26, Math.PI, Math.PI]} />
              <meshStandardMaterial color="#FEF9E7" transparent opacity={0.72} roughness={0.35} side={DoubleSide} />
            </mesh>
            <mesh position={[0, -0.12, 0.02]}>
              <sphereGeometry args={[0.52, 32, 24, Math.PI, Math.PI]} />
              <meshStandardMaterial color="#F59E0B" roughness={0.55} side={DoubleSide} />
            </mesh>
            {/* tortillon : carapace aplatie, tête, quatre nageoires */}
            <group position={[0, 0.28, 0.16]} scale={0.72}>
              <mesh scale={[1, 0.42, 0.9]} castShadow>
                <sphereGeometry args={[0.4, 24, 18]} />
                <meshStandardMaterial color="#3F6212" roughness={0.7} />
              </mesh>
              <mesh position={[-0.42, 0.02, 0]} scale={[0.16, 0.13, 0.13]}>
                <sphereGeometry args={[1, 18, 14]} />
                <meshStandardMaterial color="#4D7C0F" roughness={0.7} />
              </mesh>
              {[
                [0.2, -0.02, 0.36], [0.2, -0.02, -0.36], [-0.22, -0.02, 0.32], [-0.22, -0.02, -0.32],
              ].map((p, i) => (
                <mesh key={i} position={p as Vector3Tuple} scale={[0.2, 0.05, 0.1]}>
                  <sphereGeometry args={[1, 14, 10]} />
                  <meshStandardMaterial color="#4D7C0F" roughness={0.75} />
                </mesh>
              ))}
            </group>
          </group>
          <Tag3D position={[1.9, 0.65, 0]} label="Coquille souple = protection" tone="neutral" />
          <Tag3D position={[-1.9, -0.35, 0]} label="Jaune (vitellus) : réserves" tone="svt" />
          <Tag3D position={[1.7, -1.0, 0.4]} label="Œufs enfouis dans le sable" tone="maths" />
          <Readout position={[-2.4, 1.05, 0]} value={60} unit="jours" caption="incubation dans le sable" />
        </>
      )}

      {stage === 3 && species === 'mouton' && (
        <>
          {/* utérus en coupe : paroi musculeuse, cavité, fœtus, placenta */}
          <group position={[0, -0.05, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[1.2, 44, 32, Math.PI, Math.PI]} />
              <meshStandardMaterial color="#BE185D" roughness={0.75} side={DoubleSide} />
            </mesh>
            <mesh>
              <sphereGeometry args={[1.1, 40, 28, Math.PI, Math.PI]} />
              <meshStandardMaterial color="#FBCFE8" transparent opacity={0.55} roughness={0.4} side={DoubleSide} />
            </mesh>
            {/* placenta collé à la paroi, échanges mère ⇄ fœtus */}
            <mesh position={[0.05, 0.86, 0]} rotation={[0.35, 0, 0.2]}>
              <cylinderGeometry args={[0.4, 0.4, 0.11, 26]} />
              <meshStandardMaterial color="#9F1239" roughness={0.7} />
            </mesh>
            <group position={[0.02, -0.1, 0.06]} scale={0.92}>
              <Embryon color="#FBE3D3" />
            </group>
            <PolyLine
              points={[
                [0.06, 0.78, 0.05],
                [0.3, 0.5, 0.18],
                [0.18, 0.18, 0.24],
                [-0.06, 0.0, 0.2],
              ]}
              color="#E11D48"
              width={4}
            />
          </group>
          <Tag3D position={[1.85, 0.95, 0]} label="Placenta : nourrit le fœtus" tone="chimie" />
          <Tag3D position={[-1.9, 0.35, 0]} label="Cordon ombilical" tone="physique" />
          <Tag3D position={[1.7, -0.85, 0.4]} label="Fœtus dans l'utérus de la brebis" tone="svt" />
          <Readout position={[-2.45, 1.1, 0]} value={150} unit="jours" caption="gestation ≈ 5 mois" />
        </>
      )}

      {/* ── Étape 4 : combien de jeunes ? ─────────────────────────────── */}
      {stage === 4 && (
        <>
          <DiagrammeDescendants species={species} />
          <Tag3D position={[0, 1.75, 0]} label="Nombre de descendants (échelle log)" tone="maths" />
          <Readout position={[2.5, 0.95, 0]} value={c.survivants} unit="adultes" caption="survivants par ponte" />
        </>
      )}

      <SceneLabel position={[0, 2.35, 0]} title={label} subtitle={c.nom} tone="svt" />
    </LabScene>
  );
}
