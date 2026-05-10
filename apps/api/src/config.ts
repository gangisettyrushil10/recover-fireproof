/**
 * Process-level config. Loads from env on first import.
 *
 * Tests can override by setting env before importing the API, or by calling
 * `loadConfig({ ... })` with a partial override.
 */

import 'dotenv/config';

export type StorageDriver = 'local' | 's3';

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  storageDriver: StorageDriver;
  /** Local filesystem root when `storageDriver === 'local'`. */
  localStorageRoot: string;
  /** S3 bucket / region used by the S3 stub. */
  s3Bucket: string;
  s3Region: string;
  /** Logging level for pino. */
  logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
}

function num(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function nodeEnv(): AppConfig['nodeEnv'] {
  const v = process.env.NODE_ENV ?? 'development';
  if (v === 'production' || v === 'test' || v === 'development') return v;
  return 'development';
}

let cached: AppConfig | undefined;

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const cfg: AppConfig = {
    nodeEnv: nodeEnv(),
    port: num(process.env.PORT, 4000),
    databaseUrl:
      process.env.DATABASE_URL ?? 'postgres://fireproof:fireproof@localhost:5432/fireproof',
    jwtSecret: process.env.JWT_SECRET ?? 'dev-only-jwt-secret-change-me',
    storageDriver: (process.env.STORAGE_DRIVER as StorageDriver | undefined) ?? 'local',
    localStorageRoot: process.env.LOCAL_STORAGE_ROOT ?? './.storage',
    s3Bucket: process.env.S3_BUCKET ?? 'fireproof-originals',
    s3Region: process.env.S3_REGION ?? 'us-east-1',
    logLevel: (process.env.LOG_LEVEL as AppConfig['logLevel'] | undefined) ?? 'info',
    ...overrides,
  };
  cached = cfg;
  return cfg;
}

export function getConfig(): AppConfig {
  if (!cached) cached = loadConfig();
  return cached;
}
