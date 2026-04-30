import * as React from 'react';
import { cn } from '@/lib/cn';

/**
 * Primitive skeleton — bloc animé qu'on compose pour former les layouts de chargement.
 * Objectif Design_System §3.2 : zéro layout shift entre état loading et état hydraté.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-ink/10', className)}
      {...props}
    />
  );
}

/** Skeleton d'une ligne de texte (hauteur fixe 1em-ish). */
export function SkeletonText({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn('h-4 w-full', className)} {...props} />;
}

/** Skeleton d'une rangée de tableau : N cellules de largeurs variables. */
export function SkeletonRow({ columns = 4 }: { columns?: number }) {
  const widths = ['w-3/4', 'w-1/2', 'w-1/3', 'w-1/4', 'w-2/5', 'w-1/6'];
  return (
    <tr className="border-b border-ink/5">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-3">
          <Skeleton className={cn('h-4', widths[i % widths.length])} />
        </td>
      ))}
    </tr>
  );
}

/** Skeleton d'un bloc "stat card" : titre + gros chiffre + subtitle optionnel. */
export function SkeletonStatCard() {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm">
      <Skeleton className="mb-3 h-3 w-20" />
      <Skeleton className="h-9 w-24" />
    </div>
  );
}

/** Skeleton d'une ligne d'un <ul divide-y> (avatar + 2 lignes + action optionnelle). */
export function SkeletonListRow({ withAction = true }: { withAction?: boolean }) {
  return (
    <li className="flex items-center justify-between py-3 px-2">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      {withAction ? <Skeleton className="h-5 w-5 rounded" /> : null}
    </li>
  );
}
