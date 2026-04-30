'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

/**
 * ParticleField — fond animé "atomes/électrons en mouvement".
 * Signature visuelle d'un labo virtuel STEM.
 *
 * Performance : SVG léger, GPU-accelerated, désactivable en reduced-motion.
 * À utiliser en arrière-plan d'un container `relative overflow-hidden`.
 */
export function ParticleField({
  count = 18,
  variant = 'lab',
  className,
}: {
  count?: number;
  variant?: 'lab' | 'dark' | 'subtle';
  className?: string;
}) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 2,
        duration: Math.random() * 12 + 14,
        delay: Math.random() * 5,
        amplitude: Math.random() * 30 + 20,
      })),
    [count],
  );

  const palette = {
    lab: ['#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE'],
    dark: ['rgba(255,255,255,0.4)', 'rgba(167,139,250,0.6)', 'rgba(196,181,253,0.5)'],
    subtle: ['rgba(139,92,246,0.25)', 'rgba(167,139,250,0.18)'],
  }[variant];

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden', className)}
    >
      <svg className="h-full w-full" preserveAspectRatio="none">
        <defs>
          <radialGradient id="particle-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        {particles.map((p) => {
          const color = palette[p.id % palette.length];
          return (
            <motion.circle
              key={p.id}
              cx={`${p.x}%`}
              cy={`${p.y}%`}
              r={p.size}
              fill={color}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.8, 0.8, 0],
                cx: [`${p.x}%`, `${(p.x + p.amplitude) % 100}%`, `${(p.x - p.amplitude / 2 + 100) % 100}%`, `${p.x}%`],
                cy: [`${p.y}%`, `${(p.y + p.amplitude / 2) % 100}%`, `${(p.y - p.amplitude / 3 + 100) % 100}%`, `${p.y}%`],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}
