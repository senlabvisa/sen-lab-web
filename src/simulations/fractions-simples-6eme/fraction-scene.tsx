'use client';

import { useMemo, useRef } from 'react';
import { Group, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Arrow3D, PolyLine, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — sens de la fraction (Maths, 6ème).
 *
 * Deux galettes rondes posées sur leur plateau, chacune découpée en secteurs
 * angulaires RÉELLEMENT égaux (cylinderGeometry + thetaStart/thetaLength :
 * chaque part occupe exactement 2π/n radians). À gauche la galette de l'élève
 * (n parts, p coloriées), à droite une galette témoin. En dessous, la MÊME
 * fraction est placée sur une demi-droite graduée de 0 à 1 : l'élève voit que
 * p/n est à la fois « une aire coloriée » et « un point sur une droite ».
 * Quand les deux fractions tombent au même point, elles sont équivalentes.
 */

export type FractionSceneProps = {
  /** Numérateur : parts coloriées (0..den). */
  num: number;
  /** Dénominateur : nombre total de parts égales (2..12). */
  den: number;
  /** Fraction témoin, numérateur. */
  refNum: number;
  /** Fraction témoin, dénominateur. */
  refDen: number;
};

const R = 1.28; // rayon d'une galette
const DISC_Y = 0.85; // hauteur du centre des galettes
const LEFT_X = -2.5;
const RIGHT_X = 2.5;

const LINE_Y = -2.05; // demi-droite graduée
const X0 = -3.25; // abscisse de 0
const LEN = 5.3; // longueur de l'unité (de 0 à 1)

const GAP = 0.045; // écart angulaire entre deux parts (rad), purement visuel

const ON = '#EA7C22'; // part coloriée (mil grillé)
const OFF = '#FBE3A6'; // part laissée blanche

/** Abscisse scène d'une valeur de la demi-droite (0 → X0, 1 → X0 + LEN). */
function px(v: number) {
  return X0 + v * LEN;
}

/** Un secteur angulaire exact de 2π/total radians. */
function Wedge({
  index,
  total,
  radius,
  thickness,
  color,
}: {
  index: number;
  total: number;
  radius: number;
  thickness: number;
  color: string;
}) {
  const step = (Math.PI * 2) / total;
  const theta = Math.max(0.05, step - GAP);
  const seg = Math.max(6, Math.round((theta / (Math.PI * 2)) * 96));
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[radius, radius, thickness, seg, 1, false, index * step + GAP / 2, theta]} />
      <meshStandardMaterial color={color} roughness={0.72} metalness={0.03} />
    </mesh>
  );
}

/** Une galette entière : plateau + n parts égales dont p coloriées + croûte. */
function Galette({
  center,
  num,
  den,
  animated = false,
}: {
  center: Vector3Tuple;
  num: number;
  den: number;
  animated?: boolean;
}) {
  const lit = useRef<Group>(null);
  const parts = useMemo(() => Array.from({ length: den }, (_, i) => i), [den]);

  return (
    <group position={center}>
      {/* Plateau en bois */}
      <mesh position={[0, 0, -0.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <cylinderGeometry args={[R * 1.17, R * 1.17, 0.1, 64]} />
        <meshStandardMaterial color="#8A5A34" roughness={0.92} />
      </mesh>

      {/* Parts laissées blanches */}
      {parts
        .filter((i) => i >= num)
        .map((i) => (
          <Wedge key={`off-${i}`} index={i} total={den} radius={R} thickness={0.2} color={OFF} />
        ))}

      {/* Parts coloriées (soulevées vers l'élève) */}
      <group ref={lit} position={[0, 0, 0.06]}>
        {parts
          .filter((i) => i < num)
          .map((i) => (
            <Wedge key={`on-${i}`} index={i} total={den} radius={R} thickness={0.24} color={ON} />
          ))}
      </group>

      {/* Croûte du bord */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[R + 0.02, 0.055, 12, 72]} />
        <meshStandardMaterial color="#A8551C" roughness={0.85} />
      </mesh>

      {animated && (
        <Animate
          fn={(state) => {
            if (lit.current) lit.current.position.z = 0.06 + 0.035 * Math.sin(state.clock.elapsedTime * 1.6);
          }}
        />
      )}
    </group>
  );
}

export default function FractionScene({ num, den, refNum, refDen }: FractionSceneProps) {
  const val = num / den;
  const ref = refNum / refDen;
  const diff = num * refDen - refNum * den; // signe de la comparaison, sans division
  const sign = diff === 0 ? '=' : diff > 0 ? '>' : '<';

  const ticks = useMemo(() => Array.from({ length: den + 1 }, (_, k) => k), [den]);

  const fillSeg: Vector3Tuple[] = [
    [px(0), LINE_Y + 0.07, 0.03],
    [px(val), LINE_Y + 0.07, 0.03],
  ];
  const refDrop: Vector3Tuple[] = [
    [px(ref), LINE_Y, 0.03],
    [px(ref), LINE_Y - 0.55, 0.03],
  ];

  return (
    <LabScene cameraPosition={[0, 0.1, 9]} background="#FFF6E9" minDistance={5} maxDistance={14} groundY={null}>
      {/* ── Galette de l'élève ─────────────────────────────── */}
      <Galette center={[LEFT_X, DISC_Y, 0]} num={num} den={den} animated />
      <Tag3D position={[LEFT_X, DISC_Y + R + 0.42, 0.2]} label={`numérateur = ${num}`} tone="maths" />
      <Tag3D position={[LEFT_X - R - 0.62, DISC_Y, 0.2]} label={`dénominateur = ${den}`} tone="chimie" />
      <Readout position={[LEFT_X, DISC_Y - R - 0.42, 0.2]} value={`${num}/${den}`} caption="ta fraction" />

      {/* ── Galette témoin ─────────────────────────────────── */}
      <Galette center={[RIGHT_X, DISC_Y, 0]} num={refNum} den={refDen} />
      <Tag3D position={[RIGHT_X, DISC_Y + R + 0.42, 0.2]} label="galette témoin" tone="chimie" />
      <Readout position={[RIGHT_X, DISC_Y - R - 0.42, 0.2]} value={`${refNum}/${refDen}`} caption="témoin" />

      {/* ── Comparaison ────────────────────────────────────── */}
      <Tag3D
        position={[0, DISC_Y + 0.3, 0.5]}
        label={`${num}/${den} ${sign} ${refNum}/${refDen}`}
        tone={diff === 0 ? 'svt' : 'neutral'}
      />
      {diff === 0 && <Tag3D position={[0, DISC_Y - 0.25, 0.5]} label="fractions équivalentes" tone="svt" />}

      {/* ── Demi-droite graduée ────────────────────────────── */}
      <Arrow3D from={[X0 - 0.3, LINE_Y, 0]} to={[px(1) + 0.95, LINE_Y, 0]} color="#334155" radius={0.02} headLength={0.2} />
      {ticks.map((k) => (
        <mesh key={`t${k}`} position={[px(k / den), LINE_Y, 0.01]}>
          <boxGeometry args={[0.022, k === 0 || k === den ? 0.3 : 0.18, 0.022]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      ))}
      <PolyLine points={fillSeg} color={ON} width={6} />
      <Marker position={[px(val), LINE_Y, 0.06]} color={ON} size={0.13} />
      <Tag3D position={[px(val), LINE_Y + 0.45, 0.1]} label={`${num}/${den}`} tone="maths" />

      <Marker position={[px(ref), LINE_Y, 0.05]} color="#7C3AED" size={0.09} />
      <PolyLine points={refDrop} color="#7C3AED" width={2} dashed />
      <Tag3D position={[px(ref), LINE_Y - 0.75, 0.1]} label={`${refNum}/${refDen}`} tone="chimie" />

      <Tag3D position={[px(0), LINE_Y - 0.36, 0.1]} label="0" tone="neutral" />
      <Tag3D position={[px(1), LINE_Y - 0.36, 0.1]} label="1" tone="neutral" />

      <SceneLabel
        position={[0, 2.95, 0]}
        title={`${num}/${den}`}
        subtitle={`${num} part${num > 1 ? 's' : ''} coloriée${num > 1 ? 's' : ''} sur ${den} parts ÉGALES`}
        tone="maths"
      />
    </LabScene>
  );
}
