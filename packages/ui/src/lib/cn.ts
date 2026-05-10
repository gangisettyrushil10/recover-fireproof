import clsx, { type ClassValue } from 'clsx';

/**
 * Merge class names. Re-exported as `cn` for ergonomics in JSX.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
