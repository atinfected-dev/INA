import 'server-only';
import { prisma, ClaimStatus } from '@ina/db';
import { slugify } from '@ina/core';

/**
 * Character claims.
 *
 * Nothing in a Warcraft Logs report proves who sat at the keyboard, so a claim
 * is a request that a human approves — the software does not pretend to verify
 * something it cannot. Approval is what links an Account to a Person, and the
 * Person is what makes several characters read as one raider.
 */

export class ClaimError extends Error {}

export async function requestClaim(
  accountId: string,
  characterId: string,
  note?: string,
): Promise<void> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { id: true, name: true, personId: true },
  });
  if (!character) throw new ClaimError('Diesen Charakter gibt es nicht.');

  if (character.personId) {
    const owner = await prisma.account.findUnique({
      where: { personId: character.personId },
      select: { id: true },
    });
    if (owner && owner.id !== accountId) {
      throw new ClaimError(`${character.name} ist bereits einem anderen Konto zugeordnet.`);
    }
  }

  const existing = await prisma.characterClaim.findUnique({
    where: { accountId_characterId: { accountId, characterId } },
    select: { status: true },
  });

  if (existing?.status === ClaimStatus.PENDING) {
    throw new ClaimError('Für diesen Charakter liegt bereits ein offener Antrag vor.');
  }
  if (existing?.status === ClaimStatus.APPROVED) {
    throw new ClaimError('Dieser Charakter gehört bereits zu deinem Konto.');
  }

  await prisma.characterClaim.upsert({
    where: { accountId_characterId: { accountId, characterId } },
    // A rejected claim may be raised again; the decision is cleared with it.
    update: {
      status: ClaimStatus.PENDING,
      note: note?.trim() || null,
      createdAt: new Date(),
      decidedAt: null,
      decidedBy: null,
      decisionNote: null,
    },
    create: { accountId, characterId, note: note?.trim() || null },
  });
}

/**
 * Approves a claim and attaches the character to the account's Person.
 *
 * The Person is created on first approval, named after the account's real name
 * where one was given and the display name otherwise.
 */
export async function approveClaim(claimId: string, decidedBy: string): Promise<void> {
  const claim = await prisma.characterClaim.findUnique({
    where: { id: claimId },
    select: {
      id: true,
      characterId: true,
      account: { select: { id: true, displayName: true, realName: true, personId: true } },
    },
  });
  if (!claim) throw new ClaimError('Antrag nicht gefunden.');

  await prisma.$transaction(async (tx) => {
    let personId = claim.account.personId;

    if (!personId) {
      const displayName = claim.account.realName?.trim() || claim.account.displayName;
      const base = slugify(displayName) || `spieler-${claim.account.id.slice(0, 6)}`;

      // Slugs are unique; two members with the same name must not collide.
      let slug = base;
      for (let suffix = 2; await tx.person.findUnique({ where: { slug } }); suffix += 1) {
        slug = `${base}-${suffix}`;
      }

      const person = await tx.person.create({
        data: { displayName, slug },
        select: { id: true },
      });
      personId = person.id;

      await tx.account.update({ where: { id: claim.account.id }, data: { personId } });
    }

    await tx.character.update({ where: { id: claim.characterId }, data: { personId } });
    await tx.characterClaim.update({
      where: { id: claim.id },
      data: { status: ClaimStatus.APPROVED, decidedAt: new Date(), decidedBy },
    });
  }, {
    // Prisma's defaults (2 s to obtain a connection, 5 s to finish) were
    // written for a database with the process to itself. On the shared host
    // an aggregate refresh can hold the pool for a few seconds, and an
    // approval that then times out reads as "Entscheidung fehlgeschlagen".
    maxWait: 15_000,
    timeout: 60_000,
  });
}

export async function rejectClaim(
  claimId: string,
  decidedBy: string,
  reason?: string,
): Promise<void> {
  await prisma.characterClaim.update({
    where: { id: claimId },
    data: {
      status: ClaimStatus.REJECTED,
      decidedAt: new Date(),
      decidedBy,
      decisionNote: reason?.trim() || null,
    },
  });
}

/** Releases a character again, e.g. when it was approved in error. */
export async function revokeClaim(claimId: string, decidedBy: string): Promise<void> {
  const claim = await prisma.characterClaim.findUnique({
    where: { id: claimId },
    select: { characterId: true },
  });
  if (!claim) throw new ClaimError('Antrag nicht gefunden.');

  await prisma.$transaction([
    prisma.character.update({ where: { id: claim.characterId }, data: { personId: null } }),
    prisma.characterClaim.update({
      where: { id: claimId },
      data: { status: ClaimStatus.REJECTED, decidedAt: new Date(), decidedBy },
    }),
  ]);
}

export async function loadMyClaims(accountId: string) {
  return prisma.characterClaim.findMany({
    where: { accountId },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      status: true,
      note: true,
      decisionNote: true,
      createdAt: true,
      character: {
        select: { id: true, name: true, realmName: true, className: true },
      },
    },
  });
}

export async function loadPendingClaims() {
  return prisma.characterClaim.findMany({
    where: { status: ClaimStatus.PENDING },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      note: true,
      createdAt: true,
      account: { select: { displayName: true, realName: true, email: true } },
      character: {
        select: {
          id: true,
          name: true,
          realmName: true,
          className: true,
          _count: { select: { participation: true } },
        },
      },
    },
  });
}

/** Characters a member can still ask for, newest activity first. */
export async function loadClaimableCharacters(query: string, limit = 40) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  return prisma.character.findMany({
    where: {
      name: { contains: trimmed, mode: 'insensitive' },
      personId: null,
      participation: { some: {} },
    },
    orderBy: { lastSeenAt: 'desc' },
    take: limit,
    select: {
      id: true,
      name: true,
      realmName: true,
      className: true,
      lastSeenAt: true,
      _count: { select: { participation: true } },
    },
  });
}
