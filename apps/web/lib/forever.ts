import { prisma } from '@ina/db';
import {
  classesFor,
  factionFor,
  isFaction,
  isForeverClass,
  isForeverRole,
  raceById,
  type Faction,
  type ForeverClass,
  type ForeverRole,
} from '@ina/core';

/**
 * Forever: the members' plan for World of Warcraft: Forever.
 *
 * Two kinds of data, both small: the character each member intends to play,
 * and the officers' posts — infos, guides, raid sheets. Nothing here is
 * computed from logs; that starts on launch day.
 */

export class ForeverError extends Error {}

export type PostKind = 'info' | 'guide' | 'sheet';

export const POST_KINDS: Record<PostKind, { label: string; plural: string; description: string }> =
  {
    info: { label: 'Info', plural: 'Infos', description: 'Was die Gilde zu Forever plant.' },
    guide: { label: 'Guide', plural: 'Guides', description: 'Klassen, Leveln, Vorbereitung.' },
    sheet: { label: 'Raidsheet', plural: 'Raidsheets', description: 'Aufstellungen und Planung.' },
  };

export function isPostKind(value: string): value is PostKind {
  return value === 'info' || value === 'guide' || value === 'sheet';
}

// --- Posts ---------------------------------------------------------------------

export interface ForeverPostRow {
  id: string;
  kind: PostKind;
  title: string;
  body: string;
  url: string | null;
  pinned: boolean;
  createdAt: Date;
}

export async function loadForeverPosts(): Promise<ForeverPostRow[]> {
  const rows = await prisma.foreverPost.findMany({
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
  });
  return rows
    .filter((row) => isPostKind(row.kind))
    .map((row) => ({
      id: row.id,
      kind: row.kind as PostKind,
      title: row.title,
      body: row.body,
      url: row.url,
      pinned: row.pinned,
      createdAt: row.createdAt,
    }));
}

export interface NewPost {
  kind: string;
  title: string;
  body: string;
  url: string;
  pinned: boolean;
  authorId: string;
}

export async function createForeverPost(input: NewPost): Promise<void> {
  const title = input.title.trim();
  const body = input.body.trim();
  const url = input.url.trim();
  if (!isPostKind(input.kind)) throw new ForeverError('Unbekannte Art.');
  if (title.length < 2) throw new ForeverError('Der Titel ist zu kurz.');
  if (body.length < 2 && url === '') throw new ForeverError('Text oder Link — eines von beiden.');
  if (url !== '' && !/^https?:\/\//.test(url)) {
    throw new ForeverError('Der Link muss mit http:// oder https:// beginnen.');
  }

  await prisma.foreverPost.create({
    data: {
      kind: input.kind,
      title,
      body,
      url: url === '' ? null : url,
      pinned: input.pinned,
      authorId: input.authorId,
    },
  });
}

export async function deleteForeverPost(id: string): Promise<void> {
  await prisma.foreverPost.deleteMany({ where: { id } });
}

// --- Characters ------------------------------------------------------------------

export interface ForeverCharacterRow {
  id: string;
  name: string;
  race: string;
  className: ForeverClass;
  faction: Faction;
  role: ForeverRole;
  note: string | null;
  updatedAt: Date;
  member: { displayName: string; personId: string | null };
}

/** Everyone's planned character, Alliance first, then by name. */
export async function loadForeverRoster(): Promise<ForeverCharacterRow[]> {
  const rows = await prisma.foreverCharacter.findMany({
    orderBy: [{ faction: 'asc' }, { name: 'asc' }],
    include: { account: { select: { displayName: true, personId: true } } },
  });
  return rows
    .filter((row) => isForeverClass(row.className) && isFaction(row.faction) && isForeverRole(row.role))
    .map((row) => ({
      id: row.id,
      name: row.name,
      race: row.race,
      className: row.className as ForeverClass,
      faction: row.faction as Faction,
      role: row.role as ForeverRole,
      note: row.note,
      updatedAt: row.updatedAt,
      member: row.account,
    }));
}

export async function loadMyForeverCharacter(accountId: string): Promise<ForeverCharacterRow | null> {
  const row = await prisma.foreverCharacter.findUnique({
    where: { accountId },
    include: { account: { select: { displayName: true, personId: true } } },
  });
  if (!row || !isForeverClass(row.className) || !isFaction(row.faction) || !isForeverRole(row.role)) {
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    race: row.race,
    className: row.className,
    faction: row.faction,
    role: row.role,
    note: row.note,
    updatedAt: row.updatedAt,
    member: row.account,
  };
}

export interface CharacterInput {
  name: string;
  race: string;
  className: string;
  faction: string;
  role: string;
  note: string;
}

/**
 * Saves the member's planned character.
 *
 * The race/class table decides what is allowed — the same table the form
 * shows — so a combination the game does not offer cannot be saved even by a
 * hand-crafted request.
 */
export async function saveForeverCharacter(accountId: string, input: CharacterInput): Promise<void> {
  const name = input.name.trim();
  if (!/^[A-Za-zÀ-ÿ]{2,12}$/.test(name)) {
    throw new ForeverError('Charakternamen haben 2 bis 12 Buchstaben, ohne Leer- oder Sonderzeichen.');
  }

  const race = raceById(input.race);
  if (!race) throw new ForeverError('Unbekanntes Volk.');

  const chosen = isFaction(input.faction) ? input.faction : null;
  const faction = factionFor(race, chosen);
  if (!faction) throw new ForeverError('Skyborne wählen eine Fraktion.');

  if (!isForeverClass(input.className)) throw new ForeverError('Unbekannte Klasse.');
  if (!classesFor(race, faction).includes(input.className)) {
    throw new ForeverError(`${race.name} können in Forever keine ${input.className} sein.`);
  }
  if (!isForeverRole(input.role)) throw new ForeverError('Unbekannte Rolle.');

  const data = {
    name,
    race: race.id,
    className: input.className,
    faction,
    role: input.role,
    note: input.note.trim() === '' ? null : input.note.trim().slice(0, 280),
  };
  await prisma.foreverCharacter.upsert({
    where: { accountId },
    create: { accountId, ...data },
    update: data,
  });
}

export async function deleteForeverCharacter(accountId: string): Promise<void> {
  await prisma.foreverCharacter.deleteMany({ where: { accountId } });
}

// --- Progress: what Forever has produced so far -------------------------------------

export interface ForeverProgress {
  /** Raid nights, pulls and kills in zones belonging to a Forever expansion. */
  nights: number;
  pulls: number;
  kills: number;
  known: boolean;
}

/**
 * Forever's own numbers, kept apart from the Classic history.
 *
 * Warcraft Logs lists Forever content under its own expansion once logs
 * exist. Until then this is honestly zero, and the page says the count starts
 * on launch day — the Classic record is never touched by it.
 */
export async function loadForeverProgress(): Promise<ForeverProgress> {
  const rows = await prisma.$queryRaw<{ nights: bigint; pulls: bigint; kills: bigint; known: boolean }[]>`
    SELECT COUNT(DISTINCT DATE(f."startTime")) AS nights,
           COUNT(f.id)                          AS pulls,
           COUNT(f.id) FILTER (WHERE f.kill)     AS kills,
           EXISTS (SELECT 1 FROM "Expansion" x WHERE x.name ILIKE '%forever%') AS known
    FROM "Expansion" x
    JOIN "Zone" z      ON z."expansionId" = x.id
    JOIN "Encounter" e ON e."zoneId" = z.id
    JOIN "Fight" f     ON f."encounterId" = e.id
    WHERE x.name ILIKE '%forever%'
  `;
  const row = rows[0];
  return {
    nights: Number(row?.nights ?? 0),
    pulls: Number(row?.pulls ?? 0),
    kills: Number(row?.kills ?? 0),
    known: row?.known ?? false,
  };
}
