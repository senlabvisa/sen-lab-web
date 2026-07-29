'use client';

import { useMemo, useRef } from 'react';
import { CatmullRomCurve3, Group, Mesh, Vector3, type Vector3Tuple } from 'three';
import {
  LabScene,
  GraphPaper,
  Segment,
  PolyLine,
  SceneLabel,
  Tag3D,
  Readout,
  Animate,
} from '@/components/lab3d';

/**
 * Scène 3D — régulation de la glycémie (SVT, 1ère).
 *
 * À gauche : le graphe glycémie = f(temps) tracé en direct sur papier
 * millimétré, avec la bande verte de normalité (0,7 – 1,1 g/L), le trait
 * de consigne à 1 g/L et le seuil de diabète à 1,26 g/L (à jeun).
 * À droite : le pancréas schématisé (îlots de Langerhans — cellules β et α)
 * qui envoie ses hormones vers le foie. Les billes bleues = insuline
 * (hypoglycémiante, stockage en glycogène), les billes orange = glucagon
 * (hyperglycémiant, déstockage). Le stock de glycogène du foie grossit et
 * maigrit réellement selon le bilan hormonal. En mode diabète, les cellules β
 * ne sécrètent plus rien : le flux d'insuline disparaît.
 *
 * Aucun corps humain n'est représenté : on reste sur les organes, les
 * hormones et la courbe.
 */

export type GlycemieSceneProps = {
  /** Glycémie courante, en g/L. */
  glycemie: number;
  /** Sécrétion d'insuline normalisée 0–1. */
  insuline: number;
  /** Sécrétion de glucagon normalisée 0–1. */
  glucagon: number;
  /** Stock de glycogène hépatique normalisé 0–1. */
  glycogene: number;
  /** Historique des glycémies (une valeur par pas de simulation). */
  historique: number[];
  /** Pancréas qui ne fabrique plus d'insuline (diabète de type 1). */
  diabete: boolean;
  /** Libellé de la situation en cours (repas, jeûne, sport…). */
  etat: string;
};

// ── Repère du graphe : y = GY0 + g × GSC ────────────────────────────────
const GX0 = -4.0;
const GX1 = 0.6;
const GY0 = -1.15;
const GSC = 0.9375; // 1 g/L ↔ 0,9375 unité (0 → 3,2 g/L sur 3 unités)
const WINDOW = 170; // nombre de points affichés sur toute la largeur
const N_BILLES = 7;

const yFor = (g: number) => GY0 + Math.max(0, Math.min(3.2, g)) * GSC;

/** Trajet des hormones : pancréas → foie (voie sanguine). */
const P_INSULINE: Vector3Tuple[] = [
  [2.4, 0.9, 0.3],
  [2.15, 0.3, 0.34],
  [2.4, -0.35, 0.3],
];
const P_GLUCAGON: Vector3Tuple[] = [
  [3.4, 0.9, 0.3],
  [3.65, 0.3, 0.34],
  [3.4, -0.35, 0.3],
];

const _v = new Vector3();

/** Répartit des billes régulièrement le long d'une courbe (boucle infinie). */
function flowAlong(g: Group | null, curve: CatmullRomCurve3, len: number, dist: number) {
  if (!g) return;
  const n = g.children.length;
  for (let i = 0; i < n; i++) {
    const u = (((dist / len + i / n) % 1) + 1) % 1;
    curve.getPoint(u, _v);
    g.children[i].position.copy(_v);
  }
}

export default function GlycemieScene({
  glycemie,
  insuline,
  glucagon,
  glycogene,
  historique,
  diabete,
  etat,
}: GlycemieSceneProps) {
  const gIns = useRef<Group>(null);
  const gGlu = useRef<Group>(null);
  const point = useRef<Mesh>(null);
  const dIns = useRef(0);
  const dGlu = useRef(0);

  const courbe = useMemo<Vector3Tuple[]>(() => {
    const pts = historique.map<Vector3Tuple>((g, i) => [
      GX0 + (i / (WINDOW - 1)) * (GX1 - GX0),
      yFor(g),
      0.04,
    ]);
    return pts.length >= 2 ? pts : [[GX0, yFor(1), 0.04], [GX0 + 0.02, yFor(1), 0.04]];
  }, [historique]);

  const dernier = courbe[courbe.length - 1];

  const paths = useMemo(() => {
    const mk = (pts: Vector3Tuple[]) => new CatmullRomCurve3(pts.map((p) => new Vector3(...p)));
    const ins = mk(P_INSULINE);
    const glu = mk(P_GLUCAGON);
    return { ins, glu, lIns: ins.getLength(), lGlu: glu.getLength() };
  }, []);

  return (
    <LabScene cameraPosition={[0, 0.2, 9.6]} background="#ECFDF5" minDistance={5} maxDistance={16} groundY={null}>
      {/* ─────────── Graphe glycémie = f(temps) ─────────── */}
      <group position={[(GX0 + GX1) / 2, GY0 + 1.5, 0]}>
        <GraphPaper width={GX1 - GX0} height={3} step={GSC / 2} z={-0.06} />
      </group>

      {/* Bande de normalité 0,7 – 1,1 g/L */}
      <mesh position={[(GX0 + GX1) / 2, (yFor(0.7) + yFor(1.1)) / 2, -0.02]}>
        <planeGeometry args={[GX1 - GX0, yFor(1.1) - yFor(0.7)]} />
        <meshStandardMaterial color="#34D399" transparent opacity={0.35} />
      </mesh>

      {/* Axes + repères de niveau */}
      <Segment a={[GX0, GY0, 0]} b={[GX1, GY0, 0]} color="#334155" width={0.016} />
      <Segment a={[GX0, GY0, 0]} b={[GX0, yFor(3.15), 0]} color="#334155" width={0.016} />
      <PolyLine points={[[GX0, yFor(1), 0.01], [GX1, yFor(1), 0.01]]} color="#047857" width={2} dashed />
      <PolyLine points={[[GX0, yFor(1.26), 0.01], [GX1, yFor(1.26), 0.01]]} color="#DC2626" width={2} dashed />

      <Tag3D position={[GX0 - 0.42, yFor(1), 0]} label="1 g/L" tone="svt" />
      <Tag3D position={[GX0 - 0.42, yFor(2), 0]} label="2 g/L" tone="neutral" />
      <Tag3D position={[GX0 + 1.35, yFor(1.26) + 0.2, 0.05]} label="1,26 g/L — seuil de diabète (à jeun)" tone="neutral" />
      <Tag3D position={[GX0 + 1.1, yFor(0.9), 0.05]} label="zone normale 0,7 – 1,1 g/L" tone="svt" />
      <Tag3D position={[(GX0 + GX1) / 2, GY0 - 0.34, 0]} label="temps →" tone="neutral" />

      {/* La courbe qui se trace + le point courant */}
      <PolyLine points={courbe} color="#B91C1C" width={4} />
      <mesh ref={point} position={[dernier[0], dernier[1], 0.1]}>
        <sphereGeometry args={[0.1, 20, 16]} />
        <meshStandardMaterial color="#DC2626" emissive="#DC2626" emissiveIntensity={0.45} />
      </mesh>
      <Readout position={[GX1 + 0.75, dernier[1], 0.1]} value={glycemie.toFixed(2)} unit="g/L" caption="glycémie" />

      {/* ─────────── Pancréas (îlots de Langerhans) ─────────── */}
      <group position={[2.9, 1.15, 0]}>
        <mesh scale={[1.55, 0.6, 0.62]} castShadow>
          <sphereGeometry args={[0.52, 30, 22]} />
          <meshStandardMaterial color="#E9A08C" roughness={0.72} />
        </mesh>
        <mesh position={[0.92, -0.05, 0]} rotation={[0, 0, -Math.PI / 2 - 0.25]} castShadow>
          <coneGeometry args={[0.26, 0.66, 20]} />
          <meshStandardMaterial color="#DE9078" roughness={0.75} />
        </mesh>
        {/* cellules β → insuline */}
        <mesh position={[-0.5, 0.12, 0.3]} scale={0.75 + insuline * 0.75}>
          <sphereGeometry args={[0.15, 18, 14]} />
          <meshStandardMaterial
            color={diabete ? '#94A3B8' : '#2563EB'}
            emissive={diabete ? '#475569' : '#1D4ED8'}
            emissiveIntensity={diabete ? 0.05 : 0.25 + insuline * 0.7}
            roughness={0.35}
          />
        </mesh>
        {/* cellules α → glucagon */}
        <mesh position={[0.5, 0.12, 0.3]} scale={0.75 + glucagon * 0.75}>
          <sphereGeometry args={[0.15, 18, 14]} />
          <meshStandardMaterial color="#F59E0B" emissive="#B45309" emissiveIntensity={0.25 + glucagon * 0.7} roughness={0.35} />
        </mesh>
      </group>
      <Tag3D position={[2.9, 1.95, 0]} label="Pancréas — îlots de Langerhans" tone="svt" />
      <Tag3D position={[1.75, 1.32, 0.4]} label={diabete ? 'cellules β détruites' : 'cellules β'} tone={diabete ? 'neutral' : 'physique'} />
      <Tag3D position={[4.05, 1.32, 0.4]} label="cellules α" tone="neutral" />

      {/* ─────────── Foie (+ muscles) : le réservoir de glycogène ─────────── */}
      <group position={[2.9, -0.95, 0]}>
        <mesh scale={[1.7, 0.85, 0.9]} castShadow>
          <sphereGeometry args={[0.55, 30, 22]} />
          <meshStandardMaterial color="#8E3B3B" roughness={0.8} />
        </mesh>
        <mesh position={[0.72, -0.24, 0.12]} scale={[0.9, 0.6, 0.7]} castShadow>
          <sphereGeometry args={[0.4, 22, 16]} />
          <meshStandardMaterial color="#7A3030" roughness={0.82} />
        </mesh>
        {/* granules de glycogène : le stock grossit / maigrit pour de vrai */}
        <group scale={0.35 + glycogene}>
          {Array.from({ length: 9 }).map((_, i) => {
            const a = (i / 9) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.42, Math.sin(a) * 0.2, 0.36]}>
                <sphereGeometry args={[0.075, 12, 10]} />
                <meshStandardMaterial color="#FDE68A" emissive="#F59E0B" emissiveIntensity={0.3} roughness={0.4} />
              </mesh>
            );
          })}
        </group>
      </group>
      <Tag3D position={[2.9, -1.85, 0]} label="Foie & muscles — stock de glycogène" tone="svt" />
      <Readout position={[4.7, -0.95, 0]} value={Math.round(glycogene * 100)} unit="%" caption="glycogène" />

      {/* ─────────── Hormones en circulation ─────────── */}
      <group ref={gIns} visible={!diabete && insuline > 0.04}>
        {Array.from({ length: N_BILLES }).map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.075, 14, 10]} />
            <meshStandardMaterial color="#2563EB" emissive="#1D4ED8" emissiveIntensity={0.5} roughness={0.3} />
          </mesh>
        ))}
      </group>
      <group ref={gGlu} visible={glucagon > 0.04}>
        {Array.from({ length: N_BILLES }).map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.075, 14, 10]} />
            <meshStandardMaterial color="#F59E0B" emissive="#B45309" emissiveIntensity={0.5} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {!diabete && insuline > 0.04 && (
        <Tag3D position={[1.72, 0.2, 0.4]} label="insuline → stocke le glucose" tone="physique" />
      )}
      {diabete && <Tag3D position={[1.72, 0.2, 0.4]} label="✕ aucune insuline" tone="neutral" />}
      {glucagon > 0.04 && (
        <Tag3D position={[4.35, 0.2, 0.4]} label="glucagon → libère le glucose" tone="neutral" />
      )}

      <Animate
        fn={(state, delta) => {
          dIns.current += delta * (0.3 + insuline * 1.4);
          dGlu.current += delta * (0.3 + glucagon * 1.4);
          flowAlong(gIns.current, paths.ins, paths.lIns, dIns.current);
          flowAlong(gGlu.current, paths.glu, paths.lGlu, dGlu.current);
          point.current?.scale.setScalar(1 + 0.2 * Math.sin(state.clock.elapsedTime * 5));
        }}
      />

      <SceneLabel
        position={[-0.6, 2.35, 0]}
        title={etat}
        subtitle={diabete ? 'Pancréas sans insuline · diabète de type 1' : 'Rétrocontrôle négatif · consigne 1 g/L'}
        tone="svt"
      />
    </LabScene>
  );
}
