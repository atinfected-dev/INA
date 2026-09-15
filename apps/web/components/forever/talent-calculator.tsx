'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  add,
  blockedReason,
  canRemove,
  decodeBuild,
  encodeBuild,
  pointsIn,
  pointsTotal,
  remove,
  requiredLevel,
  resetTree,
  type ClassTalents,
  type Ranks,
  type Talent,
  type Tree,
} from '../../lib/talent-rules';
import { CLASS_DE, CLASS_EN, talentIconUrl, treeLabel, type ClassSlug } from '../../lib/talents';
import { classVar } from '../../lib/wow';
import styles from './talent-calculator.module.css';

/**
 * The talent calculator.
 *
 * Three trees side by side, the Classic rules underneath (lib/talent-rules),
 * and the whole build in the address bar so a link is the build. Left click
 * adds a point, right click takes one back, shift-click fills a talent,
 * ctrl-click empties it; on touch a tap opens the tooltip with its own
 * plus and minus. "Classic-Original" swaps in the Classic Era trees for
 * comparison — that view is read-only, the Forever build stays untouched.
 */

interface Props {
  slug: ClassSlug;
  data: ClassTalents;
  initialCode: string;
  /** A saved build that was opened, if any — kept in the link. */
  buildId: string | null;
  /** Server action that stores a public build. */
  saveAction: (formData: FormData) => Promise<void>;
}

const ROWS = 7;
const COLS = 4;

const STATUS_FLAG: Record<string, { mark: string; label: string; className: string }> = {
  new: { mark: '★', label: 'Neu in Forever', className: styles.flagNew ?? '' },
  changed: { mark: '◆', label: 'In Forever geändert', className: styles.flagChanged ?? '' },
  moved: { mark: '↕', label: 'Verschoben', className: styles.flagMoved ?? '' },
  removed: { mark: '✕', label: 'In Forever entfernt', className: styles.flagRemoved ?? '' },
};

interface Tip {
  tree: Tree;
  talent: Talent;
  x: number;
  y: number;
  pinned: boolean;
}

function cellCenter(rect: DOMRect | null, row: number, col: number): { x: number; y: number } {
  if (!rect) return { x: 0, y: 0 };
  return { x: ((col + 0.5) / COLS) * rect.width, y: ((row + 0.5) / ROWS) * rect.height };
}

export function TalentCalculator({ slug, data, initialCode, buildId, saveAction }: Props) {
  const { rules } = data;
  const [ranks, setRanks] = useState<Ranks>(() => decodeBuild(data.trees, rules, initialCode));
  const [classicView, setClassicView] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  const trees = classicView ? data.classic.trees : data.trees;
  const spent = pointsTotal(data.trees, ranks);
  const left = rules.maxPoints - spent;
  const level = requiredLevel(rules, spent);
  const code = useMemo(() => encodeBuild(data.trees, ranks), [data.trees, ranks]);

  // The link is the build: keep the address bar in step without adding
  // history entries for every click.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (code === '') url.searchParams.delete('t');
    else url.searchParams.set('t', code);
    if (buildId && url.searchParams.get('b') && encodeBuild(data.trees, decodeBuild(data.trees, rules, initialCode)) !== code) {
      // The visitor changed a saved build: the link now describes their own.
      url.searchParams.delete('b');
    }
    window.history.replaceState(null, '', url.toString());
  }, [code, buildId, data.trees, rules, initialCode]);

  const shareUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('t', code);
    return url.toString();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Build-Link:', shareUrl());
    }
  };

  const modify = useCallback(
    (tree: Tree, talent: Talent, action: 'add' | 'remove' | 'max' | 'clear') => {
      if (classicView) return;
      setRanks((current) => {
        switch (action) {
          case 'add':
            return add(data.trees, rules, current, tree, talent);
          case 'remove':
            return remove(tree, rules, current, talent);
          case 'max':
            return add(data.trees, rules, current, tree, talent, talent.maxRank);
          case 'clear':
            return remove(tree, rules, current, talent, talent.maxRank);
        }
      });
    },
    [classicView, data.trees, rules],
  );

  const onClick = (event: React.MouseEvent, tree: Tree, talent: Talent) => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) modify(tree, talent, 'clear');
    else if (event.shiftKey) modify(tree, talent, 'max');
    else modify(tree, talent, 'add');
  };

  const onContextMenu = (event: React.MouseEvent, tree: Tree, talent: Talent) => {
    event.preventDefault();
    modify(tree, talent, 'remove');
  };

  const showTip = (event: React.PointerEvent, tree: Tree, talent: Talent) => {
    if (event.pointerType === 'touch') return;
    setTip({ tree, talent, x: event.clientX, y: event.clientY, pinned: false });
  };

  const moveTip = (event: React.PointerEvent) => {
    if (event.pointerType === 'touch') return;
    setTip((current) => (current && !current.pinned ? { ...current, x: event.clientX, y: event.clientY } : current));
  };

  const hideTip = () => setTip((current) => (current?.pinned ? current : null));

  const onPointerUp = (event: React.PointerEvent, tree: Tree, talent: Talent) => {
    if (event.pointerType !== 'touch') return;
    event.preventDefault();
    setTip((current) =>
      current?.pinned && current.talent.id === talent.id
        ? null
        : { tree, talent, x: event.clientX, y: event.clientY, pinned: true },
    );
  };

  useEffect(() => {
    if (!tip?.pinned) return;
    const close = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest(`.${styles.tip}`) || target.closest(`.${styles.node}`)) return;
      setTip(null);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [tip?.pinned]);

  const classEn = CLASS_EN[slug];

  return (
    <div className={styles.calc}>
      <div className={styles.bar}>
        <div className={styles.barTitle} style={{ color: classVar(classEn) }}>
          {CLASS_DE[slug]}
          <span className={styles.barSub}>{classicView ? `Classic Era ${data.classic.build}` : 'Forever'}</span>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Punkte übrig</span>
            <span className={styles.statValue}>{left}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Benötigte Stufe</span>
            <span className={styles.statValue}>{level}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Verteilung</span>
            <span className={styles.statValue}>
              {data.trees.map((tree, i) => (
                <span key={tree.id}>
                  {i > 0 && <span className={styles.slash}> / </span>}
                  {pointsIn(tree, ranks)}
                </span>
              ))}
            </span>
          </div>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={copyLink}>
            {copied ? 'Kopiert ✓' : 'Build-Link kopieren'}
          </button>
          <button type="button" className={styles.btnQuiet} onClick={() => setRanks({})}>
            Alle zurücksetzen
          </button>
          <label className={styles.switch}>
            <input type="checkbox" checked={classicView} onChange={(e) => setClassicView(e.target.checked)} />
            <span>Classic-Original zeigen</span>
          </label>
          <label className={styles.switch}>
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
            <span>Privater Build</span>
          </label>
        </div>
      </div>

      <div className={styles.trees}>
        {trees.map((tree) => (
          <TreePanel
            key={`${classicView ? 'c' : 'f'}-${tree.id}`}
            tree={tree}
            trees={trees}
            rules={rules}
            ranks={classicView ? {} : ranks}
            readOnly={classicView}
            onReset={() => setRanks((current) => resetTree(tree, current))}
            onClick={onClick}
            onContextMenu={onContextMenu}
            onPointerEnter={showTip}
            onPointerMove={moveTip}
            onPointerLeave={hideTip}
            onPointerUp={onPointerUp}
          />
        ))}
      </div>

      <div className={styles.legend}>
        <span>
          <i className={`${styles.flag} ${styles.flagNew}`}>★</i> neu in Forever
        </span>
        <span>
          <i className={`${styles.flag} ${styles.flagChanged}`}>◆</i> geändert
        </span>
        <span>
          <i className={`${styles.flag} ${styles.flagMoved}`}>↕</i> verschoben
        </span>
        <span>
          <i className={`${styles.flag} ${styles.flagRemoved}`}>✕</i> nur in Classic
        </span>
        <span className={styles.legendHint}>
          Linksklick +1 · Rechtsklick −1 · Shift-Klick voll · Strg-Klick leer
        </span>
      </div>

      {!classicView && (
        <SaveBuild slug={slug} code={code} spent={spent} isPrivate={isPrivate} shareUrl={shareUrl} action={saveAction} />
      )}

      {tip && (
        <Tooltip
          tip={tip}
          rules={rules}
          trees={trees}
          ranks={classicView ? {} : ranks}
          readOnly={classicView}
          onAdd={() => modify(tip.tree, tip.talent, 'add')}
          onRemove={() => modify(tip.tree, tip.talent, 'remove')}
          onClose={() => setTip(null)}
        />
      )}
    </div>
  );
}

// --- One tree ---------------------------------------------------------------------

interface TreeProps {
  tree: Tree;
  trees: Tree[];
  rules: ClassTalents['rules'];
  ranks: Ranks;
  readOnly: boolean;
  onReset: () => void;
  onClick: (event: React.MouseEvent, tree: Tree, talent: Talent) => void;
  onContextMenu: (event: React.MouseEvent, tree: Tree, talent: Talent) => void;
  onPointerEnter: (event: React.PointerEvent, tree: Tree, talent: Talent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerLeave: () => void;
  onPointerUp: (event: React.PointerEvent, tree: Tree, talent: Talent) => void;
}

function TreePanel({
  tree,
  trees,
  rules,
  ranks,
  readOnly,
  onReset,
  onClick,
  onContextMenu,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onPointerUp,
}: TreeProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const element = bodyRef.current;
    if (!element) return;
    const update = () => setRect(element.getBoundingClientRect());
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const spent = pointsIn(tree, ranks);
  const byId = new Map(tree.talents.map((t) => [t.id, t]));

  return (
    <section className={styles.tree} aria-label={treeLabel(tree.id, tree.name)}>
      <header className={styles.treeHead}>
        {tree.icon && <img src={talentIconUrl(tree.icon)} alt="" width={30} height={30} className={styles.treeIcon} />}
        <h2 className={styles.treeName}>
          {treeLabel(tree.id, tree.name)}
          <span className={styles.treeNameEn}>{tree.name}</span>
        </h2>
        <span className={styles.treePoints}>{spent}</span>
        {!readOnly && (
          <button type="button" className={styles.treeReset} onClick={onReset} disabled={spent === 0}>
            Zurücksetzen
          </button>
        )}
      </header>
      <div className={styles.treeBody} ref={bodyRef}>
        <svg className={styles.arrows} aria-hidden="true">
          {tree.talents
            .filter((t) => t.requires && byId.has(t.requires.talent))
            .map((t) => {
              const from = byId.get(t.requires!.talent)!;
              const a = cellCenter(rect, from.row, from.col);
              const b = cellCenter(rect, t.row, t.col);
              const met = (ranks[from.id] ?? 0) >= t.requires!.rank;
              return (
                <g key={t.id} className={met ? styles.arrowActive : styles.arrow}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={styles.arrowHalo} />
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={styles.arrowLine} />
                </g>
              );
            })}
        </svg>
        <div className={styles.grid}>
          {tree.talents.map((talent) => {
            const rank = ranks[talent.id] ?? 0;
            const blocked = readOnly ? 'readonly' : blockedReason(trees, rules, ranks, tree, talent);
            const state =
              rank >= talent.maxRank
                ? styles.maxed
                : rank > 0
                  ? styles.partial
                  : blocked === null || blocked === 'no-points'
                    ? styles.available
                    : styles.locked;
            const flag = talent.status ? STATUS_FLAG[talent.status] : undefined;
            return (
              <div
                key={talent.id}
                className={styles.node}
                style={{ gridRow: talent.row + 1, gridColumn: talent.col + 1 }}
              >
                <div className={styles.nodeInner}>
                  <button
                    type="button"
                    className={`${styles.nodeBtn} ${state}`}
                    aria-label={`${talent.name}, Rang ${rank} von ${talent.maxRank}`}
                    onClick={(e) => onClick(e, tree, talent)}
                    onContextMenu={(e) => onContextMenu(e, tree, talent)}
                    onPointerEnter={(e) => onPointerEnter(e, tree, talent)}
                    onPointerMove={onPointerMove}
                    onPointerLeave={onPointerLeave}
                    onPointerUp={(e) => onPointerUp(e, tree, talent)}
                  >
                    <img src={talentIconUrl(talent.icon)} alt="" width={44} height={44} loading="lazy" draggable={false} />
                  </button>
                  <span className={styles.rank} aria-hidden="true">
                    {rank}/{talent.maxRank}
                  </span>
                  {flag && (
                    <i className={`${styles.flag} ${flag.className}`} title={flag.label} aria-hidden="true">
                      {flag.mark}
                    </i>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// --- Tooltip -------------------------------------------------------------------------

function Tooltip({
  tip,
  rules,
  trees,
  ranks,
  readOnly,
  onAdd,
  onRemove,
  onClose,
}: {
  tip: Tip;
  rules: ClassTalents['rules'];
  trees: Tree[];
  ranks: Ranks;
  readOnly: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const { tree, talent } = tip;
  const rank = ranks[talent.id] ?? 0;
  const shown = Math.max(rank, 1);
  const blocked = readOnly ? null : blockedReason(trees, rules, ranks, tree, talent);
  const needsRow = talent.row * rules.pointsPerRow;
  const prereq = talent.requires ? tree.talents.find((t) => t.id === talent.requires!.talent) : undefined;

  // Keep the card on screen: to the right of the pointer, flipped when it
  // would leave the viewport.
  const width = 320;
  const x = typeof window !== 'undefined' && tip.x + width + 24 > window.innerWidth ? tip.x - width - 12 : tip.x + 14;
  const y = typeof window !== 'undefined' ? Math.min(tip.y + 12, window.innerHeight - 260) : tip.y;

  return (
    <div className={`${styles.tip} ${tip.pinned ? styles.tipPinned : ''}`} style={{ left: Math.max(8, x), top: Math.max(8, y) }}>
      <div className={styles.tipTitle}>
        <span>{talent.name}</span>
        <span className={styles.tipRank}>
          Rang {rank}/{talent.maxRank}
        </span>
      </div>
      {needsRow > 0 && (
        <div className={pointsIn(tree, ranks) - (ranks[talent.id] ?? 0) >= needsRow || rank > 0 ? styles.tipMeta : styles.tipReq}>
          Erfordert {needsRow} Punkte in {treeLabel(tree.id, tree.name)}
        </div>
      )}
      {prereq && (
        <div className={(ranks[prereq.id] ?? 0) >= talent.requires!.rank ? styles.tipMeta : styles.tipReq}>
          Erfordert {talent.requires!.rank} {talent.requires!.rank === 1 ? 'Punkt' : 'Punkte'} in {prereq.name}
        </div>
      )}
      <p className={styles.tipDesc}>{talent.ranks[shown - 1]}</p>
      {rank > 0 && rank < talent.maxRank && (
        <div className={styles.tipNext}>
          <span className={styles.tipLabel}>Nächster Rang</span>
          <p className={styles.tipDesc}>{talent.ranks[rank]}</p>
        </div>
      )}
      {talent.classic && (
        <div className={styles.tipClassic}>
          <span className={styles.tipLabel}>Classic Era</span>
          {talent.classic.name !== talent.name && <strong>{talent.classic.name}: </strong>}
          {talent.classic.ranks[0]}
          {talent.classic.maxRank !== talent.maxRank && ` (${talent.classic.maxRank} Ränge)`}
        </div>
      )}
      {talent.status && STATUS_FLAG[talent.status] && (
        <div className={styles.tipStatus}>
          <i className={`${styles.flag} ${STATUS_FLAG[talent.status]!.className}`}>{STATUS_FLAG[talent.status]!.mark}</i>
          {STATUS_FLAG[talent.status]!.label}
        </div>
      )}
      {talent.caveats && (
        <div className={styles.tipCaveat}>
          {talent.caveats.includes('ranks') && 'Ränge 2+ aus dem Classic-Muster hochgerechnet — nur Rang 1 war im Stream zu sehen. '}
          {talent.caveats.includes('reading') && 'Unsichere Lesung aus dem Stream.'}
        </div>
      )}
      {!readOnly && blocked === 'no-points' && <div className={styles.tipHint}>Keine Punkte mehr übrig.</div>}
      {tip.pinned && !readOnly && (
        <div className={styles.tipButtons}>
          <button type="button" className={styles.btnQuiet} onClick={onRemove} disabled={!canRemove(tree, rules, ranks, talent)}>
            −
          </button>
          <button type="button" className={styles.btn} onClick={onAdd} disabled={blocked !== null}>
            +
          </button>
          <button type="button" className={styles.btnQuiet} onClick={onClose}>
            Schließen
          </button>
        </div>
      )}
    </div>
  );
}

// --- Saving ------------------------------------------------------------------------

function SaveBuild({
  slug,
  code,
  spent,
  isPrivate,
  shareUrl,
  action,
}: {
  slug: ClassSlug;
  code: string;
  spent: number;
  isPrivate: boolean;
  shareUrl: () => string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [link, setLink] = useState('');
  useEffect(() => setLink(shareUrl()), [code, shareUrl]);

  if (isPrivate) {
    return (
      <div className={styles.save}>
        <p className={styles.saveHint}>
          Privater Build: nichts wird gespeichert. Der Link enthält den ganzen Build —{' '}
          <code className={styles.code}>{code}</code>
        </p>
      </div>
    );
  }

  return (
    <form className={styles.save} action={action}>
      <input type="hidden" name="className" value={slug} />
      <input type="hidden" name="code" value={code} />
      <label className={styles.saveField}>
        <span className={styles.statLabel}>Build veröffentlichen</span>
        <input
          name="title"
          className={styles.saveInput}
          maxLength={60}
          minLength={3}
          required
          placeholder="Name des Builds, z. B. „Furor-Raid ab Stufe 60“"
        />
      </label>
      <button type="submit" className={styles.btn} disabled={spent < 5}>
        In die Bestenliste stellen
      </button>
      <p className={styles.saveHint}>
        Öffentliche Builds erscheinen in der Liste, sortierbar nach Aufrufen und Stimmen. Link:{' '}
        <code className={styles.code}>{link || '…'}</code>
      </p>
    </form>
  );
}
