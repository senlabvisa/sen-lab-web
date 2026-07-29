'use client';

import { useMemo, useRef, useState } from 'react';
import { Group, Mesh, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Animate } from '@/components/lab3d/anim';
import { GraphPaper, LabBench, Segment } from '@/components/lab3d/environment';
import { Battery, Meter, Resistor, Rheostat, Wire } from '@/components/lab3d/electric';
import { Arrow3D, DataPoints, PolyLine } from '@/components/lab3d/plot';
import { Readout, SceneLabel, Tag3D } from '@/components/lab3d/annotations';

/**
 * Scène 3D — loi d'Ohm : caractéristique U = f(I) d'un conducteur ohmique
 * (Physique-Chimie, 3ème).
 *
 * À gauche : un vrai montage de paillasse en BOUCLE FERMÉE —
 *   générateur réglable (E) → rhéostat (fait varier I) → conducteur ohmique R
 *   → ampèremètre EN SÉRIE → retour au générateur ;
 *   le voltmètre est branché EN DÉRIVATION aux bornes du conducteur ohmique.
 * Des porteurs de charge circulent le long du fil, d'autant plus vite que I
 * est grande, et les aiguilles des deux instruments rejoignent leur valeur
 * en douceur (lissage image par image).
 *
 * À droite : la caractéristique U = f(I) se construit point par point
 * (<DataPoints>) ; dès 2 points la droite de régression passant par
 * l'origine (<PolyLine>) est tracée — sa pente vaut R.
 *
 * Physique : U = R × I (U en volts, I en ampères, R en ohms),
 * I = E / (R + R_rhéostat).
 */

export type OhmSceneProps = {
  /** Tension réglée sur le générateur (V). */
  e: number;
  /** Résistance introduite par le rhéostat (Ω). */
  rh: number;
  /** Intensité dans le circuit (A). */
  i: number;
  /** Tension aux bornes du conducteur ohmique (V). */
  u: number;
  /** Pente de la droite de régression (Ω), null tant qu'il y a < 2 points. */
  slope: number | null;
  /** Couples (I, U) déjà relevés par l'élève. */
  points: { i: number; u: number }[];
};

const GROUND_Y = -2.9;
const I_CAL = 1; // calibre ampèremètre (A)
const U_CAL = 15; // calibre voltmètre (V)
const RH_MAX = 30; // course du rhéostat (Ω)

// Échelles du graphe : 0,6 A → 3,0 unités ; 12 V → 3,0 unités
const KX = 5; // unités par ampère
const KY = 0.25; // unités par volt

const WIRE = '#B45309';
const WIRE_V = '#2563EB';

// ── Boucle principale (fermée) : + du générateur → rhéostat → R → ampèremètre → −
const S1: Vector3Tuple[] = [[-4.6, 0.62, 0], [-4.6, 1.5, 0], [-3.75, 1.5, 0]];
const S2: Vector3Tuple[] = [[-1.95, 1.5, 0], [-1.1, 1.5, 0], [-1.1, 0.85, 0]];
const S3: Vector3Tuple[] = [[-1.1, -1.2, 0], [-1.1, -1.9, 0], [-1.75, -1.9, 0]];
const S4: Vector3Tuple[] = [[-3.05, -1.9, 0], [-4.6, -1.9, 0], [-4.6, -0.95, 0]];

// ── Dérivation du voltmètre, aux bornes du conducteur ohmique
const D1: Vector3Tuple[] = [[-1.1, 0.8, 0], [-0.1, 0.8, 0], [-0.1, 0.6, 0]];
const D2: Vector3Tuple[] = [[-0.1, -0.6, 0], [-0.1, -1.2, 0], [-1.1, -1.2, 0]];

// Chemin suivi par les porteurs de charge (sens conventionnel : + → −)
const LOOP: Vector3Tuple[] = [
  [-4.6, 0.62, 0],
  [-4.6, 1.5, 0],
  [-1.1, 1.5, 0],
  [-1.1, -1.9, 0],
  [-4.6, -1.9, 0],
  [-4.6, 0.62, 0],
];

const N_CHARGES = 12;

export default function OhmScene({ e, rh, i, u, slope, points }: OhmSceneProps) {
  const charges = useRef<Group>(null);
  const live = useRef<Mesh>(null);
  const [shown, setShown] = useState({ i: 0, u: 0 });
  const smooth = useRef({ i: 0, u: 0 });

  // Longueurs cumulées de la boucle (pour faire défiler les porteurs)
  const path = useMemo(() => {
    const segs: { a: Vector3Tuple; b: Vector3Tuple; len: number }[] = [];
    let total = 0;
    for (let k = 0; k < LOOP.length - 1; k++) {
      const a = LOOP[k];
      const b = LOOP[k + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      segs.push({ a, b, len });
      total += len;
    }
    return { segs, total };
  }, []);

  const ticks = useMemo(() => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let k = 1; k <= 7; k++) xs.push(k * 0.5);
    for (let k = 1; k <= 6; k++) ys.push(k * 0.5);
    return { xs, ys };
  }, []);

  const cloud = useMemo<Vector3Tuple[]>(
    () => points.map((p) => [p.i * KX, p.u * KY, 0.02]),
    [points],
  );

  // Droite de régression passant par l'origine : U = pente × I
  const fit = useMemo<Vector3Tuple[]>(() => {
    if (slope === null) return [];
    const iMax = Math.max(0.12, ...points.map((p) => p.i));
    return [
      [0, 0, 0],
      [iMax * KX * 1.05, slope * iMax * KY * 1.05, 0],
    ];
  }, [slope, points]);

  return (
    <LabScene cameraPosition={[0.4, 0.1, 10.8]} background="#FEF3C7" minDistance={6} maxDistance={18} groundY={GROUND_Y}>
      <LabBench y={GROUND_Y} color="#E7D8B8" size={28} />

      {/* ───────────── Le montage (boucle fermée) ───────────── */}
      <Battery position={[-4.6, -0.2, 0]} voltage={e} />
      <Tag3D position={[-4.6, -1.35, 0]} label={`Générateur ${e.toFixed(0)} V`} tone="physique" />

      <Rheostat position={[-2.85, 1.5, 0]} cursor={1 - rh / RH_MAX} />
      <Tag3D position={[-2.85, 2.05, 0]} label={`Rhéostat ${rh.toFixed(0)} Ω`} tone="physique" />

      {/* Conducteur ohmique (résistance à anneaux : rouge-noir-noir = 20 Ω) */}
      <Resistor position={[-1.1, -0.2, 0]} rotation={[0, 0, 0]} bands={['#DC2626', '#000000', '#000000']} />
      <Tag3D position={[-1.95, -0.2, 0]} label="Conducteur ohmique R" tone="physique" />

      {/* Ampèremètre — EN SÉRIE dans la boucle */}
      <Meter position={[-2.4, -1.9, 0]} kind="A" value={shown.i} max={I_CAL} />
      <Tag3D position={[-2.4, -1.15, 0]} label="Ampèremètre · en série" tone="physique" />
      <Readout position={[-2.4, -2.6, 0]} value={i.toFixed(3)} unit="A" caption="intensité I" />

      {/* Voltmètre — EN DÉRIVATION aux bornes du conducteur ohmique */}
      <Meter position={[-0.1, 0, 0]} kind="V" value={shown.u} max={U_CAL} color="#1D4ED8" />
      <Tag3D position={[0.62, 1.15, 0]} label="Voltmètre · en dérivation" tone="physique" />
      <Readout position={[0.75, -1.05, 0]} value={u.toFixed(1)} unit="V" caption="tension U" />

      {/* Fils : la boucle est fermée, les composants en comblent les coupures */}
      <Wire points={S1} color={WIRE} radius={0.05} />
      <Wire points={S2} color={WIRE} radius={0.05} />
      <Wire points={S3} color={WIRE} radius={0.05} />
      <Wire points={S4} color={WIRE} radius={0.05} />
      <Wire points={D1} color={WIRE_V} radius={0.04} />
      <Wire points={D2} color={WIRE_V} radius={0.04} />

      {/* Porteurs de charge : vitesse proportionnelle à I */}
      <group ref={charges}>
        {Array.from({ length: N_CHARGES }).map((_, k) => (
          <mesh key={k}>
            <sphereGeometry args={[0.07, 12, 10]} />
            <meshStandardMaterial color="#FBBF24" emissive="#F59E0B" emissiveIntensity={0.9} />
          </mesh>
        ))}
      </group>

      <SceneLabel
        position={[-2.85, 3.1, 0]}
        title={`U = ${u.toFixed(1)} V · I = ${i.toFixed(3)} A`}
        subtitle="Montage de paillasse · loi d'Ohm"
        tone="physique"
      />

      {/* ───────────── La caractéristique U = f(I) ───────────── */}
      <group position={[1.95, -1.8, 0]}>
        {/* papier millimétré (centré) recadré sur le premier quadrant */}
        <group position={[1.75, 1.65, 0]}>
          <GraphPaper width={3.9} height={3.7} step={0.5} z={-0.08} />
        </group>

        <Arrow3D from={[-0.2, 0, 0]} to={[3.85, 0, 0]} color="#475569" radius={0.018} headLength={0.18} />
        <Arrow3D from={[0, -0.2, 0]} to={[0, 3.65, 0]} color="#475569" radius={0.018} headLength={0.18} />
        {ticks.xs.map((x) => (
          <Segment key={`x${x}`} a={[x, -0.09, 0]} b={[x, 0.09, 0]} color="#475569" width={0.014} />
        ))}
        {ticks.ys.map((y) => (
          <Segment key={`y${y}`} a={[-0.09, y, 0]} b={[0.09, y, 0]} color="#475569" width={0.014} />
        ))}

        {/* Droite de régression passant par l'origine — sa pente vaut R */}
        {fit.length === 2 && <PolyLine points={fit} color="#0EA5E9" width={3} />}
        {/* Couples (I ; U) relevés */}
        <DataPoints points={cloud} color="#DC2626" size={0.085} />
        {/* Point courant (pulse) */}
        <mesh ref={live}>
          <sphereGeometry args={[0.1, 16, 12]} />
          <meshStandardMaterial color="#F59E0B" emissive="#F59E0B" emissiveIntensity={0.7} />
        </mesh>

        <Tag3D position={[3.85, -0.32, 0]} label="I (A)" tone="physique" />
        <Tag3D position={[-0.42, 3.6, 0]} label="U (V)" tone="physique" />
        <Tag3D position={[3.0, -0.32, 0]} label="0,6" tone="neutral" />
        <Tag3D position={[-0.36, 3.0, 0]} label="12" tone="neutral" />
        <SceneLabel
          position={[1.85, 4.05, 0]}
          title="Caractéristique U = f(I)"
          subtitle={`${points.length} point(s) relevé(s)`}
          tone="physique"
        />
        {slope !== null && (
          <Readout position={[2.55, 2.05, 0]} value={slope.toFixed(1)} unit="Ω" caption="pente = R" />
        )}
      </group>

      <Animate
        fn={(state, delta) => {
          // 1) porteurs de charge : plus I est grande, plus ils défilent vite
          const g = charges.current;
          if (g) {
            const speed = 0.25 + i * 4.5;
            const base = (state.clock.elapsedTime * speed) % path.total;
            for (let k = 0; k < g.children.length; k++) {
              let rem = (base + (k / N_CHARGES) * path.total) % path.total;
              for (const seg of path.segs) {
                if (rem <= seg.len) {
                  const t = rem / seg.len;
                  g.children[k].position.set(
                    seg.a[0] + (seg.b[0] - seg.a[0]) * t,
                    seg.a[1] + (seg.b[1] - seg.a[1]) * t,
                    0.09,
                  );
                  break;
                }
                rem -= seg.len;
              }
            }
          }

          // 2) point courant sur la caractéristique (léger battement)
          if (live.current) {
            const s = 1 + Math.sin(state.clock.elapsedTime * 3.2) * 0.18;
            live.current.position.set(i * KX, u * KY, 0.05);
            live.current.scale.setScalar(s);
          }

          // 3) aiguilles : la valeur affichée rejoint la mesure en douceur
          const k = Math.min(1, delta * 5);
          smooth.current.i += (i - smooth.current.i) * k;
          smooth.current.u += (u - smooth.current.u) * k;
          if (Math.abs(smooth.current.i - shown.i) > 0.004 || Math.abs(smooth.current.u - shown.u) > 0.05) {
            setShown({ i: smooth.current.i, u: smooth.current.u });
          }
        }}
      />
    </LabScene>
  );
}
