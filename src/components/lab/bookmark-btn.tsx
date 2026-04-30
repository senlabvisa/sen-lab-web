'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

export function BookmarkBtn({
  initial = false,
  onChange,
  variant = 'light',
  className,
}: {
  initial?: boolean;
  onChange?: (next: boolean) => void;
  variant?: 'light' | 'dark';
  className?: string;
}) {
  const [active, setActive] = useState(initial);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !active;
    setActive(next);
    onChange?.(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={cn(
        'grid h-9 w-9 place-items-center rounded-full transition',
        variant === 'dark'
          ? active
            ? 'bg-white text-night-900'
            : 'bg-white/10 text-white hover:bg-white/20'
          : active
            ? 'bg-lab-500 text-white shadow-lab-glow'
            : 'bg-white text-night-700 ring-1 ring-night-100 hover:bg-night-50',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M6 3h12v18l-6-4-6 4V3Z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
