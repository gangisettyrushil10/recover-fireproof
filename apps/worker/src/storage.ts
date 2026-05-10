/**
 * Storage adapter interface used by the packet worker. The local filesystem
 * adapter is sufficient for dev; a future S3 adapter implements the same
 * contract.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface StorageAdapter {
  /** Read object bytes by storage key. */
  get(key: string): Promise<Buffer>;
  /** Persist bytes under `key`. Creates parent dirs as needed. */
  put(key: string, bytes: Buffer): Promise<void>;
  /** Build a packet-scoped storage key. */
  packetKey(packet_id: string, filename: string): string;
}

export class LocalFsStorageAdapter implements StorageAdapter {
  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    // Defend against absolute keys / path traversal.
    const safe = key.replace(/^\/+/, '').replace(/\.\./g, '');
    return path.join(this.root, safe);
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async put(key: string, bytes: Buffer): Promise<void> {
    const target = this.resolve(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes);
  }

  packetKey(packet_id: string, filename: string): string {
    return path.posix.join('packets', packet_id, filename);
  }
}
