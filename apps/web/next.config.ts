import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';

// Next.js only looks for .env next to the app. This is a workspace, and the
// database URL plus the Warcraft Logs credentials live at the repository root
// so that the web app, the worker and the CLI scripts all read one file.
const rootEnv = resolve(import.meta.dirname, '../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const config: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source rather than a build step.
  transpilePackages: ['@ina/core', '@ina/db', '@ina/wcl', '@ina/contracts'],
  // Prisma and the pg driver must not be bundled; they load native/dynamic
  // pieces at runtime.
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg'],
  typedRoutes: true,
};

export default config;
