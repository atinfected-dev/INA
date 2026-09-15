'use client';

import { useMemo, useState } from 'react';
import {
  CLASS_LABELS,
  FACTION_LABELS,
  FOREVER_RACES,
  FOREVER_ROLES,
  classesFor,
  factionFor,
  type Faction,
  type ForeverClass,
  type ForeverRole,
} from '@ina/core';
import styles from '../auth/form.module.css';

/**
 * The planned character.
 *
 * Race first, then faction if the race leaves it open, then only the classes
 * that pairing can actually play — the list narrows as the member chooses,
 * with the new Forever pairings marked. The server checks the same table
 * again on save; this form is the friendly version of that rule, not the
 * only one.
 */

export interface CharacterFormValues {
  name: string;
  surname: string;
  race: string;
  className: ForeverClass | '';
  faction: Faction | '';
  role: ForeverRole | '';
  note: string;
}

export function CharacterForm({
  action,
  initial,
}: {
  action: (formData: FormData) => Promise<void>;
  initial: CharacterFormValues;
}) {
  const [raceId, setRaceId] = useState(initial.race || 'human');
  const [faction, setFaction] = useState<Faction | ''>(initial.faction);
  const [className, setClassName] = useState<ForeverClass | ''>(initial.className);

  const race = useMemo(() => FOREVER_RACES.find((r) => r.id === raceId) ?? FOREVER_RACES[0]!, [raceId]);
  const settledFaction = factionFor(race, faction === '' ? null : faction);
  const classes = settledFaction ? classesFor(race, settledFaction) : race.classes;
  const classStillValid = className !== '' && classes.includes(className);

  return (
    <form action={action} className={styles.form} id="mein-charakter">
      <label className={styles.field}>
        <span className={styles.label}>Vorname</span>
        <input
          className={styles.input}
          name="name"
          required
          minLength={2}
          maxLength={12}
          pattern="[A-Za-zÀ-ÿ]{2,12}"
          defaultValue={initial.name}
          placeholder="2–12 Buchstaben"
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Nachname</span>
        <input
          className={styles.input}
          name="surname"
          required
          minLength={2}
          maxLength={16}
          pattern="[A-Za-zÀ-ÿ]{2,16}"
          defaultValue={initial.surname}
          placeholder="2–16 Buchstaben"
        />
        <span className={styles.hint}>
          Forever-Charaktere tragen Vor- und Nachnamen. Die Namensreservierung läuft ab dem 27.
          Oktober — trag ein, was du dir wünschst.
        </span>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Volk</span>
        <select
          className={styles.input}
          name="race"
          value={raceId}
          onChange={(event) => {
            setRaceId(event.target.value);
            setClassName('');
          }}
        >
          {(['alliance', 'horde', 'neutral'] as const).map((group) => (
            <optgroup
              key={group}
              label={group === 'neutral' ? 'Neutral — wählt eine Fraktion' : FACTION_LABELS[group]}
            >
              {FOREVER_RACES.filter((r) => r.faction === group).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.isNewRace ? ' · neu' : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      {race.faction === 'neutral' ? (
        <label className={styles.field}>
          <span className={styles.label}>Fraktion</span>
          <select
            className={styles.input}
            name="faction"
            value={faction}
            required
            onChange={(event) => {
              setFaction(event.target.value as Faction | '');
              setClassName('');
            }}
          >
            <option value="">— wählen —</option>
            <option value="alliance">Allianz · dazu Magier</option>
            <option value="horde">Horde · dazu Schamane</option>
          </select>
          <span className={styles.hint}>
            Skyborne schließen sich einer Seite an; die Seite entscheidet über Magier oder Schamane.
          </span>
        </label>
      ) : (
        <input type="hidden" name="faction" value={race.faction} />
      )}

      <label className={styles.field}>
        <span className={styles.label}>Klasse</span>
        <select
          className={styles.input}
          name="className"
          required
          value={classStillValid ? className : ''}
          onChange={(event) => setClassName(event.target.value as ForeverClass)}
        >
          <option value="">— wählen —</option>
          {classes.map((cls) => (
            <option key={cls} value={cls}>
              {CLASS_LABELS[cls]}
              {race.newClasses.includes(cls) ? ' · neu in Forever' : ''}
            </option>
          ))}
        </select>
        <span className={styles.hint}>
          Nur, was {race.name === 'Skyborne' ? 'Skyborne' : `ein ${race.name}`} in Forever spielen
          kann. „Neu" sind die Paarungen, die es im Original nicht gab.
        </span>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Rolle</span>
        <select className={styles.input} name="role" required defaultValue={initial.role}>
          <option value="">— wählen —</option>
          {FOREVER_ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Notiz</span>
        <input
          className={styles.input}
          name="note"
          maxLength={280}
          defaultValue={initial.note}
          placeholder="Zweitwahl, Beruf, Wunsch — optional"
        />
      </label>

      <button type="submit" className={styles.submit}>
        {initial.name ? 'Änderungen speichern' : 'Charakter eintragen'}
      </button>
    </form>
  );
}
