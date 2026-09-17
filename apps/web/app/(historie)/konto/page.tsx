import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ClaimStatus } from '@ina/db';
import { OrnateFrame, Panel } from '../../../components/ui/frame';
import { PAGE_ART, zoneArt } from '../../../lib/zone-art';
import { PinForm, type PinOption } from '../../../components/achievements/pin-form';
import {
  MAX_PINNED,
  loadAchievementsForCharacterId,
  loadAchievementsForSubject,
} from '../../../lib/achievements';
import { savePinsAction } from './actions';
import { prisma } from '@ina/db';
import { ClassName, Divider } from '../../../components/ui/bits';
import { ClaimForm } from '../../../components/auth/forms';
import { getViewer } from '../../../lib/auth';
import { loadClaimableCharacters, loadMyClaims } from '../../../lib/claims';
import { changePasswordAction, claimAction, logoutAction, updateProfileAction } from './actions';
import styles from '../../../components/auth/form.module.css';

export const metadata: Metadata = { title: 'Mein Konto' };

const STATUS_LABEL: Record<ClaimStatus, string> = {
  PENDING: 'in Prüfung',
  APPROVED: 'bestätigt',
  REJECTED: 'abgelehnt',
};

const STATUS_COLOR: Record<ClaimStatus, string> = {
  PENDING: 'var(--warn)',
  APPROVED: 'var(--ok)',
  REJECTED: 'var(--danger)',
};

type Search = Record<string, string | string[] | undefined>;

export default async function AccountPage({ searchParams }: { searchParams: Promise<Search> }) {
  const viewer = await getViewer();
  if (!viewer) redirect('/anmelden');

  const search = await searchParams;
  const raw = search.suche;
  const query = (Array.isArray(raw) ? raw[0] : raw) ?? '';
  const settingsOk = typeof search.ok === 'string' ? search.ok : null;
  const settingsError = typeof search.fehler === 'string' ? search.fehler : null;

  const [claims, candidates] = await Promise.all([
    loadMyClaims(viewer.id),
    loadClaimableCharacters(query),
  ]);

  const approved = claims.filter((claim) => claim.status === ClaimStatus.APPROVED);

  // Straight to the person where one exists — the achievements belong to the
  // raider, not to whichever character happens to be first in the list. Going
  // through a NAME here once answered with a stranger who shares one.
  const standing = viewer.personId
    ? await loadAchievementsForSubject(viewer.personId)
    : approved[0]
      ? await loadAchievementsForCharacterId(approved[0].character.id)
      : null;
  const account = await prisma.account.findUnique({
    where: { id: viewer.id },
    select: { pinnedAchievements: true },
  });

  const pinOptions: PinOption[] = (standing?.earned ?? [])
    .filter((entry) => entry.tier !== null)
    .map((entry) => ({
      id: entry.definition.id,
      name: entry.definition.name,
      tier: entry.tier!,
      share: entry.share,
    }));

  return (
    <>
      <OrnateFrame
        art={PAGE_ART.account}
        title={viewer.displayName}
        subtitle={[viewer.realName, viewer.email, viewer.isAdmin ? 'Offizier' : null]
          .filter(Boolean)
          .join(' · ')}
      >
        <p style={{ marginTop: 0, color: 'var(--text-secondary)' }}>
          {approved.length === 0
            ? 'Noch keine bestätigten Charaktere. Suche unten nach deinem Charakter und stelle einen Antrag.'
            : `${approved.length} bestätigte ${approved.length === 1 ? 'Charakter' : 'Charaktere'}.`}
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <a href="#einstellungen" className={styles.small}>
            Kontodaten ändern
          </a>
          {viewer.isAdmin && (
            <a href="/admin/claims" className={styles.small}>
              Anträge prüfen
            </a>
          )}
          {viewer.isAdmin && (
            <a href="/admin/konten" className={styles.small}>
              Konten verwalten
            </a>
          )}
          <form action={logoutAction}>
            <button type="submit" className={styles.small}>
              Abmelden
            </button>
          </form>
        </div>
      </OrnateFrame>

      <Divider label="Kontodaten" />

      <div id="einstellungen" />
      {settingsOk && <p className={styles.notice}>{settingsOk}</p>}
      {settingsError && <p className={styles.error}>{settingsError}</p>}

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(min(22rem, 100%), 1fr))' }}>
        <Panel title="Profil" subtitle="Anzeigename ist öffentlich, Klarname nur für angemeldete Mitglieder">
          <form action={updateProfileAction} className={styles.form}>
            <label className={styles.field}>
              <span className={styles.label}>Anzeigename</span>
              <input className={styles.input} name="displayName" required minLength={2} maxLength={40} defaultValue={viewer.displayName} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Klarname</span>
              <input className={styles.input} name="realName" maxLength={80} defaultValue={viewer.realName ?? ''} placeholder="optional" />
              <span className={styles.hint}>Sehen nur angemeldete Mitglieder — nie die öffentlichen Seiten.</span>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>E-Mail-Adresse</span>
              <input className={styles.input} name="email" type="email" required defaultValue={viewer.email} />
              <span className={styles.hint}>Damit meldest du dich an. Eine Bestätigungsmail gibt es nicht — prüf die Schreibweise.</span>
            </label>
            <button type="submit" className={styles.submit}>
              Speichern
            </button>
          </form>
        </Panel>

        <Panel title="Passwort" subtitle="Mindestens 12 Zeichen">
          <form action={changePasswordAction} className={styles.form}>
            <label className={styles.field}>
              <span className={styles.label}>Aktuelles Passwort</span>
              <input className={styles.input} name="current" type="password" required autoComplete="current-password" />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Neues Passwort</span>
              <input className={styles.input} name="next" type="password" required minLength={12} autoComplete="new-password" />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Neues Passwort wiederholen</span>
              <input className={styles.input} name="repeat" type="password" required minLength={12} autoComplete="new-password" />
            </label>
            <button type="submit" className={styles.submit}>
              Passwort ändern
            </button>
          </form>
        </Panel>
      </div>

      <Divider label="Meine Charaktere" />

      <Panel title="Anträge und Zuordnungen">
        {claims.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Noch keine Anträge gestellt.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: '0.5rem' }}>
            {claims.map((claim) => (
              <li
                key={claim.id}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'baseline',
                  flexWrap: 'wrap',
                }}
              >
                <a href={`/players/${encodeURIComponent(claim.character.name)}`}>
                  <ClassName name={claim.character.name} className={claim.character.className} />
                </a>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  {claim.character.realmName}
                </span>
                <span style={{ color: STATUS_COLOR[claim.status], fontSize: '0.85rem' }}>
                  {STATUS_LABEL[claim.status]}
                </span>
                {claim.decisionNote && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    — {claim.decisionNote}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Divider label="Angepinnte Erfolge" />

      <Panel
        title="Profil-Auswahl"
        subtitle={`Bis zu ${MAX_PINNED} Erfolge stehen oben auf deinem Profil`}
      >
        {approved.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Erst einen Charakter beanspruchen — danach lassen sich Erfolge anpinnen.
          </p>
        ) : pinOptions.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Noch keine Erfolge errungen. Sie erscheinen hier, sobald die erste Stufe erreicht ist.
          </p>
        ) : (
          <PinForm
            action={savePinsAction}
            options={pinOptions}
            selected={account?.pinnedAchievements ?? []}
            max={MAX_PINNED}
          />
        )}
      </Panel>

      <Divider label="Charakter beanspruchen" />

      <Panel title="Suche">
        <form method="get" action="/konto" className={styles.inlineForm}>
          <input
            className={styles.input}
            type="search"
            name="suche"
            defaultValue={query}
            placeholder="Charaktername, mindestens 2 Zeichen"
            style={{ minWidth: '16rem' }}
          />
          <button type="submit" className={styles.small}>
            Suchen
          </button>
        </form>

        {query.trim().length >= 2 && candidates.length === 0 && (
          <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>
            Keine freien Charaktere gefunden. Bereits zugeordnete Charaktere erscheinen hier nicht.
          </p>
        )}

        {candidates.length > 0 && (
          <ul
            style={{
              margin: '0.8rem 0 0',
              paddingLeft: 0,
              listStyle: 'none',
              display: 'grid',
              gap: '0.7rem',
            }}
          >
            {candidates.map((character) => (
              <li key={character.id} style={{ display: 'grid', gap: '0.3rem' }}>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'baseline' }}>
                  <ClassName name={character.name} className={character.className} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {character.realmName} · {character._count.participation.toLocaleString('de-DE')}{' '}
                    Pulls
                    {character.lastSeenAt
                      ? ` · zuletzt ${character.lastSeenAt.toLocaleDateString('de-DE')}`
                      : ''}
                  </span>
                </div>
                <ClaimForm
                  action={claimAction}
                  characterId={character.id}
                  characterName={character.name}
                />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
