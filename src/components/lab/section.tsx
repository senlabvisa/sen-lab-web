import Link from 'next/link';
import type { Route } from 'next';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Header de section avec lien "Voir tout" — pattern récurrent skillzone.
 */
export function SectionHeader({
  title,
  viewAllHref,
  viewAllLabel = 'Voir tout',
  className,
}: {
  title: React.ReactNode;
  viewAllHref?: Route;
  viewAllLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <h2 className="font-display text-lg font-semibold text-night-900">{title}</h2>
      {viewAllHref ? (
        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-0.5 text-sm font-medium text-lab-700 transition hover:text-lab-800"
        >
          {viewAllLabel}
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

/** Bloc carte container — fond blanc, ring discret, padding standard. */
export function PanelCard({
  className,
  children,
  padding = 'md',
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}) {
  const padMap = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  };
  return (
    <div
      className={cn('rounded-3xl bg-white ring-1 ring-night-100', padMap[padding], className)}
      {...rest}
    >
      {children}
    </div>
  );
}
