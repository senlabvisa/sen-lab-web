'use client';

import { useMemo, useRef } from 'react';
import { DoubleSide, Shape, type Mesh, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { GraphPaper } from '@/components/lab3d/environment';
import { PolyLine, DataPoints } from '@/components/lab3d/plot';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — Théorème de Pythagore et sa réciproque (4ème, Maths).
 *
 * Mode « aires » : démonstration visuelle. Un vrai carré est construit sur
 * chacun des trois côtés du triangle rectangle. Les deux petits carrés sont
 * pavés de carreaux unités (a² carreaux bleus, b² carreaux orange) que
 * l'élève peut compter. L'animation transfère ces carreaux vers le grand
 * carré, qui se remplit exactement : a² + b² = c².
 *
 * Mode « réciproque » : le triangle est construit à partir de ses trois
 * longueurs (loi des cosinus, donc géométrie exacte). L'angle en C est
 * mesuré : il vaut 90° si et seulement si a² + b² = c².
 */

export type PythagoreSceneProps = {
  /** Côté de l'angle droit porté par l'axe des abscisses (CB). */
  a: number;
  /** Second côté de l'angle droit (CA). */
  b: number;
  mode?: 'aires' | 'reciproque';
  /** Mode réciproque : longueur du troisième côté (AB), le plus grand. */
  cTest?: number;
  /** Mode aires : lance le transfert animé des carreaux. */
  transfer?: boolean;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

const BLUE = '#3B82F6';
const AMBER = '#F59E0B';
const GREEN = '#10B981';

export default function PythagoreScene({ a, b, mode = 'aires', cTest = 5, transfer = false }: PythagoreSceneProps) {
  if (mode === 'reciproque') return <ReciproqueScene a={a} b={b} c={cTest} />;
  return <AiresScene a={a} b={b} transfer={transfer} />;
}

// ──────────────────────────────────────────────────────────────────────
// Mode « aires » — les trois carrés et le transfert des carreaux
// ──────────────────────────────────────────────────────────────────────

type Cell = { x: number; y: number; kind: 'a' | 'b' };

function AiresScene({ a, b, transfer }: { a: number; b: number; transfer: boolean }) {
  const tiles = useRef<(Mesh | null)[]>([]);
  const fill = useRef<Mesh>(null);

  const c = Math.hypot(a, b);
  const c2 = a * a + b * b;

  const { cells, s, cx, cy, tx, ty, tilt } = useMemo(() => {
    const cs: Cell[] = [];
    for (let i = 0; i < a; i++) for (let j = 0; j < a; j++) cs.push({ x: i + 0.5, y: -(j + 0.5), kind: 'a' });
    for (let i = 0; i < b; i++) for (let j = 0; j < b; j++) cs.push({ x: -(i + 0.5), y: j + 0.5, kind: 'b' });
    // Emprise de la figure : x ∈ [−b ; a+b], y ∈ [−a ; a+b]
    const spanX = a + 2 * b;
    const spanY = 2 * a + b;
    return {
      cells: cs,
      s: 5.6 / Math.max(spanX, spanY),
      cx: a / 2,
      cy: b / 2,
      tx: (a + b) / 2, // centre du carré de l'hypoténuse
      ty: (a + b) / 2,
      tilt: -Math.atan2(b, a),
    };
  }, [a, b]);

  const triangle: Vector3Tuple[] = [
    [0, 0, 0.08],
    [a, 0, 0.08],
    [0, b, 0.08],
    [0, 0, 0.08],
  ];
  const sqA: Vector3Tuple[] = [
    [0, 0, 0.05],
    [a, 0, 0.05],
    [a, -a, 0.05],
    [0, -a, 0.05],
    [0, 0, 0.05],
  ];
  const sqB: Vector3Tuple[] = [
    [0, 0, 0.05],
    [0, b, 0.05],
    [-b, b, 0.05],
    [-b, 0, 0.05],
    [0, 0, 0.05],
  ];
  const sqC: Vector3Tuple[] = [
    [0, b, 0.05],
    [a, 0, 0.05],
    [a + b, a, 0.05],
    [b, a + b, 0.05],
    [0, b, 0.05],
  ];
  const rightAngle: Vector3Tuple[] = [
    [0.5, 0, 0.1],
    [0.5, 0.5, 0.1],
    [0, 0.5, 0.1],
  ];

  return (
    <LabScene cameraPosition={[0, 0.2, 10.5]} background="#F5F7FF" minDistance={6} maxDistance={18} groundY={null}>
      <group position={[-cx * s, -cy * s, 0]} scale={s}>
        <group position={[cx, cy, 0]}>
          <GraphPaper width={a + 2 * b + 1.2} height={2 * a + b + 1.2} step={1} z={-0.25} color="#DBE3F4" />
        </group>

        {/* Carré de l'hypoténuse : plaque vide + remplissage qui monte */}
        <group position={[0, b, 0]} rotation={[0, 0, tilt]}>
          <mesh position={[c / 2, c / 2, 0]}>
            <planeGeometry args={[c, c]} />
            <meshStandardMaterial color="#FFFFFF" transparent opacity={0.7} side={DoubleSide} />
          </mesh>
          <mesh ref={fill} position={[c / 2, 0, 0.03]}>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial color={GREEN} transparent opacity={0.85} side={DoubleSide} emissive={GREEN} emissiveIntensity={0.15} />
          </mesh>
        </group>

        {/* Contours des trois carrés */}
        <PolyLine points={sqA} color="#1D4ED8" width={2.5} />
        <PolyLine points={sqB} color="#B45309" width={2.5} />
        <PolyLine points={sqC} color="#047857" width={3.5} />

        {/* Carreaux unités (comptables) des deux petits carrés */}
        {cells.map((t, i) => (
          <mesh
            key={`${a}-${b}-${i}`}
            ref={(m) => {
              tiles.current[i] = m;
            }}
            position={[t.x, t.y, 0.07]}
            castShadow
          >
            <boxGeometry args={[0.86, 0.86, 0.16]} />
            <meshStandardMaterial color={t.kind === 'a' ? BLUE : AMBER} roughness={0.42} metalness={0.06} />
          </mesh>
        ))}

        {/* Le triangle rectangle lui-même */}
        <PolyLine points={triangle} color="#0F172A" width={4} />
        <PolyLine points={rightAngle} color="#DC2626" width={3} />

        <Tag3D position={[a / 2, -0.42, 0.2]} label={`a = ${a}`} tone="physique" />
        <Tag3D position={[-0.45, b / 2, 0.2]} label={`b = ${b}`} tone="neutral" />
        <Tag3D position={[a / 2 + 0.5, b / 2 + 0.5, 0.2]} label={`c = ${c.toFixed(2)}`} tone="svt" />

        <Tag3D position={[a / 2, -a / 2, 0.6]} label={`a² = ${a * a}`} tone="physique" />
        <Tag3D position={[-b / 2, b / 2, 0.6]} label={`b² = ${b * b}`} tone="neutral" />
        <Tag3D position={[tx, ty, 0.6]} label={`c² = ${c2}`} tone="svt" />

        <SceneLabel
          position={[cx, a + b + 0.95, 0.4]}
          title={`a² + b² = ${a * a} + ${b * b} = ${c2} = c²`}
          subtitle="Un carré construit sur chaque côté"
          tone="maths"
        />
        <Readout position={[cx, -a - 1.0, 0.4]} value={`${a * a} + ${b * b} = ${c2}`} caption="carreaux comptés" />

        <Animate
          fn={(state) => {
            const n = cells.length;
            if (!transfer) {
              for (let k = 0; k < n; k++) {
                const m = tiles.current[k];
                if (!m) continue;
                m.position.set(cells[k].x, cells[k].y, 0.07);
                m.scale.setScalar(1);
              }
              fill.current?.scale.set(c, 0.0001, 1);
              fill.current?.position.set(c / 2, 0, 0.03);
              return;
            }
            const cycle = 7;
            const u = (state.clock.elapsedTime % cycle) / cycle;
            const p = clamp((u - 0.1) / 0.62, 0, 1);
            let done = 0;
            for (let k = 0; k < n; k++) {
              const w = smooth(clamp((p - (k / n) * 0.72) / 0.28, 0, 1));
              done += w;
              const m = tiles.current[k];
              if (!m) continue;
              const t = cells[k];
              m.position.set(
                t.x + (tx - t.x) * w,
                t.y + (ty - t.y) * w,
                0.07 + Math.sin(Math.PI * w) * 1.2,
              );
              m.scale.setScalar(Math.max(0.03, 1 - 0.95 * w));
            }
            const frac = n > 0 ? done / n : 0;
            fill.current?.scale.set(c, Math.max(0.0001, frac * c), 1);
            fill.current?.position.set(c / 2, (frac * c) / 2, 0.03);
          }}
        />
      </group>
    </LabScene>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Mode « réciproque » — le triangle construit à partir de ses 3 longueurs
// ──────────────────────────────────────────────────────────────────────

function ReciproqueScene({ a, b, c }: { a: number; b: number; c: number }) {
  const bead = useRef<Mesh>(null);
  const c2 = c * c;
  const sum2 = a * a + b * b;
  const isRight = Math.abs(sum2 - c2) < 1e-9;

  const geo = useMemo(() => {
    // Loi des cosinus : angle en C entre les côtés a (CB) et b (CA).
    const g = Math.acos(clamp((a * a + b * b - c * c) / (2 * a * b), -1, 1));
    const A: [number, number] = [b * Math.cos(g), b * Math.sin(g)];
    const B: [number, number] = [a, 0];
    const C: [number, number] = [0, 0];
    const xs = [C[0], B[0], A[0]];
    const ys = [C[1], B[1], A[1]];
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const s = Math.min(1.25, 5.2 / Math.max(maxX - minX, maxY - minY, 1));

    const segs = [
      { from: C, to: B, len: a },
      { from: B, to: A, len: c },
      { from: A, to: C, len: b },
    ];
    const perim = a + b + c;

    // Corde à nœuds : un nœud tous les mètres le long du périmètre.
    const knots: Vector3Tuple[] = [];
    if (Number.isInteger(perim) && perim <= 32) {
      for (let d = 0; d < perim; d += 1) {
        let rest = d;
        for (const sg of segs) {
          if (rest <= sg.len) {
            const t = sg.len > 0 ? rest / sg.len : 0;
            knots.push([sg.from[0] + (sg.to[0] - sg.from[0]) * t, sg.from[1] + (sg.to[1] - sg.from[1]) * t, 0.14]);
            break;
          }
          rest -= sg.len;
        }
      }
    }

    const shape = new Shape();
    shape.moveTo(C[0], C[1]);
    shape.lineTo(B[0], B[1]);
    shape.lineTo(A[0], A[1]);
    shape.closePath();

    return {
      g,
      A,
      B,
      C,
      s,
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      segs,
      perim,
      knots,
      shape,
    };
  }, [a, b, c]);

  const deg = (geo.g * 180) / Math.PI;

  const outline: Vector3Tuple[] = [
    [geo.C[0], geo.C[1], 0.1],
    [geo.B[0], geo.B[1], 0.1],
    [geo.A[0], geo.A[1], 0.1],
    [geo.C[0], geo.C[1], 0.1],
  ];

  const angleMark: Vector3Tuple[] = useMemo(() => {
    if (isRight) {
      return [
        [0.55, 0, 0.16],
        [0.55, 0.55, 0.16],
        [0, 0.55, 0.16],
      ];
    }
    const pts: Vector3Tuple[] = [];
    for (let i = 0; i <= 26; i++) {
      const th = (i / 26) * geo.g;
      pts.push([0.75 * Math.cos(th), 0.75 * Math.sin(th), 0.16]);
    }
    return pts;
  }, [isRight, geo.g]);

  // milieux des côtés, décalés vers l'extérieur pour les étiquettes
  const midC: Vector3Tuple = [(geo.B[0] + geo.A[0]) / 2 + 0.35, (geo.B[1] + geo.A[1]) / 2 + 0.35, 0.2];
  const midB: Vector3Tuple = [geo.A[0] / 2 - 0.5, geo.A[1] / 2 + 0.1, 0.2];

  return (
    <LabScene cameraPosition={[0, 0.2, 9.5]} background="#F7FBFF" minDistance={5} maxDistance={16} groundY={null}>
      <group position={[-geo.cx * geo.s, -geo.cy * geo.s, 0]} scale={geo.s}>
        <group position={[geo.cx, geo.cy, 0]}>
          <GraphPaper width={12} height={9} step={1} z={-0.25} color="#DBE7F4" />
        </group>

        {/* Surface du triangle */}
        <mesh position={[0, 0, -0.02]}>
          <shapeGeometry args={[geo.shape]} />
          <meshStandardMaterial color={isRight ? '#D1FAE5' : '#FFE4E6'} transparent opacity={0.9} side={DoubleSide} />
        </mesh>

        <PolyLine points={outline} color="#0F172A" width={4} />
        <PolyLine points={angleMark} color={isRight ? '#059669' : '#E11D48'} width={4} />

        {/* Corde à nœuds tendue sur le triangle */}
        {geo.knots.length > 0 && <DataPoints points={geo.knots} color="#7C3AED" size={0.14} />}

        {/* Nœud qui parcourt la corde */}
        <mesh ref={bead}>
          <sphereGeometry args={[0.2, 20, 16]} />
          <meshStandardMaterial color="#DC2626" emissive="#7F1D1D" emissiveIntensity={0.35} />
        </mesh>
        <Animate
          fn={(state) => {
            let rest = (state.clock.elapsedTime * 1.7) % geo.perim;
            for (const sg of geo.segs) {
              if (rest <= sg.len) {
                const t = sg.len > 0 ? rest / sg.len : 0;
                bead.current?.position.set(
                  sg.from[0] + (sg.to[0] - sg.from[0]) * t,
                  sg.from[1] + (sg.to[1] - sg.from[1]) * t,
                  0.22,
                );
                return;
              }
              rest -= sg.len;
            }
          }}
        />

        <Tag3D position={[a / 2, -0.45, 0.2]} label={`a = ${a}`} tone="physique" />
        <Tag3D position={midB} label={`b = ${b}`} tone="neutral" />
        <Tag3D position={midC} label={`c = ${c}`} tone="svt" />

        <SceneLabel
          position={[geo.cx, geo.cy + 3.1, 0.4]}
          title={isRight ? 'Rectangle en C ✓' : 'Pas rectangle ✗'}
          subtitle={isRight ? `${a}² + ${b}² = ${c}²` : `${sum2} ≠ ${c2}`}
          tone={isRight ? 'svt' : 'maths'}
        />
        <Readout position={[geo.cx - 2.4, geo.cy - 2.6, 0.4]} value={deg.toFixed(1)} unit="°" caption="angle en C" />
        <Readout position={[geo.cx + 0.2, geo.cy - 2.6, 0.4]} value={sum2} caption="a² + b²" />
        <Readout position={[geo.cx + 2.6, geo.cy - 2.6, 0.4]} value={c2} caption="c²" />
      </group>
    </LabScene>
  );
}
