'use client';

import { cn } from '@/lib/cn';

type DataPoint = { day: string; mentoring: number; selfImprove: number; student: number };

/**
 * Chart productivité du dashboard skillzone — barres verticales segmentées
 * par 3 catégories (3 couleurs différentes).
 */
export function ProductivityChart({ data, className }: { data: DataPoint[]; className?: string }) {
  // Échelle 0-100 par valeur (les maxima dans data sont déjà sous 100)
  const max = 100;
  const yTicks = [0, 25, 50, 75, 90];

  return (
    <div className={cn('rounded-3xl bg-lab-50 p-4', className)}>
      <div className="flex items-end gap-3">
        {/* Échelle Y */}
        <div className="flex h-44 flex-col-reverse justify-between pb-6 pr-1 text-[10px] font-medium text-night-400">
          {yTicks.map((t) => (
            <span key={t}>{t}%</span>
          ))}
        </div>

        {/* Barres */}
        <div className="grid flex-1 grid-cols-7 gap-3 pb-6">
          {data.map((d) => {
            const totalH = (d.mentoring / max) * 100;
            return (
              <div key={d.day} className="relative flex flex-col items-center gap-1">
                <div className="relative flex h-44 w-full items-end justify-center gap-1.5">
                  <Bar value={d.mentoring} max={max} color="bg-lab-300" />
                  <Bar value={d.selfImprove} max={max} color="bg-night-900" />
                  <Bar value={d.student} max={max} color="bg-sky-400" />
                </div>
                <span className="absolute bottom-0 text-[11px] font-medium text-night-500">
                  {d.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Légende */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[11px] text-night-600">
        <Legend color="bg-lab-300" label="Tutorat" />
        <Legend color="bg-night-900" label="Auto-formation" />
        <Legend color="bg-sky-400" label="En classe" />
      </div>
    </div>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const h = Math.max(4, (value / max) * 100);
  return (
    <div
      className={cn('w-2.5 rounded-full transition-all', color)}
      style={{ height: `${h}%` }}
      aria-label={`${value}%`}
    />
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2.5 w-2.5 rounded-full', color)} />
      {label}
    </span>
  );
}
