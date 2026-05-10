'use client';

import { forwardRef } from 'react';
import { Input, type InputProps } from './Input.js';

export interface NumberInputProps extends Omit<InputProps, 'type'> {
  /** When true, only finite numbers are accepted; non-numeric input is rejected. */
  strict?: boolean;
}

/**
 * Numeric input that uses `inputMode="decimal"` and HTML5 `type="number"`.
 * Form-layer validation should still enforce numeric values via Zod.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ strict = true, ...props }, ref) => (
    <Input
      ref={ref}
      type="number"
      inputMode="decimal"
      step="any"
      pattern={strict ? '[0-9]*[.,]?[0-9]*' : undefined}
      {...props}
    />
  ),
);
NumberInput.displayName = 'NumberInput';
