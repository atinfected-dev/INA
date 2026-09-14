import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Loads the repository-root .env into process.env for standalone scripts.
 *
 * The web app and worker get their environment from Next.js and Docker
 * respectively; only CLI scripts need this. Existing variables win, so an
 * explicitly exported value is never overwritten by the file.
 */
export function loadRootEnv(): void {
  // scripts/ -> packages/wcl/ -> packages/ -> repo root
  const envPath = resolve(import.meta.dirname, '../../../.env');
  if (!existsSync(envPath)) {
    console.warn(`No .env found at ${envPath} — relying on the ambient environment.`);
    return;
  }
  process.loadEnvFile(envPath);
}
