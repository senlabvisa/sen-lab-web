import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
  {
    variants: {
      tone: {
        science: 'bg-science-50 text-science-700',
        action: 'bg-action-50 text-action-700',
        alert: 'bg-alert-50 text-alert-700',
        danger: 'bg-danger-50 text-danger',
        neutral: 'bg-ink/5 text-ink/70',
        maths: 'bg-violet-50 text-violet-700',
        physique: 'bg-science-50 text-science-700',
        svt: 'bg-action-50 text-action-700',
      },
      size: {
        sm: 'text-[11px] px-2 py-0.5',
        md: 'text-xs px-2.5 py-1',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}

/** Mappe une matière (Maths / Physique-Chimie / SVT) à un tone Badge. */
export function subjectTone(
  subject: string | undefined | null,
): 'maths' | 'physique' | 'svt' | 'neutral' {
  if (!subject) return 'neutral';
  const s = subject.toLowerCase();
  if (s.includes('math')) return 'maths';
  if (s.includes('physique') || s.includes('chimie')) return 'physique';
  if (s.includes('svt')) return 'svt';
  return 'neutral';
}
