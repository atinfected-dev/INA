/**
 * Ranking formulas.
 *
 * These live apart from any database or UI code for one reason: every one of
 * them is quoted verbatim to the reader in the "Wie wird das berechnet?"
 * disclosure next to the leaderboard. A formula that is only expressed as a
 * SQL fragment somewhere cannot be shown, tested, or argued with.
 */

/** Per-player parse figures, as aggregated from ParseRanking. */
export interface ParseAggregate {
  /** Number of ranked kills behind these figures. */
  sampleSize: number;
  best: number;
  mean: number;
  median: number;
  /** Population standard deviation of the percentiles. */
  stdDev: number;
  count100: number;
  count99: number;
  count95plus: number;
  count90plus: number;
  count80plus: number;
}

/**
 * Consistency: the mean penalised by its own spread.
 *
 * A player who parses 90 every week beats one who alternates 100 and 60 for
 * the same average. Chosen over the plain mean because it cannot be gamed by a
 * single lucky pull, and it stays a number a raider can reason about.
 */
export function consistencyRating(mean: number, stdDev: number): number {
  return mean - stdDev;
}

export type ParseMetricKey =
  | 'best'
  | 'averageRaw'
  | 'average'
  | 'median'
  | 'consistency'
  | 'count100'
  | 'count99'
  | 'count95plus'
  | 'count90plus'
  | 'count80plus';

export interface ParseMetricDefinition {
  key: ParseMetricKey;
  label: string;
  /** Shown to the reader. Must describe exactly what the code does. */
  formula: string;
  /** Whether the configured minimum number of ranked kills applies. */
  usesMinimumSample: boolean;
  /** How the value is read off an aggregate. */
  value: (aggregate: ParseAggregate) => number;
  decimals: number;
}

export const PARSE_METRICS: readonly ParseMetricDefinition[] = [
  {
    key: 'average',
    label: 'Ø Parse (gewertet)',
    formula:
      'Durchschnitt aller Parse-Perzentile, gewertet ab der konfigurierten Mindestanzahl gewerteter Kills.',
    usesMinimumSample: true,
    value: (a) => a.mean,
    decimals: 1,
  },
  {
    key: 'averageRaw',
    label: 'Ø Parse (roh)',
    formula:
      'Durchschnitt aller Parse-Perzentile, ohne Mindestanzahl. Ein einziger Glückstreffer kann diese Liste anführen — genau deshalb steht sie neben der gewerteten.',
    usesMinimumSample: false,
    value: (a) => a.mean,
    decimals: 1,
  },
  {
    key: 'consistency',
    label: 'Consistency',
    formula:
      'Durchschnitt minus Standardabweichung der Parse-Perzentile. Belohnt gleichmäßige Leistung statt einzelner Ausreißer.',
    usesMinimumSample: true,
    value: (a) => consistencyRating(a.mean, a.stdDev),
    decimals: 1,
  },
  {
    key: 'median',
    label: 'Median Parse',
    formula: 'Median aller Parse-Perzentile, ab der konfigurierten Mindestanzahl gewerteter Kills.',
    usesMinimumSample: true,
    value: (a) => a.median,
    decimals: 1,
  },
  {
    key: 'best',
    label: 'Bester Parse',
    formula: 'Höchstes je erreichtes Parse-Perzentil. Ohne Mindestanzahl.',
    usesMinimumSample: false,
    value: (a) => a.best,
    decimals: 0,
  },
  {
    key: 'count100',
    label: '100er Parses',
    formula: 'Anzahl gewerteter Kills mit Perzentil 100.',
    usesMinimumSample: false,
    value: (a) => a.count100,
    decimals: 0,
  },
  {
    key: 'count99',
    label: 'Parses ab 99',
    formula: 'Anzahl gewerteter Kills mit Perzentil 99 oder höher.',
    usesMinimumSample: false,
    value: (a) => a.count99,
    decimals: 0,
  },
  {
    key: 'count95plus',
    label: 'Parses ab 95',
    formula: 'Anzahl gewerteter Kills mit Perzentil 95 oder höher.',
    usesMinimumSample: false,
    value: (a) => a.count95plus,
    decimals: 0,
  },
  {
    key: 'count90plus',
    label: 'Parses ab 90',
    formula: 'Anzahl gewerteter Kills mit Perzentil 90 oder höher.',
    usesMinimumSample: false,
    value: (a) => a.count90plus,
    decimals: 0,
  },
  {
    key: 'count80plus',
    label: 'Parses ab 80',
    formula: 'Anzahl gewerteter Kills mit Perzentil 80 oder höher.',
    usesMinimumSample: false,
    value: (a) => a.count80plus,
    decimals: 0,
  },
];

export function parseMetric(key: string): ParseMetricDefinition {
  const found = PARSE_METRICS.find((m) => m.key === key);
  if (!found) throw new Error(`Unknown parse metric "${key}".`);
  return found;
}

export interface RankedRow<T> {
  subject: T;
  value: number;
  sampleSize: number;
}

/**
 * Applies a metric to aggregates and orders them.
 *
 * The minimum-sample rule is applied here rather than in the query so that the
 * same aggregates can back both the filtered and the unfiltered list — the two
 * are shown side by side, and nothing is hidden.
 */
export function rankByParseMetric<T>(
  rows: { subject: T; aggregate: ParseAggregate }[],
  metric: ParseMetricDefinition,
  minimumSample: number,
): RankedRow<T>[] {
  const eligible = metric.usesMinimumSample
    ? rows.filter((row) => row.aggregate.sampleSize >= minimumSample)
    : rows;

  return eligible
    .map((row) => ({
      subject: row.subject,
      value: metric.value(row.aggregate),
      sampleSize: row.aggregate.sampleSize,
    }))
    // Ties broken by the larger sample: more evidence ranks higher.
    .sort((a, b) => b.value - a.value || b.sampleSize - a.sampleSize);
}
