import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-base font-medium transition disabled:pointer-events-none disabled:opacity-60 min-h-touch',
  {
    variants: {
      variant: {
        primary: 'bg-science text-white hover:bg-science/90',
        success: 'bg-action text-white hover:bg-action/90',
        outline: 'border border-ink/20 text-ink hover:bg-ink/5',
      },
      size: {
        md: 'px-6',
        sm: 'px-4 text-sm min-h-[36px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';
