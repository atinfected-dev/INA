/**
 * Round trip for the guild-name poll, against the real database.
 *
 * Two throwaway accounts vote on the same names: up, down, change, withdraw.
 * Checks the tallies, the ranking and the one-vote-per-name rule, then
 * removes both accounts (their votes go with them). Leaves nothing behind.
 */
process.loadEnvFile('../../.env');

import { prisma } from '@ina/db';
import { PollError, addOption, castVote, loadPoll, loadPollDetails, removeOption } from '../lib/guild-name-poll';

function check(label: string, ok: boolean): void {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) process.exitCode = 1;
}

async function main(): Promise<void> {
  const stamp = Date.now();
  const throwaway = (tag: string) =>
    prisma.account.create({
      data: { email: `rundlauf-poll-${tag}-${stamp}@example.invalid`, passwordHash: 'not-a-hash', displayName: `Rundlauf ${tag}`, isActive: false },
    });
  const a = await throwaway('a');
  const b = await throwaway('b');
  const votesBefore = await prisma.guildNameVote.count();
  const optionsBefore = await prisma.guildNameOption.count();

  try {
    const poll = await loadPoll(null);
    check('Vorschläge stehen zur Wahl (16 zum Start)', poll.options.length >= 16);
    check('„Is Not Alone“ ist dabei', poll.options.some((o) => o.name === 'Is Not Alone'));

    await addOption(`Rundlauf-Name ${stamp}`);
    const option = (await loadPoll(null)).options.find((o) => o.name === `Rundlauf-Name ${stamp}`)!;
    check('Neuer Vorschlag angelegt', option !== undefined);

    let rejected = false;
    try {
      await addOption(`rundlauf-name ${stamp}`);
    } catch (error) {
      rejected = error instanceof PollError;
    }
    check('Doppelter Name (Groß/Klein egal) wird abgelehnt', rejected);

    check('Hochstimmen meldet „up“', (await castVote(a.id, option.id, 1)) === 'up');
    check('Zweites Mitglied stimmt runter', (await castVote(b.id, option.id, -1)) === 'down');
    let tally = (await loadPoll(a.id)).options.find((o) => o.id === option.id)!;
    check('Zählung 1 hoch, 1 runter, Saldo 0', tally.up === 1 && tally.down === 1 && tally.score === 0);
    check('Eigene Stimme wird angezeigt', tally.mine === 1);

    const details = await loadPollDetails();
    const row = details.byOption.find((o) => o.id === option.id);
    check(
      'Offiziersansicht: wer hoch, wer runter',
      row?.up.some((v) => v.accountId === a.id) === true && row.down.some((v) => v.accountId === b.id) === true,
    );
    const memberA = details.byMember.find((m) => m.accountId === a.id);
    check('Offiziersansicht nach Mitglied', memberA?.up.includes(option.name) === true && memberA.down.length === 0);

    check('Meinung ändern überschreibt statt zu addieren', (await castVote(a.id, option.id, -1)) === 'down');
    tally = (await loadPoll(a.id)).options.find((o) => o.id === option.id)!;
    check('Nur eine Stimme pro Mitglied und Name', tally.up === 0 && tally.down === 2 && tally.score === -2);

    check('Gleicher Pfeil noch einmal zieht zurück', (await castVote(a.id, option.id, -1)) === 'withdrawn');
    tally = (await loadPoll(a.id)).options.find((o) => o.id === option.id)!;
    check('Zurückgezogen: 0 hoch, 1 runter', tally.up === 0 && tally.down === 1 && tally.mine === 0);

    // The same member may vote on several names.
    const other = poll.options.find((o) => o.name === 'Is Not Alone')!;
    await castVote(a.id, other.id, 1);
    const both = await loadPoll(a.id);
    check('Mehrere Namen je Mitglied möglich', both.options.filter((o) => o.mine !== 0).length === 1 && both.options.find((o) => o.id === other.id)!.mine === 1);
    check('Rangfolge: höherer Saldo zuerst', both.options.findIndex((o) => o.id === other.id) < both.options.findIndex((o) => o.id === option.id));

    let bad = false;
    try {
      await castVote(a.id, option.id, 5);
    } catch (error) {
      bad = error instanceof PollError;
    }
    check('Ungültiger Stimmwert wird abgelehnt', bad);

    await castVote(a.id, other.id, 1); // withdraw again
    await removeOption(option.id);
    check('Vorschlag entfernt, Stimmen dazu weg', (await loadPoll(null)).options.every((o) => o.id !== option.id));
  } finally {
    await prisma.account.deleteMany({ where: { id: { in: [a.id, b.id] } } });
    await prisma.guildNameOption.deleteMany({ where: { name: { startsWith: 'Rundlauf-Name ' } } });
  }

  check('Aufgeräumt: Stimmen', (await prisma.guildNameVote.count()) === votesBefore);
  check('Aufgeräumt: Vorschläge', (await prisma.guildNameOption.count()) === optionsBefore);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
