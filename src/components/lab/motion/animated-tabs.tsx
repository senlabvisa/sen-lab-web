'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tabContent } from '@/lib/motion';
import { cn } from '@/lib/cn';

export type AnimatedTab = {
  id: string;
  label: React.ReactNode;
  emoji?: string;
  done?: boolean;
};

/**
 * Tabs animés avec indicator slide (layoutId) + AnimatePresence pour le contenu.
 * Utilisé pour les étapes du TP.
 */
export function AnimatedTabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: AnimatedTab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar', className)}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        const isDone = t.done && !isActive;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              'relative inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'text-white'
                : isDone
                  ? 'bg-mint text-mintInk'
                  : 'bg-white text-night-600 ring-1 ring-night-100 hover:bg-night-50',
            )}
          >
            {isActive ? (
              <motion.span
                layoutId="active-tab-bg"
                className="absolute inset-0 -z-0 rounded-xl bg-night-900"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            ) : null}
            <span className="relative z-10">{t.emoji}</span>
            <span className="relative z-10">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Wrapper pour le contenu animé entre tabs (slide horizontal).
 */
export function AnimatedTabContent({
  activeId,
  children,
}: {
  activeId: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeId}
        variants={tabContent}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
