'use client';

/**
 * lab3d/environment — décor de paillasse partagé.
 *
 * Donne du « poids » physique aux scènes : une vraie paillasse posée, un
 * repère millimétré pour les graphes, un statif pour la chimie/optique.
 * À placer dans un <Canvas> (via LabScene).
 */

import { useEffect, useMemo } from 'react';
import {
  CanvasTexture,
  DoubleSide,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  type Vector3Tuple,
} from 'three';
import { Metal } from './materials';

// ──────────────────────────────────────────────────────────────────────
// Textures procédurales de paillasse (générées en mémoire, ZÉRO réseau)
// ──────────────────────────────────────────────────────────────────────

/** PRNG déterministe (mulberry32) → même grain à chaque exécution. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type BenchTextures = { grain: CanvasTexture; rough: CanvasTexture };
let benchTexturesCache: BenchTextures | null | undefined;

/**
 * Génère le mouchetis « résine époxy » d'une paillasse : une carte de couleur
 * quasi blanche (elle module la couleur du matériau, donc reste compatible avec
 * la prop `color`) et une carte de rugosité corrélée. C'est la variation de
 * rugosité qui, sous la carte d'environnement, fait lire la surface comme une
 * vraie paillasse plutôt qu'un plastique uniforme.
 *
 * 256×256, générée une seule fois et partagée par toutes les scènes.
 */
function getBenchTextures(): BenchTextures | null {
  if (benchTexturesCache !== undefined) return benchTexturesCache;
  if (typeof document === 'undefined') {
    benchTexturesCache = null;
    return null;
  }
  const size = 256;
  const make = () => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    return { canvas, ctx: canvas.getContext('2d') };
  };
  const a = make();
  const b = make();
  if (!a.ctx || !b.ctx) {
    benchTexturesCache = null;
    return null;
  }

  const grainImg = a.ctx.createImageData(size, size);
  const roughImg = b.ctx.createImageData(size, size);
  const rnd = mulberry32(0x5e17ab);

  for (let i = 0; i < size * size; i++) {
    // bruit fin + quelques éclats plus marqués (mouchetis de résine)
    const fine = rnd();
    const fleck = rnd() > 0.985 ? rnd() * 0.5 : 0;
    // couleur : 236..255, assombrie ponctuellement par les éclats
    const c = Math.round(238 + fine * 17 - fleck * 90);
    // rugosité : base mate avec micro-variations + éclats plus lisses
    const r = Math.round(196 + fine * 40 - fleck * 120);
    const o = i * 4;
    grainImg.data[o] = c;
    grainImg.data[o + 1] = c;
    grainImg.data[o + 2] = Math.min(255, c + 2);
    grainImg.data[o + 3] = 255;
    roughImg.data[o] = r;
    roughImg.data[o + 1] = r;
    roughImg.data[o + 2] = r;
    roughImg.data[o + 3] = 255;
  }
  a.ctx.putImageData(grainImg, 0, 0);
  b.ctx.putImageData(roughImg, 0, 0);

  const grain = new CanvasTexture(a.canvas);
  grain.colorSpace = SRGBColorSpace;
  const rough = new CanvasTexture(b.canvas);

  for (const t of [grain, rough]) {
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    t.anisotropy = 4;
    t.needsUpdate = true;
  }

  benchTexturesCache = { grain, rough };
  return benchTexturesCache;
}

/** Clone les textures partagées avec le bon nombre de répétitions pour `size`. */
function useBenchTextures(size: number): { grain: Texture; rough: Texture } | null {
  const cloned = useMemo(() => {
    const base = getBenchTextures();
    if (!base) return null;
    const repeat = Math.max(1, Math.round(size / 2));
    const grain = base.grain.clone();
    const rough = base.rough.clone();
    for (const t of [grain, rough]) {
      t.repeat.set(repeat, repeat);
      t.needsUpdate = true;
    }
    return { grain, rough };
  }, [size]);

  useEffect(() => {
    if (!cloned) return;
    return () => {
      cloned.grain.dispose();
      cloned.rough.dispose();
    };
  }, [cloned]);

  return cloned;
}

/**
 * Paillasse de labo (plateau stratifié + plinthe). Pose les objets dessus.
 *
 * Matière : résine mate mouchetée avec un vernis très diffus (clearcoat), qui
 * capte un large reflet du plafonnier du studio → la surface a une orientation
 * lisible et les objets paraissent vraiment posés.
 */
export function LabBench({ y = -1.5, color = '#E8E2D6', size = 22 }: { y?: number; color?: string; size?: number }) {
  const tex = useBenchTextures(size);
  return (
    <group position={[0, y, 0]}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size]} />
        <meshPhysicalMaterial
          color={color}
          map={tex?.grain ?? null}
          roughnessMap={tex?.rough ?? null}
          roughness={0.72}
          metalness={0.02}
          clearcoat={0.3}
          clearcoatRoughness={0.55}
          envMapIntensity={0.55}
          side={DoubleSide}
        />
      </mesh>
      {/* fine plinthe pour donner de l'épaisseur au plateau */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[size, 0.12, size]} />
        <meshStandardMaterial color="#BCB4A2" roughness={0.78} metalness={0.03} envMapIntensity={0.5} />
      </mesh>
    </group>
  );
}

/** Repère millimétré (plan vertical) pour les graphes — papier blanc + grille. */
export function GraphPaper({
  width = 6,
  height = 4.5,
  step = 0.5,
  z = -0.05,
  color = '#CBD5E1',
}: {
  width?: number;
  height?: number;
  step?: number;
  z?: number;
  color?: string;
}) {
  const lines = useMemo(() => {
    const segs: Vector3Tuple[][] = [];
    const x0 = -width / 2;
    const x1 = width / 2;
    const y0 = -height / 2;
    const y1 = height / 2;
    for (let x = x0; x <= x1 + 1e-6; x += step) segs.push([[x, y0, z], [x, y1, z]]);
    for (let y = y0; y <= y1 + 1e-6; y += step) segs.push([[x0, y, z], [x1, y, z]]);
    return segs;
  }, [width, height, step, z]);

  return (
    <group>
      <mesh position={[0, 0, z - 0.02]} receiveShadow>
        <planeGeometry args={[width, height]} />
        {/* papier : mat, et peu sensible à l'environnement pour rester blanc */}
        <meshStandardMaterial color="#FFFFFF" roughness={0.92} metalness={0} envMapIntensity={0.3} />
      </mesh>
      {lines.map((s, i) => (
        <Segment key={i} a={s[0]} b={s[1]} color={color} width={0.006} />
      ))}
    </group>
  );
}

/** Segment fin (réutilisé pour grilles, repères). Cylindre = compatible bas de gamme. */
export function Segment({ a, b, color = '#94A3B8', width = 0.01 }: { a: Vector3Tuple; b: Vector3Tuple; color?: string; width?: number }) {
  const { pos, len, rot } = useMemo(() => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
    const mid: Vector3Tuple = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    // orienter un cylindre (axe Y) le long de AB
    const theta = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
    const phi = Math.atan2(dx, dz);
    return { pos: mid, len: length, rot: [Math.PI / 2 - theta, phi, 0] as Vector3Tuple };
  }, [a, b]);
  return (
    <mesh position={pos} rotation={rot}>
      <cylinderGeometry args={[width, width, len, 6]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  );
}

/** Statif de labo : pied + tige verticale + noix + pince (support universel). */
export function Stand({ position = [0, 0, 0], height = 3.2 }: { position?: Vector3Tuple; height?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, -height / 2 + 0.05, 0]} castShadow>
        <boxGeometry args={[1.6, 0.12, 1]} />
        <Metal color="#6B7280" roughness={0.45} />
      </mesh>
      <mesh position={[-0.55, 0, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, height, 16]} />
        <Metal color="#AEB6C2" roughness={0.3} />
      </mesh>
      <mesh position={[-0.2, height / 2 - 0.4, 0]} castShadow>
        <boxGeometry args={[0.8, 0.16, 0.16]} />
        <Metal color="#9AA3AF" />
      </mesh>
    </group>
  );
}
