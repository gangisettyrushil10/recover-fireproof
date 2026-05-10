/**
 * `@fireproof/domain` — top-level barrel.
 *
 * Re-exports every enum, state machine helper, error, and Zod schema (with
 * its inferred TS type). Sub-paths are also available:
 *   - `@fireproof/domain/enums`
 *   - `@fireproof/domain/states`
 *   - `@fireproof/domain/transitions`
 *   - `@fireproof/domain/errors`
 *   - `@fireproof/domain/schemas`
 *   - `@fireproof/domain/api`
 *   - `@fireproof/domain/types`  (types only, no runtime)
 */

export * from './enums.js';
export * from './states.js';
export * from './transitions.js';
export * from './errors.js';
export * from './schemas/index.js';
