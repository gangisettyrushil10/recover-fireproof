/**
 * `@fireproof/rules` — top-level barrel.
 *
 * Re-exports the evaluator, the seeded packs registry, all engine types
 * and Zod schemas, and the duration helper.
 *
 * Sub-paths:
 *   - `@fireproof/rules/evaluator`
 *   - `@fireproof/rules/packs`
 *   - `@fireproof/rules/types`
 */

export * from './types.js';
export * from './evaluator.js';
export * from './duration.js';
export * from './packs/index.js';
