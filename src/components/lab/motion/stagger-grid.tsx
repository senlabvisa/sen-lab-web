'use client';

import { motion, type Variants } from 'framer-motion';
import { fadeInUp, staggerContainer, staggerFast } from '@/lib/motion';
import { cn } from '@/lib/cn';

/**
 * Container qui fait apparaître ses enfants en cascade.
 * Wrap des `<StaggerItem>` directement (ou n'importe quel `motion.*`).
 */
export function StaggerGrid({
  children,
  className,
  fast = false,
  as: As = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  fast?: boolean;
  as?: 'div' | 'ul' | 'ol' | 'section';
}) {
  const Component = motion[As];
  return (
    <Component
      variants={fast ? staggerFast : staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </Component>
  );
}

/** Item enfant d'un StaggerGrid — apparaît en fade-up automatiquement. */
export function StaggerItem({
  children,
  className,
  variants,
}: {
  children: React.ReactNode;
  className?: string;
  variants?: Variants;
}) {
  return (
    <motion.div variants={variants ?? fadeInUp} className={cn(className)}>
      {children}
    </motion.div>
  );
}
