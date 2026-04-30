import { TrendingUp, TrendingDown } from 'lucide-react';
import { CounterUp } from './motion/counter-up';
import { cn } from '@/lib/cn';

const toneMap = {
  lab: 'bg-lab-100 text-lab-700',
  blue: 'bg-sky text-skyInk',
  emerald: 'bg-mint text-mintInk',
  amber: 'bg-peach text-peachInk',
  rose: 'bg-rose text-roseInk',
} as const;

export type StatTileTone = keyof typeof toneMap;

/**
 * Carte stat type "Score 210 +13%" du dashboard skillzone.
 */
export function StatTile({
  label,
  value,
  delta,
  icon,
  tone = 'lab',
  className,
}: {
  label: string;
  value: React.ReactNode;
  delta?: number; // ex: 13 = +13%, -9 = -9%
  icon: React.ReactNode;
  tone?: StatTileTone;
  className?: string;
}) {
  const isPositive = (delta ?? 0) >= 0;
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-night-100',
        className,
      )}
    >
      <span
        className={cn(
          'grid h-11 w-11 shrink-0 place-items-center rounded-xl',
          toneMap[tone],
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-night-500">{label}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-2xl font-bold text-night-900">
            {typeof value === 'number' ? <CounterUp to={value} /> : value}
          </span>
          {delta !== undefined ? (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-semibold',
                isPositive ? 'text-emerald-600' : 'text-rose-600',
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {isPositive ? '+' : ''}
              {delta}%
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
