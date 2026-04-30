'use client';

import { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useInView } from 'framer-motion';
import { useRef } from 'react';

/**
 * Animation chiffre montant (0 → valeur cible) au moment où il entre dans la viewport.
 * Utilisé pour les stats du dashboard.
 */
export function CounterUp({
  to,
  duration = 1.6,
  format,
  className,
}: {
  to: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    stiffness: 80,
    damping: 22,
    duration: duration * 1000,
  });
  const display = useTransform(spring, (current) => {
    const rounded = Math.round(current);
    return format ? format(rounded) : String(rounded);
  });

  useEffect(() => {
    if (inView) {
      motionValue.set(to);
    }
  }, [inView, to, motionValue]);

  return <motion.span ref={ref} className={className}>{display}</motion.span>;
}
