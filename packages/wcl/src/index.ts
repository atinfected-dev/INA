export { WclClient, type WclClientOptions } from './client.js';
export { loadWclConfig, type WclConfig } from './config.js';
export { TokenProvider } from './auth.js';
export { Semaphore } from './semaphore.js';
export {
  isStale,
  msUntilReset,
  remainingPoints,
  type RateLimitSnapshot,
} from './rate-limit.js';
export { WclGraphQLError, WclHttpError, WclRateLimitError } from './errors.js';

// Typed operations and the generated result/variable types. Both are produced
// from the committed schema, so importing from here cannot reference a field
// Warcraft Logs does not have.
export * from './operations.js';
// The generated module is not re-exported: the client preset emits its own
// *Document constants for the same operations, which would collide. Operation
// result types are reachable through ResultOf<typeof XDocument>.
export type { ResultOf, VariablesOf } from '@graphql-typed-document-node/core';
