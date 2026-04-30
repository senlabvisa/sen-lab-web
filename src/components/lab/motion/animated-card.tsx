'use client';

import { motion, type MotionProps } from 'framer-motion';
import { hoverLift, hoverPress, fadeInUp } from '@/lib/motion';
import { cn } from '@/lib/cn';

type Props = MotionProps & {
  className?: string;
  children: React.ReactNode;
  /** Active le lift au hover (par défaut true). */
  lift?: boolean;
  /** Active le press scale-down au tap (par défaut true). */
  press?: boolean;
};

/**
 * Wrapper motion.div autour d'une card — lift + press automatiques.
 */
export function AnimatedCard({ className, children, lift = true, press = true, ...rest }: Props) {
  return (
    <motion.div
      variants={fadeInUp}
      whileHover={lift ? hoverLift : undefined}
      whileTap={press ? hoverPress : undefined}
      className={cn(className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
