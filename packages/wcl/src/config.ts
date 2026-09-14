/**
 * Runtime configuration for the Warcraft Logs API v2 client.
 *
 * Every value is read from the environment at call time so that scripts, the
 * worker and Next.js server code all share one source of truth. Nothing here
 * may ever be imported into browser code: the client secret must not leave the
 * server.
 */

export interface WclConfig {
  /** OAuth token endpoint. Always the www host, even for Classic data. */
  tokenUrl: string;
  /** GraphQL host, e.g. https://classic.warcraftlogs.com */
  apiHost: string;
  /** Public, application-scoped GraphQL endpoint. */
  clientEndpoint: string;
  clientId: string;
  clientSecret: string;
  /** Stop issuing requests once fewer than this many points remain this hour. */
  pointReserve: number;
  /** Maximum number of in-flight requests. */
  maxConcurrency: number;
}

class MissingConfigError extends Error {
  constructor(variable: string) {
    super(
      `Missing environment variable ${variable}. Copy .env.example to .env and ` +
        `fill it in. Warcraft Logs v2 credentials come from ` +
        `https://www.warcraftlogs.com/api/clients (the "v2 Clients" section — a ` +
        `v1 API key will not work).`,
    );
    this.name = 'MissingConfigError';
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') throw new MissingConfigError(name);
  return value.trim();
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Environment variable ${name} must be a non-negative number, got "${raw}".`);
  }
  return parsed;
}

/** Strips a trailing slash so endpoint concatenation stays predictable. */
function normaliseHost(host: string): string {
  return host.replace(/\/+$/, '');
}

export function loadWclConfig(): WclConfig {
  const apiHost = normaliseHost(
    process.env.WCL_API_HOST?.trim() || 'https://classic.warcraftlogs.com',
  );

  return {
    tokenUrl: process.env.WCL_OAUTH_TOKEN_URL?.trim() || 'https://www.warcraftlogs.com/oauth/token',
    apiHost,
    clientEndpoint: `${apiHost}/api/v2/client`,
    clientId: required('WCL_CLIENT_ID'),
    clientSecret: required('WCL_CLIENT_SECRET'),
    pointReserve: optionalNumber('WCL_POINT_RESERVE', 200),
    maxConcurrency: optionalNumber('WCL_MAX_CONCURRENCY', 2),
  };
}
