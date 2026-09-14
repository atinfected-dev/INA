/**
 * World of Warcraft colour conventions.
 *
 * Two separate systems that happen to share a palette:
 *  - class colours, used for player names
 *  - item quality colours, which Warcraft Logs reuses for parse percentiles
 *
 * Keeping the parse thresholds in one place matters: they are quoted in the
 * "how is this calculated" popovers, so the UI and the explanation cannot
 * drift apart.
 */

export const CLASS_NAMES = [
  'Death Knight',
  'Druid',
  'Hunter',
  'Mage',
  'Monk',
  'Paladin',
  'Priest',
  'Rogue',
  'Shaman',
  'Warlock',
  'Warrior',
] as const;

export type WowClass = (typeof CLASS_NAMES)[number];

/**
 * Maps a class name to the CSS variable holding its colour.
 *
 * Matching strips everything but letters, because the same class arrives
 * spelled differently depending on the endpoint: Warcraft Logs reports
 * "DeathKnight", the display name is "Death Knight", and the CSS variable is
 * `--class-death-knight`. Comparing the spellings directly left every Death
 * Knight uncoloured.
 */
const CLASS_VARS = new Map(
  CLASS_NAMES.map((name) => [
    name.toLowerCase().replace(/[^a-z]/g, ''),
    `var(--class-${name.toLowerCase().replace(/\s+/g, '-')})`,
  ]),
);

export function classVar(className: string | null | undefined): string {
  if (!className) return 'var(--text-primary)';
  return CLASS_VARS.get(className.toLowerCase().replace(/[^a-z]/g, '')) ?? 'var(--text-primary)';
}

export interface ParseBracket {
  /** Inclusive lower bound of the percentile range. */
  min: number;
  label: string;
  cssVar: string;
}

/**
 * Warcraft Logs' parse colouring, from grey to gold. A 100 parse gets its own
 * bracket, and 99 its own pink, because those are the two numbers players
 * actually chase.
 */
export const PARSE_BRACKETS: readonly ParseBracket[] = [
  { min: 100, label: 'Legendary (100)', cssVar: '--q-artifact' },
  { min: 99, label: 'Astounding (99)', cssVar: '--q-astounding' },
  { min: 95, label: 'Epic (95-98)', cssVar: '--q-legendary' },
  { min: 75, label: 'Rare (75-94)', cssVar: '--q-epic' },
  { min: 50, label: 'Uncommon (50-74)', cssVar: '--q-rare' },
  { min: 25, label: 'Common (25-49)', cssVar: '--q-uncommon' },
  { min: 0, label: 'Poor (0-24)', cssVar: '--q-poor' },
] as const;

export function parseBracket(percentile: number): ParseBracket {
  const bracket = PARSE_BRACKETS.find((b) => percentile >= b.min);
  // PARSE_BRACKETS ends at 0, so only a negative or NaN input can miss.
  return bracket ?? PARSE_BRACKETS[PARSE_BRACKETS.length - 1]!;
}

export function parseColorVar(percentile: number): string {
  return `var(${parseBracket(percentile).cssVar})`;
}

/** German number formatting, used everywhere so no page invents its own. */
export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Like formatNumber, but drops trailing zeros: 26 Mrd., not 26,00 Mrd. */
function compact(value: number, decimals: number): string {
  return value.toLocaleString('de-DE', { maximumFractionDigits: decimals });
}

/**
 * Compact totals for damage and healing (1,2 Mrd., 987 Tsd.).
 *
 * Deliberately German: mixing "44.94B" into a page that otherwise writes
 * "6.314" reads as a thousands separator and turns a billion into a mistake.
 */
export function formatAmount(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${compact(value / 1_000_000_000, 2)} Mrd.`;
  if (abs >= 1_000_000) return `${compact(value / 1_000_000, 1)} Mio.`;
  if (abs >= 1_000) return `${compact(value / 1_000, 1)} Tsd.`;
  return formatNumber(value);
}

/** Fight durations as m:ss, which is how raiders read pull times. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
