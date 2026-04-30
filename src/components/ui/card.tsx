import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const cardVariants = cva('rounded-2xl border transition', {
  variants: {
    variant: {
      default: 'border-ink/5 bg-white shadow-card',
      flat: 'border-ink/5 bg-white shadow-soft',
      hero: 'border-science-100 bg-hero-blue shadow-card overflow-hidden relative',
      'hero-svt': 'border-action-100 bg-hero-emerald shadow-card overflow-hidden relative',
      'hero-maths': 'border-violet-200 bg-hero-violet shadow-card overflow-hidden relative',
      'hero-physique': 'border-science-100 bg-hero-blue shadow-card overflow-hidden relative',
      ghost: 'border-transparent bg-white/60 backdrop-blur-sm shadow-soft',
    },
    padding: {
      default: 'p-6',
      sm: 'p-4',
      lg: 'p-8',
      none: 'p-0',
    },
  },
  defaultVariants: { variant: 'default', padding: 'default' },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, variant, padding, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant, padding }), className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mb-4 flex items-center justify-between gap-3', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('font-display text-lg font-semibold text-ink', className)}
      {...props}
    />
  );
}
