'use client';

import { useMemo, useRef } from 'react';
import { Group, Mesh, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench } from '@/components/lab3d/environment';
import { Bar, Marker, PolyLine } from '@/components/lab3d/plot';
import { Readout, SceneLabel, Tag3D } from '@/components/lab3d/annotations';
import { HotspotCoach } from '@/components/lab/hotspot-coach';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — puissances d'un nombre (Maths, 4ème). Trois vues :
 *
 *  1. « materiel » — la croissance ×10 rendue matérielle, aux proportions exactes.
 *     10⁰ = 1 cube · 10¹ = 1 barre (10 cubes) · 10² = 1 plaque (10 barres) ·
 *     10³ = 1 gros cube (10 plaques). Pour les exposants NÉGATIFS, l'unité est
 *     découpée en 10, puis le dixième en 10, etc. : 10⁻ⁿ = 1/10ⁿ.
 *  2. « echelle » — axe LOGARITHMIQUE (<PolyLine>) de 10⁻¹² à 10¹² mètres, où
 *     l'élève place des grandeurs réelles. Un pas = ×10.
 *  3. « croissance » — 2ⁿ contre n² en barres : l'exponentielle écrase le carré.
 *
 * Doit être chargée via next/dynamic({ ssr: false }).
 */

export type SceneView = 'materiel' | 'echelle' | 'croissance';
export type ScaleMark = { label: string; exp: number; ok: boolean };

export type CubesSceneProps = {
  view: SceneView;
  /** Exposant courant de la vue « materiel » (−3 … 3). */
  exponent: number;
  /** Grandeurs déjà placées sur l'échelle logarithmique. */
  marks?: ScaleMark[];
  /** Écriture scientifique à afficher dans l'afficheur (vue « echelle »). */
  notation?: string;
};

// ── Matériel base 10 ──────────────────────────────────────────────────
const U = 0.17; // arête du cube-unité
const TEN = U * 10; // 1,7 — longueur d'une barre, côté d'une plaque et du gros cube
const GY = -1.25; // hauteur du plateau
const PIECE_COLOR = ['#F59E0B', '#16A34A', '#0EA5E9', '#7C3AED'];
const PIECE_NAME = ['cube', 'barre', 'plaque', 'gros cube'];

// ── Échelle logarithmique ─────────────────────────────────────────────
const AX = 3.8; // demi-longueur de l'axe (unités scène)
const E_MAX = 12; // l'axe couvre 10⁻¹² … 10¹²
const ex = (e: number) => (e / E_MAX) * AX;

// ── Comparaison 2ⁿ / n² ───────────────────────────────────────────────
const N_MAX = 8;
const YS = 3 / 2 ** N_MAX; // 2⁸ = 256 occupe 3 unités de haut
const xs = (n: number) => (n - 4.5) * 0.46;

const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

/** Exposant en exposant Unicode (offline-safe, pas de police à charger). */
function sup(n: number): string {
  const digits = Math.abs(n)
    .toString()
    .split('')
    .map((d) => SUP[Number(d)])
    .join('');
  return (n < 0 ? '⁻' : '') + digits;
}

/** Valeur décimale de 10ⁿ, écrite à la française. */
function fmt(n: number): string {
  if (n >= 0) return Math.round(10 ** n).toLocaleString('fr-FR');
  return (10 ** n).toFixed(-n).replace('.', ',');
}

function pieceArgs(k: number): [number, number, number] {
  if (k === 0) return [U, U, U];
  if (k === 1) return [TEN, U, U];
  if (k === 2) return [TEN, U, TEN];
  return [TEN, TEN, TEN];
}

function pieceHeight(k: number): number {
  return k === 3 ? TEN : U;
}

function Piece({ k, position, pale = false }: { k: number; position: Vector3Tuple; pale?: boolean }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={pieceArgs(k)} />
      <meshStandardMaterial
        color={pale ? '#CBD5E1' : PIECE_COLOR[k]}
        roughness={pale ? 0.9 : 0.42}
        metalness={pale ? 0 : 0.08}
      />
    </mesh>
  );
}

/** Rainures gravées : on doit pouvoir compter les 10 sous-pièces. */
function Grooves({ k, center }: { k: number; center: Vector3Tuple }) {
  const [cx, cy, cz] = center;
  const top = cy + pieceHeight(k) / 2 + 0.005;
  if (k === 1) {
    return (
      <>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} position={[cx - TEN / 2 + (i + 1) * U, top, cz]}>
            <boxGeometry args={[0.012, 0.006, U * 1.02]} />
            <meshStandardMaterial color="#0F172A" />
          </mesh>
        ))}
      </>
    );
  }
  if (k === 2) {
    return (
      <>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={`x${i}`} position={[cx - TEN / 2 + (i + 1) * U, top, cz]}>
            <boxGeometry args={[0.012, 0.006, TEN]} />
            <meshStandardMaterial color="#0F172A" />
          </mesh>
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={`z${i}`} position={[cx, top, cz - TEN / 2 + (i + 1) * U]}>
            <boxGeometry args={[TEN, 0.006, 0.012]} />
            <meshStandardMaterial color="#0F172A" />
          </mesh>
        ))}
      </>
    );
  }
  if (k === 3) {
    return (
      <>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={`y${i}`} position={[cx, cy - TEN / 2 + (i + 1) * U, cz + TEN / 2 + 0.006]}>
            <boxGeometry args={[TEN, 0.012, 0.006]} />
            <meshStandardMaterial color="#0F172A" />
          </mesh>
        ))}
      </>
    );
  }
  return null;
}

const BL = 3.2; // longueur de la réglette « unité » (exposants négatifs)

export default function CubesScene({ view, exponent, marks = [], notation }: CubesSceneProps) {
  const bob = useRef<Group>(null);
  const unit = useRef<Mesh>(null);
  const cell = useRef<Mesh>(null);
  const sweep = useRef<Mesh>(null);
  const rider = useRef<Mesh>(null);

  const k = Math.max(0, Math.min(3, exponent));
  const depth = Math.min(3, Math.max(1, -exponent)); // nombre de découpages successifs

  const axisPts = useMemo<Vector3Tuple[]>(() => [
    [-AX - 0.35, 0, 0],
    [AX + 0.35, 0, 0],
  ], []);

  const pow2Top = useMemo<Vector3Tuple[]>(
    () => Array.from({ length: N_MAX }, (_, i) => [xs(i + 1) - 0.12, 2 ** (i + 1) * YS, 0.16] as Vector3Tuple),
    [],
  );
  const sqTop = useMemo<Vector3Tuple[]>(
    () => Array.from({ length: N_MAX }, (_, i) => [xs(i + 1) + 0.12, (i + 1) ** 2 * YS, 0.16] as Vector3Tuple),
    [],
  );

  const okCount = marks.filter((m) => m.ok).length;

  const camera: Vector3Tuple =
    view === 'materiel' ? [0.6, 1.1, 7.2] : view === 'echelle' ? [0, 0.2, 8.2] : [0, 0.1, 6];

  return (
    <LabScene
      cameraPosition={camera}
      background={view === 'croissance' ? '#F0F9FF' : view === 'echelle' ? '#EEF2FF' : '#F5F3FF'}
      minDistance={4}
      maxDistance={16}
      groundY={view === 'materiel' ? GY : null}
    >
      {/* ══ Vue 1 — matériel base 10, exposant ≥ 0 ══ */}
      {view === 'materiel' && exponent >= 0 && (
        <>
          <LabBench y={GY} color="#EAE3D4" size={20} />
          <group ref={bob}>
            <Piece k={k} position={[0.55, GY + pieceHeight(k) / 2, 0]} />
            <Grooves k={k} center={[0.55, GY + pieceHeight(k) / 2, 0]} />
          </group>

          {k >= 1 && (
            <>
              <Piece k={k - 1} position={[-2.3, GY + pieceHeight(k - 1) / 2, 0]} pale />
              <Tag3D
                position={[-2.3, GY + pieceHeight(k - 1) + 0.4, 0]}
                label={`10${sup(k - 1)} = ${fmt(k - 1)} (1 ${PIECE_NAME[k - 1]})`}
                tone="neutral"
                distanceFactor={11}
              />
              <mesh ref={unit} position={[2.55, GY + U / 2, 0.6]} castShadow>
                <boxGeometry args={[U, U, U]} />
                <meshStandardMaterial color="#F59E0B" emissive="#B45309" emissiveIntensity={0.3} roughness={0.4} />
              </mesh>
              <Tag3D position={[2.55, GY + 0.45, 0.6]} label="1 unité" tone="neutral" distanceFactor={9} />
            </>
          )}

          <Tag3D
            position={[0.55, GY + pieceHeight(k) + 0.45, 0]}
            label={`1 ${PIECE_NAME[k]} = ${fmt(k)}`}
            tone="maths"
            distanceFactor={11}
          />
          {k === 0 && (
            <HotspotCoach position={[0.55, GY + 0.75, 0]} label="10⁰ = 1 : un seul cube" tone="violet" />
          )}
          {k >= 1 && (
            <Tag3D
              position={[-0.9, GY + pieceHeight(k) + 0.9, 0]}
              label={`×10 : 10 ${PIECE_NAME[k - 1]}s = 1 ${PIECE_NAME[k]}`}
              tone="svt"
              distanceFactor={11}
            />
          )}
        </>
      )}

      {/* ══ Vue 1 bis — exposant négatif : on découpe l'unité en 10, puis en 10… ══ */}
      {view === 'materiel' && exponent < 0 && (
        <>
          <LabBench y={GY} color="#EAE3D4" size={20} />
          {Array.from({ length: depth }, (_, i) => {
            const d = i + 1; // niveau 1 = découpage en dixièmes
            const y = GY + 0.55 + (depth - d) * 0.72;
            const deepest = d === depth;
            return (
              <group key={d}>
                <mesh position={[0, y, 0]} castShadow receiveShadow>
                  <boxGeometry args={[BL, 0.16, 0.42]} />
                  <meshStandardMaterial color="#E2E8F0" roughness={0.85} />
                </mesh>
                {Array.from({ length: 9 }, (_, j) => (
                  <mesh key={j} position={[-BL / 2 + ((j + 1) * BL) / 10, y, 0]}>
                    <boxGeometry args={[0.016, 0.175, 0.44]} />
                    <meshStandardMaterial color="#94A3B8" />
                  </mesh>
                ))}
                <mesh
                  ref={deepest ? cell : undefined}
                  position={[-BL / 2 + BL / 20, y, 0]}
                  castShadow
                >
                  <boxGeometry args={[BL / 10 - 0.03, 0.185, 0.45]} />
                  <meshStandardMaterial
                    color={PIECE_COLOR[Math.min(3, d)]}
                    emissive={deepest ? PIECE_COLOR[Math.min(3, d)] : '#000000'}
                    emissiveIntensity={deepest ? 0.3 : 0}
                    roughness={0.4}
                  />
                </mesh>
                <Tag3D
                  position={[BL / 2 + 0.75, y, 0]}
                  label={`10${sup(-d)} = ${fmt(-d)} = 1/10${sup(d)}`}
                  tone={deepest ? 'maths' : 'neutral'}
                  distanceFactor={11}
                />
                {d < depth && (
                  <>
                    <PolyLine
                      points={[
                        [-BL / 2, y - 0.1, 0.24],
                        [-BL / 2, y - 0.72 + 0.1, 0.24],
                      ]}
                      color="#7C3AED"
                      width={2}
                      dashed
                    />
                    <PolyLine
                      points={[
                        [-BL / 2 + BL / 10, y - 0.1, 0.24],
                        [BL / 2, y - 0.72 + 0.1, 0.24],
                      ]}
                      color="#7C3AED"
                      width={2}
                      dashed
                    />
                  </>
                )}
              </group>
            );
          })}
          <Tag3D
            position={[0, GY + 0.55 + depth * 0.72 + 0.15, 0]}
            label="on agrandit le premier dixième, puis on le coupe encore en 10"
            tone="svt"
            distanceFactor={12}
          />
        </>
      )}

      {view === 'materiel' && (
        <>
          <SceneLabel
            position={[0, 2.35, 0]}
            title={`10${sup(exponent)} = ${fmt(exponent)}`}
            subtitle={exponent >= 0 ? 'matériel base 10 · chaque étape ×10' : "l'unité découpée en dixièmes"}
            tone="maths"
          />
          <Readout position={[3.1, 1.6, 0]} value={`1 × 10${sup(exponent)}`} caption="écriture scientifique" />
        </>
      )}

      {/* ══ Vue 2 — échelle logarithmique des grandeurs réelles ══ */}
      {view === 'echelle' && (
        <>
          <PolyLine points={axisPts} color="#334155" width={4} />
          {Array.from({ length: 2 * E_MAX + 1 }, (_, i) => {
            const e = i - E_MAX;
            const major = e % 3 === 0;
            return (
              <mesh key={e} position={[ex(e), 0, 0]}>
                <boxGeometry args={[major ? 0.03 : 0.016, major ? 0.24 : 0.13, 0.03]} />
                <meshStandardMaterial color={major ? '#334155' : '#94A3B8'} />
              </mesh>
            );
          })}
          {[-12, -9, -6, -3, 0, 3, 6, 9, 12].map((e) => (
            <Tag3D key={e} position={[ex(e), -0.38, 0]} label={`10${sup(e)}`} tone="neutral" distanceFactor={11} />
          ))}

          {marks.map((m, i) => {
            const x = ex(m.exp);
            const y = 0.6 + (i % 3) * 0.52;
            return (
              <group key={m.label}>
                <PolyLine
                  points={[
                    [x, 0.05, 0],
                    [x, y - 0.1, 0],
                  ]}
                  color={m.ok ? '#16A34A' : '#F59E0B'}
                  width={2}
                  dashed={!m.ok}
                />
                <Marker position={[x, y, 0]} color={m.ok ? '#16A34A' : '#F59E0B'} size={0.1} />
                <Tag3D
                  position={[x, y + 0.3, 0]}
                  label={`${m.ok ? '✓ ' : ''}${m.label}`}
                  tone={m.ok ? 'svt' : 'neutral'}
                  distanceFactor={12}
                />
              </group>
            );
          })}

          <mesh ref={sweep} position={[-AX, 0, 0.2]}>
            <sphereGeometry args={[0.085, 18, 14]} />
            <meshStandardMaterial color="#7C3AED" emissive="#7C3AED" emissiveIntensity={0.5} />
          </mesh>

          <SceneLabel
            position={[0, 2.45, 0]}
            title="Échelle des ordres de grandeur (mètres)"
            subtitle="une graduation = ×10"
            tone="maths"
          />
          <Readout
            position={[-2.6, -1.25, 0]}
            value={`${okCount}/${marks.length}`}
            caption="grandeurs bien placées"
          />
          {notation && <Readout position={[2.3, -1.25, 0]} value={notation} caption="écriture scientifique" />}
        </>
      )}

      {/* ══ Vue 3 — 2ⁿ écrase n² ══ */}
      {view === 'croissance' && (
        <group position={[0, -1.5, 0]}>
          <PolyLine
            points={[
              [xs(0.4), 0, 0],
              [xs(N_MAX + 0.6), 0, 0],
            ]}
            color="#334155"
            width={3}
          />
          {Array.from({ length: N_MAX }, (_, i) => {
            const n = i + 1;
            return (
              <group key={n}>
                <Bar x={xs(n) - 0.12} height={2 ** n * YS} width={0.19} color="#7C3AED" depth={0.28} />
                <Bar x={xs(n) + 0.12} height={n ** 2 * YS} width={0.19} color="#0EA5E9" depth={0.28} />
                <Tag3D position={[xs(n), -0.28, 0]} label={`n=${n}`} tone="neutral" distanceFactor={13} />
              </group>
            );
          })}

          <PolyLine points={pow2Top} color="#7C3AED" width={3} />
          <PolyLine points={sqTop} color="#0EA5E9" width={3} />

          <PolyLine
            points={[
              [xs(5), 0, 0.3],
              [xs(5), 3.15, 0.3],
            ]}
            color="#DC2626"
            width={2}
            dashed
          />
          <Tag3D position={[xs(5) - 0.05, 2.1, 0.3]} label="2⁵ = 32 > 5² = 25" tone="physique" distanceFactor={12} />
          <Tag3D position={[xs(8) - 0.12, 2 ** 8 * YS + 0.28, 0.2]} label="2⁸ = 256" tone="chimie" distanceFactor={12} />
          <Tag3D position={[xs(8) + 0.45, 8 ** 2 * YS + 0.05, 0.2]} label="8² = 64" tone="maths" distanceFactor={12} />

          <mesh ref={rider} position={[xs(1) - 0.12, 2 * YS, 0.25]}>
            <sphereGeometry args={[0.09, 18, 14]} />
            <meshStandardMaterial color="#DC2626" emissive="#7F1D1D" emissiveIntensity={0.4} />
          </mesh>

          <SceneLabel position={[0, 3.85, 0]} title="2ⁿ (violet) contre n² (bleu)" subtitle="l'exponentielle écrase le carré" tone="maths" />
        </group>
      )}

      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime;
          if (bob.current) bob.current.position.setY(Math.sin(t * 1.4) * 0.035);
          if (unit.current) unit.current.scale.setScalar(1 + Math.sin(t * 3) * 0.14);
          if (cell.current) cell.current.scale.setY(1 + Math.sin(t * 3) * 0.22);
          if (sweep.current) sweep.current.position.setX(-AX + ((t * 0.35) % (2 * AX)));
          if (rider.current) {
            const n = 1 + ((t * 0.9) % N_MAX);
            rider.current.position.set(xs(n) - 0.12, 2 ** n * YS, 0.25);
          }
        }}
      />
    </LabScene>
  );
}
