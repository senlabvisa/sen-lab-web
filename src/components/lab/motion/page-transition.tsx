'use client';

import { motion } from 'framer-motion';
import { pageVariants } from '@/lib/motion';
import { cn } from '@/lib/cn';

/**
 * Wrap le contenu d'une page pour une entrée animée fluide.
 */
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
