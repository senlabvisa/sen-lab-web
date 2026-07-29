'use client';

import { useMemo, useRef } from 'react';
import { DoubleSide, Group, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { GraphPaper, Segment } from '@/components/lab3d/environment';
import { Arrow3D, Marker, PolyLine } from '@/components/lab3d/plot';
import { Readout, SceneLabel, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — LA PLANCHE À DESSIN (Maths, 6ème).
 *
 * Une vraie planche en bois avec sa feuille quadrillée, et trois ateliers :
 *  - « trace »      : le lexique de la géométrie plane — droite (illimitée),
 *                     demi-droite (une origine), segment (deux extrémités),
 *                     droites perpendiculaires (codage de l'angle droit) et
 *                     droites parallèles (codage par chevrons) ;
 *  - « compas »     : un compas articulé (pointe sur le centre, mine sur le
 *                     cercle) qui tourne autour de O. L'élève règle l'écartement :
 *                     rayon r, diamètre = 2 × r, plus une corde [EF] ;
 *  - « rapporteur » : un rapporteur gradué 0–180 en DOUBLE graduation que
 *                     l'élève incline pour poser sa ligne 0 sur le côté [OA),
 *                     puis un curseur de lecture qu'il amène sur [OB).
 *
 * Rien n'est tracé « à coups de petites sphères » : tubes (Segment), lignes
 * lisses (PolyLine), tores et disques. Animation via <Animate> uniquement.
 */

export type BoardMode = 'trace' | 'compas' | 'rapporteur';
export type TraceFocus = 'droite' | 'demi-droite' | 'segment' | 'perpendiculaires' | 'paralleles';

export type ProtractorSceneProps = {
  mode: BoardMode;
  /** Élément de vocabulaire mis en évidence (atelier « trace »). */
  focus: TraceFocus;
  /** Écartement du compas, en centimètres. */
  rayon: number;
  /** Inclinaison du rapporteur, en degrés (sa ligne 0). */
  base: number;
  /** Graduation lue par le curseur, en degrés. */
  cursor: number;
  /** Direction absolue du côté [OA), en degrés. */
  dirA: number;
  /** Angle réel AÔB à mesurer, en degrés. */
  target: number;
  /** Ce que l'on mesure (affiché sous le titre). */
  caption: string;
};

const D2R = Math.PI / 180;
const CM = 0.42; // 1 cm de la feuille ↔ unités de scène
const RP = 2.55; // rayon du rapporteur
const RAY = 3.6; // longueur dessinée des côtés de l'angle
const HZ = 2.3; // hauteur de la charnière du compas au-dessus de la feuille

const VIOLET = '#7C3AED';
const GREY = '#94A3B8';
const INK = '#1F2937';
const GREEN = '#16A34A';
const RED = '#DC2626';

/** Graduations du rapporteur : trait tous les 5°, plus long tous les 10° et 30°. */
const TICKS: { a: number; len: number }[] = [];
for (let d = 0; d <= 180; d += 5) {
  TICKS.push({ a: d * D2R, len: d % 30 === 0 ? 0.34 : d % 10 === 0 ? 0.2 : 0.11 });
}
/** Double graduation : sens direct 0→180 ET sens indirect 180→0. */
const LABELS = [0, 30, 60, 90, 120, 150, 180];

function natureFr(a: number): string {
  if (a <= 0) return 'angle nul';
  if (a < 90) return 'angle aigu';
  if (a === 90) return 'angle droit';
  if (a < 180) return 'angle obtus';
  return 'angle plat';
}

/** Planche en bois + feuille quadrillée + crayon posé. */
function Board() {
  return (
    <group>
      <mesh position={[0, 0, -0.34]} receiveShadow>
        <boxGeometry args={[11.9, 8.3, 0.3]} />
        <meshStandardMaterial color="#8B5E34" roughness={0.85} />
      </mesh>
      <GraphPaper width={11.1} height={7.6} step={0.5} z={-0.08} color="#DDE5F0" />
      {/* crayon de menuisier posé le long du bord gauche */}
      <group position={[-5.05, -0.2, 0.16]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.075, 0.075, 2.2, 12]} />
          <meshStandardMaterial color="#F59E0B" roughness={0.45} />
        </mesh>
        <mesh position={[0, -1.22, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.075, 0.26, 12]} />
          <meshStandardMaterial color="#E8D3B0" roughness={0.7} />
        </mesh>
        <mesh position={[0, -1.39, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.03, 0.09, 12]} />
          <meshStandardMaterial color="#111827" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

/** Atelier 1 — le lexique : droite, demi-droite, segment, ⊥ et //. */
function TraceBoard({ focus }: { focus: TraceFocus }) {
  const col = (f: TraceFocus) => (focus === f ? VIOLET : GREY);
  const tone = (f: TraceFocus) => (focus === f ? ('maths' as const) : ('neutral' as const));
  const Z = 0.06;

  return (
    <group>
      {/* ── droite (d) : illimitée des deux côtés ── */}
      <Arrow3D from={[-3.4, 2.0, Z]} to={[-4.95, 2.0, Z]} color={col('droite')} radius={0.035} headLength={0.24} />
      <Arrow3D from={[-3.4, 2.0, Z]} to={[-1.85, 2.0, Z]} color={col('droite')} radius={0.035} headLength={0.24} />
      <Tag3D position={[-3.4, 1.25, Z]} label="droite (d)" tone={tone('droite')} />

      {/* ── demi-droite [Ax) : une origine, pas de fin ── */}
      <Marker position={[-1.4, 2.0, Z]} color={col('demi-droite')} size={0.09} />
      <Arrow3D from={[-1.4, 2.0, Z]} to={[1.5, 2.0, Z]} color={col('demi-droite')} radius={0.035} headLength={0.24} />
      <Tag3D position={[-1.55, 2.36, Z]} label="A" tone={tone('demi-droite')} />
      <Tag3D position={[0.05, 1.25, Z]} label="demi-droite [Ax)" tone={tone('demi-droite')} />

      {/* ── segment [BC] : deux extrémités ── */}
      <Segment a={[2.15, 2.0, Z]} b={[4.75, 2.0, Z]} color={col('segment')} width={0.045} />
      <Marker position={[2.15, 2.0, Z]} color={col('segment')} size={0.09} />
      <Marker position={[4.75, 2.0, Z]} color={col('segment')} size={0.09} />
      <Tag3D position={[2.0, 2.36, Z]} label="B" tone={tone('segment')} />
      <Tag3D position={[4.9, 2.36, Z]} label="C" tone={tone('segment')} />
      <Tag3D position={[3.45, 1.25, Z]} label="segment [BC]" tone={tone('segment')} />

      {/* ── droites perpendiculaires : codage de l'angle droit ── */}
      <Segment a={[-3.8, -1.5, Z]} b={[-0.8, -1.5, Z]} color={col('perpendiculaires')} width={0.04} />
      <Segment a={[-2.3, -2.6, Z]} b={[-2.3, -0.45, Z]} color={col('perpendiculaires')} width={0.04} />
      <PolyLine
        points={[
          [-2.02, -1.5, Z + 0.02],
          [-2.02, -1.22, Z + 0.02],
          [-2.3, -1.22, Z + 0.02],
        ]}
        color={focus === 'perpendiculaires' ? RED : GREY}
        width={3}
      />
      <Tag3D position={[-2.3, -2.98, Z]} label="(d₁) ⊥ (d₂) — angle droit" tone={tone('perpendiculaires')} />

      {/* ── droites parallèles : même écart, codage par chevrons ── */}
      <Segment a={[1.0, -1.0, Z]} b={[4.0, -1.0, Z]} color={col('paralleles')} width={0.04} />
      <Segment a={[1.0, -2.0, Z]} b={[4.0, -2.0, Z]} color={col('paralleles')} width={0.04} />
      {[-1.0, -2.0].map((y) => (
        <group key={y}>
          <Segment a={[2.38, y - 0.17, Z + 0.02]} b={[2.6, y, Z + 0.02]} color={col('paralleles')} width={0.024} />
          <Segment a={[2.6, y, Z + 0.02]} b={[2.38, y + 0.17, Z + 0.02]} color={col('paralleles')} width={0.024} />
        </group>
      ))}
      <Tag3D position={[2.5, -2.55, Z]} label="(d₃) // (d₄) — parallèles" tone={tone('paralleles')} />
    </group>
  );
}

/** Atelier 2 — le compas : centre, rayon, diamètre, corde. */
function CompassBoard({ rayon }: { rayon: number }) {
  const arm = useRef<Group>(null);
  const R = rayon * CM;
  const Z = 0.06;

  const M: Vector3Tuple = [Math.cos(55 * D2R) * R, Math.sin(55 * D2R) * R, Z];
  const E: Vector3Tuple = [Math.cos(212 * D2R) * R, Math.sin(212 * D2R) * R, Z];
  const F: Vector3Tuple = [Math.cos(328 * D2R) * R, Math.sin(328 * D2R) * R, Z];

  return (
    <group position={[0, -0.2, 0]}>
      {/* le cercle tracé (tore : une vraie ligne fermée, pas des sphères) */}
      <mesh position={[0, 0, Z]} castShadow>
        <torusGeometry args={[Math.max(0.05, R), 0.035, 10, 96]} />
        <meshStandardMaterial color={VIOLET} roughness={0.4} emissive={VIOLET} emissiveIntensity={0.18} />
      </mesh>

      {/* diamètre [CD] : il passe par le centre, il vaut 2 × rayon */}
      <Segment a={[-R, 0, Z]} b={[R, 0, Z]} color="#0EA5E9" width={0.035} />
      <Marker position={[-R, 0, Z]} color="#0EA5E9" size={0.08} />
      <Marker position={[R, 0, Z]} color="#0EA5E9" size={0.08} />

      {/* rayon [OM] */}
      <Segment a={[0, 0, Z + 0.01]} b={M} color="#DB2777" width={0.04} />
      <Marker position={M} color="#DB2777" size={0.085} />

      {/* corde [EF] : elle joint deux points du cercle sans passer par O */}
      <Segment a={E} b={F} color="#EA580C" width={0.032} />
      <Marker position={E} color="#EA580C" size={0.075} />
      <Marker position={F} color="#EA580C" size={0.075} />

      {/* centre O */}
      <Marker position={[0, 0, Z + 0.03]} color={INK} size={0.085} />

      {/* étiquettes du vocabulaire, posées hors du plus grand cercle */}
      <Tag3D position={[-0.85, 0.42, 0.2]} label="O — centre" tone="neutral" />
      <Tag3D position={[3.45, 1.55, 0.2]} label="rayon [OM]" tone="maths" />
      <Tag3D position={[-3.65, 0.3, 0.2]} label="diamètre [CD]" tone="maths" />
      <Tag3D position={[3.2, -2.35, 0.2]} label="corde [EF]" tone="maths" />

      {/* le compas : pointe sèche sur O, mine sur le cercle, charnière au-dessus */}
      <group ref={arm}>
        <Segment a={[0, 0, Z]} b={[R / 2, 0, HZ]} color="#AEB6C2" width={0.055} />
        <Segment a={[R, 0, Z]} b={[R / 2, 0, HZ]} color="#F59E0B" width={0.055} />
        <mesh position={[R / 2, 0, HZ]} castShadow>
          <sphereGeometry args={[0.14, 18, 14]} />
          <meshStandardMaterial color="#6B7280" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[R / 2, 0, HZ + 0.34]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.62, 12]} />
          <meshStandardMaterial color="#374151" roughness={0.5} />
        </mesh>
        {/* mine du compas, posée exactement sur le cercle */}
        <mesh position={[R, 0, Z + 0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.05, 0.2, 12]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      </group>
      <Animate
        fn={(state) => {
          if (arm.current) arm.current.rotation.z = state.clock.elapsedTime * 0.7;
        }}
      />
    </group>
  );
}

/** Atelier 3 — le rapporteur gradué que l'élève incline pour mesurer. */
function ProtractorBoard({
  base,
  cursor,
  dirA,
  target,
  okBase,
  okRay,
}: {
  base: number;
  cursor: number;
  dirA: number;
  target: number;
  okBase: boolean;
  okRay: boolean;
}) {
  const Z = 0.06;
  const dirB = dirA + target;
  const A: Vector3Tuple = [Math.cos(dirA * D2R) * RAY, Math.sin(dirA * D2R) * RAY, Z];
  const B: Vector3Tuple = [Math.cos(dirB * D2R) * RAY, Math.sin(dirB * D2R) * RAY, Z];

  const arc = useMemo(() => {
    const pts: Vector3Tuple[] = [];
    const n = Math.max(2, Math.round(cursor / 3));
    for (let i = 0; i <= n; i++) {
      const t = (cursor * D2R * i) / n;
      pts.push([Math.cos(t) * 0.92, Math.sin(t) * 0.92, 0.16]);
    }
    return pts;
  }, [cursor]);

  return (
    <group position={[0, -1.95, 0]}>
      {/* l'angle à mesurer, tracé au crayon sur la feuille */}
      <Segment a={[0, 0, Z]} b={A} color={INK} width={0.05} />
      <Segment a={[0, 0, Z]} b={B} color={INK} width={0.05} />
      <Marker position={[0, 0, Z + 0.04]} color={INK} size={0.1} />
      <Tag3D position={[A[0] * 1.09, A[1] * 1.09 - 0.18, Z]} label="A" tone="neutral" />
      <Tag3D position={[B[0] * 1.09, B[1] * 1.09 + 0.2, Z]} label="B" tone="neutral" />
      <Tag3D position={[-0.62, -0.32, Z]} label="O — sommet" tone="neutral" />

      {/* le rapporteur : on l'incline pour poser sa ligne 0 sur [OA) */}
      <group rotation={[0, 0, base * D2R]} position={[0, 0, 0.1]}>
        <mesh>
          <circleGeometry args={[RP, 80, 0, Math.PI]} />
          <meshStandardMaterial color="#FDE68A" transparent opacity={0.5} side={DoubleSide} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.012]}>
          <ringGeometry args={[RP - 0.07, RP, 80, 1, 0, Math.PI]} />
          <meshStandardMaterial color="#B45309" side={DoubleSide} />
        </mesh>
        {/* ligne 0–180 (le bord droit du rapporteur) */}
        <mesh position={[0, 0, 0.014]}>
          <boxGeometry args={[2 * RP, 0.05, 0.02]} />
          <meshStandardMaterial color={okBase ? GREEN : '#B45309'} />
        </mesh>
        {/* repère du centre, à poser sur le sommet O */}
        <mesh position={[0, 0, 0.016]}>
          <ringGeometry args={[0.13, 0.17, 32]} />
          <meshStandardMaterial color="#B45309" side={DoubleSide} />
        </mesh>

        {TICKS.map((t, i) => (
          <mesh
            key={i}
            position={[Math.cos(t.a) * (RP - 0.08 - t.len / 2), Math.sin(t.a) * (RP - 0.08 - t.len / 2), 0.018]}
            rotation={[0, 0, t.a]}
          >
            <boxGeometry args={[t.len, 0.022, 0.012]} />
            <meshStandardMaterial color="#78350F" />
          </mesh>
        ))}

        {LABELS.map((d) => (
          <Tag3D
            key={d}
            position={[Math.cos(d * D2R) * (RP + 0.38), Math.sin(d * D2R) * (RP + 0.38), 0.02]}
            label={`${d} · ${180 - d}`}
            tone="maths"
            distanceFactor={11}
          />
        ))}

        {/* arc de l'angle lu */}
        <PolyLine points={arc} color={okRay ? GREEN : VIOLET} width={4} />
        {cursor === 90 && (
          <PolyLine
            points={[
              [0.34, 0, 0.17],
              [0.34, 0.34, 0.17],
              [0, 0.34, 0.17],
            ]}
            color={RED}
            width={4}
          />
        )}

        {/* curseur de lecture : à amener sur le côté [OB) */}
        <group rotation={[0, 0, cursor * D2R]}>
          <mesh position={[(RP + 0.55) / 2, 0, 0.05]}>
            <boxGeometry args={[RP + 0.55, 0.05, 0.02]} />
            <meshStandardMaterial
              color={okRay ? GREEN : RED}
              emissive={okRay ? GREEN : RED}
              emissiveIntensity={0.35}
            />
          </mesh>
        </group>
      </group>

      {okBase && <Tag3D position={[A[0] * 0.62, A[1] * 0.62 - 0.42, 0.3]} label="ligne 0 posée sur [OA) ✓" tone="svt" />}
      {okRay && <Tag3D position={[B[0] * 0.68, B[1] * 0.68 + 0.42, 0.3]} label="curseur sur [OB) ✓" tone="svt" />}
    </group>
  );
}

export default function ProtractorScene({
  mode,
  focus,
  rayon,
  base,
  cursor,
  dirA,
  target,
  caption,
}: ProtractorSceneProps) {
  const okBase = Math.abs(base - dirA) <= 2;
  const okRay = Math.abs(base + cursor - (dirA + target)) <= 3;

  const head =
    mode === 'trace'
      ? { title: 'Le vocabulaire du tracé', sub: 'droite · demi-droite · segment · ⊥ · //' }
      : mode === 'compas'
        ? { title: 'Le compas et le cercle', sub: 'centre · rayon · diamètre · corde' }
        : { title: 'Le rapporteur', sub: caption };

  return (
    <LabScene
      cameraPosition={[0, 0.2, 10.4]}
      background="#F5F3FF"
      minDistance={5}
      maxDistance={18}
      groundY={null}
    >
      <Board />

      {mode === 'trace' && <TraceBoard focus={focus} />}
      {mode === 'compas' && <CompassBoard rayon={rayon} />}
      {mode === 'rapporteur' && (
        <ProtractorBoard base={base} cursor={cursor} dirA={dirA} target={target} okBase={okBase} okRay={okRay} />
      )}

      <SceneLabel position={[0, 3.4, 0.3]} title={head.title} subtitle={head.sub} tone="maths" />

      {mode === 'compas' && (
        <>
          <Readout
            position={[-4.05, 2.75, 0.3]}
            value={rayon.toFixed(1).replace('.', ',')}
            unit="cm"
            caption="rayon r"
          />
          <Readout
            position={[4.05, 2.75, 0.3]}
            value={(2 * rayon).toFixed(1).replace('.', ',')}
            unit="cm"
            caption="diamètre = 2 × r"
          />
        </>
      )}

      {mode === 'rapporteur' && (
        <Readout position={[4.1, 2.75, 0.3]} value={cursor} unit="°" caption={natureFr(cursor)} />
      )}
    </LabScene>
  );
}
