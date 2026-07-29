'use client';

import { useMemo, useRef } from 'react';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { GraphPaper } from '@/components/lab3d/environment';
import { Marker, PolyLine } from '@/components/lab3d/plot';
import { Readout, SceneLabel, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — nature des triangles, somme des angles et inégalité triangulaire
 * (Maths · 5ème).
 *
 * L'élève fixe les trois longueurs a = BC, b = CA, c = AB (en cm). La scène
 * construit le VRAI triangle sur un papier quadrillé (1 carreau = 1 cm) :
 *   • les trois angles sont calculés par la loi des cosinus
 *     cos  = (b² + c² − a²) / (2bc)  → mesures exactes, somme = 180° ;
 *   • les trois secteurs angulaires sont reportés bout à bout sous la figure :
 *     ils remplissent exactement un demi-tour (angle plat) ;
 *   • droites remarquables au choix : médianes (centre de gravité G),
 *     médiatrices (centre O du cercle circonscrit), hauteurs (orthocentre H) ;
 *   • si un côté dépasse la somme des deux autres, le triangle est IMPOSSIBLE :
 *     les deux côtés courts pivotent autour de leurs extrémités et ne se
 *     rejoignent jamais — l'écart manquant est mesuré en rouge.
 *
 * Construite sur le kit lab3d (aucune courbe « en petites sphères »).
 */

export type DroitesMode = 'aucune' | 'medianes' | 'mediatrices' | 'hauteurs';

export type TriangleSceneProps = {
  /** Côté a = BC (cm). */
  a: number;
  /** Côté b = CA (cm). */
  b: number;
  /** Côté c = AB (cm). */
  c: number;
  /** Libellé de nature affiché en haut de la scène. */
  nature: string;
  droites?: DroitesMode;
  /** Report des trois angles bout à bout sous la figure. */
  showReport?: boolean;
};

type P2 = [number, number];
type V3T = [number, number, number];

/** 1 cm de l'énoncé = 0,36 unité de scène (= 1 carreau du quadrillage). */
const S = 0.36;

const COL_A = '#7C3AED'; // angle Â
const COL_B = '#0EA5E9'; // angle B̂
const COL_C = '#F59E0B'; // angle Ĉ
const EDGE = '#4C1D95';
const BAD = '#DC2626';

const clamp1 = (x: number) => Math.max(-1, Math.min(1, x));
const deg = (r: number) => (r * 180) / Math.PI;
const fr = (x: number, n = 1) => x.toFixed(n).replace('.', ',');
const p3 = (p: P2, z = 0): V3T => [p[0], p[1], z];

/** Secteur angulaire orienté (start, len) du sommet V vers ses voisins P et Q. */
function sector(V: P2, P: P2, Q: P2) {
  const a1 = Math.atan2(P[1] - V[1], P[0] - V[0]);
  const a2 = Math.atan2(Q[1] - V[1], Q[0] - V[0]);
  let d = a2 - a1;
  while (d <= -Math.PI) d += 2 * Math.PI;
  while (d > Math.PI) d -= 2 * Math.PI;
  return d >= 0 ? { start: a1, len: d } : { start: a2, len: -d };
}

const mid = (P: P2, Q: P2): P2 => [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];

/** Projeté orthogonal de P sur la droite (QR) — pied d'une hauteur. */
function foot(P: P2, Q: P2, R: P2): P2 {
  const dx = R[0] - Q[0];
  const dy = R[1] - Q[1];
  const l2 = dx * dx + dy * dy || 1e-9;
  const k = ((P[0] - Q[0]) * dx + (P[1] - Q[1]) * dy) / l2;
  return [Q[0] + dx * k, Q[1] + dy * k];
}

/** Médiatrice de [PQ] : segment centré sur le milieu, perpendiculaire à (PQ). */
function bisectorLine(P: P2, Q: P2, half: number): [P2, P2] {
  const m = mid(P, Q);
  const dx = Q[0] - P[0];
  const dy = Q[1] - P[1];
  const l = Math.hypot(dx, dy) || 1e-9;
  const nx = -dy / l;
  const ny = dx / l;
  return [
    [m[0] - nx * half, m[1] - ny * half],
    [m[0] + nx * half, m[1] + ny * half],
  ];
}

/** Centre du cercle circonscrit (intersection des trois médiatrices). */
function circumcenter(A: P2, B: P2, C: P2): P2 {
  const d = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
  if (Math.abs(d) < 1e-9) return [0, 0];
  const a2 = A[0] * A[0] + A[1] * A[1];
  const b2 = B[0] * B[0] + B[1] * B[1];
  const c2 = C[0] * C[0] + C[1] * C[1];
  return [
    (a2 * (B[1] - C[1]) + b2 * (C[1] - A[1]) + c2 * (A[1] - B[1])) / d,
    (a2 * (C[0] - B[0]) + b2 * (A[0] - C[0]) + c2 * (B[0] - A[0])) / d,
  ];
}

/** Secteur plein (part de camembert) — sert aux marques d'angle et au report. */
function AngleSector({
  at,
  start,
  len,
  color,
  radius,
  z = 0.04,
}: {
  at: P2;
  start: number;
  len: number;
  color: string;
  radius: number;
  z?: number;
}) {
  return (
    <mesh position={[at[0], at[1], z]}>
      <circleGeometry args={[radius, 48, start, len]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} side={DoubleSide} depthWrite={false} />
    </mesh>
  );
}

export default function TriangleScene({ a, b, c, nature, droites = 'aucune', showReport = true }: TriangleSceneProps) {
  const armB = useRef<Group>(null);
  const armC = useRef<Group>(null);

  const t = useMemo(() => {
    const possible = a + b > c && a + c > b && b + c > a;

    if (!possible) {
      const [L, m1, m2] = [a, b, c].slice().sort((x, y) => y - x);
      return { valid: false as const, L, m1, m2, gap: L - m1 - m2, bx: -(L * S) / 2, cx: (L * S) / 2 };
    }

    // Angles exacts (loi des cosinus). Par construction Â + B̂ + Ĉ = π.
    const rA = Math.acos(clamp1((b * b + c * c - a * a) / (2 * b * c)));
    const rB = Math.acos(clamp1((a * a + c * c - b * b) / (2 * a * c)));
    const rC = Math.PI - rA - rB;

    // B et C sur l'horizontale, A obtenu par l'angle en B.
    const rawB: P2 = [-(a * S) / 2, 0];
    const rawC: P2 = [(a * S) / 2, 0];
    const rawA: P2 = [rawB[0] + c * S * Math.cos(rB), c * S * Math.sin(rB)];
    // Recentrage sur le centre de gravité pour un cadrage stable.
    const ox = -(rawA[0] + rawB[0] + rawC[0]) / 3;
    const oy = -(rawA[1] + rawB[1] + rawC[1]) / 3 + 0.35;
    const A: P2 = [rawA[0] + ox, rawA[1] + oy];
    const B: P2 = [rawB[0] + ox, rawB[1] + oy];
    const C: P2 = [rawC[0] + ox, rawC[1] + oy];
    const G: P2 = [0, 0.35];

    const face = new BufferGeometry();
    face.setAttribute(
      'position',
      new Float32BufferAttribute([B[0], B[1], 0, C[0], C[1], 0, A[0], A[1], 0], 3),
    );
    face.setIndex([0, 1, 2]);
    face.computeVertexNormals();

    const O = circumcenter(A, B, C);
    const R = Math.hypot(A[0] - O[0], A[1] - O[1]);
    const H: P2 = [A[0] + B[0] + C[0] - 2 * O[0], A[1] + B[1] + C[1] - 2 * O[1]];
    const circle: V3T[] = [];
    for (let i = 0; i <= 72; i++) {
      const th = (i / 72) * Math.PI * 2;
      circle.push([O[0] + R * Math.cos(th), O[1] + R * Math.sin(th), -0.02]);
    }

    return {
      valid: true as const,
      A,
      B,
      C,
      G,
      O,
      H,
      face,
      circle,
      degA: deg(rA),
      degB: deg(rB),
      degC: deg(rC),
      radA: rA,
      radB: rB,
      radC: rC,
      secA: sector(A, B, C),
      secB: sector(B, C, A),
      secC: sector(C, A, B),
      rayA: Math.min(0.5, 0.35 * S * Math.min(b, c)),
      rayB: Math.min(0.5, 0.35 * S * Math.min(a, c)),
      rayC: Math.min(0.5, 0.35 * S * Math.min(a, b)),
      mBC: mid(B, C),
      mCA: mid(C, A),
      mAB: mid(A, B),
      fA: foot(A, B, C),
      fB: foot(B, C, A),
      fC: foot(C, A, B),
    };
  }, [a, b, c]);

  /** Étiquette d'un sommet, poussée vers l'extérieur du triangle. */
  const outward = (V: P2, d = 0.34): V3T => {
    const dx = V[0] - 0;
    const dy = V[1] - 0.35;
    const l = Math.hypot(dx, dy) || 1;
    return [V[0] + (dx / l) * d, V[1] + (dy / l) * d, 0.1];
  };

  return (
    <LabScene cameraPosition={[0, 0, 8.6]} background="#F5F3FF" minDistance={5} maxDistance={15} groundY={null}>
      <group position={[0, 0.35, 0]}>
        <GraphPaper width={S * 20} height={S * 12} step={S} z={-0.12} color="#DDD6FE" />
      </group>

      {t.valid ? (
        <>
          {/* Plaque du triangle (comme une pièce de tôle découpée) */}
          <mesh geometry={t.face}>
            <meshStandardMaterial color="#C4B5FD" roughness={0.55} metalness={0.05} side={DoubleSide} />
          </mesh>
          <PolyLine points={[p3(t.A, 0.02), p3(t.B, 0.02), p3(t.C, 0.02), p3(t.A, 0.02)]} color={EDGE} width={4} />

          {/* Marques d'angle : couleur = angle */}
          <AngleSector at={t.A} start={t.secA.start} len={t.secA.len} color={COL_A} radius={t.rayA} />
          <AngleSector at={t.B} start={t.secB.start} len={t.secB.len} color={COL_B} radius={t.rayB} />
          <AngleSector at={t.C} start={t.secC.start} len={t.secC.len} color={COL_C} radius={t.rayC} />

          <Tag3D
            position={[
              t.A[0] + Math.cos(t.secA.start + t.secA.len / 2) * (t.rayA + 0.3),
              t.A[1] + Math.sin(t.secA.start + t.secA.len / 2) * (t.rayA + 0.3),
              0.12,
            ]}
            label={`Â = ${fr(t.degA)}°`}
            tone="chimie"
          />
          <Tag3D
            position={[
              t.B[0] + Math.cos(t.secB.start + t.secB.len / 2) * (t.rayB + 0.3),
              t.B[1] + Math.sin(t.secB.start + t.secB.len / 2) * (t.rayB + 0.3),
              0.12,
            ]}
            label={`B̂ = ${fr(t.degB)}°`}
            tone="maths"
          />
          <Tag3D
            position={[
              t.C[0] + Math.cos(t.secC.start + t.secC.len / 2) * (t.rayC + 0.3),
              t.C[1] + Math.sin(t.secC.start + t.secC.len / 2) * (t.rayC + 0.3),
              0.12,
            ]}
            label={`Ĉ = ${fr(t.degC)}°`}
            tone="physique"
          />

          {/* Sommets et longueurs des côtés */}
          <Tag3D position={outward(t.A)} label="A" tone="neutral" />
          <Tag3D position={outward(t.B)} label="B" tone="neutral" />
          <Tag3D position={outward(t.C)} label="C" tone="neutral" />
          <Tag3D position={[t.mBC[0], t.mBC[1] - 0.3, 0.1]} label={`a = ${a} cm`} tone="svt" />
          <Tag3D position={[t.mCA[0] + 0.34, t.mCA[1] + 0.16, 0.1]} label={`b = ${b} cm`} tone="svt" />
          <Tag3D position={[t.mAB[0] - 0.34, t.mAB[1] + 0.16, 0.1]} label={`c = ${c} cm`} tone="svt" />

          {/* Droites remarquables */}
          {droites === 'medianes' && (
            <>
              <PolyLine points={[p3(t.A, 0.03), p3(t.mBC, 0.03)]} color="#16A34A" width={2.5} />
              <PolyLine points={[p3(t.B, 0.03), p3(t.mCA, 0.03)]} color="#16A34A" width={2.5} />
              <PolyLine points={[p3(t.C, 0.03), p3(t.mAB, 0.03)]} color="#16A34A" width={2.5} />
              <Marker position={p3(t.G, 0.06)} color="#15803D" size={0.1} />
              <Tag3D position={[t.G[0] + 0.05, t.G[1] - 0.34, 0.12]} label="G · centre de gravité" tone="svt" />
            </>
          )}

          {droites === 'mediatrices' && (
            <>
              {[bisectorLine(t.B, t.C, 2), bisectorLine(t.C, t.A, 2), bisectorLine(t.A, t.B, 2)].map((seg, i) => (
                <PolyLine key={i} points={[p3(seg[0], 0.03), p3(seg[1], 0.03)]} color="#0EA5E9" width={2.5} dashed />
              ))}
              <PolyLine points={t.circle} color="#0284C7" width={2} />
              <Marker position={p3(t.O, 0.06)} color="#0369A1" size={0.1} />
              <Tag3D position={[t.O[0] + 0.05, t.O[1] - 0.34, 0.12]} label="O · cercle circonscrit" tone="maths" />
            </>
          )}

          {droites === 'hauteurs' && (
            <>
              <PolyLine points={[p3(t.A, 0.03), p3(t.fA, 0.03)]} color={BAD} width={2.5} />
              <PolyLine points={[p3(t.B, 0.03), p3(t.fB, 0.03)]} color={BAD} width={2.5} />
              <PolyLine points={[p3(t.C, 0.03), p3(t.fC, 0.03)]} color={BAD} width={2.5} />
              <Marker position={p3(t.H, 0.06)} color="#991B1B" size={0.1} />
              <Tag3D position={[t.H[0] + 0.05, t.H[1] - 0.34, 0.12]} label="H · orthocentre" tone="neutral" />
            </>
          )}

          {/* Report des trois angles bout à bout → angle plat de 180° */}
          {showReport && (
            <group position={[0, -2.3, 0]}>
              <AngleSector at={[0, 0]} start={0} len={t.radA} color={COL_A} radius={1.05} z={0.02} />
              <AngleSector at={[0, 0]} start={t.radA} len={t.radB} color={COL_B} radius={1.05} z={0.02} />
              <AngleSector at={[0, 0]} start={t.radA + t.radB} len={t.radC} color={COL_C} radius={1.05} z={0.02} />
              <PolyLine
                points={[
                  [-1.35, 0, 0.05],
                  [1.35, 0, 0.05],
                ]}
                color="#334155"
                width={3}
              />
              <Marker position={[0, 0, 0.06]} color="#334155" size={0.06} />
              <Tag3D position={[0, -0.34, 0.1]} label="Â + B̂ + Ĉ = angle plat = 180°" tone="chimie" />
            </group>
          )}

          <SceneLabel position={[0, 2.85, 0]} title={nature} subtitle="Nature du triangle" tone="chimie" />
          <Readout position={[2.7, 1.75, 0]} value={fr(t.degA + t.degB + t.degC)} unit="°" caption="Â + B̂ + Ĉ" />
        </>
      ) : (
        <>
          {/* Le plus long côté sert de base : les deux autres pivotent sans jamais se rejoindre */}
          <PolyLine
            points={[
              [t.bx, 0, 0.02],
              [t.cx, 0, 0.02],
            ]}
            color={EDGE}
            width={4}
          />
          <Tag3D position={[0, -0.32, 0.1]} label={`côté le plus long : ${t.L} cm`} tone="neutral" />

          <group ref={armB} position={[t.bx, 0, 0]}>
            <PolyLine
              points={[
                [0, 0, 0.04],
                [t.m1 * S, 0, 0.04],
              ]}
              color={BAD}
              width={4}
            />
            <Marker position={[t.m1 * S, 0, 0.05]} color={BAD} size={0.09} />
            <Tag3D position={[(t.m1 * S) / 2, 0.28, 0.1]} label={`${t.m1} cm`} tone="neutral" />
          </group>

          <group ref={armC} position={[t.cx, 0, 0]}>
            <PolyLine
              points={[
                [0, 0, 0.04],
                [-t.m2 * S, 0, 0.04],
              ]}
              color={BAD}
              width={4}
            />
            <Marker position={[-t.m2 * S, 0, 0.05]} color={BAD} size={0.09} />
            <Tag3D position={[(-t.m2 * S) / 2, 0.28, 0.1]} label={`${t.m2} cm`} tone="neutral" />
          </group>

          <Animate
            fn={(state) => {
              const th = 0.45 * (1 - Math.cos(state.clock.elapsedTime * 1.15));
              if (armB.current) armB.current.rotation.z = th;
              if (armC.current) armC.current.rotation.z = -th;
            }}
          />

          {/* Écart qui manque, mesuré à plat sur la base */}
          <PolyLine
            points={[
              [t.bx + t.m1 * S, -0.5, 0.03],
              [t.cx - t.m2 * S, -0.5, 0.03],
            ]}
            color={BAD}
            width={5}
          />
          <Tag3D
            position={[0, -0.86, 0.1]}
            label={t.gap > 0.001 ? `il manque ${fr(t.gap)} cm` : 'triangle aplati : A, B, C alignés'}
            tone="neutral"
          />

          <SceneLabel
            position={[0, 2.3, 0]}
            title="Triangle impossible"
            subtitle={`${t.L} > ${t.m1} + ${t.m2}`}
            tone="chimie"
          />
          <Readout position={[0, 1.35, 0]} value={`${t.m1} + ${t.m2} = ${t.m1 + t.m2}`} unit="cm" caption={`trop court pour ${t.L} cm`} />
        </>
      )}
    </LabScene>
  );
}
