import * as React from 'react';
import { cn } from '@/lib/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'min-h-touch w-full rounded-lg border border-ink/20 bg-white px-4 text-base text-ink placeholder:text-ink/40 focus:border-science focus:outline-none focus:ring-2 focus:ring-science/30',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
