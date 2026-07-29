'use client';

import { useMemo, useRef } from 'react';
import { Group, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';
import { HotspotCoach } from '@/components/lab/hotspot-coach';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — abaque / tableau de numération décimale (Maths, 6ème).
 *
 * Matériel base 10 en volume, aux proportions exactes :
 *   1 unité   = petit cube d'arête U
 *   1 dizaine = barre  U × U × 10U        (= 10 cubes alignés)
 *   1 centaine= plaque 10U × U × 10U      (= 10 barres côte à côte)
 *   1 millier = gros cube (10U)³          (= 10 plaques empilées)
 *
 * Chaque colonne du plateau porte un rang. Quand un rang atteint 10, le
 * paquet de 10 pièces glisse vers la colonne de gauche et se « fond » en
 * une seule pièce du rang supérieur (animation via <Animate>).
 *
 * Doit être chargé via next/dynamic({ ssr: false }).
 */

export type Rank = 'm' | 'c' | 'd' | 'u';
export type Digits = Record<Rank, number>;

export const RANKS: Rank[] = ['m', 'c', 'd', 'u'];
export const PLACE_VALUE: Record<Rank, number> = { m: 1000, c: 100, d: 10, u: 1 };
export const RANK_LABEL: Record<Rank, string> = { m: 'Milliers', c: 'Centaines', d: 'Dizaines', u: 'Unités' };
export const RANK_PIECE: Record<Rank, string> = { m: 'gros cube', c: 'plaque', d: 'barre', u: 'cube' };
export const RANK_COLOR: Record<Rank, string> = { m: '#7C3AED', c: '#0EA5E9', d: '#16A34A', u: '#F59E0B' };
export const NEXT_RANK: Record<Rank, Rank | null> = { u: 'd', d: 'c', c: 'm', m: null };

const U = 0.09; // arête du cube-unité
const TEN = U * 10; // 0,9 — longueur d'une barre, côté d'une plaque, arête du cube-mille
const GAP = 0.035; // jeu entre deux pièces empilées
const GY = -1.15; // hauteur du plateau
const CELL = TEN + 0.06; // pas de la grille des milliers

const COL_X: Record<Rank, number> = { m: -2.1, c: 0.4, d: 1.7, u: 2.6 };

function pieceHeight(rank: Rank) {
  return rank === 'm' ? TEN : U;
}

function pieceArgs(rank: Rank): [number, number, number] {
  if (rank === 'u') return [U, U, U];
  if (rank === 'd') return [U, U, TEN];
  if (rank === 'c') return [TEN, U, TEN];
  return [TEN, TEN, TEN];
}

/** Une pièce de matériel base 10. */
function Piece({ rank, position }: { rank: Rank; position: Vector3Tuple }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={pieceArgs(rank)} />
      <meshStandardMaterial color={RANK_COLOR[rank]} roughness={0.42} metalness={0.08} />
    </mesh>
  );
}

/** Rainures gravées sur la pièce du dessus : on doit pouvoir compter les 10. */
function Grooves({ rank, position }: { rank: Rank; position: Vector3Tuple }) {
  const top = position[1] + U / 2 + 0.003;
  if (rank === 'd') {
    return (
      <>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} position={[position[0], top, position[2] - TEN / 2 + (i + 1) * U]}>
            <boxGeometry args={[U * 1.05, 0.005, 0.012]} />
            <meshStandardMaterial color="#0F172A" />
          </mesh>
        ))}
      </>
    );
  }
  if (rank === 'c') {
    return (
      <>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={`z${i}`} position={[position[0], top, position[2] - TEN / 2 + (i + 1) * U]}>
            <boxGeometry args={[TEN, 0.005, 0.012]} />
            <meshStandardMaterial color="#0F172A" />
          </mesh>
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={`x${i}`} position={[position[0] - TEN / 2 + (i + 1) * U, top, position[2]]}>
            <boxGeometry args={[0.012, 0.005, TEN]} />
            <meshStandardMaterial color="#0F172A" />
          </mesh>
        ))}
      </>
    );
  }
  return null;
}

/** Pile d'un rang (les milliers occupent une grille 3×3, sinon empilement). */
function Stack({ rank, n }: { rank: Rank; n: number }) {
  const h = pieceHeight(rank);
  if (rank === 'm') {
    return (
      <>
        {Array.from({ length: n }, (_, i) => (
          <Piece
            key={i}
            rank="m"
            position={[COL_X.m + ((i % 3) - 1) * CELL, GY + TEN / 2, (Math.floor(i / 3) - 1) * CELL]}
          />
        ))}
      </>
    );
  }
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <Piece key={i} rank={rank} position={[COL_X[rank], GY + h / 2 + i * (h + GAP), 0]} />
      ))}
      {n > 0 && <Grooves rank={rank} position={[COL_X[rank], GY + h / 2 + (n - 1) * (h + GAP), 0]} />}
    </>
  );
}

/** Animation « 10 pièces d'un rang se fondent en 1 pièce du rang supérieur ». */
function Regroupement({ rank, toRank }: { rank: Rank; toRank: Rank }) {
  const pack = useRef<Group>(null);
  const born = useRef<Group>(null);
  const t0 = useRef(0);
  const h = pieceHeight(rank);
  const from: Vector3Tuple = [COL_X[rank], GY, 0];
  const to: Vector3Tuple = [COL_X[toRank], GY + 0.55, 0];

  return (
    <group>
      <group ref={pack} position={from}>
        {Array.from({ length: 10 }, (_, i) => (
          <Piece key={i} rank={rank} position={[0, h / 2 + i * (h + GAP), 0]} />
        ))}
      </group>
      <group ref={born} position={to} scale={0.001}>
        <Piece rank={toRank} position={[0, 0, 0]} />
      </group>
      <Animate
        fn={(state) => {
          if (t0.current === 0) t0.current = state.clock.elapsedTime;
          const p = Math.min(1, (state.clock.elapsedTime - t0.current) / 1.15);
          const e = p * p * (3 - 2 * p); // lissage
          if (pack.current) {
            pack.current.position.set(from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e, 0);
            pack.current.scale.setScalar(Math.max(0.001, 1 - Math.max(0, (p - 0.45) / 0.45)));
          }
          if (born.current) {
            born.current.scale.setScalar(Math.max(0.001, Math.min(1, (p - 0.5) / 0.4)));
          }
        }}
      />
      <Tag3D
        position={[(from[0] + to[0]) / 2, GY + 2.05, 0]}
        label={`10 ${RANK_PIECE[rank]}s = 1 ${RANK_PIECE[toRank]}`}
        tone="maths"
        distanceFactor={10}
      />
    </group>
  );
}

export type AbaqueSceneProps = {
  digits: Digits;
  value: number;
  grouping: Rank | null;
  /** Change à chaque regroupement : force le remontage de l'animation. */
  groupKey: number;
};

export default function AbaqueScene({ digits, value, grouping, groupKey }: AbaqueSceneProps) {
  const decomp = useMemo(() => {
    const parts = RANKS.filter((r) => digits[r] > 0).map((r) => `${digits[r]}×${PLACE_VALUE[r]}`);
    return parts.length ? parts.join(' + ') : '0';
  }, [digits]);
  const toRank = grouping ? NEXT_RANK[grouping] : null;

  return (
    <LabScene cameraPosition={[0.2, 1.7, 8]} background="#EEF2FF" minDistance={4} maxDistance={15} groundY={GY}>
      {/* Plateau du tableau de numération */}
      <mesh position={[-0.45, GY - 0.08, 0]} receiveShadow>
        <boxGeometry args={[7.2, 0.16, 3.6]} />
        <meshStandardMaterial color="#C89468" roughness={0.88} />
      </mesh>
      {[-0.35, 1.05, 2.15].map((x) => (
        <mesh key={x} position={[x, GY + 0.14, 0]} castShadow>
          <boxGeometry args={[0.05, 0.28, 3.5]} />
          <meshStandardMaterial color="#8B5A2B" roughness={0.82} />
        </mesh>
      ))}

      {/* Piles de chaque rang (le rang en cours de regroupement est joué par l'animation) */}
      {RANKS.map((r) => (grouping === r ? null : <Stack key={r} rank={r} n={digits[r]} />))}

      {grouping && toRank && <Regroupement key={groupKey} rank={grouping} toRank={toRank} />}

      {/* Étiquette de chaque rang */}
      {RANKS.map((r) => (
        <Tag3D
          key={`t${r}`}
          position={[COL_X[r], GY + 1.45, 0]}
          label={`${RANK_LABEL[r]} : ${digits[r]}`}
          tone="maths"
          distanceFactor={10}
        />
      ))}
      {RANKS.map((r) => (
        <Tag3D
          key={`p${r}`}
          position={[COL_X[r], GY - 0.42, 1.55]}
          label={`1 ${RANK_PIECE[r]} = ${PLACE_VALUE[r]}`}
          tone="neutral"
          distanceFactor={7}
        />
      ))}

      {value === 0 && (
        <HotspotCoach position={[COL_X.u, GY + 0.75, 0]} label="Ajoute des unités ici" tone="action" />
      )}

      <Readout position={[0.2, GY + 2.6, 0]} value={value.toLocaleString('fr-FR')} caption="nombre construit" />
      <SceneLabel position={[0.2, GY + 3.25, 0]} title={decomp} subtitle="Tableau de numération" tone="maths" />
    </LabScene>
  );
}
