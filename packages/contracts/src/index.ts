/**
 * Shared data contracts for anything entering the database from outside the
 * Warcraft Logs importer.
 *
 * Currently a placeholder for the RaidBrain addon export (bench history,
 * assignments, soll/ist deviations) — data the logs cannot provide. Defined in
 * M7; kept as its own package now so the boundary exists before anything needs
 * to cross it.
 */
export const CONTRACTS_VERSION = 1 as const;
