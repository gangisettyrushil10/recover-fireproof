'use client';

import * as ToastPrimitive from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { forwardRef } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../lib/cn.js';

export const ToastProvider = ToastPrimitive.Provider;

export const ToastViewport = forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      'fixed bottom-0 right-0 z-50 m-4 flex w-96 max-w-full flex-col gap-2 outline-none',
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

const toastVariants = tv({
  base: 'pointer-events-auto flex w-full items-start justify-between gap-3 rounded-md border p-3 shadow-lg',
  variants: {
    variant: {
      default:
        'border-[rgb(var(--color-border-strong))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))]',
      success:
        'border-[rgb(var(--color-success))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))]',
      danger:
        'border-[rgb(var(--color-danger))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))]',
    },
  },
  defaultVariants: { variant: 'default' },
});

export const Toast = forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={cn(toastVariants({ variant }), className)}
    {...props}
  />
));
Toast.displayName = ToastPrimitive.Root.displayName;

export const ToastTitle = forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title
    ref={ref}
    className={cn('text-sm font-semibold', className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitive.Title.displayName;

export const ToastDescription = forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={cn('text-xs text-[rgb(var(--color-fg-muted))]', className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitive.Description.displayName;

export const ToastClose = forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn(
      'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-[rgb(var(--color-fg-muted))] hover:bg-[rgb(var(--color-bg-muted))]',
      className,
    )}
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </ToastPrimitive.Close>
));
ToastClose.displayName = ToastPrimitive.Close.displayName;
