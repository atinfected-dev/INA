import { createHash } from 'node:crypto';
import { prisma } from '@ina/db';
import { isBuildCode } from './talent-rules';
import { isClassSlug, type ClassSlug } from './talents';

/**
 * Shared talent builds.
 *
 * A public build is a title and a code; the code alone is the build, so
 * nothing else needs storing. Votes are one per browser and build, keyed by
 * a hash of address and user agent that identifies no one and cannot be
 * turned back into either.
 */

export class BuildError extends Error {}

export type BuildSort = 'score' | 'views' | 'newest';

export interface BuildRow {
  id: string;
  className: ClassSlug;
  title: string;
  code: string;
  views: number;
  score: number;
  createdAt: Date;
  author: string | null;
}

const select = {
  id: true,
  className: true,
  title: true,
  code: true,
  views: true,
  score: true,
  createdAt: true,
  author: { select: { displayName: true } },
} as const;

type Raw = {
  id: string;
  className: string;
  title: string;
  code: string;
  views: number;
  score: number;
  createdAt: Date;
  author: { displayName: string } | null;
};

function shape(row: Raw): BuildRow | null {
  if (!isClassSlug(row.className)) return null;
  return {
    id: row.id,
    className: row.className,
    title: row.title,
    code: row.code,
    views: row.views,
    score: row.score,
    createdAt: row.createdAt,
    author: row.author?.displayName ?? null,
  };
}

export async function listBuilds(options: { className?: ClassSlug; sort?: BuildSort; limit?: number } = {}): Promise<BuildRow[]> {
  const sort = options.sort ?? 'score';
  const rows = await prisma.foreverBuild.findMany({
    where: options.className ? { className: options.className } : undefined,
    orderBy:
      sort === 'views'
        ? [{ views: 'desc' }, { score: 'desc' }]
        : sort === 'newest'
          ? [{ createdAt: 'desc' }]
          : [{ score: 'desc' }, { views: 'desc' }],
    take: options.limit ?? 50,
    select,
  });
  return rows.map(shape).filter((row): row is BuildRow => row !== null);
}

export async function loadBuild(id: string): Promise<BuildRow | null> {
  const row = await prisma.foreverBuild.findUnique({ where: { id }, select });
  return row ? shape(row) : null;
}

/** Counts a visit; fire-and-forget from the page, a miss never matters. */
export async function countView(id: string): Promise<void> {
  await prisma.foreverBuild.updateMany({ where: { id }, data: { views: { increment: 1 } } });
}

export async function createBuild(input: { className: string; title: string; code: string; authorId: string | null }): Promise<string> {
  const title = input.title.trim();
  const code = input.code.trim();
  if (!isClassSlug(input.className)) throw new BuildError('Unbekannte Klasse.');
  if (title.length < 3 || title.length > 60) throw new BuildError('Der Name braucht 3 bis 60 Zeichen.');
  if (!isBuildCode(code)) throw new BuildError('Der Build-Code ist ungültig.');
  const points = code.replace(/[^0-9]/g, '').split('').reduce((sum, d) => sum + Number(d), 0);
  if (points < 5) throw new BuildError('Ein Build braucht mindestens fünf Punkte.');

  const row = await prisma.foreverBuild.create({
    data: { className: input.className, title, code, authorId: input.authorId },
    select: { id: true },
  });
  return row.id;
}

/** The voter's key: never stored in the clear, never reversible. */
export function voterHash(address: string, userAgent: string): string {
  const secret = process.env.AUTH_SECRET ?? 'ina';
  return createHash('sha256').update(`${secret}|${address}|${userAgent}`).digest('hex');
}

/** Adds a vote; a repeat from the same browser is a no-op and says so. */
export async function vote(buildId: string, hash: string): Promise<'counted' | 'already'> {
  const existing = await prisma.foreverBuildVote.findUnique({ where: { buildId_voterHash: { buildId, voterHash: hash } } });
  if (existing) return 'already';
  await prisma.foreverBuildVote.create({ data: { buildId, voterHash: hash } });
  await prisma.foreverBuild.update({ where: { id: buildId }, data: { score: { increment: 1 } } });
  return 'counted';
}
