'use client';

import { useMemo, useRef } from 'react';
import { DoubleSide, Group, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { GraphPaper, Segment } from '@/components/lab3d/environment';
import { Arrow3D, FunctionCurve, Marker, PolyLine } from '@/components/lab3d/plot';
import { Readout, SceneLabel, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — procréation humaine (SVT, 3ème).
 *
 * Deux vues, aucune représentation anatomique : on recadre sur le GRAPHE du
 * cycle et sur les CELLULES REPRODUCTRICES.
 *
 *  1. `cycle`      : courbes des hormones ovariennes (œstrogènes, progestérone)
 *                    et courbe de température basale sur 28 jours, avec les
 *                    quatre phases en bandes et un curseur « jour du cycle ».
 *  2. `fecondation`: l'ovule entouré de sa zone pellucide, les spermatozoïdes
 *                    qui convergent (un seul pénètre), puis la segmentation
 *                    (1 → 2 → 4 → 8 → 16 cellules), le blastocyste et la
 *                    nidation dans la muqueuse utérine.
 *
 * Données conformes au programme : cycle de 28 jours, ovulation à j14, plateau
 * thermique de ~0,4 °C après l'ovulation, nidation vers le 7e jour.
 */

export type CycleSceneProps = {
  /** Vue affichée. */
  view: 'cycle' | 'fecondation';
  /** Jour du cycle menstruel, 1 → 28. */
  day: number;
  /** Jour après la fécondation, 0 → 9. */
  devDay: number;
  /** Libellé de la phase du cycle (sous-titre de la vue « cycle »). */
  phaseLabel: string;
  /** Libellé du stade de développement (sous-titre de la vue « fécondation »). */
  stageLabel: string;
};

// ── Repère du graphe ────────────────────────────────────────────────────
const XA = -3;
const XB = 3;
const HB = -0.3; // ligne de base des hormones
const HS = 2.4; // échelle verticale des hormones (0 → 1)
const TB = -2.45; // ligne de base thermique = 36,2 °C
const TS = 1.65; // 1 °C → unités scène

const xOf = (d: number) => XA + ((d - 1) / 27) * (XB - XA);
const dOf = (x: number) => 1 + ((x - XA) / (XB - XA)) * 27;

/** Taux d'œstrogènes (0 → 1) : pic juste avant l'ovulation, second pic lutéal. */
function estrogene(d: number) {
  return 0.1 + 0.78 * Math.exp(-((d - 13) ** 2) / 9.68) + 0.42 * Math.exp(-((d - 21.5) ** 2) / 25.9);
}

/** Taux de progestérone (0 → 1) : sécrétée par le corps jaune après l'ovulation. */
function progesterone(d: number) {
  return 0.05 + (0.85 * Math.exp(-((d - 22) ** 2) / 20.5)) / (1 + Math.exp(-(d - 15) / 0.9));
}

/** Température basale (°C) : plateau thermique après l'ovulation. */
function tempAt(d: number) {
  if (d <= 12) return 36.5;
  if (d === 13) return 36.45;
  if (d === 14) return 36.35;
  if (d === 15) return 36.75;
  if (d === 16) return 36.88;
  if (d <= 26) return 36.95;
  if (d === 27) return 36.85;
  return 36.6;
}

const tempY = (d: number) => TB + (tempAt(d) - 36.2) * TS;

const PHASE_BANDS: Array<{ a: number; b: number; color: string; opacity: number }> = [
  { a: 1, b: 5.5, color: '#F87171', opacity: 0.22 },
  { a: 5.5, b: 13.5, color: '#7DD3FC', opacity: 0.18 },
  { a: 13.5, b: 14.5, color: '#FBBF24', opacity: 0.4 },
  { a: 14.5, b: 28, color: '#C4B5FD', opacity: 0.2 },
];

// ── Développement de l'embryon ──────────────────────────────────────────
/** Nombre de cellules au jour n après la fécondation (0 = pas encore divisé). */
function cellCount(d: number) {
  if (d <= 1) return 1;
  if (d === 2) return 2;
  if (d === 3) return 4;
  if (d === 4) return 8;
  return 16;
}

/** Disposition des cellules : le volume total reste constant (segmentation). */
function cellLayout(n: number, r: number): Vector3Tuple[] {
  if (n === 1) return [[0, 0, 0]];
  if (n === 2) {
    return [
      [-r * 0.92, 0, 0],
      [r * 0.92, 0, 0],
    ];
  }
  if (n === 4) {
    const k = r * 0.66;
    return [
      [k, k, k],
      [k, -k, -k],
      [-k, k, -k],
      [-k, -k, k],
    ];
  }
  if (n === 8) {
    const k = r * 0.62;
    const out: Vector3Tuple[] = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) out.push([sx * k, sy * k, sz * k]);
    return out;
  }
  const out: Vector3Tuple[] = [];
  const R = r * 1.75;
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * i) / (n - 1);
    const rad = Math.sqrt(Math.max(0, 1 - y * y));
    out.push([R * Math.cos(ga * i) * rad, R * y, R * Math.sin(ga * i) * rad]);
  }
  return out;
}

/** Un spermatozoïde : tête, pièce intermédiaire, flagelle. Tête vers +Z. */
function Spermatozoide() {
  const flagelle = useMemo<Vector3Tuple[]>(() => {
    const pts: Vector3Tuple[] = [];
    for (let i = 0; i <= 22; i++) {
      const u = i / 22;
      pts.push([Math.sin(u * Math.PI * 2.4) * 0.08 * u, 0, -0.14 - u * 0.85]);
    }
    return pts;
  }, []);
  return (
    <group>
      <mesh position={[0, 0, 0.05]} scale={[0.62, 0.8, 1]} castShadow>
        <sphereGeometry args={[0.12, 18, 14]} />
        <meshStandardMaterial color="#93C5FD" roughness={0.3} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0, -0.09]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.032, 0.05, 0.13, 10]} />
        <meshStandardMaterial color="#60A5FA" roughness={0.45} />
      </mesh>
      <PolyLine points={flagelle} color="#60A5FA" width={2.4} />
    </group>
  );
}

const SPERM_N = 7;
const SPERM_CYCLE = 7; // durée (s) d'un cycle d'animation

export default function CycleScene({ view, day, devDay, phaseLabel, stageLabel }: CycleSceneProps) {
  const embryon = useRef<Group>(null);
  const ovule = useRef<Group>(null);
  const sperms = useRef<Array<Group | null>>([]);

  // ── Vue « cycle » ────────────────────────────────────────────────────
  const tempPts = useMemo<Vector3Tuple[]>(() => {
    const pts: Vector3Tuple[] = [];
    for (let d = 1; d <= 28; d++) pts.push([xOf(d), tempY(d), 0]);
    return pts;
  }, []);

  // ── Vue « fécondation » ──────────────────────────────────────────────
  const n = cellCount(devDay);
  const rCell = 0.8 / Math.cbrt(n);
  const cells = useMemo(() => cellLayout(n, rCell), [n, rCell]);
  const blasto = devDay >= 6;
  const embryonY = devDay <= 6 ? 0.1 : devDay === 7 ? -0.55 : devDay === 8 ? -0.95 : -1.15;

  const corona = useMemo<Vector3Tuple[]>(() => {
    const pts: Vector3Tuple[] = [];
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < 26; i++) {
      const y = 1 - (2 * i) / 25;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      pts.push([1.14 * Math.cos(ga * i) * rad, 1.14 * y, 1.14 * Math.sin(ga * i) * rad]);
    }
    return pts;
  }, []);

  const trophoblaste = useMemo<Vector3Tuple[]>(() => {
    const pts: Vector3Tuple[] = [];
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < 24; i++) {
      const y = 1 - (2 * i) / 23;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      pts.push([0.76 * Math.cos(ga * i) * rad, 0.76 * y, 0.76 * Math.sin(ga * i) * rad]);
    }
    return pts;
  }, []);

  const vaisseaux = useMemo<Vector3Tuple[][]>(() => {
    const out: Vector3Tuple[][] = [];
    for (let k = 0; k < 5; k++) {
      const x0 = -2.2 + k * 1.1;
      const pts: Vector3Tuple[] = [];
      for (let i = 0; i <= 16; i++) {
        const u = i / 16;
        pts.push([x0 + Math.sin(u * 5.2 + k) * 0.28, -1.98 + u * 0.82, 0.42 + Math.cos(u * 3.1 + k) * 0.35]);
      }
      out.push(pts);
    }
    return out;
  }, []);

  const isCycle = view === 'cycle';

  return (
    <LabScene
      cameraPosition={isCycle ? [0, 0.2, 8] : [0, -0.15, 6.6]}
      background={isCycle ? '#F4F7FD' : '#FDF6F7'}
      minDistance={isCycle ? 4 : 3.2}
      maxDistance={isCycle ? 14 : 11}
      groundY={null}
    >
      {isCycle ? (
        <>
          <GraphPaper width={7} height={5.6} step={0.5} z={-0.12} />

          {/* Les quatre phases du cycle, en bandes */}
          {PHASE_BANDS.map((b, i) => (
            <mesh key={i} position={[(xOf(b.a) + xOf(b.b)) / 2, HB + (HS + 0.15) / 2, -0.08]}>
              <planeGeometry args={[Math.max(0.05, xOf(b.b) - xOf(b.a)), HS + 0.15]} />
              <meshStandardMaterial color={b.color} transparent opacity={b.opacity} side={DoubleSide} />
            </mesh>
          ))}

          {/* Axes du panneau hormonal */}
          <Arrow3D from={[XA - 0.35, HB, 0]} to={[XB + 0.45, HB, 0]} color="#64748B" radius={0.016} headLength={0.18} />
          <Arrow3D from={[XA - 0.35, HB - 0.08, 0]} to={[XA - 0.35, HB + HS + 0.3, 0]} color="#64748B" radius={0.016} headLength={0.18} />
          {[7, 14, 21, 28].map((d) => (
            <Segment key={d} a={[xOf(d), HB - 0.11, 0]} b={[xOf(d), HB + 0.02, 0]} color="#64748B" width={0.012} />
          ))}

          {/* Courbes hormonales réelles */}
          <FunctionCurve fn={(x) => HB + estrogene(dOf(x)) * HS} from={XA} to={XB} samples={140} color="#0EA5E9" width={3.4} />
          <FunctionCurve fn={(x) => HB + progesterone(dOf(x)) * HS} from={XA} to={XB} samples={140} color="#7C3AED" width={3.4} />

          {/* Panneau thermique */}
          <Segment a={[XA - 0.35, TB, 0]} b={[XB + 0.35, TB, 0]} color="#94A3B8" width={0.012} />
          <Segment a={[XA - 0.35, TB + 0.3 * TS, 0]} b={[XB + 0.35, TB + 0.3 * TS, 0]} color="#CBD5E1" width={0.008} />
          <PolyLine points={tempPts} color="#DC2626" width={3.2} />

          {/* Repère de l'ovulation + curseur du jour choisi */}
          <Segment a={[xOf(14), TB - 0.12, -0.02]} b={[xOf(14), HB + HS + 0.25, -0.02]} color="#F59E0B" width={0.02} />
          <Segment a={[xOf(day), TB - 0.18, 0.05]} b={[xOf(day), HB + HS + 0.3, 0.05]} color="#0F172A" width={0.013} />
          <Marker position={[xOf(day), HB + estrogene(day) * HS, 0.05]} color="#0EA5E9" size={0.11} />
          <Marker position={[xOf(day), HB + progesterone(day) * HS, 0.05]} color="#7C3AED" size={0.11} />
          <Marker position={[xOf(day), tempY(day), 0.05]} color="#DC2626" size={0.11} />

          <SceneLabel position={[0, 3.05, 0]} title={`Jour ${day} / 28`} subtitle={phaseLabel} tone="svt" />
          <Tag3D position={[xOf(14), 2.55, 0]} label="Ovulation · j14" tone="neutral" />
          <Tag3D position={[-2.15, 2.35, 0]} label="Œstrogènes" tone="maths" />
          <Tag3D position={[-2.1, 1.9, 0]} label="Progestérone" tone="chimie" />
          <Tag3D position={[-2.2, -0.95, 0]} label="Température basale" tone="neutral" />
          <Readout position={[2.5, -0.95, 0]} value={tempAt(day).toFixed(2)} unit="°C" caption="température" />
        </>
      ) : (
        <>
          {/* Muqueuse utérine (endomètre) — visible au moment de la nidation */}
          {devDay >= 7 && (
            <group position={[0, -1.95, 0]}>
              <mesh receiveShadow>
                <boxGeometry args={[6.4, 0.9, 3]} />
                <meshStandardMaterial color="#E08795" roughness={0.9} />
              </mesh>
              {[-2.4, -1.6, -0.8, 0.8, 1.6, 2.4].map((x) => (
                <mesh key={x} position={[x, 0.42, 0.2]} scale={[1, 0.55, 1]}>
                  <sphereGeometry args={[0.34, 16, 12]} />
                  <meshStandardMaterial color="#E9909D" roughness={0.9} />
                </mesh>
              ))}
              {vaisseaux.map((v, i) => (
                <PolyLine key={i} points={v.map((p) => [p[0], p[1] + 1.95, p[2]] as Vector3Tuple)} color="#B91C1C" width={2.2} />
              ))}
            </group>
          )}

          {devDay === 0 ? (
            <group ref={ovule}>
              {/* Couronne de cellules folliculaires */}
              {corona.map((p, i) => (
                <mesh key={i} position={p}>
                  <sphereGeometry args={[0.115, 12, 10]} />
                  <meshStandardMaterial color="#F9C6D0" roughness={0.7} />
                </mesh>
              ))}
              {/* Zone pellucide : franchie par un seul spermatozoïde */}
              <mesh>
                <sphereGeometry args={[1, 40, 28]} />
                <meshStandardMaterial color="#FDE68A" transparent opacity={0.3} roughness={0.15} side={DoubleSide} />
              </mesh>
              {/* Cytoplasme + noyau de l'ovule (23 chromosomes) */}
              <mesh castShadow>
                <sphereGeometry args={[0.85, 40, 28]} />
                <meshStandardMaterial color="#F6B49F" roughness={0.5} emissive="#C2410C" emissiveIntensity={0.08} />
              </mesh>
              <mesh position={[0.2, 0.16, 0.34]}>
                <sphereGeometry args={[0.3, 24, 18]} />
                <meshStandardMaterial color="#A855F7" roughness={0.35} emissive="#6B21A8" emissiveIntensity={0.2} />
              </mesh>
            </group>
          ) : (
            <group ref={embryon} position={[0, embryonY, 0]}>
              {/* Zone pellucide, conservée jusqu'au blastocyste */}
              {!blasto && (
                <mesh>
                  <sphereGeometry args={[0.95, 36, 26]} />
                  <meshStandardMaterial color="#FDE68A" transparent opacity={0.22} roughness={0.15} side={DoubleSide} />
                </mesh>
              )}
              {blasto ? (
                <>
                  {/* Cavité (blastocèle) + trophoblaste + bouton embryonnaire */}
                  <mesh>
                    <sphereGeometry args={[0.72, 36, 26]} />
                    <meshStandardMaterial color="#FBCFE8" transparent opacity={0.38} roughness={0.3} side={DoubleSide} />
                  </mesh>
                  {trophoblaste.map((p, i) => (
                    <mesh key={i} position={p}>
                      <sphereGeometry args={[0.13, 14, 10]} />
                      <meshStandardMaterial color="#F6B49F" roughness={0.55} />
                    </mesh>
                  ))}
                  {[
                    [0, 0.4, 0.18],
                    [0.22, 0.44, -0.05],
                    [-0.2, 0.42, 0.02],
                    [0.04, 0.24, -0.12],
                    [-0.08, 0.22, 0.2],
                  ].map((p, i) => (
                    <mesh key={i} position={p as Vector3Tuple}>
                      <sphereGeometry args={[0.16, 16, 12]} />
                      <meshStandardMaterial color="#C084FC" roughness={0.45} />
                    </mesh>
                  ))}
                </>
              ) : (
                cells.map((p, i) => (
                  <group key={i} position={p}>
                    <mesh castShadow>
                      <sphereGeometry args={[rCell, 30, 22]} />
                      <meshStandardMaterial color="#F6B49F" roughness={0.5} />
                    </mesh>
                    <mesh position={[0, 0, rCell * 0.32]}>
                      <sphereGeometry args={[rCell * 0.36, 18, 14]} />
                      <meshStandardMaterial color="#A855F7" roughness={0.35} emissive="#6B21A8" emissiveIntensity={0.18} />
                    </mesh>
                  </group>
                ))
              )}
            </group>
          )}

          {/* Spermatozoïdes : ils convergent, un seul franchit la zone pellucide */}
          {devDay === 0 &&
            Array.from({ length: SPERM_N }).map((_, i) => (
              <group
                key={i}
                ref={(el) => {
                  sperms.current[i] = el;
                }}
              >
                <Spermatozoide />
              </group>
            ))}

          <Animate
            fn={(state) => {
              const t = state.clock.elapsedTime;
              if (devDay === 0) {
                const p = (t % SPERM_CYCLE) / SPERM_CYCLE;
                const approche = Math.min(1, p / 0.62);
                for (let i = 0; i < SPERM_N; i++) {
                  const g = sperms.current[i];
                  if (!g) continue;
                  const gagnant = i === 0;
                  const az = (i / SPERM_N) * Math.PI * 2 + 0.45;
                  const el = Math.sin(i * 2.1) * 0.5;
                  const dist = gagnant ? 3.1 - 3.1 * approche : 3.1 - 1.95 * approche;
                  const w = 0.12 * Math.sin(t * 7 + i * 1.7);
                  g.position.set(
                    Math.cos(az) * Math.cos(el) * dist + w,
                    Math.sin(el) * dist * 0.55 + w * 0.6,
                    Math.sin(az) * Math.cos(el) * dist,
                  );
                  g.lookAt(0, 0, 0);
                  g.visible = gagnant ? p < 0.64 : true;
                }
                if (ovule.current) {
                  const b = p > 0.64 && p < 0.88 ? Math.sin(((p - 0.64) / 0.24) * Math.PI) : 0;
                  ovule.current.scale.setScalar(1 + 0.055 * b);
                  ovule.current.rotation.y = t * 0.12;
                }
              } else if (embryon.current) {
                embryon.current.rotation.y = t * 0.28;
              }
            }}
          />

          <SceneLabel
            position={[0, 2.1, 0]}
            title={devDay === 0 ? 'Fécondation' : `${devDay} jour(s) après la fécondation`}
            subtitle={stageLabel}
            tone="svt"
          />
          {devDay === 0 ? (
            <>
              <Tag3D position={[-1.55, 0.55, 0.4]} label="Ovule" tone="svt" />
              <Tag3D position={[0.15, 1.35, 0.5]} label="Zone pellucide" tone="chimie" />
              <Tag3D position={[2.35, -1.1, 0]} label="Spermatozoïdes" tone="maths" />
            </>
          ) : (
            <>
              <Tag3D position={[-1.6, embryonY + 0.7, 0.3]} label={blasto ? 'Blastocyste' : 'Cellules (blastomères)'} tone="svt" />
              {devDay >= 7 && <Tag3D position={[2.05, -1.35, 0.9]} label="Muqueuse utérine" tone="neutral" />}
            </>
          )}
          <Readout
            position={[2.3, 1.15, 0]}
            value={devDay === 0 ? '23 + 23' : blasto ? '≈ 100' : String(n)}
            unit={devDay === 0 ? 'chr.' : 'cell.'}
            caption={devDay === 0 ? 'chromosomes' : 'cellules'}
          />
        </>
      )}
    </LabScene>
  );
}
