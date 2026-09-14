import { loadEnv } from './env';
import { WclClient, ReportTableDocument } from '@ina/wcl';

async function main() {
  loadEnv();
  const c = new WclClient();
  const ids = (process.argv[2] ?? '37').split(',').map(Number);
  const r = await c.query(ReportTableDocument, {
    code: 'x1HnJgZKTfFpraYb', dataType: 'Summary', fightIDs: ids,
  });
  const data = (r.reportData?.report?.table as { data?: Record<string, unknown> })?.data;
  const deaths = (data?.deathEvents as unknown[] | undefined) ?? [];
  console.log(`deathEvents: ${deaths.length}`);
  console.log(JSON.stringify(deaths.slice(0, 3), null, 2).slice(0, 1800));
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
