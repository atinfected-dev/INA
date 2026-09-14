import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Loads the repository-root .env for locally run worker processes.
 *
 * In Docker the environment comes from compose, so a missing file is only a
 * warning. Values already present in the environment win.
 */
export function loadEnv(): void {
  // src/ -> worker/ -> apps/ -> repo root
  const envPath = resolve(import.meta.dirname, '../../../.env');
  if (!existsSync(envPath)) {
    console.warn(`No .env at ${envPath} — using the ambient environment.`);
    return;
  }
  process.loadEnvFile(envPath);
}
