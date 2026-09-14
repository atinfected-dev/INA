'use client';

import { useEffect, useState } from 'react';
import styles from './cookie-notice.module.css';

/**
 * The cookie notice.
 *
 * Honest about what there is: one cookie, `ina_session`, set only when
 * someone signs in, holding an opaque session id. No tracking, no analytics,
 * no third-party cookies. The images come from Blizzard's servers, which is
 * a request to a third party but not a cookie, and is named as such.
 *
 * The acknowledgement lives in localStorage rather than in a cookie of its
 * own — a "cookie notice" that plants a cookie to remember it was dismissed
 * would be a small joke at the reader's expense.
 */

const KEY = 'ina-cookie-notice';

export function CookieNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(KEY) !== 'ok') setOpen(true);
    } catch {
      // Storage blocked: show the notice; nothing else depends on it.
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  const accept = (): void => {
    try {
      window.localStorage.setItem(KEY, 'ok');
    } catch {
      // Without storage the notice returns next visit; that is acceptable.
    }
    setOpen(false);
  };

  return (
    <div className={styles.notice} role="region" aria-label="Hinweis zu Cookies">
      <p className={styles.text}>
        Diese Seite setzt <strong>ein einziges Cookie</strong>, und das erst beim Anmelden: es
        hält deine Sitzung. Kein Tracking, keine Werbung, keine Analyse. Klassensymbole und
        Raid-Bilder werden von Blizzards Servern geladen. Mehr im{' '}
        <a href="/impressum">Impressum</a>.
      </p>
      <button type="button" className={styles.button} onClick={accept}>
        Verstanden
      </button>
    </div>
  );
}
