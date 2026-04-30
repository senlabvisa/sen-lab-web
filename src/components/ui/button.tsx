import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 min-h-touch',
  {
    variants: {
      variant: {
        primary:
          'bg-science-700 text-white shadow-soft hover:bg-science-800 hover:shadow-glow',
        gradient:
          'bg-science-gradient text-white shadow-soft hover:shadow-glow',
        success:
          'bg-action-700 text-white shadow-soft hover:bg-action-700/90',
        outline:
          'border border-ink/15 bg-white text-ink hover:border-science-300 hover:bg-science-50 hover:text-science-700',
        ghost:
          'bg-transparent text-ink hover:bg-ink/5',
        soft:
          'bg-science-50 text-science-700 hover:bg-science-100',
        danger:
          'bg-danger text-white hover:bg-danger/90',
      },
      size: {
        md: 'h-11 px-5 text-base',
        sm: 'h-9 px-3.5 text-sm min-h-[36px]',
        lg: 'h-12 px-7 text-base',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';
