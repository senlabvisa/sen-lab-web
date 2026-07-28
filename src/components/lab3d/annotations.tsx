'use client';

/**
 * lab3d/annotations — étiquettes et lectures attachées à la scène 3D.
 *
 * On utilise <Html> (DOM) plutôt que <Text>/troika : rendu net, pas de
 * police à fetch sur un CDN (critique pour le mode 100 % offline du PWA).
 * Tous ces composants doivent être placés à l'intérieur d'un <Canvas>.
 */

import { Html } from '@react-three/drei';
import type { Vector3Tuple } from 'three';

export type Tone = 'physique' | 'chimie' | 'maths' | 'svt' | 'neutral';

const TONE: Record<Tone, { ring: string; ink: string; dot: string }> = {
  physique: { ring: 'ring-blue-200', ink: 'text-blue-700', dot: '#2563EB' },
  chimie: { ring: 'ring-violet-200', ink: 'text-violet-700', dot: '#7C3AED' },
  maths: { ring: 'ring-sky-200', ink: 'text-sky-700', dot: '#0EA5E9' },
  svt: { ring: 'ring-emerald-200', ink: 'text-emerald-700', dot: '#16A34A' },
  neutral: { ring: 'ring-ink/10', ink: 'text-ink', dot: '#475569' },
};

/** Grande étiquette « carte » au-dessus de la scène (titre + sous-titre). */
export function SceneLabel({
  position,
  title,
  subtitle,
  tone = 'neutral',
  distanceFactor = 9,
}: {
  position: Vector3Tuple;
  title: string;
  subtitle?: string;
  tone?: Tone;
  distanceFactor?: number;
}) {
  const t = TONE[tone];
  return (
    <Html position={position} center distanceFactor={distanceFactor} style={{ pointerEvents: 'none' }}>
      <div className={`select-none whitespace-nowrap rounded-2xl bg-white/95 px-3 py-1.5 text-center shadow-card ring-1 ${t.ring}`}>
        {subtitle && <div className="text-[10px] uppercase tracking-wider text-ink/45">{subtitle}</div>}
        <div className={`font-display text-sm font-bold ${t.ink}`}>{title}</div>
      </div>
    </Html>
  );
}

/** Petite pastille collée à un point (nom d'atome, d'organe, de borne). */
export function Tag3D({
  position,
  label,
  tone = 'neutral',
  distanceFactor = 8,
}: {
  position: Vector3Tuple;
  label: string;
  tone?: Tone;
  distanceFactor?: number;
}) {
  const t = TONE[tone];
  return (
    <Html position={position} center distanceFactor={distanceFactor} style={{ pointerEvents: 'none' }}>
      <span className={`select-none whitespace-nowrap rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-semibold shadow-soft ring-1 ${t.ring} ${t.ink}`}>
        {label}
      </span>
    </Html>
  );
}

/** Lecture de mesure type afficheur (valeur + unité), fond sombre « instrument ». */
export function Readout({
  position,
  value,
  unit,
  caption,
  distanceFactor = 8,
}: {
  position: Vector3Tuple;
  value: string | number;
  unit?: string;
  caption?: string;
  distanceFactor?: number;
}) {
  return (
    <Html position={position} center distanceFactor={distanceFactor} style={{ pointerEvents: 'none' }}>
      <div className="select-none whitespace-nowrap rounded-lg bg-night-900/95 px-2.5 py-1 text-center shadow-card ring-1 ring-white/10">
        <div className="font-mono text-sm font-bold tabular-nums text-emerald-300">
          {value}
          {unit ? <span className="ml-0.5 text-[11px] text-emerald-200/70">{unit}</span> : null}
        </div>
        {caption ? <div className="text-[9px] uppercase tracking-wide text-white/40">{caption}</div> : null}
      </div>
    </Html>
  );
}

export { HotspotCoach } from '@/components/lab/hotspot-coach';
