/**
 * Système d'animations standardisé pour Sen Lab Visa.
 * Inspiré "labo virtuel STEM" — fluide, scientifique, joyeux.
 */

import type { Transition, Variants } from 'framer-motion';

// =====================================================================
// Easings — courbes signature
// =====================================================================
export const EASE = {
  /** Ressort doux pour les apparitions de cards. */
  spring: { type: 'spring', stiffness: 260, damping: 22 } as Transition,
  /** Ressort plus snappy pour les boutons et hovers. */
  snappy: { type: 'spring', stiffness: 400, damping: 28 } as Transition,
  /** Easing fluide générique (cubic-bezier "smooth"). */
  smooth: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } as Transition,
  /** Easing lent pour les fonds décoratifs (atomes, particules). */
  ambient: { duration: 8, ease: 'linear', repeat: Infinity } as Transition,
} as const;

// =====================================================================
// Variants — apparitions
// =====================================================================
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: EASE.smooth },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: EASE.spring },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0, transition: EASE.smooth },
};

// =====================================================================
// Stagger — apparition en cascade pour grilles
// =====================================================================
export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

/** Stagger plus rapide (utile pour beaucoup d'enfants). */
export const staggerFast: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

// =====================================================================
// Hover — micro-interactions
// =====================================================================
export const hoverLift = {
  scale: 1.015,
  y: -2,
  transition: EASE.snappy,
};

export const hoverPress = {
  scale: 0.97,
  transition: { duration: 0.1 },
};

// =====================================================================
// Page transitions — entre routes
// =====================================================================
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { ...EASE.smooth, duration: 0.35 } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.2 } },
};

// =====================================================================
// Tab transitions — switch entre étapes du TP
// =====================================================================
export const tabContent: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: EASE.smooth },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

// =====================================================================
// Pulse — pour les éléments online / vivants
// =====================================================================
export const pulseRing = {
  scale: [1, 1.6, 1.6],
  opacity: [0.8, 0, 0],
  transition: {
    duration: 2.4,
    repeat: Infinity,
    ease: 'easeOut' as const,
  },
};

// =====================================================================
// Floating — flottement doux pour atomes/molécules
// =====================================================================
export const floatY = {
  y: [0, -10, 0],
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  },
};

// =====================================================================
// Helpers
// =====================================================================

/** Active reduced-motion ; les composants doivent le respecter. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
