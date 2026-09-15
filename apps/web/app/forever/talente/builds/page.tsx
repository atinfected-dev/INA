import type { Metadata } from 'next';
import { BuildList } from '../../../../components/forever/build-list';
import { listBuilds, type BuildSort } from '../../../../lib/forever-builds';
import { FOREVER_MARK } from '../../../../lib/forever-art';
import { CLASS_DE, CLASS_EN, CLASS_SLUGS, classIcon, isClassSlug } from '../../../../lib/talents';
import { classVar } from '../../../../lib/wow';
import styles from '../../forever.module.css';
import local from '../talente.module.css';
import forms from '../../../../components/auth/form.module.css';

export const metadata: Metadata = { title: 'Builds — Talentrechner' };

type Search = Promise<Record<string, string | string[] | undefined>>;

const SORTS: { key: BuildSort; label: string }[] = [
  { key: 'score', label: 'Stimmen' },
  { key: 'views', label: 'Aufrufe' },
  { key: 'newest', label: 'Neueste' },
];

/** Every public build, sortable, optionally one class. */
export default async function BuildsPage({ searchParams }: { searchParams: Search }) {
  const search = await searchParams;
  const sort: BuildSort = search.sort === 'views' || search.sort === 'newest' ? search.sort : 'score';
  const klasse = typeof search.klasse === 'string' && isClassSlug(search.klasse) ? search.klasse : undefined;
  const builds = await listBuilds({ className: klasse, sort, limit: 100 });
  const voted = search.stimme === 'counted' ? 'Stimme gezählt.' : search.stimme === 'already' ? 'Du hast hier schon abgestimmt.' : null;

  const link = (next: { sort?: BuildSort; klasse?: string | null }) => {
    const params = new URLSearchParams();
    const s = next.sort ?? sort;
    const k = next.klasse === undefined ? klasse : next.klasse;
    if (s !== 'score') params.set('sort', s);
    if (k) params.set('klasse', k);
    const query = params.toString();
    return `/forever/talente/builds${query ? `?${query}` : ''}`;
  };

  return (
    <div className={styles.forever}>
      <section className={styles.section} style={{ marginTop: '1rem' }} aria-labelledby="all-builds">
        <div className={styles.sectionHead}>
          <h2 id="all-builds" className={styles.sectionTitle}>
            <img className={styles.mark} src={FOREVER_MARK} alt="" width={26} height={29} />
            {klasse ? `${CLASS_DE[klasse]}-Builds` : 'Alle Builds'}
          </h2>
          <a href="/forever/talente" className={styles.sectionLink}>
            ← Talentrechner
          </a>
        </div>

        <div className={local.classBar}>
          <a href={link({ klasse: null })} className={klasse ? local.classLink : local.classLinkActive}>
            Alle Klassen
          </a>
          {CLASS_SLUGS.map((slug) => (
            <a key={slug} href={link({ klasse: slug })} className={slug === klasse ? local.classLinkActive : local.classLink}>
              <img src={classIcon(slug)} alt="" width={18} height={18} />
              <span style={slug === klasse ? { color: classVar(CLASS_EN[slug]) } : undefined}>{CLASS_DE[slug]}</span>
            </a>
          ))}
        </div>

        <div className={local.sort} style={{ marginBottom: '1rem' }}>
          {SORTS.map((entry) => (
            <a key={entry.key} href={link({ sort: entry.key })} className={entry.key === sort ? local.sortActive : local.sortLink}>
              {entry.label}
            </a>
          ))}
        </div>

        {voted && <p className={forms.notice}>{voted}</p>}

        <BuildList builds={builds} back={link({})} empty="Noch keine Builds." />
      </section>
    </div>
  );
}
