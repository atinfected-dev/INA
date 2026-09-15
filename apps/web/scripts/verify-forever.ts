/**
 * Round trip for the Forever page, against the real database.
 *
 * Uses a throwaway account so no member's planned character is touched:
 * posts one entry of each kind, saves a Skyborne character, checks the
 * race/class table rejects what the game does not offer, reads everything
 * back the way the page does, then removes all of it. Leaves nothing behind.
 */
process.loadEnvFile('../../.env');

import { prisma } from '@ina/db';
import {
  ForeverError,
  createForeverPost,
  deleteForeverCharacter,
  deleteForeverPost,
  loadForeverPosts,
  loadForeverProgress,
  loadForeverRoster,
  loadMyForeverCharacter,
  saveForeverCharacter,
} from '../lib/forever';
import { WISSEN_TOPICS } from '../lib/forever-wissen';

function check(label: string, ok: boolean): void {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) process.exitCode = 1;
}

async function rejects(label: string, work: () => Promise<unknown>): Promise<void> {
  try {
    await work();
    check(label, false);
  } catch (error) {
    check(label, error instanceof ForeverError);
    if (error instanceof ForeverError) console.log(`  → ${error.message}`);
  }
}

async function main(): Promise<void> {
  const account = await prisma.account.create({
    data: {
      email: `rundlauf-${Date.now()}@example.invalid`,
      passwordHash: 'not-a-hash',
      displayName: 'Rundlauf',
      isActive: false,
    },
  });
  const postsBefore = await prisma.foreverPost.count();

  try {
    // --- Posts ---------------------------------------------------------------
    for (const kind of ['info', 'guide', 'sheet'] as const) {
      await createForeverPost({
        kind,
        title: `Rundlauf ${kind}`,
        body: kind === 'sheet' ? '' : 'Nur für den Rundlauf.\nZweiter Absatz.',
        url: kind === 'sheet' ? 'https://docs.google.com/spreadsheets/d/rundlauf' : '',
        pinned: kind === 'info',
        authorId: account.id,
      });
    }
    const posts = (await loadForeverPosts()).filter((post) => post.title.startsWith('Rundlauf '));
    check('Drei Beiträge angelegt und geladen', posts.length === 3);
    check('Angepinnter Beitrag steht vorn', posts[0]?.pinned === true && posts[0].kind === 'info');
    check('Raidsheet trägt den Link', posts.find((p) => p.kind === 'sheet')?.url?.startsWith('https://') === true);
    await rejects('Beitrag ohne Text und Link wird abgelehnt', () =>
      createForeverPost({ kind: 'info', title: 'Leer', body: '', url: '', pinned: false, authorId: account.id }),
    );
    await rejects('Link ohne http(s) wird abgelehnt', () =>
      createForeverPost({ kind: 'sheet', title: 'Link', body: '', url: 'docs.google.com/x', pinned: false, authorId: account.id }),
    );

    // --- Character -----------------------------------------------------------
    await saveForeverCharacter(account.id, {
      name: 'Rundläufer',
      surname: 'Testmann',
      race: 'skyborne',
      faction: 'horde',
      className: 'Shaman',
      role: 'Heiler',
      note: 'Nur für den Rundlauf.',
    });
    const mine = await loadMyForeverCharacter(account.id);
    check('Skyborne-Schamane (Horde) gespeichert', mine?.className === 'Shaman' && mine.faction === 'horde');
    check('Vor- und Nachname gespeichert', mine?.name === 'Rundläufer' && mine.surname === 'Testmann');
    check('Aufstellung enthält den Charakter', (await loadForeverRoster()).some((row) => row.id === mine?.id));

    await saveForeverCharacter(account.id, {
      name: 'Rundläufer',
      surname: 'Testmann',
      race: 'undead',
      faction: '',
      className: 'Paladin',
      role: 'Tank',
      note: '',
    });
    const changed = await loadMyForeverCharacter(account.id);
    check('Umgeplant auf Untoter Paladin, ein Charakter je Konto', changed?.race === 'undead' && changed.className === 'Paladin');
    check('Fraktion folgt dem Volk', changed?.faction === 'horde');
    check('Leere Notiz wird nicht gespeichert', changed?.note === null);

    await rejects('Nachtelf-Paladin wird abgelehnt', () =>
      saveForeverCharacter(account.id, { name: 'Falsch', surname: 'Testmann', race: 'nightelf', faction: '', className: 'Paladin', role: 'Tank', note: '' }),
    );
    await rejects('Skyborne-Schamane auf Allianzseite wird abgelehnt', () =>
      saveForeverCharacter(account.id, { name: 'Falsch', surname: 'Testmann', race: 'skyborne', faction: 'alliance', className: 'Shaman', role: 'Heiler', note: '' }),
    );
    await rejects('Skyborne ohne Fraktion wird abgelehnt', () =>
      saveForeverCharacter(account.id, { name: 'Falsch', surname: 'Testmann', race: 'skyborne', faction: '', className: 'Warrior', role: 'Tank', note: '' }),
    );
    await rejects('Name mit Leerzeichen wird abgelehnt', () =>
      saveForeverCharacter(account.id, { name: 'Zwei Worte', surname: 'Testmann', race: 'orc', faction: '', className: 'Mage', role: 'Schaden', note: '' }),
    );
    await rejects('Fehlender Nachname wird abgelehnt', () =>
      saveForeverCharacter(account.id, { name: 'Ohne', surname: '', race: 'orc', faction: '', className: 'Mage', role: 'Schaden', note: '' }),
    );

    // --- Progress and knowledge ---------------------------------------------------
    const progress = await loadForeverProgress();
    check('Forever-Erfolge starten bei null', progress.nights === 0 && progress.pulls === 0 && progress.kills === 0);
    check('Fünf Wissensthemen mit eindeutigen Slugs', new Set(WISSEN_TOPICS.map((t) => t.slug)).size === 5);
    check(
      'Jede Tabelle hat gleich viele Spalten und Zellen',
      WISSEN_TOPICS.every((t) =>
        t.sections.every((s) => !s.table || s.table.rows.every((r) => r.length === s.table!.columns.length)),
      ),
    );
  } finally {
    // --- Clean up --------------------------------------------------------------
    for (const post of await prisma.foreverPost.findMany({ where: { authorId: account.id } })) {
      await deleteForeverPost(post.id);
    }
    await deleteForeverCharacter(account.id);
    await prisma.account.delete({ where: { id: account.id } });
  }

  check('Aufgeräumt: Beiträge', (await prisma.foreverPost.count()) === postsBefore);
  check('Aufgeräumt: Konto', (await prisma.account.findUnique({ where: { id: account.id } })) === null);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
