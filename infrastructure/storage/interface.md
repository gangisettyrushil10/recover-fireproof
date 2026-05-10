# IStorageAdapter — shared interface contract

This document is the single source of truth for the storage adapter contract.
The backend (`apps/api`) and worker (`apps/worker`) MUST implement and consume
storage exclusively through this interface. Do not call S3/MinIO/local FS
clients directly from business code.

## Goals

1. Originals are immutable. The adapter MUST refuse to overwrite an object
   whose stored metadata says `is_original=true` while a hold or active
   retention applies.
2. WORM semantics are first-class. The adapter mirrors S3 Object Lock
   primitives (Retention + Legal Hold) so prod and dev behave the same.
3. Every write returns the bytes that were actually persisted plus their
   SHA-256 and ETag, so the API can persist a verifiable
   `document_versions` row.
4. Originals and derivatives live in separate buckets (`fireproof-originals`
   under Object Lock, `fireproof-derivatives` mutable).

## Types

```ts
export type StorageBucket = 'originals' | 'derivatives';

export interface PutOptions {
  /** True when this is an original ingest. Routes to the locked bucket. */
  isOriginal: boolean;
  /** MIME type, persisted as object metadata. */
  contentType: string;
  /** Optional WORM retention (compliance mode). Originals only. */
  retainUntil?: Date;
  /** Optional legal hold flag at write time. */
  legalHold?: boolean;
  /** Optional uploader / actor id, persisted as object metadata. */
  uploadedBy?: string;
  /** Optional pre-computed sha256 for verification (hex). */
  expectedSha256?: string;
}

export interface PutResult {
  bucket: StorageBucket;
  key: string;
  etag: string;
  sha256: string;
  byteSize: number;
  versionId?: string;
}

export interface HeadResult {
  bucket: StorageBucket;
  key: string;
  contentType: string;
  byteSize: number;
  sha256: string;
  etag: string;
  uploadedBy?: string;
  isOriginal: boolean;
  legalHold: boolean;
  retainUntil?: Date;
  createdAt: Date;
  versionId?: string;
}
```

## Methods

### `put(key, bytes, opts) -> PutResult`

- Streams `bytes` (`Buffer | Readable`) to the bucket selected by
  `opts.isOriginal`.
- Computes SHA-256 during the upload. If `opts.expectedSha256` is set and
  does not match, throw `STORAGE_CHECKSUM_MISMATCH` and abort.
- For originals, applies `retainUntil` (compliance retention) and
  `legalHold` if provided.
- MUST refuse and throw `STORAGE_OVERWRITE_FORBIDDEN` if an object already
  exists at `key` in the originals bucket. Callers should always use
  content-addressed keys (e.g. `documents/<uuid>/v<version>/<sha>.pdf`).

### `get(key) -> Buffer`

- Reads the object. Throws `STORAGE_NOT_FOUND` if missing.

### `head(key) -> HeadResult`

- Returns metadata only. Throws `STORAGE_NOT_FOUND` if missing.

### `applyLegalHold(key, on: boolean) -> void`

- Sets or clears the legal-hold flag on the specified version.
- Originals bucket only. MUST throw `STORAGE_NOT_LOCKABLE` if called
  against the derivatives bucket.

### `setRetention(key, until: Date) -> void`

- Sets compliance-mode retention on the specified version. Retention may
  only be extended; shortening MUST throw `STORAGE_RETENTION_SHORTENED`.

### `delete(key) -> void`

- Soft delete a derivative.
- For originals: MUST throw `STORAGE_DELETE_FORBIDDEN` if the object is
  under active legal hold OR within compliance retention.

## Error codes (must match `@fireproof/domain` error enum)

- `STORAGE_NOT_FOUND`
- `STORAGE_OVERWRITE_FORBIDDEN`
- `STORAGE_DELETE_FORBIDDEN`
- `STORAGE_CHECKSUM_MISMATCH`
- `STORAGE_RETENTION_SHORTENED`
- `STORAGE_NOT_LOCKABLE`
- `LEGAL_HOLD_ACTIVE` (raised when a higher-level hold blocks the call)

## Implementations

| Implementation | Location | Used by |
|---|---|---|
| `S3StorageAdapter` (MinIO compatible) | `apps/api/src/storage/s3.ts` | dev + prod |
| `LocalFsStorageAdapter` | `apps/api/src/storage/local-fs.ts` | tests |

Both implementations MUST pass the contract test suite at
`apps/api/src/storage/__tests__/contract.test.ts`.

## Key naming convention

```
documents/<documentId>/v<versionNo>/<sha256>.<ext>
exports/<packetId>/manifest.json
exports/<packetId>/bundle.zip
derivatives/<documentId>/v<versionNo>/preview.<ext>
```

Keys are content-addressed by `documentId` + `versionNo`; the SHA-256
suffix lets callers verify integrity from the key alone.
