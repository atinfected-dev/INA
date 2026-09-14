'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { TIER_LABELS, type AchievementTier } from '@ina/core';
import type { FormState } from '../../app/konto/actions';
import styles from './pin-form.module.css';

/**
 * Picking the achievements shown at the top of one's own profile.
 *
 * The cap is enforced here so the limit is visible while choosing rather than
 * announced after saving — and again on the server, because a disabled
 * checkbox is a courtesy, not a rule.
 */

export interface PinOption {
  id: string;
  name: string;
  tier: AchievementTier;
  share: number;
}

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

function Submit({ full }: { full: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.submit} disabled={pending}>
      {pending ? 'Moment …' : full ? 'Auswahl speichern' : 'Speichern'}
    </button>
  );
}

export function PinForm({
  action,
  options,
  selected,
  max,
}: {
  action: Action;
  options: PinOption[];
  selected: string[];
  max: number;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const [chosen, setChosen] = useState<string[]>(selected.slice(0, max));

  const toggle = (id: string): void => {
    setChosen((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : current.length >= max
          ? current
          : [...current, id],
    );
  };

  return (
    <form action={formAction}>
      {state.error && <p className={styles.error}>{state.error}</p>}
      {state.notice && <p className={styles.notice}>{state.notice}</p>}

      <p className={styles.counter}>
        {chosen.length} von {max} ausgewählt
      </p>

      <div className={styles.grid}>
        {options.map((option) => {
          const active = chosen.includes(option.id);
          return (
            <label
              key={option.id}
              className={active ? styles.optionActive : styles.option}
              data-disabled={!active && chosen.length >= max ? 'true' : undefined}
            >
              <input
                type="checkbox"
                name="pinned"
                value={option.id}
                checked={active}
                onChange={() => toggle(option.id)}
                disabled={!active && chosen.length >= max}
              />
              <span>
                <strong>{option.name}</strong>
                <span className={styles.meta}>
                  {TIER_LABELS[option.tier]} · {(option.share * 100).toLocaleString('de-DE', {
                    maximumFractionDigits: 1,
                  })}{' '}
                  %
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <Submit full={chosen.length === max} />
    </form>
  );
}
