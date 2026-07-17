import { resolve } from 'node:path';

/** Runtime config, all overridable by env with local-dev-friendly defaults. */
export interface Config {
  host: string;
  port: number;
  dbPath: string;
  logLevel: string;
}

export function loadConfig(): Config {
  return {
    host: process.env.PM_HOST ?? '127.0.0.1',
    port: Number(process.env.PM_PORT ?? 8787),
    // `:memory:` is honored verbatim (used by tests); otherwise resolve to an absolute path.
    dbPath:
      process.env.PM_DB_PATH === ':memory:'
        ? ':memory:'
        : resolve(process.env.PM_DB_PATH ?? resolve(process.cwd(), 'pm.db')),
    logLevel: process.env.PM_LOG_LEVEL ?? 'info',
  };
}
