import { WclHttpError } from './errors.js';
import type { WclConfig } from './config.js';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface CachedToken {
  accessToken: string;
  /** Epoch milliseconds at which the token is considered stale. */
  expiresAt: number;
}

/**
 * OAuth 2.0 client-credentials token manager.
 *
 * Warcraft Logs issues long-lived application tokens (currently a year), so
 * there is no refresh token — the correct strategy is to request a new one when
 * the current one nears expiry. Tokens are cached in memory per instance and a
 * single in-flight request is shared, so a burst of parallel jobs cannot cause
 * a stampede of token requests.
 */
export class TokenProvider {
  #cached: CachedToken | undefined;
  #inFlight: Promise<CachedToken> | undefined;

  /** Renew this long before actual expiry, so a request never races the clock. */
  static readonly EXPIRY_MARGIN_MS = 60_000;

  constructor(private readonly config: WclConfig) {}

  async getAccessToken(): Promise<string> {
    const cached = this.#cached;
    if (cached && Date.now() < cached.expiresAt) return cached.accessToken;

    this.#inFlight ??= this.#fetchToken().finally(() => {
      this.#inFlight = undefined;
    });

    const token = await this.#inFlight;
    return token.accessToken;
  }

  /** Drops the cached token so the next call fetches a fresh one (used on 401). */
  invalidate(): void {
    this.#cached = undefined;
  }

  async #fetchToken(): Promise<CachedToken> {
    // HTTP Basic with client id/secret, per the client-credentials grant.
    const basic = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
      'utf8',
    ).toString('base64');

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new WclHttpError(
        response.status,
        response.status === 401
          ? `${body}\n\nCheck WCL_CLIENT_ID and WCL_CLIENT_SECRET. These come from the ` +
            `"v2 Clients" section of https://www.warcraftlogs.com/api/clients; a v1 API key ` +
            `is a different credential and cannot be used here.`
          : body,
      );
    }

    const data = (await response.json()) as TokenResponse;
    const token: CachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000 - TokenProvider.EXPIRY_MARGIN_MS,
    };
    this.#cached = token;
    return token;
  }
}
