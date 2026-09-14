/**
 * Import worker.
 *
 * Runs the pg-boss queues that fetch reports, fights and per-fight tables from
 * Warcraft Logs, then rebuild sessions and aggregates. Kept out of the Next.js
 * process because a full history import runs for hours, which no HTTP request
 * should.
 *
 * Implemented in M2; this entry point exists now so the process boundary is
 * real from the start.
 */
async function main(): Promise<void> {
  console.log('INA worker — no queues registered yet (see milestone M2).');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
