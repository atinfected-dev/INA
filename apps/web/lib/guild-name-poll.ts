import { prisma } from '@ina/db';

/**
 * The guild-name poll.
 *
 * Every registered, active member may vote on as many candidates as they
 * like — but only once per name, up or down — and may change or withdraw a
 * vote at any time. The ranking is the balance of ups and downs; a name
 * nobody has voted on sits at zero. Voting needs an account so that one
 * person is one voice per name, which is the whole point of asking.
 */

export class PollError extends Error {}

export interface PollOption {
  id: string;
  name: string;
  up: number;
  down: number;
  score: number;
  /** The viewer's own vote, if signed in: 1, -1 or 0. */
  mine: number;
}

export interface Poll {
  options: PollOption[];
  voters: number;
  votes: number;
}

export async function loadPoll(viewerId: string | null): Promise<Poll> {
  const [options, votes] = await Promise.all([
    prisma.guildNameOption.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
    prisma.guildNameVote.findMany({ select: { optionId: true, accountId: true, value: true } }),
  ]);

  const tally = new Map<string, { up: number; down: number; mine: number }>();
  for (const option of options) tally.set(option.id, { up: 0, down: 0, mine: 0 });
  const voters = new Set<string>();
  for (const vote of votes) {
    const t = tally.get(vote.optionId);
    if (!t) continue;
    voters.add(vote.accountId);
    if (vote.value > 0) t.up += 1;
    else if (vote.value < 0) t.down += 1;
    if (viewerId && vote.accountId === viewerId) t.mine = Math.sign(vote.value);
  }

  const shaped = options
    .map((option) => {
      const t = tally.get(option.id)!;
      return { id: option.id, name: option.name, up: t.up, down: t.down, score: t.up - t.down, mine: t.mine };
    })
    // Best balance first; among equals, more ups first; then alphabetically.
    .sort((a, b) => b.score - a.score || b.up - a.up || a.name.localeCompare(b.name, 'de'));

  return { options: shaped, voters: voters.size, votes: votes.length };
}

/** value 1 = up, -1 = down. Casting the same vote again withdraws it. */
export async function castVote(accountId: string, optionId: string, value: number): Promise<'up' | 'down' | 'withdrawn'> {
  if (value !== 1 && value !== -1) throw new PollError('Ungültige Stimme.');
  const option = await prisma.guildNameOption.findUnique({ where: { id: optionId }, select: { id: true } });
  if (!option) throw new PollError('Diesen Namen gibt es nicht mehr.');

  const existing = await prisma.guildNameVote.findUnique({ where: { optionId_accountId: { optionId, accountId } } });
  if (existing && existing.value === value) {
    await prisma.guildNameVote.delete({ where: { optionId_accountId: { optionId, accountId } } });
    return 'withdrawn';
  }
  await prisma.guildNameVote.upsert({
    where: { optionId_accountId: { optionId, accountId } },
    create: { optionId, accountId, value },
    update: { value },
  });
  return value === 1 ? 'up' : 'down';
}

export async function addOption(name: string): Promise<void> {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 2 || trimmed.length > 40) throw new PollError('Ein Name braucht 2 bis 40 Zeichen.');
  const exists = await prisma.guildNameOption.findFirst({ where: { name: { equals: trimmed, mode: 'insensitive' } } });
  if (exists) throw new PollError('Der Name steht schon zur Wahl.');
  const last = await prisma.guildNameOption.aggregate({ _max: { sortOrder: true } });
  await prisma.guildNameOption.create({ data: { name: trimmed, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
}

export async function removeOption(id: string): Promise<void> {
  await prisma.guildNameOption.deleteMany({ where: { id } });
}
