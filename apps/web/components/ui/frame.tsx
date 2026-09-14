import type { ReactNode } from 'react';
import styles from './frame.module.css';

interface FrameProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Rendered on the right side of the header, e.g. filters or a link. */
  actions?: ReactNode;
  children: ReactNode;
  /** Removes body padding, for panels whose child is a full-bleed table. */
  flush?: boolean;
  className?: string;
  /**
   * URL of a raid painting to show behind the frame (see lib/zone-art.ts).
   * Ornate frames only — a working panel with a painting behind its table
   * would be exactly the gilded-row mistake this design avoids.
   */
  art?: string;
}

/**
 * The full WoW treatment: gold bevel, black fassung, corner fittings.
 *
 * Use for showcase surfaces — Hall of Fame, Guild Records, profile headers —
 * and for the outer shell of a page. Do not nest these; two gold frames inside
 * each other read as noise.
 */
export function OrnateFrame({
  title,
  subtitle,
  actions,
  children,
  flush = false,
  className,
  art,
}: FrameProps) {
  return (
    <section
      className={[styles.frame, art ? styles.painted : null, className].filter(Boolean).join(' ')}
    >
      <div className={styles.inner}>
        {art && (
          <>
            <div className={styles.art} style={{ backgroundImage: `url(${art})` }} />
            <div className={styles.artWash} />
          </>
        )}
        {(title || actions) && (
          <header className={styles.header}>
            <div>
              {title && <div className={styles.title}>{title}</div>}
              {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
            </div>
            {actions}
          </header>
        )}
        <div className={flush ? styles.bodyFlush : styles.body}>{children}</div>
      </div>
      <span className={`${styles.corner} ${styles.cornerTopLeft}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.cornerTopRight}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.cornerBottomLeft}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.cornerBottomRight}`} aria-hidden="true" />
    </section>
  );
}

/**
 * The restrained variant: same ground, a single thin gold keyline, no fittings.
 * This is what dense working pages use so the data stays in front.
 */
export function Panel({ title, subtitle, actions, children, flush = false, className }: FrameProps) {
  return (
    <section className={[styles.plain, className].filter(Boolean).join(' ')}>
      {(title || actions) && (
        <header className={styles.header}>
          <div>
            {title && <div className={styles.title}>{title}</div>}
            {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
          </div>
          {actions}
        </header>
      )}
      <div className={flush ? styles.bodyFlush : styles.body}>{children}</div>
    </section>
  );
}
