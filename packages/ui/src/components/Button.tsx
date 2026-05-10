'use client';

import { Slot } from '@radix-ui/react-slot';
import { forwardRef } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../lib/cn.js';

export const buttonVariants = tv({
  base: 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-[rgb(var(--color-bg))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-accent))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  variants: {
    variant: {
      primary:
        'bg-[rgb(var(--color-accent))] text-[rgb(var(--color-accent-fg))] hover:opacity-90',
      secondary:
        'border border-[rgb(var(--color-border-strong))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))] hover:bg-[rgb(var(--color-bg-muted))]',
      ghost:
        'text-[rgb(var(--color-fg))] hover:bg-[rgb(var(--color-bg-muted))]',
      danger:
        'bg-[rgb(var(--color-danger))] text-white hover:opacity-90',
      link: 'text-[rgb(var(--color-accent))] underline-offset-4 hover:underline',
    },
    size: {
      sm: 'h-8 px-3 text-xs',
      md: 'h-9 px-4',
      lg: 'h-10 px-6',
      icon: 'h-9 w-9',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
