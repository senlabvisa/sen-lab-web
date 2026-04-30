'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

/**
 * Point pulsant pour les statuts "online" / "live".
 * Utilise 2 anneaux en pulsation décalée pour un effet vivant.
 */
export function PulseDot({
  color = 'emerald',
  size = 8,
  className,
}: {
  color?: 'emerald' | 'lab' | 'amber' | 'rose';
  size?: number;
  className?: string;
}) {
  const palette = {
    emerald: 'bg-emerald-500',
    lab: 'bg-lab-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  }[color];

  return (
    <span className={cn('relative inline-flex', className)} style={{ width: size, height: size }}>
      <motion.span
        className={cn('absolute inset-0 rounded-full opacity-75', palette)}
        animate={{ scale: [1, 2.4, 2.4], opacity: [0.7, 0, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
      />
      <span className={cn('relative inline-block h-full w-full rounded-full', palette)} />
    </span>
  );
}
