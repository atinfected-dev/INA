/**
 * Round trip for officer-added content, against the real database.
 *
 * Creates one achievement, one computed record, one manual record and one
 * Hall of Fame title, checks each shows up where the pages read it, then
 * removes all of them again. Leaves nothing behind.
 */
process.loadEnvFile('../../.env');

import { prisma } from '@ina/db';
import {
  createCustomAchievement,
  createCustomRecord,
  deleteCustomAchievement,
  deleteCustomRecord,
  loadCustomAchievements,
  loadCustomRecords,
  titleId,
  createCustomTitle,
  deleteCustomTitle,
  listCustomTitles,
} from '../lib/custom-content';
import { loadAchievementOverview } from '../lib/achievements';
import { loadRecords } from '../lib/records';
import { loadHallOfFame } from '../lib/hall-of-fame';
import { loadSettings, saveSettings } from '../lib/settings';
import { invalidateAll } from '../lib/cache';

function check(label: string, ok: boolean): void {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) process.exitCode = 1;
}

async function main(): Promise<void> {
  const before = await prisma.customAchievement.count();

  // --- Achievement -----------------------------------------------------------
  await createCustomAchievement({
    name: 'Verifikations-Erfolg',
    description: 'Nur für den Rundlauf.',
    category: 'fun',
    metric: 'dispels',
    thresholds: { bronze: '100', gold: '1.000' },
  });
  const custom = await loadCustomAchievements();
  const mine = custom.find((entry) => entry.name === 'Verifikations-Erfolg');
  check('Erfolg angelegt und geladen', mine !== undefined);
  check('Erfolg trägt custom:-Präfix', mine?.id.startsWith('custom:') === true);
  check('Schwellen steigen: 100 < 1000', mine?.steps.map((s) => s.threshold).join(',') === '100,1000');

  const overview = await loadAchievementOverview();
  const standing = overview.standings.find((entry) => entry.definition.id === mine?.id);
  check('Erfolg wird für alle ausgewertet', standing !== undefined);
  check(
    'Bronze (100 Dispels) hält jemand',
    (standing?.byTier.bronze ?? 0) > 0,
  );

  // Ascending check is enforced.
  let rejected = false;
  try {
    await createCustomAchievement({
      name: 'Falsch',
      description: 'Absteigend.',
      category: 'fun',
      metric: 'pulls',
      thresholds: { bronze: '500', silver: '100' },
    });
  } catch {
    rejected = true;
  }
  check('Absteigende Schwellen werden abgelehnt', rejected);

  // --- Records ---------------------------------------------------------------
  await createCustomRecord({
    label: 'Verifikation berechnet',
    formula: 'Wer die meisten Dispels hat.',
    metric: 'dispels',
    value: '',
    holder: '',
    holderClass: '',
    context: '',
  });
  await createCustomRecord({
    label: 'Verifikation manuell',
    formula: 'Ein Datum, das kein Log kennt.',
    metric: '',
    value: '12.05.2024',
    holder: 'Harry',
    holderClass: 'Warrior',
    context: 'Rundlauf',
  });
  const records = await loadCustomRecords();
  const computed = records.find((r) => r.label === 'Verifikation berechnet');
  const manual = records.find((r) => r.label === 'Verifikation manuell');
  check('Berechneter Rekord hat einen Träger', !!computed?.holder && computed.value !== '—');
  check('Manueller Rekord ist als manuell ausgewiesen', manual?.formula.includes('manuell') === true);
  check('Manueller Rekord zeigt Wert und Träger', manual?.value === '12.05.2024' && manual.holder === 'Harry');

  const all = await loadRecords();
  check('Rekordseite enthält beide', all.some((r) => r.label === 'Verifikation berechnet') && all.some((r) => r.label === 'Verifikation manuell'));
  console.log(`  berechnet: ${computed?.holder} · ${computed?.value}`);

  // --- Hall of Fame ----------------------------------------------------------
  const settings = await loadSettings();
  const id = titleId('Verifikations-Titel', settings.hallOfFameTitles.map((t) => t.id));
  await saveSettings({
    hallOfFameTitles: [
      ...settings.hallOfFameTitles,
      { id, title: 'Verifikations-Titel', subtitle: 'Rundlauf', metric: 'deaths.total', direction: 'highest' },
    ],
  });
  const holders = await loadHallOfFame((await loadSettings()).hallOfFameTitles);
  const holder = holders.find((h) => h.title.id === id);
  check('Titel angelegt und vergeben', !!holder?.name && !holder.unavailable);
  console.log(`  Titel: ${holder?.title.title} → ${holder?.name} (${holder?.value})`);

  // --- Manual titles -----------------------------------------------------------
  await createCustomTitle({
    title: 'Verifikations-Ehrentitel',
    subtitle: 'Nur für den Rundlauf.',
    holder: 'Harry',
    holderClass: 'Warrior',
    note: 'verliehen im Test',
  });
  // What every officer action does after a change: the Hall of Fame is
  // cached, and the earlier check above already filled it for these titles.
  invalidateAll();
  const honour = (await loadHallOfFame((await loadSettings()).hallOfFameTitles)).find(
    (h) => h.title.title === 'Verifikations-Ehrentitel',
  );
  check(
    'Manueller Titel erscheint in der Hall of Fame',
    honour?.name === 'Harry' && honour.note === 'verliehen im Test',
  );
  check(
    'Manueller Titel hat keinen Wert und keinen Gleichstand',
    honour?.value === null && honour.tiedWith.length === 1,
  );

  // --- Clean up --------------------------------------------------------------
  for (const row of await listCustomTitles()) {
    if (row.title === 'Verifikations-Ehrentitel') await deleteCustomTitle(row.id);
  }
  if (mine) await deleteCustomAchievement(mine.id.replace(/^custom:/, ''));
  for (const record of await prisma.customRecord.findMany({ where: { label: { startsWith: 'Verifikation' } } })) {
    await deleteCustomRecord(record.id);
  }
  await saveSettings({ hallOfFameTitles: settings.hallOfFameTitles });

  check('Aufgeräumt: Erfolge', (await prisma.customAchievement.count()) === before);
  check('Aufgeräumt: Rekorde', (await prisma.customRecord.count({ where: { label: { startsWith: 'Verifikation' } } })) === 0);
  check('Aufgeräumt: Titel', !(await loadSettings()).hallOfFameTitles.some((t) => t.id === id));
  check(
    'Aufgeräumt: manuelle Titel',
    !(await listCustomTitles()).some((t) => t.title === 'Verifikations-Ehrentitel'),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
