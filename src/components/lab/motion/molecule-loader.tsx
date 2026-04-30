'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

/**
 * Loader thématique science : noyau central + 3 électrons en orbite.
 * Remplace les spinners génériques pour rester dans l'univers labo.
 */
export function MoleculeLoader({
  size = 56,
  className,
  label = 'Chargement…',
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  const radius = size / 2 - 4;
  return (
    <div className={cn('flex flex-col items-center gap-2', className)} role="status" aria-label={label}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Noyau pulsant */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={size / 6}
            fill="url(#nucleus-grad)"
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '50%', originY: '50%' }}
          />
          <defs>
            <radialGradient id="nucleus-grad">
              <stop offset="0%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#6D28D9" />
            </radialGradient>
          </defs>
        </svg>

        {/* 3 électrons en orbite (rotations à des vitesses différentes) */}
        {[0, 120, 240].map((rot, i) => (
          <motion.div
            key={i}
            className="absolute inset-0"
            initial={{ rotate: rot }}
            animate={{ rotate: rot + 360 }}
            transition={{
              duration: 2 + i * 0.4,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{ transformOrigin: '50% 50%' }}
          >
            <span
              className="absolute h-2 w-2 rounded-full"
              style={{
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                background: ['#8B5CF6', '#10B981', '#F59E0B'][i],
                boxShadow: `0 0 8px ${['#8B5CF6', '#10B981', '#F59E0B'][i]}`,
              }}
            />
          </motion.div>
        ))}
      </div>
      <span className="text-xs font-medium text-night-500">{label}</span>
    </div>
  );
}
