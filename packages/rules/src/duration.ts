/**
 * Pure helper for computing impairment duration in minutes.
 *
 * Behavior:
 * - If `closed` is provided, the elapsed window is `closed - opened`.
 * - Otherwise, it's `now - opened`.
 * - The result is always clamped to `>= 0` (so a closed-before-opened or
 *   future-opened impairment never returns a negative duration).
 */

import { differenceInMinutes } from 'date-fns';

export function computeImpairmentDurationMinutes(
  opened: Date,
  closed: Date | undefined,
  now: Date,
): number {
  const end = closed ?? now;
  const minutes = differenceInMinutes(end, opened);
  return Math.max(0, minutes);
}
