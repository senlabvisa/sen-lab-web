'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type TabItem = {
  id: string;
  label: ReactNode;
  count?: number | string;
};

export function LabTabs({
  items,
  defaultId,
  onChange,
  variant = 'pill',
  className,
}: {
  items: TabItem[];
  defaultId?: string;
  onChange?: (id: string) => void;
  variant?: 'pill' | 'underline';
  className?: string;
}) {
  const [active, setActive] = useState(defaultId ?? items[0]?.id);

  const click = (id: string) => {
    setActive(id);
    onChange?.(id);
  };

  if (variant === 'underline') {
    return (
      <div className={cn('flex gap-6 border-b border-night-100', className)}>
        {items.map((it) => {
          const isActive = it.id === active;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => click(it.id)}
              className={cn(
                'relative -mb-px py-3 text-sm font-medium transition',
                isActive ? 'text-lab-700' : 'text-night-500 hover:text-night-900',
              )}
            >
              <span>{it.label}</span>
              {it.count !== undefined ? (
                <span className="ml-1 text-night-400">({it.count})</span>
              ) : null}
              {isActive ? (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-lab-500" />
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('inline-flex rounded-2xl bg-night-50 p-1', className)} role="tablist">
      {items.map((it) => {
        const isActive = it.id === active;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => click(it.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition',
              isActive
                ? 'bg-white text-night-900 shadow-lab-soft'
                : 'text-night-500 hover:text-night-900',
            )}
          >
            <span>{it.label}</span>
            {it.count !== undefined ? (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[10px] font-bold',
                  isActive ? 'bg-lab-100 text-lab-700' : 'bg-night-100 text-night-600',
                )}
              >
                {it.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
