/**
 * Downloads the live Warcraft Logs API v2 schema and writes it to
 * packages/wcl/schema.graphql.
 *
 * This is the project's guard against inventing API fields. The schema is
 * committed, graphql-codegen validates every operation against it, and the
 * build fails on any field that does not actually exist. Re-run this whenever
 * Warcraft Logs changes their API; the diff shows exactly what moved.
 */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  buildClientSchema,
  getIntrospectionQuery,
  printSchema,
  type IntrospectionQuery,
} from 'graphql';
import { loadRootEnv } from './env';
import { WclClient } from '../src/client';

const SCHEMA_PATH = resolve(import.meta.dirname, '../schema.graphql');

async function main(): Promise<void> {
  loadRootEnv();

  const client = new WclClient({ waitForRateLimitReset: false });
  console.log(`Introspecting ${client.apiHost}/api/v2/client …`);

  const introspection = await client.query<IntrospectionQuery, undefined>(
    // descriptions:true keeps the field docs, which is the whole point of
    // having a local copy to read.
    getIntrospectionQuery({ descriptions: true }),
  );

  const schema = buildClientSchema(introspection);
  const sdl = printSchema(schema);
  await writeFile(SCHEMA_PATH, `${sdl}\n`, 'utf8');

  const typeCount = Object.keys(schema.getTypeMap()).filter((n) => !n.startsWith('__')).length;
  const queryFields = Object.keys(schema.getQueryType()?.getFields() ?? {});

  console.log(`\nWrote ${SCHEMA_PATH}`);
  console.log(`  types:            ${typeCount}`);
  console.log(`  top-level queries: ${queryFields.join(', ')}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
