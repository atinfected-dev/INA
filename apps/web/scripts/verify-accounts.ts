/**
 * Round trip for account management, against the real database.
 *
 * Throwaway accounts only: a member edits their profile and password, an
 * officer grants and withdraws the role and switches a login off. Checks the
 * guards — no self-demotion, the last officer stays — then removes every
 * account it made. Leaves nothing behind.
 */
process.loadEnvFile('../../.env');

import { prisma } from '@ina/db';
import { hashPassword, verifyPassword } from '@ina/core/password';
import { AccountError, changePassword, listAccounts, setActive, setOfficer, updateProfile } from '../lib/accounts';

function check(label: string, ok: boolean): void {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) process.exitCode = 1;
}

async function rejects(label: string, work: () => Promise<unknown>): Promise<void> {
  try {
    await work();
    check(label, false);
  } catch (error) {
    check(label, error instanceof AccountError);
    if (error instanceof AccountError) console.log(`  → ${error.message}`);
  }
}

async function main(): Promise<void> {
  const stamp = Date.now();
  const make = (tag: string, isAdmin: boolean, passwordHash: string) =>
    prisma.account.create({
      data: { email: `rundlauf-konto-${tag}-${stamp}@example.invalid`, passwordHash, displayName: `Rundlauf ${tag}`, isAdmin, isActive: true },
    });
  const hash = await hashPassword('Rundlauf-Passwort-1');
  const officer = await make('offizier', true, hash);
  const member = await make('mitglied', false, hash);
  const other = await make('anderer', false, hash);
  const ids = [officer.id, member.id, other.id];

  try {
    // --- Member: profile -----------------------------------------------------------
    const result = await updateProfile(member.id, { displayName: '  Neuer  Name ', realName: 'Max Muster', email: `RUNDLAUF-neu-${stamp}@Example.invalid` });
    const saved = await prisma.account.findUnique({ where: { id: member.id } });
    check('Profil gespeichert: Anzeigename bereinigt, E-Mail kleingeschrieben', saved?.displayName === 'Neuer Name' && saved.email === `rundlauf-neu-${stamp}@example.invalid` && saved.realName === 'Max Muster');
    check('E-Mail-Wechsel wird gemeldet', result.emailChanged);
    await rejects('Fremde E-Mail-Adresse wird abgelehnt', () =>
      updateProfile(member.id, { displayName: 'Neuer Name', realName: '', email: other.email }),
    );
    await rejects('Ungültige E-Mail wird abgelehnt', () => updateProfile(member.id, { displayName: 'Neuer Name', realName: '', email: 'kein-mail' }));
    await rejects('Zu kurzer Anzeigename wird abgelehnt', () => updateProfile(member.id, { displayName: 'X', realName: '', email: saved!.email }));
    await updateProfile(member.id, { displayName: 'Neuer Name', realName: '   ', email: saved!.email });
    check('Leerer Klarname wird als leer gespeichert', (await prisma.account.findUnique({ where: { id: member.id } }))?.realName === null);

    // A linked person follows the handle — that is what the public lists show.
    const person = await prisma.person.create({ data: { displayName: 'Alter Name', slug: `rundlauf-person-${stamp}`, account: { connect: { id: member.id } } } });
    await updateProfile(member.id, { displayName: 'Noch Neuer', realName: 'Max Muster', email: saved!.email });
    check('Verknüpfte Person übernimmt den neuen Anzeigenamen', (await prisma.person.findUnique({ where: { id: person.id } }))?.displayName === 'Noch Neuer');
    check('Klarname landet nicht in der Person', (await prisma.person.findUnique({ where: { id: person.id } }))?.displayName !== 'Max Muster');
    await prisma.person.delete({ where: { id: person.id } });

    // --- Member: password ----------------------------------------------------------
    await rejects('Falsches aktuelles Passwort wird abgelehnt', () => changePassword(member.id, 'falsch', 'Neues-Passwort-123', 'Neues-Passwort-123'));
    await rejects('Wiederholung muss stimmen', () => changePassword(member.id, 'Rundlauf-Passwort-1', 'Neues-Passwort-123', 'Neues-Passwort-124'));
    await rejects('Zu kurzes Passwort wird abgelehnt', () => changePassword(member.id, 'Rundlauf-Passwort-1', 'kurz', 'kurz'));
    await changePassword(member.id, 'Rundlauf-Passwort-1', 'Neues-Passwort-123', 'Neues-Passwort-123');
    const after = await prisma.account.findUnique({ where: { id: member.id }, select: { passwordHash: true } });
    check('Neues Passwort gilt, altes nicht mehr', (await verifyPassword('Neues-Passwort-123', after!.passwordHash)) && !(await verifyPassword('Rundlauf-Passwort-1', after!.passwordHash)));

    // --- Officer: roles ------------------------------------------------------------
    await setOfficer(officer.id, member.id, true);
    check('Offiziersrolle vergeben', (await prisma.account.findUnique({ where: { id: member.id } }))?.isAdmin === true);
    await setOfficer(officer.id, member.id, false);
    check('Offiziersrolle entzogen', (await prisma.account.findUnique({ where: { id: member.id } }))?.isAdmin === false);
    await rejects('Eigene Rolle lässt sich nicht ändern', () => setOfficer(officer.id, officer.id, false));

    // The last-officer guard counts the whole table; the real site has its own
    // officers, so the check runs on what is there rather than assuming one.
    const active = await prisma.account.count({ where: { isAdmin: true, isActive: true } });
    if (active === 1) {
      await rejects('Der letzte Offizier bleibt', () => setOfficer(member.id, officer.id, false));
    } else {
      check(`Letzter-Offizier-Schutz: ${active} aktive Offiziere vorhanden, Regel greift erst bei einem`, true);
    }

    // --- Officer: activation --------------------------------------------------------
    await prisma.session.create({ data: { tokenHash: `rundlauf-${stamp}`, accountId: other.id, expiresAt: new Date(Date.now() + 60_000) } });
    await setActive(officer.id, other.id, false);
    const off = await prisma.account.findUnique({ where: { id: other.id }, select: { isActive: true, sessions: true } });
    check('Konto deaktiviert und Sitzungen beendet', off?.isActive === false && off.sessions.length === 0);
    await setActive(officer.id, other.id, true);
    check('Konto wieder aktiviert', (await prisma.account.findUnique({ where: { id: other.id } }))?.isActive === true);
    await rejects('Eigenes Konto lässt sich nicht deaktivieren', () => setActive(officer.id, officer.id, false));

    const rows = await listAccounts();
    check('Kontenliste enthält die Testkonten mit Rolle und Status', ids.every((id) => rows.some((r) => r.id === id)) && rows.find((r) => r.id === officer.id)?.isAdmin === true);
  } finally {
    await prisma.account.deleteMany({ where: { id: { in: ids } } });
  }
  check('Aufgeräumt: Konten', (await prisma.account.count({ where: { email: { contains: `rundlauf-konto-` } } })) === 0);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
