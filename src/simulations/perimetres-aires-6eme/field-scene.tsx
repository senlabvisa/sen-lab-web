'use client';

import { useMemo, useRef } from 'react';
import { Mesh, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { GraphPaper } from '@/components/lab3d/environment';
import { PolyLine } from '@/components/lab3d/plot';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — périmètre et aire d'un terrain rectangulaire (Maths, 6ème).
 *
 * Le terrain est posé sur un papier quadrillé dont CHAQUE carreau vaut
 * exactement 1 m × 1 m (le pas de la grille est l'échelle « 1 mètre »).
 *
 *  - PÉRIMÈTRE : une clôture (polyligne épaisse + piquets) court le long du
 *    CONTOUR. Un rouleau de grillage se déplace le long de ce contour : sa
 *    longueur de course est le périmètre, en MÈTRES.
 *  - AIRE : le terrain est pavé de carreaux de 1 m². Un carreau surligné les
 *    parcourt un par un : on les COMPTE, en MÈTRES CARRÉS.
 *
 * En mode `compare`, un second terrain de MÊME périmètre mais de dimensions
 * différentes est affiché à côté : même longueur de clôture, aire très
 * différente. C'est le contre-exemple qui casse la confusion P ↔ A.
 */

export type FieldSceneProps = {
  /** Longueur du terrain de l'élève, en mètres (entier). */
  longueur: number;
  /** Largeur du terrain de l'élève, en mètres (entier). */
  largeur: number;
  /** Affiche le terrain témoin de même périmètre à côté. */
  compare?: boolean;
  /** Longueur du terrain témoin (même périmètre), en mètres. */
  refLongueur?: number;
  /** Largeur du terrain témoin (même périmètre), en mètres. */
  refLargeur?: number;
};

const GAP_M = 3; // espace entre les deux terrains, en mètres

const SOIL = '#8C6239'; // terre du champ
const TILE_A = '#7DAA3C'; // carreau 1 m² (clair)
const TILE_B = '#5F8C2A'; // carreau 1 m² (foncé) — damier pour compter
const FENCE = '#475569'; // grillage
const POST = '#8B5A2B'; // piquet de bois
const ROLL = '#EA580C'; // rouleau de grillage qui court

/** Point du contour à la distance d (en mètres) depuis le coin bas-gauche. */
function contourPoint(d: number, L: number, l: number): [number, number] {
  if (d <= L) return [d, 0];
  if (d <= L + l) return [L, d - L];
  if (d <= 2 * L + l) return [L - (d - L - l), l];
  return [0, l - (d - 2 * L - l)];
}

type TerrainProps = {
  /** Longueur en mètres. */
  L: number;
  /** Largeur en mètres. */
  l: number;
  /** Abscisse du coin bas-gauche, en mètres (entier → aligné sur la grille). */
  x0: number;
  /** Ordonnée du coin bas-gauche, en mètres (entier). */
  y0: number;
  /** Échelle : unités de scène par mètre. */
  s: number;
  /** Titre affiché sous le terrain. */
  caption: string;
  /** Anime le rouleau de grillage + le carreau compté. */
  animated?: boolean;
};

/** Un terrain : sol, pavage 1 m², clôture du contour, cotes et afficheurs. */
function Terrain({ L, l, x0, y0, s, caption, animated = true }: TerrainProps) {
  const roll = useRef<Mesh>(null);
  const hi = useRef<Mesh>(null);

  const X0 = x0 * s;
  const Y0 = y0 * s;
  const W = L * s;
  const H = l * s;
  const X1 = X0 + W;
  const Y1 = Y0 + H;
  const cx = X0 + W / 2;
  const cy = Y0 + H / 2;

  const perimetre = 2 * (L + l);
  const aire = L * l;

  /** Pavage : un carreau = 1 m². Damier pour aider au comptage. */
  const tiles = useMemo(() => {
    const out: { x: number; y: number; dark: boolean }[] = [];
    for (let i = 0; i < L; i++) {
      for (let j = 0; j < l; j++) {
        out.push({ x: X0 + (i + 0.5) * s, y: Y0 + (j + 0.5) * s, dark: (i + j) % 2 === 1 });
      }
    }
    return out;
  }, [L, l, X0, Y0, s]);

  /** Piquets tous les 2 m le long du contour. */
  const posts = useMemo(() => {
    const out: Vector3Tuple[] = [];
    for (let d = 0; d < perimetre; d += 2) {
      const [mx, my] = contourPoint(d, L, l);
      out.push([X0 + mx * s, Y0 + my * s, 0.09]);
    }
    return out;
  }, [perimetre, L, l, X0, Y0, s]);

  const loop: Vector3Tuple[] = [
    [X0, Y0, 0.12],
    [X1, Y0, 0.12],
    [X1, Y1, 0.12],
    [X0, Y1, 0.12],
    [X0, Y0, 0.12],
  ];

  return (
    <group>
      {/* Sol du terrain (la terre nue) */}
      <mesh position={[cx, cy, 0.005]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color={SOIL} roughness={0.95} />
      </mesh>

      {/* AIRE — pavage en carreaux de 1 m² */}
      {tiles.map((t, i) => (
        <mesh key={i} position={[t.x, t.y, 0.03]}>
          <boxGeometry args={[s * 0.94, s * 0.94, 0.02]} />
          <meshStandardMaterial color={t.dark ? TILE_B : TILE_A} roughness={0.8} />
        </mesh>
      ))}

      {/* Carreau en cours de comptage */}
      {animated && (
        <mesh ref={hi} position={[X0 + s / 2, Y0 + s / 2, 0.07]}>
          <boxGeometry args={[s * 0.96, s * 0.96, 0.03]} />
          <meshStandardMaterial color="#FACC15" emissive="#FACC15" emissiveIntensity={0.45} roughness={0.5} />
        </mesh>
      )}

      {/* PÉRIMÈTRE — la clôture le long du contour */}
      <PolyLine points={loop} color={FENCE} width={5} />
      {posts.map((p, i) => (
        <mesh key={i} position={p} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.18, 8]} />
          <meshStandardMaterial color={POST} roughness={0.85} />
        </mesh>
      ))}

      {/* Rouleau de grillage qui court le long du contour */}
      {animated && (
        <mesh ref={roll} position={[X0, Y0, 0.2]}>
          <torusGeometry args={[0.1, 0.038, 8, 20]} />
          <meshStandardMaterial color={ROLL} emissive={ROLL} emissiveIntensity={0.3} roughness={0.4} />
        </mesh>
      )}

      {animated && (
        <Animate
          fn={(state) => {
            const t = state.clock.elapsedTime;
            const d = (t * 2.4) % perimetre;
            const [mx, my] = contourPoint(d, L, l);
            roll.current?.position.set(X0 + mx * s, Y0 + my * s, 0.2);
            const cell = tiles[Math.floor(t * 3.2) % tiles.length];
            if (cell) hi.current?.position.set(cell.x, cell.y, 0.07);
          }}
        />
      )}

      {/* Cotes du rectangle */}
      <Tag3D position={[cx, Y0 - 0.3, 0.15]} label={`L = ${L} m`} tone="maths" />
      <Tag3D position={[X0 - 0.45, cy, 0.15]} label={`l = ${l} m`} tone="maths" />

      {/* Afficheurs : périmètre (m) et aire (m²) */}
      <Readout position={[cx - W / 2 - 0.05, Y1 + 0.4, 0.15]} value={perimetre} unit="m" caption="périmètre · clôture" />
      <Readout position={[cx + W / 2 + 0.05, Y1 + 0.9, 0.15]} value={aire} unit="m²" caption="aire · carreaux" />
      <Tag3D position={[cx, Y0 - 0.8, 0.15]} label={caption} tone="neutral" />
    </group>
  );
}

export default function FieldScene({
  longueur,
  largeur,
  compare = false,
  refLongueur = 1,
  refLargeur = 1,
}: FieldSceneProps) {
  const L = Math.max(1, Math.round(longueur));
  const w = Math.max(1, Math.round(largeur));
  const L2 = Math.max(1, Math.round(refLongueur));
  const w2 = Math.max(1, Math.round(refLargeur));

  const totalW = compare ? L + GAP_M + L2 : L;
  const maxH = compare ? Math.max(w, w2) : w;

  // Échelle : 1 mètre = s unités de scène (= 1 carreau de la grille).
  const s = Math.max(0.16, Math.min(0.46, 10.5 / totalW, 5.0 / Math.max(5, maxH)));

  // Coins bas-gauche en mètres ENTIERS → les terrains tombent pile sur la grille.
  const x0A = -Math.round(totalW / 2);
  const y0A = -Math.round(w / 2);
  const x0B = x0A + L + GAP_M;
  const y0B = -Math.round(w2 / 2);

  const NX = Math.ceil(totalW / 2) + 2;
  const NY = Math.ceil(maxH / 2) + 3;

  const perimetre = 2 * (L + w);
  const aire = L * w;

  const dist = Math.max(6.5, NX * s * 2.4);
  const top = NY * s - 0.2;

  return (
    <LabScene
      cameraPosition={[0, 0, dist]}
      background="#EEF6FF"
      minDistance={4}
      maxDistance={dist + 8}
      groundY={null}
      enablePan
    >
      {/* Papier quadrillé : 1 carreau = 1 m × 1 m */}
      <GraphPaper width={2 * NX * s} height={2 * NY * s} step={s} z={-0.04} color="#BFD4E8" />

      <Terrain L={L} l={w} x0={x0A} y0={y0A} s={s} caption={compare ? 'ton champ' : 'le champ de Kaolack'} />

      {compare && (
        <>
          <Terrain L={L2} l={w2} x0={x0B} y0={y0B} s={s} caption="même clôture, autre forme" animated={false} />
          <Tag3D
            position={[(x0A + L + GAP_M / 2) * s, (y0A - 1.6) * s, 0.2]}
            label={`même périmètre : ${perimetre} m de grillage`}
            tone="physique"
          />
          <Tag3D
            position={[(x0A + L + GAP_M / 2) * s, (y0A - 2.4) * s, 0.2]}
            label={`aires différentes : ${aire} m² ≠ ${L2 * w2} m²`}
            tone="svt"
          />
        </>
      )}

      <SceneLabel
        position={[0, top, 0.2]}
        title={compare ? `P = ${perimetre} m pour les deux terrains` : `${L} m × ${w} m`}
        subtitle={compare ? 'même contour, pavages différents' : '1 carreau du quadrillage = 1 m²'}
        tone="maths"
      />
    </LabScene>
  );
}
