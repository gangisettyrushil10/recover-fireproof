import { describe, expect, it } from 'vitest';
import { computeImpairmentDurationMinutes } from '../src/duration.js';

describe('computeImpairmentDurationMinutes', () => {
  it('returns now - opened when not closed, > 240 triggers gt4h rule', () => {
    const opened = new Date('2026-01-05T07:40:00-05:00');
    const now = new Date('2026-01-05T13:30:00-05:00'); // +350 minutes
    const minutes = computeImpairmentDurationMinutes(opened, undefined, now);
    expect(minutes).toBe(350);
    expect(minutes).toBeGreaterThan(240);
  });

  it('< 240 minutes does not trigger gt4h rule', () => {
    const opened = new Date('2026-01-05T07:40:00-05:00');
    const now = new Date('2026-01-05T10:30:00-05:00'); // +170 minutes
    const minutes = computeImpairmentDurationMinutes(opened, undefined, now);
    expect(minutes).toBe(170);
    expect(minutes).toBeLessThan(240);
  });

  it('uses closedAt when present (closed time wins over now)', () => {
    const opened = new Date('2026-01-05T07:40:00-05:00');
    const closed = new Date('2026-01-05T08:40:00-05:00'); // +60 min
    const now = new Date('2026-01-05T20:00:00-05:00'); // much later
    expect(computeImpairmentDurationMinutes(opened, closed, now)).toBe(60);
  });

  it('clamps negative durations to zero', () => {
    const opened = new Date('2026-01-05T13:00:00-05:00');
    const now = new Date('2026-01-05T12:00:00-05:00'); // before opened
    expect(computeImpairmentDurationMinutes(opened, undefined, now)).toBe(0);
  });
});
