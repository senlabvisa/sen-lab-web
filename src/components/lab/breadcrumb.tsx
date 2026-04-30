import Link from 'next/link';
import type { Route } from 'next';
import { cn } from '@/lib/cn';

export type Crumb = {
  label: string;
  href?: Route;
};

export function LabBreadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Fil d'Ariane" className={cn('flex items-center gap-2 text-sm', className)}>
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${c.label}-${i}`} className="flex items-center gap-2">
            {c.href && !last ? (
              <Link
                href={c.href}
                className="font-medium text-night-400 transition hover:text-lab-700"
              >
                {c.label}
              </Link>
            ) : (
              <span className={cn('font-medium', last ? 'text-night-900' : 'text-night-400')}>
                {c.label}
              </span>
            )}
            {!last ? <span className="text-night-300">/</span> : null}
          </span>
        );
      })}
    </nav>
  );
}
