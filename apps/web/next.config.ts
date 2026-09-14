import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source rather than a build step.
  transpilePackages: ['@ina/core', '@ina/db', '@ina/wcl', '@ina/contracts'],
  typedRoutes: true,
};

export default config;
