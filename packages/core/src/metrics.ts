/**
 * The metric registry.
 *
 * `AggregateStat.metric` is a plain string in the database so a new statistic
 * never needs a migration — this file is the authority on which strings are
 * valid, what they mean, and how each one is computed.
 *
 * `formula` is not documentation for developers. It is rendered verbatim in the
 * "Wie wird das berechnet?" popover next to every leaderboard, which is what
 * keeps the rankings honest.
 */

export type MetricNormalisation =
  | 'total'
  | 'perFight'
  | 'perMinute'
  | 'perPull'
  | 'percent'
  | 'rate'
  | 'raw';

export interface MetricDefinition {
  key: string;
  label: string;
  /** Plain-language formula, shown to readers. */
  formula: string;
  normalisation: MetricNormalisation;
  /** Higher is better? Drives sort direction and medal colouring. */
  higherIsBetter: boolean;
  /** Whether the averaged-leaderboard minimum sample applies. */
  usesMinimumSample: boolean;
  /** Unit hint for formatting. */
  unit: 'percentile' | 'count' | 'amount' | 'rate' | 'duration' | 'percent';
}

function define(definitions: MetricDefinition[]): Record<string, MetricDefinition> {
  return Object.fromEntries(definitions.map((d) => [d.key, d]));
}

export const METRICS: Record<string, MetricDefinition> = define([
  // --- Parses -------------------------------------------------------------
  {
    key: 'parse.best',
    label: 'Bester Parse',
    formula: 'Höchster erreichter rankPercent über alle gewerteten Kills.',
    normalisation: 'raw',
    higherIsBetter: true,
    usesMinimumSample: false,
    unit: 'percentile',
  },
  {
    key: 'parse.averageRaw',
    label: 'Ø Parse (roh)',
    formula:
      'Durchschnitt aller rankPercent-Werte, ohne Mindestanzahl. Ein einzelner Kill kann diese Liste anführen.',
    normalisation: 'raw',
    higherIsBetter: true,
    usesMinimumSample: false,
    unit: 'percentile',
  },
  {
    key: 'parse.average',
    label: 'Ø Parse (gewertet)',
    formula:
      'Durchschnitt aller rankPercent-Werte, nur für Spieler mit mindestens der konfigurierten Anzahl gewerteter Kills.',
    normalisation: 'raw',
    higherIsBetter: true,
    usesMinimumSample: true,
    unit: 'percentile',
  },
  {
    key: 'parse.median',
    label: 'Median Parse',
    formula: 'Median aller rankPercent-Werte, ab der konfigurierten Mindestanzahl gewerteter Kills.',
    normalisation: 'raw',
    higherIsBetter: true,
    usesMinimumSample: true,
    unit: 'percentile',
  },
  {
    key: 'parse.consistency',
    label: 'Consistency',
    formula:
      'Durchschnitt der rankPercent-Werte minus deren Standardabweichung. Belohnt gleichmäßige Leistung statt einzelner Ausreißer.',
    normalisation: 'raw',
    higherIsBetter: true,
    usesMinimumSample: true,
    unit: 'percentile',
  },
  {
    key: 'parse.count100',
    label: '100er Parses',
    formula: 'Anzahl gewerteter Kills mit rankPercent = 100.',
    normalisation: 'total',
    higherIsBetter: true,
    usesMinimumSample: false,
    unit: 'count',
  },
  {
    key: 'parse.count99',
    label: '99er Parses',
    formula: 'Anzahl gewerteter Kills mit rankPercent = 99.',
    normalisation: 'total',
    higherIsBetter: true,
    usesMinimumSample: false,
    unit: 'count',
  },
  {
    key: 'parse.count99plus',
    label: 'Parses ab 99',
    formula: 'Anzahl gewerteter Kills mit rankPercent >= 99.',
    normalisation: 'total',
    higherIsBetter: true,
    usesMinimumSample: false,
    unit: 'count',
  },
  {
    key: 'parse.count95plus',
    label: 'Parses ab 95',
    formula: 'Anzahl gewerteter Kills mit rankPercent >= 95.',
    normalisation: 'total',
    higherIsBetter: true,
    usesMinimumSample: false,
    unit: 'count',
  },
  {
    key: 'parse.count90plus',
    label: 'Parses ab 90',
    formula: 'Anzahl gewerteter Kills mit rankPercent >= 90.',
    normalisation: 'total',
    higherIsBetter: true,
    usesMinimumSample: false,
    unit: 'count',
  },
  {
    key: 'parse.count80plus',
    label: 'Parses ab 80',
    formula: 'Anzahl gewerteter Kills mit rankPercent >= 80.',
    normalisation: 'total',
    higherIsBetter: true,
    usesMinimumSample: false,
    unit: 'count',
  },

  // --- Damage, healing, mitigation ----------------------------------------
  {
    key: 'damage.total',
    label: 'Schaden gesamt',
    formula: 'Summe von damageDone über alle Pulls im gewählten Bereich.',
    normalisation: 'total',
    higherIsBetter: true,
    usesMinimumSample: false,
    unit: 'amount',
  },
  {
    key: 'damage.averageDps',
    label: 'Ø DPS',
    formula: 'Summe damageDone geteilt durch die Summe der Kampfdauern, nicht Mittel der Einzel-DPS.',
    normalisation: 'rate',
    higherIsBetter: true,
    usesMinimumSample: true,
    unit: 'rate',
  },
  {
    key: 'damage.bestDps',
    label: 'Höchster DPS',
    formula: 'Höchster DPS-Wert in einem einzelnen Pull.',
    normalisation: 'raw',
    higherIsBetter: true,
    usesMinimumSample: false,
    unit: 'rate',
  },
  {
    key: 'healing.total',
    label: 'Heilung gesamt',
    formula: 'Summe von healingDone über alle Pulls im gewählten Bereich.',
    normalisation: 'total',
    higherIsBetter: true,
    usesMinimumSample: false,
    unit: 'amount',
  },
  {
    key: 'healing.averageHps',
    label: 'Ø HPS',
    formula: 'Summe healingDone geteilt durch die Summe der Kampfdauern.',
    normalisation: 'rate',
    higherIsBetter: true,
    usesMinimumSample: true,
    unit: 'rate',
  },
  {
    key: 'damageTaken.total',
    label: 'Erlittener Schaden gesamt',
    formula: 'Summe von damageTaken. Tanks führen diese Liste naturgemäß an — siehe die normalisierten Varianten.',
    normalisation: 'total',
    higherIsBetter: true,
    usesMinimumSample: false,
    unit: 'amount',
  },
  {
    key: 'damageTaken.perMinute',
    label: 'Erlittener Schaden pro Minute',
    formula: 'Summe damageTaken geteilt durch die Summe der Kampfdauern in Minuten.',
    normalisation: 'perMinute',
    higherIsBetter: true,
    usesMinimumSample: true,
    unit: 'rate',
  },
  {
    key: 'damageTaken.perFight',
    label: 'Erlittener Schaden pro Pull',
    formula: 'Summe damageTaken geteilt durch die Anzahl der Pulls.',
    normalisation: 'perFight',
    higherIsBetter: true,
    usesMinimumSample: true,
    unit: 'amount',
  },

  // --- Deaths and wipes ---------------------------------------------------
  {
    key: 'deaths.total',
    label: 'Tode gesamt',
    formula: 'Anzahl der Todesereignisse über alle Pulls im gewählten Bereich.',
    normalisation: 'total',
    higherIsBetter: true,
    usesMinimumSample: false,
    unit: 'count',
  },
  {
    key: 'deaths.perPull',
    label: 'Tode pro Pull',
    formula: 'Anzahl Tode geteilt durch die Anzahl der Pulls, an denen der Spieler teilgenommen hat.',
    normalisation: 'perPull',
    higherIsBetter: true,
    usesMinimumSample: true,
    unit: 'rate',
  },
  {
    key: 'deaths.perHour',
    label: 'Tode pro Stunde',
    formula: 'Anzahl Tode geteilt durch die Summe der Kampfdauern in Stunden.',
    normalisation: 'perMinute',
    higherIsBetter: true,
    usesMinimumSample: true,
    unit: 'rate',
  },
  {
    key: 'wipes.total',
    label: 'Wipes',
    formula: 'Anzahl der Pulls mit kill = false, an denen der Spieler teilgenommen hat.',
    normalisation: 'total',
    higherIsBetter: true,
    usesMinimumSample: false,
    unit: 'count',
  },
  {
    key: 'kills.total',
    label: 'Bosskills',
    formula: 'Anzahl der Pulls mit kill = true, an denen der Spieler teilgenommen hat.',
    normalisation: 'total',
    higherIsBetter: true,
    usesMinimumSample: false,
    unit: 'count',
  },
  {
    key: 'pulls.total',
    label: 'Pulls',
    formula: 'Anzahl aller Boss-Pulls, an denen der Spieler teilgenommen hat.',
    normalisation: 'total',
    higherIsBetter: true,
    usesMinimumSample: false,
    unit: 'count',
  },

  // --- Utility ------------------------------------------------------------
  {
    key: 'interrupts.total',
    label: 'Interrupts',
    formula: 'Summe der Interrupts über alle Pulls im gewählten Bereich.',
    normalisation: 'total',
    higherIsBetter: true,
    usesMinimumSample: false,
    unit: 'count',
  },
  {
    key: 'interrupts.perFight',
    label: 'Interrupts pro Pull',
    formula: 'Summe der Interrupts geteilt durch die Anzahl der Pulls.',
    normalisation: 'perFight',
    higherIsBetter: true,
    usesMinimumSample: true,
    unit: 'rate',
  },
  {
    key: 'dispels.total',
    label: 'Dispels',
    formula: 'Summe der Dispels über alle Pulls im gewählten Bereich.',
    normalisation: 'total',
    higherIsBetter: true,
    usesMinimumSample: false,
    unit: 'count',
  },
  {
    key: 'dispels.perFight',
    label: 'Dispels pro Pull',
    formula: 'Summe der Dispels geteilt durch die Anzahl der Pulls.',
    normalisation: 'perFight',
    higherIsBetter: true,
    usesMinimumSample: true,
    unit: 'rate',
  },

  // --- Attendance ---------------------------------------------------------
  {
    key: 'attendance.nights',
    label: 'Raidabende',
    formula: 'Anzahl der Raidabende, an denen der Spieler als anwesend gewertet wurde.',
    normalisation: 'total',
    higherIsBetter: true,
    usesMinimumSample: false,
    unit: 'count',
  },
  {
    key: 'attendance.percent',
    label: 'Attendance',
    formula:
      'Anwesende Raidabende geteilt durch die Raidabende der Gilde im Zeitraum zwischen erstem und letztem Auftreten des Spielers.',
    normalisation: 'percent',
    higherIsBetter: true,
    usesMinimumSample: true,
    unit: 'percent',
  },
  {
    key: 'attendance.hours',
    label: 'Raidstunden',
    formula: 'Summe der Kampfzeit über alle Raidabende, in Stunden.',
    normalisation: 'total',
    higherIsBetter: true,
    usesMinimumSample: false,
    unit: 'duration',
  },
]);

export function metric(key: string): MetricDefinition {
  const definition = METRICS[key];
  if (!definition) throw new Error(`Unknown metric "${key}". Add it to METRICS in @ina/core.`);
  return definition;
}

export const METRIC_KEYS = Object.keys(METRICS);
