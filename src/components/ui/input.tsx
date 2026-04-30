import * as React from 'react';
import { cn } from '@/lib/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'min-h-touch w-full rounded-xl border border-ink/15 bg-white px-4 text-base text-ink placeholder:text-ink/40 transition focus:border-science-500 focus:outline-none focus:ring-4 focus:ring-science-100',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
