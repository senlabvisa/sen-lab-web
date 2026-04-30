import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const labBadgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
  {
    variants: {
      tone: {
        // Skillzone-like
        top: 'bg-mint text-mintInk',
        certified: 'bg-lilac text-lilacInk',
        new: 'bg-sky text-skyInk',
        demand: 'bg-rose text-roseInk',
        ielts: 'bg-peach text-peachInk',
        // Niveaux scolaires (Sen Lab Visa)
        beginner: 'bg-mint text-mintInk',
        intermediate: 'bg-peach text-peachInk',
        advanced: 'bg-rose text-roseInk',
        // Modes labo
        virtual: 'bg-lab-100 text-lab-700',
        physical: 'bg-sky text-skyInk',
        hybrid: 'bg-peach text-peachInk',
        // Matières STEM (programme sénégalais)
        maths: 'bg-violet-100 text-violet-700',
        physique: 'bg-blue-100 text-blue-700',
        svt: 'bg-emerald-100 text-emerald-700',
        info: 'bg-zinc-100 text-zinc-700',
        techno: 'bg-orange-100 text-orange-700',
        // États
        offline: 'bg-night-100 text-night-700',
        neutral: 'bg-night-50 text-night-600',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface LabBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof labBadgeVariants> {
  icon?: React.ReactNode;
}

export function LabBadge({ className, tone, icon, children, ...props }: LabBadgeProps) {
  return (
    <span className={cn(labBadgeVariants({ tone }), className)} {...props}>
      {icon ? <span className="-ml-0.5 grid h-3 w-3 place-items-center">{icon}</span> : null}
      {children}
    </span>
  );
}

/** Étoile de note (utilisée à côté des badges, comme skillzone). */
export function RatingPill({
  value,
  showStar = true,
  className,
}: {
  value: number;
  showStar?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-night-50 px-2 py-0.5 text-[11px] font-semibold text-night-900',
        className,
      )}
    >
      {showStar ? (
        <svg viewBox="0 0 24 24" className="h-3 w-3 fill-gold" aria-hidden>
          <path d="M12 2 14.9 8.6l7.1.6-5.4 4.7 1.7 6.9L12 17.3 5.7 20.8l1.7-6.9L2 9.2l7.1-.6L12 2Z" />
        </svg>
      ) : null}
      {value.toFixed(1)}
    </span>
  );
}
