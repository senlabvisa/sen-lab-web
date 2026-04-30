'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';

/**
 * "Hot dot" interactif — point pulsant avec halo qui marque une zone active
 * sur un visuel (organe, plante, circuit). Inspiré du dashboard santé.
 *
 * Usage: positionnement absolu via `style={{ top, left }}` du parent relative.
 */
export function HotDot({
  label,
  active = false,
  tone = 'science',
  className,
  onClick,
}: {
  label?: string;
  active?: boolean;
  tone?: 'science' | 'action' | 'alert';
  className?: string;
  onClick?: () => void;
}) {
  const colors = {
    science: { dot: 'bg-science-700', ring: 'bg-science-500/40' },
    action: { dot: 'bg-action-700', ring: 'bg-action-500/40' },
    alert: { dot: 'bg-alert-500', ring: 'bg-alert-500/40' },
  }[tone];

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'group absolute flex items-center justify-center',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      <span
        className={cn(
          'absolute h-6 w-6 rounded-full',
          active ? 'animate-pulse-ring' : 'opacity-0',
          colors.ring,
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          'relative z-10 block h-3 w-3 rounded-full ring-4 ring-white',
          active && 'animate-pulse-dot',
          colors.dot,
        )}
        aria-hidden="true"
      />
      {label ? (
        <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
          {label}
        </span>
      ) : null}
    </Component>
  );
}
