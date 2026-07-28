'use client';

/**
 * lab3d/materials — matériaux réalistes partagés + données scientifiques.
 *
 * Objectif « 3D réelle » : remplacer les `meshStandardMaterial opacity={0.18}`
 * approximatifs par du verre physique (transmission/IOR), du métal brossé,
 * et des liquides crédibles. Tous les composants du kit lab3d s'appuient
 * sur ces helpers pour un rendu cohérent d'un TP à l'autre.
 *
 * Perf : `meshPhysicalMaterial` avec `transmission` déclenche une passe de
 * rendu supplémentaire. C'est le plus gros gain visuel du kit ; on l'accepte
 * sur le bécher/ballon « héros » d'une scène. Pour les pièces secondaires,
 * préférer <GlassThin> (transparence simple, mono-passe).
 */

import { useMemo } from 'react';
import { Color } from 'three';

// ──────────────────────────────────────────────────────────────────────
// Verre
// ──────────────────────────────────────────────────────────────────────

export type GlassProps = {
  /** Teinte du verre (très légère). Défaut : verre neutre légèrement bleuté. */
  tint?: string;
  /** 0 = limpide, 1 = dépoli. Défaut 0.05. */
  roughness?: number;
  /** Épaisseur optique (réfraction). Défaut 0.35. */
  thickness?: number;
  opacity?: number;
};

/** Verre physique réaliste (transmission + IOR ~1.5). Pour la pièce héros. */
export function Glass({ tint = '#E6F0FF', roughness = 0.05, thickness = 0.35, opacity = 1 }: GlassProps) {
  return (
    <meshPhysicalMaterial
      color={tint}
      transmission={0.95}
      transparent
      opacity={opacity}
      roughness={roughness}
      thickness={thickness}
      ior={1.5}
      metalness={0}
      clearcoat={0.6}
      clearcoatRoughness={0.15}
      envMapIntensity={0.9}
      attenuationColor={tint}
      attenuationDistance={2.5}
    />
  );
}

/** Verre léger mono-passe (transparence simple) pour pièces secondaires / low-end. */
export function GlassThin({ tint = '#CFE3FF', opacity = 0.16, roughness = 0.1 }: { tint?: string; opacity?: number; roughness?: number }) {
  return (
    <meshStandardMaterial
      color={tint}
      transparent
      opacity={opacity}
      roughness={roughness}
      metalness={0.05}
      depthWrite={false}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────
// Métal
// ──────────────────────────────────────────────────────────────────────

/** Métal brossé (statif, bornes, supports). */
export function Metal({ color = '#9AA3AF', roughness = 0.35, metalness = 0.9 }: { color?: string; roughness?: number; metalness?: number }) {
  return <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />;
}

/** Plastique mat coloré (boîtiers, supports, jouets pédagogiques). */
export function Plastic({ color, roughness = 0.5 }: { color: string; roughness?: number }) {
  return <meshStandardMaterial color={color} roughness={roughness} metalness={0.05} />;
}

// ──────────────────────────────────────────────────────────────────────
// Liquides
// ──────────────────────────────────────────────────────────────────────

/** Liquide translucide teinté (eau colorée, solution, réactif). */
export function Liquid({ color, opacity = 0.78, emissive }: { color: string; opacity?: number; emissive?: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      transparent
      opacity={opacity}
      transmission={0.4}
      roughness={0.15}
      ior={1.33}
      thickness={0.5}
      emissive={emissive ?? '#000000'}
      emissiveIntensity={emissive ? 0.25 : 0}
      depthWrite={false}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────
// Données atomiques (CPK) — couleurs & rayons relatifs
// ──────────────────────────────────────────────────────────────────────

export type Element = 'H' | 'C' | 'N' | 'O' | 'Na' | 'Cl' | 'S' | 'P' | 'K' | 'Ca' | 'Fe' | 'Cu' | 'Mg' | 'Zn' | 'F' | 'Br' | 'I' | 'He' | 'Ne' | 'Ar' | 'Al' | 'Si';

/** Couleur CPK conventionnelle (légèrement éclaircie pour le rendu sombre). */
export const CPK_COLOR: Record<Element, string> = {
  H: '#F4F6FB', C: '#3B3F46', N: '#3B5BFF', O: '#FF3B30', Na: '#A86BF0', Cl: '#33D14B',
  S: '#FFD23F', P: '#FF8C3B', K: '#8F40D4', Ca: '#3DBF6E', Fe: '#E0772B', Cu: '#C77B45',
  Mg: '#67D86B', Zn: '#7D80AB', F: '#7FE66B', Br: '#A52A2A', I: '#9B30FF', He: '#D9FFFF',
  Ne: '#B3E3F5', Ar: '#80D1E3', Al: '#BFA6A6', Si: '#F0C8A0',
};

/** Rayon relatif (échelle de rendu, pas physique). */
export const ATOM_RADIUS: Record<Element, number> = {
  H: 0.26, C: 0.40, N: 0.38, O: 0.36, Na: 0.55, Cl: 0.50, S: 0.50, P: 0.50, K: 0.62,
  Ca: 0.58, Fe: 0.50, Cu: 0.50, Mg: 0.52, Zn: 0.50, F: 0.32, Br: 0.54, I: 0.62,
  He: 0.30, Ne: 0.34, Ar: 0.40, Al: 0.52, Si: 0.48,
};

/** Hook : Color three mémoïsée depuis un hex (évite les allocations par frame). */
export function useThreeColor(hex: string): Color {
  return useMemo(() => new Color(hex), [hex]);
}

// Palette pédagogique cohérente avec le Design System (matières).
export const SUBJECT_3D = {
  physique: { primary: '#2563EB', accent: '#F59E0B', bg: '#EAF2FF' },
  chimie: { primary: '#7C3AED', accent: '#10B981', bg: '#F3EEFF' },
  maths: { primary: '#0EA5E9', accent: '#F43F5E', bg: '#EAF6FF' },
  svt: { primary: '#16A34A', accent: '#EC4899', bg: '#ECFDF3' },
} as const;
