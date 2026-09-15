'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  LEGACY_RULES,
  LEGACY_TREE,
  decodeLegacy,
  encodeLegacy,
  legacyIconUrl,
  legacySpent,
  type LegacyNode,
  type LegacyRanks,
} from '../../lib/forever-legacy';
import styles from './legacy-tree.module.css';

/**
 * The Legacy tree as a planner: three columns, 16 points to place.
 *
 * No prerequisites are known, so the only rule is the launch cap; the code
 * in the address bar is one digit per node, the same way talent builds work.
 */
export function LegacyTree({ initialCode }: { initialCode: string }) {
  const [ranks, setRanks] = useState<LegacyRanks>(() => decodeLegacy(initialCode));
  const [copied, setCopied] = useState(false);
  const spent = legacySpent(ranks);
  const left = LEGACY_RULES.spendableAtLaunch - spent;
  const code = useMemo(() => encodeLegacy(ranks), [ranks]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (code === '') url.searchParams.delete('lp');
    else url.searchParams.set('lp', code);
    window.history.replaceState(null, '', url.toString());
  }, [code]);

  const change = (node: LegacyNode, delta: number) => {
    if (!node.effect) return;
    setRanks((current) => {
      const now = current[node.id] ?? 0;
      const next = Math.max(0, Math.min(node.ranks, now + delta));
      if (next > now && legacySpent(current) + (next - now) > LEGACY_RULES.spendableAtLaunch) return current;
      const copy = { ...current };
      if (next === 0) delete copy[node.id];
      else copy[node.id] = next;
      return copy;
    });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Link:', window.location.href);
    }
  };

  return (
    <div>
      <div className={styles.bar}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Legacy-Punkte übrig</span>
          <span className={styles.statValue}>
            {left} <span className={styles.statOf}>/ {LEGACY_RULES.spendableAtLaunch}</span>
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Verteilung</span>
          <span className={styles.statValue}>
            {LEGACY_TREE.map((c, i) => (
              <span key={c.id}>
                {i > 0 && <span className={styles.statOf}> / </span>}
                {c.nodes.reduce((n, node) => n + (ranks[node.id] ?? 0), 0)}
              </span>
            ))}
          </span>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={copyLink}>
            {copied ? 'Kopiert ✓' : 'Link kopieren'}
          </button>
          <button type="button" className={styles.btnQuiet} onClick={() => setRanks({})} disabled={spent === 0}>
            Zurücksetzen
          </button>
        </div>
      </div>

      <div className={styles.columns}>
        {LEGACY_TREE.map((category) => (
          <section key={category.id} className={styles.column} aria-label={category.name}>
            <header className={styles.head}>
              <img src={legacyIconUrl(category.icon)} alt="" width={30} height={30} className={styles.headIcon} />
              <div>
                <h2 className={styles.headName}>{category.name}</h2>
                <p className={styles.headTag}>{category.tagline}</p>
              </div>
              <span className={styles.headPoints}>{category.nodes.reduce((n, node) => n + (ranks[node.id] ?? 0), 0)}</span>
            </header>
            <ul className={styles.nodes}>
              {category.nodes.map((node) => {
                const rank = ranks[node.id] ?? 0;
                const known = Boolean(node.effect);
                const state = !known ? styles.unknown : rank >= node.ranks ? styles.maxed : rank > 0 ? styles.partial : left > 0 ? styles.available : styles.locked;
                return (
                  <li key={node.id} className={`${styles.node} ${state}`}>
                    <button
                      type="button"
                      className={styles.nodeBtn}
                      onClick={(e) => change(node, e.shiftKey ? node.ranks : 1)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        change(node, -1);
                      }}
                      disabled={!known}
                      aria-label={`${node.name}, Rang ${rank} von ${node.ranks}`}
                    >
                      <img src={legacyIconUrl(node.icon)} alt="" width={40} height={40} />
                      <span className={styles.rank}>
                        {rank}/{node.ranks}
                      </span>
                    </button>
                    <div className={styles.body}>
                      <div className={styles.name}>{node.name}</div>
                      <p className={styles.effect}>
                        {node.effect ?? 'Platzhalter — „wird mit späterem Inhalt ergänzt", so stand es auch im Spiel.'}
                      </p>
                      {node.note && <p className={styles.note}>{node.note}</p>}
                      {known && (
                        <div className={styles.controls}>
                          <button type="button" className={styles.mini} onClick={() => change(node, -1)} disabled={rank === 0}>
                            −
                          </button>
                          <button type="button" className={styles.mini} onClick={() => change(node, 1)} disabled={rank >= node.ranks || left === 0}>
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
