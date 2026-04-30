import * as React from 'react';
import { cn } from '@/lib/cn';

/**
 * "Stat Pill" — petit bloc compact utilisé en grille pour afficher une valeur
 * avec son unité et un label discret. Inspiré du dashboard santé (cards 1.5L,
 * 10g, 9mm autour du cerveau).
 */
export function StatPill({
  label,
  value,
  unit,
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl bg-white/80 px-3 py-2 shadow-soft ring-1 ring-ink/5 backdrop-blur-sm',
        className,
      )}
    >
      <div className="text-[10px] uppercase tracking-wider text-ink/50">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="font-display text-xl font-bold text-ink">{value}</span>
        {unit ? <span className="text-xs font-medium text-ink/60">{unit}</span> : null}
      </div>
    </div>
  );
}
