import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

// Prisma 7 reads the connection URL from here rather than from schema.prisma.
// Load the repository-root .env so the CLI works from any directory.
process.loadEnvFile(resolve(import.meta.dirname, '../../.env'));

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
