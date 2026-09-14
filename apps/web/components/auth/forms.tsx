'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { FormState } from '../../app/konto/actions';
import styles from './form.module.css';

/**
 * Client-side form shells.
 *
 * The actions themselves stay on the server; these components only carry
 * pending state and render whatever message comes back. No password ever
 * touches client state.
 */

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

function Submit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.submit} disabled={pending}>
      {pending ? 'Moment …' : children}
    </button>
  );
}

function Messages({ state }: { state: FormState }) {
  return (
    <>
      {state.error && <p className={styles.error}>{state.error}</p>}
      {state.notice && <p className={styles.notice}>{state.notice}</p>}
    </>
  );
}

export function RegisterForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className={styles.form}>
      <Messages state={state} />

      <label className={styles.field}>
        <span className={styles.label}>E-Mail</span>
        <input className={styles.input} type="email" name="email" required autoComplete="email" />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Anzeigename</span>
        <input className={styles.input} type="text" name="displayName" required minLength={2} />
        <span className={styles.hint}>Öffentlich sichtbar. Gern der Gildenname.</span>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Klarname (optional)</span>
        <input className={styles.input} type="text" name="realName" autoComplete="name" />
        <span className={styles.hint}>
          Nur für angemeldete Gildenmitglieder sichtbar, nie öffentlich. Kann leer bleiben.
        </span>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Passwort</span>
        <input
          className={styles.input}
          type="password"
          name="password"
          required
          minLength={12}
          autoComplete="new-password"
        />
        <span className={styles.hint}>Mindestens 12 Zeichen.</span>
      </label>

      <Submit>Konto anlegen</Submit>
    </form>
  );
}

export function LoginForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className={styles.form}>
      <Messages state={state} />

      <label className={styles.field}>
        <span className={styles.label}>E-Mail</span>
        <input className={styles.input} type="email" name="email" required autoComplete="email" />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Passwort</span>
        <input
          className={styles.input}
          type="password"
          name="password"
          required
          autoComplete="current-password"
        />
      </label>

      <Submit>Anmelden</Submit>
    </form>
  );
}

export function ClaimForm({
  action,
  characterId,
  characterName,
}: {
  action: Action;
  characterId: string;
  characterName: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className={styles.inlineForm}>
      <input type="hidden" name="characterId" value={characterId} />
      <input
        className={styles.input}
        type="text"
        name="note"
        placeholder="Notiz (optional)"
        style={{ flex: '1 1 12rem', minWidth: 0 }}
      />
      <Submit>{`${characterName} beanspruchen`}</Submit>
      <Messages state={state} />
    </form>
  );
}

export function DecisionForm({
  action,
  claimId,
  decision,
  label,
  danger = false,
  withReason = false,
}: {
  action: Action;
  claimId: string;
  decision: 'approve' | 'reject' | 'revoke';
  label: string;
  danger?: boolean;
  withReason?: boolean;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const { pending } = useFormStatus();

  return (
    <form action={formAction} className={styles.inlineForm}>
      <input type="hidden" name="claimId" value={claimId} />
      <input type="hidden" name="decision" value={decision} />
      {withReason && (
        <input className={styles.input} type="text" name="reason" placeholder="Begründung" />
      )}
      <button
        type="submit"
        className={danger ? styles.smallDanger : styles.small}
        disabled={pending}
      >
        {label}
      </button>
      {state.error && <span className={styles.error}>{state.error}</span>}
    </form>
  );
}
