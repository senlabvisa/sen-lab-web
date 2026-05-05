'use client';

import { Html } from '@react-three/drei';
import type { Vector3Tuple } from 'three';

/**
 * <HotspotCoach> — annotation guide attachée à un point 3D de la scène.
 *
 * Une bulle blanche au-dessus du point, avec un pulse coloré qui attire
 * l'œil. Utilisée pour pointer un atome / un organe / une force pendant
 * une étape pédagogique. Doit être placé à l'intérieur d'un <Canvas>.
 *
 * Pas pointer-events : l'élève peut toujours interagir avec la scène.
 */

export type HotspotCoachProps = {
  position: Vector3Tuple;
  label: string;
  tone?: 'violet' | 'science' | 'action' | 'alert';
  /** Si false, la bulle est cachée mais le pulse reste. Pour transitions. */
  visible?: boolean;
};

const TONE_COLORS: Record<NonNullable<HotspotCoachProps['tone']>, { bg: string; ring: string; ink: string }> = {
  violet: { bg: '#7C3AED', ring: 'rgba(124, 58, 237, 0.35)', ink: '#5B21B6' },
  science: { bg: '#1E40AF', ring: 'rgba(30, 64, 175, 0.35)', ink: '#1E3A8A' },
  action: { bg: '#059669', ring: 'rgba(5, 150, 105, 0.35)', ink: '#065F46' },
  alert: { bg: '#D97706', ring: 'rgba(217, 119, 6, 0.35)', ink: '#92400E' },
};

export function HotspotCoach({ position, label, tone = 'violet', visible = true }: HotspotCoachProps) {
  const c = TONE_COLORS[tone];
  return (
    <Html position={position} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
      <div className="relative grid place-items-center">
        <span
          className="absolute h-6 w-6 rounded-full opacity-70"
          style={{
            background: c.ring,
            animation: 'pulseRing 2s ease-out infinite',
          }}
        />
        <span
          className="relative h-3 w-3 rounded-full ring-2 ring-white"
          style={{ background: c.bg, animation: 'pulseDot 2s ease-in-out infinite' }}
        />
        {visible && (
          <span
            className="mt-2 select-none whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold shadow-soft ring-1 ring-ink/10"
            style={{ color: c.ink }}
          >
            {label}
          </span>
        )}
      </div>
    </Html>
  );
}
