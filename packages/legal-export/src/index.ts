/**
 * `@fireproof/legal-export` — public barrel.
 *
 * The library exposes pure functions for:
 *   - claim extraction         (./claims/extractor)
 *   - contradiction detection  (./contradictions/engine)
 *   - packet manifest + bundle (./packets/manifest, ./packets/builder)
 *   - legal-hold policy        (./holds/policy)
 *   - audit / receipt          (./audit/chain)
 *
 * Nothing here touches the DB, the network, or the filesystem (the only
 * exception is the caller-supplied `fetchBytes` callback in
 * `buildPacketBundle`).
 */

export * from './types.js';
export * from './claims/extractor.js';
export * from './contradictions/engine.js';
export * from './packets/manifest.js';
export * from './packets/builder.js';
export * from './holds/policy.js';
export * from './audit/chain.js';
