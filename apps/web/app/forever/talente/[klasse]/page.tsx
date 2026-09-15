import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BuildList } from '../../../../components/forever/build-list';
import { TalentCalculator } from '../../../../components/forever/talent-calculator';
import { countView, listBuilds, loadBuild } from '../../../../lib/forever-builds';
import { FOREVER_MARK } from '../../../../lib/forever-art';
import { isBuildCode } from '../../../../lib/talent-rules';
import { CLASS_DE, CLASS_EN, CLASS_SLUGS, classIcon, isClassSlug, loadClassTalents } from '../../../../lib/talents';
import { classVar } from '../../../../lib/wow';
import { saveBuildAction } from '../actions';
import styles from '../../forever.module.css';
import local from '../talente.module.css';
import forms from '../../../../components/auth/form.module.css';

type Params = Promise<{ klasse: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { klasse } = await params;
  if (!isClassSlug(klasse)) return { title: 'Talentrechner' };
  return {
    title: `${CLASS_DE[klasse]} — Talentrechner`,
    description: `Forever-Talentrechner für ${CLASS_DE[klasse]}: drei Bäume, 51 Punkte, Build als Link teilen.`,
  };
}

/**
 * One class: the calculator, and the builds others shared for it.
 *
 * `?t=` carries a build as digits, `?b=` opens a saved one (and counts the
 * visit). Outcomes of saving and voting come back as query parameters, the
 * way every other form on the site reports.
 */
export default async function ClassTalentsPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { klasse } = await params;
  if (!isClassSlug(klasse)) notFound();
  const search = await searchParams;

  const data = loadClassTalents(klasse);
  const buildId = typeof search.b === 'string' ? search.b : null;
  let code = typeof search.t === 'string' && isBuildCode(search.t) ? search.t : '';
  if (buildId) {
    const build = await loadBuild(buildId);
    if (build && build.className === klasse) {
      code = build.code;
      void countView(build.id).catch(() => undefined);
    }
  }

  const builds = await listBuilds({ className: klasse, sort: 'score', limit: 5 });
  const ok = search.ok === '1' ? 'Build veröffentlicht — er steht jetzt in der Liste.' : null;
  const error = typeof search.fehler === 'string' ? search.fehler : null;
  const voted = search.stimme === 'counted' ? 'Stimme gezählt.' : search.stimme === 'already' ? 'Du hast hier schon abgestimmt.' : null;
  const here = `/forever/talente/${klasse}${buildId ? `?b=${buildId}` : ''}`;

  return (
    <div className={styles.forever}>
      <div className={local.classBar}>
        {CLASS_SLUGS.map((slug) => (
          <a key={slug} href={`/forever/talente/${slug}`} className={slug === klasse ? local.classLinkActive : local.classLink}>
            <img src={classIcon(slug)} alt="" width={18} height={18} />
            <span style={slug === klasse ? { color: classVar(CLASS_EN[slug]) } : undefined}>{CLASS_DE[slug]}</span>
          </a>
        ))}
      </div>

      {ok && <p className={forms.notice}>{ok}</p>}
      {voted && <p className={forms.notice}>{voted}</p>}
      {error && <p className={forms.error}>{error}</p>}

      <TalentCalculator slug={klasse} data={data} initialCode={code} buildId={buildId} saveAction={saveBuildAction} />

      <section className={styles.section} aria-labelledby="class-builds">
        <div className={styles.sectionHead}>
          <h2 id="class-builds" className={styles.sectionTitle}>
            <img className={styles.mark} src={FOREVER_MARK} alt="" width={26} height={29} />
            Beliebte {CLASS_DE[klasse]}-Builds
          </h2>
          <a href={`/forever/talente/builds?klasse=${klasse}`} className={styles.sectionLink}>
            Alle {CLASS_DE[klasse]}-Builds →
          </a>
        </div>
        <BuildList builds={builds} back={here} empty="Noch kein Build für diese Klasse. Verteile Punkte und stell deinen ein." />
      </section>

      <p className={styles.footnote}>
        Daten: Deradon/wow-forever-talent-calc (MIT), gelesen aus dem BlizzCon-2026-Stream; Classic
        Era {data.classic.build} als Vergleich. Nur Rang 1 war zu sehen, höhere Ränge sind
        hochgerechnet; die Punkteregeln sind die von Classic. Talentnamen, Texte und Icons gehören
        Blizzard Entertainment.
      </p>
    </div>
  );
}
