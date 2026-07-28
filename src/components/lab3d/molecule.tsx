'use client';

/**
 * lab3d/molecule — atomes, liaisons, molécules et ADN.
 *
 * Modèle « boules-bâtonnets » avec couleurs CPK et rayons relatifs.
 * Pour : molécule d'eau, atomes & molécules, chimie organique (alcanes,
 * alcènes), tableau périodique, ADN, génétique moléculaire.
 */

import { useMemo } from 'react';
import { Quaternion, Vector3, type Vector3Tuple } from 'three';
import { ATOM_RADIUS, CPK_COLOR, type Element } from './materials';

const UP = new Vector3(0, 1, 0);

// ──────────────────────────────────────────────────────────────────────
// Atome
// ──────────────────────────────────────────────────────────────────────

export function Atom({
  element,
  position = [0, 0, 0],
  scale = 1,
}: {
  element: Element;
  position?: Vector3Tuple;
  scale?: number;
}) {
  const r = ATOM_RADIUS[element] * scale;
  return (
    <mesh position={position} castShadow>
      <sphereGeometry args={[r, 32, 24]} />
      <meshStandardMaterial color={CPK_COLOR[element]} roughness={0.3} metalness={0.05} envMapIntensity={0.6} />
    </mesh>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Liaison covalente (1 à 3 bâtonnets)
// ──────────────────────────────────────────────────────────────────────

export function Bond({
  from,
  to,
  order = 1,
  color = '#CBD5E1',
  radius = 0.08,
}: {
  from: Vector3Tuple;
  to: Vector3Tuple;
  order?: 1 | 2 | 3;
  color?: string;
  radius?: number;
}) {
  const { mid, len, quat, offsets } = useMemo(() => {
    const a = new Vector3(...from);
    const b = new Vector3(...to);
    const dir = b.clone().sub(a);
    const length = dir.length() || 1e-6;
    const q = new Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
    // décalage perpendiculaire pour les liaisons multiples
    const perp = new Vector3(1, 0, 0).cross(dir).normalize();
    if (perp.lengthSq() < 1e-6) perp.set(0, 0, 1);
    const gap = 0.13;
    const offs: Vector3[] =
      order === 1 ? [new Vector3()] : order === 2 ? [perp.clone().multiplyScalar(gap), perp.clone().multiplyScalar(-gap)] : [perp.clone().multiplyScalar(gap * 1.4), new Vector3(), perp.clone().multiplyScalar(-gap * 1.4)];
    return { mid: a.add(b).multiplyScalar(0.5), len: length, quat: q, offsets: offs };
  }, [from, to, order]);
  return (
    <group position={[mid.x, mid.y, mid.z]} quaternion={quat}>
      {offsets.map((o, i) => (
        <mesh key={i} position={[o.x, o.y, o.z]}>
          <cylinderGeometry args={[radius, radius, len, 14]} />
          <meshStandardMaterial color={color} roughness={0.45} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Molécule (assemblage déclaratif)
// ──────────────────────────────────────────────────────────────────────

export type AtomSpec = { el: Element; pos: Vector3Tuple };
export type BondSpec = [number, number] | [number, number, 1 | 2 | 3];

export function Molecule({ atoms, bonds = [], scale = 1 }: { atoms: AtomSpec[]; bonds?: BondSpec[]; scale?: number }) {
  return (
    <group scale={scale}>
      {bonds.map((bnd, i) => {
        const [ai, bi, order] = bnd;
        return <Bond key={`b${i}`} from={atoms[ai].pos} to={atoms[bi].pos} order={(order ?? 1) as 1 | 2 | 3} />;
      })}
      {atoms.map((a, i) => (
        <Atom key={`a${i}`} element={a.el} position={a.pos} />
      ))}
    </group>
  );
}

// Quelques molécules prêtes à l'emploi (géométries approximatives mais correctes).
export const MOLECULES: Record<string, { atoms: AtomSpec[]; bonds: BondSpec[] }> = {
  // Eau H2O — angle ~104.5°
  H2O: {
    atoms: [
      { el: 'O', pos: [0, 0, 0] },
      { el: 'H', pos: [0.76, 0.59, 0] },
      { el: 'H', pos: [-0.76, 0.59, 0] },
    ],
    bonds: [[0, 1], [0, 2]],
  },
  // Dioxygène O2
  O2: { atoms: [{ el: 'O', pos: [-0.6, 0, 0] }, { el: 'O', pos: [0.6, 0, 0] }], bonds: [[0, 1, 2]] },
  // Dioxyde de carbone CO2 — linéaire
  CO2: {
    atoms: [{ el: 'C', pos: [0, 0, 0] }, { el: 'O', pos: [1.16, 0, 0] }, { el: 'O', pos: [-1.16, 0, 0] }],
    bonds: [[0, 1, 2], [0, 2, 2]],
  },
  // Méthane CH4 — tétraèdre
  CH4: {
    atoms: [
      { el: 'C', pos: [0, 0, 0] },
      { el: 'H', pos: [0.63, 0.63, 0.63] },
      { el: 'H', pos: [-0.63, -0.63, 0.63] },
      { el: 'H', pos: [-0.63, 0.63, -0.63] },
      { el: 'H', pos: [0.63, -0.63, -0.63] },
    ],
    bonds: [[0, 1], [0, 2], [0, 3], [0, 4]],
  },
  // Dihydrogène H2
  H2: { atoms: [{ el: 'H', pos: [-0.37, 0, 0] }, { el: 'H', pos: [0.37, 0, 0] }], bonds: [[0, 1]] },
  // Éthylène C2H4 (alcène, double liaison)
  C2H4: {
    atoms: [
      { el: 'C', pos: [-0.67, 0, 0] },
      { el: 'C', pos: [0.67, 0, 0] },
      { el: 'H', pos: [-1.23, 0.93, 0] },
      { el: 'H', pos: [-1.23, -0.93, 0] },
      { el: 'H', pos: [1.23, 0.93, 0] },
      { el: 'H', pos: [1.23, -0.93, 0] },
    ],
    bonds: [[0, 1, 2], [0, 2], [0, 3], [1, 4], [1, 5]],
  },
};

// ──────────────────────────────────────────────────────────────────────
// ADN — double hélice avec paires de bases
// ──────────────────────────────────────────────────────────────────────

export function DNAHelix({
  turns = 3,
  height = 4,
  radius = 0.7,
  position = [0, 0, 0],
}: {
  turns?: number;
  height?: number;
  radius?: number;
  position?: Vector3Tuple;
}) {
  const rungs = useMemo(() => {
    const n = turns * 10;
    const items: { a: Vector3Tuple; b: Vector3Tuple; color: string }[] = [];
    const pair = ['#3B82F6', '#F59E0B', '#10B981', '#EC4899'];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const ang = t * turns * Math.PI * 2;
      const y = (t - 0.5) * height;
      const a: Vector3Tuple = [Math.cos(ang) * radius, y, Math.sin(ang) * radius];
      const b: Vector3Tuple = [Math.cos(ang + Math.PI) * radius, y, Math.sin(ang + Math.PI) * radius];
      items.push({ a, b, color: pair[i % pair.length] });
    }
    return items;
  }, [turns, height, radius]);

  return (
    <group position={position}>
      {/* deux brins (petites sphères du squelette) */}
      {rungs.map((r, i) => (
        <group key={i}>
          <mesh position={r.a}>
            <sphereGeometry args={[0.12, 14, 12]} />
            <meshStandardMaterial color="#A78BFA" roughness={0.3} emissive="#7C3AED" emissiveIntensity={0.15} />
          </mesh>
          <mesh position={r.b}>
            <sphereGeometry args={[0.12, 14, 12]} />
            <meshStandardMaterial color="#C4B5FD" roughness={0.3} emissive="#7C3AED" emissiveIntensity={0.12} />
          </mesh>
          {/* barreau (paire de bases) tous les 2 crans */}
          {i % 2 === 0 && <Rung a={r.a} b={r.b} color={r.color} />}
        </group>
      ))}
    </group>
  );
}

function Rung({ a, b, color }: { a: Vector3Tuple; b: Vector3Tuple; color: string }) {
  const { mid, len, quat } = useMemo(() => {
    const va = new Vector3(...a);
    const vb = new Vector3(...b);
    const dir = vb.clone().sub(va);
    const length = dir.length() || 1e-6;
    const q = new Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
    return { mid: va.add(vb).multiplyScalar(0.5), len: length, quat: q };
  }, [a, b]);
  return (
    <mesh position={[mid.x, mid.y, mid.z]} quaternion={quat}>
      <cylinderGeometry args={[0.05, 0.05, len, 8]} />
      <meshStandardMaterial color={color} roughness={0.4} emissive={color} emissiveIntensity={0.2} />
    </mesh>
  );
}
