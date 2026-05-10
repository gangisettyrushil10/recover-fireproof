/**
 * Storage abstraction. Originals live behind `IStorageAdapter.put` with a
 * content-addressed path; the local adapter simulates S3 Object Lock by
 * refusing to overwrite an existing key.
 */

import { createHash } from 'node:crypto';
import { promises as fs, createReadStream } from 'node:fs';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { getConfig, type StorageDriver } from '../config.js';

export interface PutResult {
  storage_key: string;
  sha256: string;
  byte_size: number;
}

export interface IStorageAdapter {
  /**
   * Write `bytes` and return the canonical content-addressed key.
   * If `bytes` already exists at the computed key, throws if
   * `failIfExists` is true (default for originals).
   */
  put(bytes: Buffer, opts?: { failIfExists?: boolean }): Promise<PutResult>;
  /** Read a previously-stored blob. Throws on missing key. */
  get(storageKey: string): Promise<Buffer>;
  /** Streaming variant of `get`. */
  getStream(storageKey: string): Promise<Readable>;
  /** True if the key exists. */
  exists(storageKey: string): Promise<boolean>;
  /** Driver name for logs/audit. */
  readonly driver: StorageDriver;
}

function hashBytes(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function pathFromHash(hash: string): string {
  // sha256[0..2]/sha256
  return path.posix.join(hash.slice(0, 2), hash);
}

// ─── Local FS adapter ───────────────────────────────────────────────────────

export class LocalFsStorageAdapter implements IStorageAdapter {
  public readonly driver: StorageDriver = 'local';
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private absPath(key: string): string {
    return path.join(this.root, key);
  }

  async put(bytes: Buffer, opts: { failIfExists?: boolean } = {}): Promise<PutResult> {
    const sha256 = hashBytes(bytes);
    const key = pathFromHash(sha256);
    const abs = this.absPath(key);
    await fs.mkdir(path.dirname(abs), { recursive: true });

    let alreadyExists = false;
    try {
      await fs.access(abs);
      alreadyExists = true;
    } catch {
      alreadyExists = false;
    }

    if (alreadyExists) {
      if (opts.failIfExists) {
        const err = new Error(
          `Refusing to overwrite content-addressed object ${key} (WORM).`,
        );
        (err as Error & { code?: string }).code = 'STORAGE_OVERWRITE_REFUSED';
        throw err;
      }
      // Same content already present — by definition byte-equal.
      return { storage_key: key, sha256, byte_size: bytes.byteLength };
    }

    // Write to a temp file then rename — guarantees never-half-written reads.
    const tmp = `${abs}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(tmp, bytes);
    await fs.rename(tmp, abs);
    return { storage_key: key, sha256, byte_size: bytes.byteLength };
  }

  async get(storageKey: string): Promise<Buffer> {
    return fs.readFile(this.absPath(storageKey));
  }

  async getStream(storageKey: string): Promise<Readable> {
    return createReadStream(this.absPath(storageKey));
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      await fs.access(this.absPath(storageKey));
      return true;
    } catch {
      return false;
    }
  }
}

// ─── S3 stub ────────────────────────────────────────────────────────────────

export class S3StorageAdapter implements IStorageAdapter {
  public readonly driver: StorageDriver = 's3';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_opts: { bucket: string; region: string }) {
    // Real implementation would lazy-init an S3Client with Object Lock
    // configured. MVP keeps this as a stub so tests can target the
    // interface without pulling AWS deps.
  }

  put(): Promise<PutResult> {
    throw new Error('S3StorageAdapter.put: NotImplemented');
  }
  get(): Promise<Buffer> {
    throw new Error('S3StorageAdapter.get: NotImplemented');
  }
  getStream(): Promise<Readable> {
    throw new Error('S3StorageAdapter.getStream: NotImplemented');
  }
  exists(): Promise<boolean> {
    throw new Error('S3StorageAdapter.exists: NotImplemented');
  }
}

let cached: IStorageAdapter | undefined;

export function getStorageAdapter(): IStorageAdapter {
  if (cached) return cached;
  const cfg = getConfig();
  if (cfg.storageDriver === 'local') {
    cached = new LocalFsStorageAdapter(cfg.localStorageRoot);
  } else {
    cached = new S3StorageAdapter({ bucket: cfg.s3Bucket, region: cfg.s3Region });
  }
  return cached;
}

/** Test hook — let suites swap in a custom adapter. */
export function setStorageAdapter(adapter: IStorageAdapter): void {
  cached = adapter;
}
