/**
 * Achievements.
 *
 * Two decisions keep this from turning into eighty hand-written queries.
 *
 * First, an achievement is a THRESHOLD ON A METRIC, not a query. Every number
 * a subject can be measured by is computed once in `SubjectMetrics`; a
 * definition only names the metric and the steps. Adding "500 dispels" is then
 * one line, not a new database round trip.
 *
 * Second, tiers instead of badges. "Pull Machine, Gold" says more on a profile
 * than four separate entries that differ only in a number, and it keeps the
 * list of held achievements short enough to read.
 *
 * Everything here is data and pure functions — no database, no framework — so
 * the thresholds and the tier logic can be tested directly.
 */

export type AchievementCategory = 'lifetime' | 'progress' | 'performance' | 'reliability' | 'fun';

export const ACHIEVEMENT_CATEGORIES: Record<
  AchievementCategory,
  { label: string; description: string }
> = {
  lifetime: {
    label: 'Lebenswerk',
    description: 'Was sich über Jahre ansammelt. Zeit, Pulls, Kills, Abende.',
  },
  progress: {
    label: 'Progress',
    description: 'Neue Bosse, Erstkills, Hardmodes — und die Wipes davor.',
  },
  performance: {
    label: 'Leistung',
    description: 'Parses, Schaden, Heilung, Unterbrechungen.',
  },
  reliability: {
    label: 'Zuverlässigkeit',
    description: 'Da sein, drin bleiben, nicht sterben.',
  },
  fun: {
    label: 'Kuriositäten',
    description: 'Auszeichnungen, auf die niemand hinarbeitet.',
  },
};

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export const TIER_ORDER: readonly AchievementTier[] = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
];

export const TIER_LABELS: Record<AchievementTier, string> = {
  bronze: 'Bronze',
  silver: 'Silber',
  gold: 'Gold',
  platinum: 'Platin',
  diamond: 'Diamant',
};

/**
 * Every number a subject can be measured by.
 *
 * Declared here rather than in the query layer on purpose: a definition that
 * names a metric which does not exist is a build error, the same guard the
 * generated Warcraft Logs types provide against invented API fields.
 */
export interface SubjectMetrics {
  /** Combat time — the summed length of the pulls taken part in, in ms. */
  combatMs: number;
  /**
   * Time spent at the raid: first pull to last pull of every night attended,
   * in milliseconds.
   *
   * A different question from combat time and the larger number by far — this
   * guild has 959 hours of combat across 582 nights, but its most present
   * raider has sat through 978 hours of raid. Both are kept because both get
   * asked: "how long were you there" and "how long were you fighting".
   */
  raidTimeMs: number;
  pulls: number;
  bossKills: number;
  nights: number;
  wipes: number;
  /** Distinct Classic expansions raided in. */
  expansions: number;
  /** Distinct raids (zones). */
  zones: number;
  /** Distinct bosses killed. */
  bossesKilled: number;
  /** Pulls on a boss before the guild first killed it. */
  progressPulls: number;
  /** Participations in the guild's first kill of a boss and difficulty. */
  firstKills: number;
  /** Kills on Heroic or Mythic. */
  heroicKills: number;
  /** Most pulls spent on a single boss. */
  maxPullsOneBoss: number;

  parses75: number;
  parses90: number;
  parses95: number;
  parses99: number;
  parses100: number;
  /** Distinct bosses with at least one parse of 90. */
  bosses90: number;

  damageDone: number;
  healingDone: number;
  damageTaken: number;
  interrupts: number;
  dispels: number;

  deaths: number;
  /** Distinct fights died in. */
  fightsDied: number;
  /** Times this subject was the first of the raid to die in a pull. */
  firstDeaths: number;
  /** Boss kills survived from start to finish. */
  killsWithoutDeath: number;
  /** Raid nights attended without dying once. */
  nightsWithoutDeath: number;
  /** Longest run of consecutive raid nights attended. */
  attendanceStreak: number;

  /** Distinct classes played. */
  classes: number;
  /** Boss kills on the single most-played class. */
  maxKillsOneClass: number;
  /** Combat time on the single most-played class, in milliseconds. */
  maxCombatMsOneClass: number;
  /** Characters of this subject that have at least one boss kill. */
  charactersWithKills: number;
  /** Distinct realms played on. */
  realms: number;
  /** Characters merged into this person. */
  mergedCharacters: number;

  /** Length of the longest single raid night attended, in milliseconds. */
  longestNightMs: number;
  /** Most pulls in a single raid night. */
  maxPullsOneNight: number;
  /** Combat time in fights that started between 00:00 and 06:00, in ms. */
  lateNightCombatMs: number;
  /** Position of this subject's first night in guild history, 1 = the first ever. */
  firstNightIndex: number;
}

export type MetricKey = keyof SubjectMetrics;

/** What each metric is called when an officer picks one from a list. */
export const METRIC_LABELS: Record<MetricKey, string> = {
  combatMs: 'Kampfzeit',
  raidTimeMs: 'Zeit im Raid',
  pulls: 'Pulls',
  bossKills: 'Bosskills',
  nights: 'Raidabende',
  wipes: 'Wipes',
  expansions: 'Erweiterungen',
  zones: 'Verschiedene Raids',
  bossesKilled: 'Verschiedene Bosse gelegt',
  progressPulls: 'Progress-Pulls',
  firstKills: 'Erstkills',
  heroicKills: 'Heroic-Kills',
  maxPullsOneBoss: 'Meiste Pulls auf einem Boss',
  parses75: 'Parses ab 75',
  parses90: 'Parses ab 90',
  parses95: 'Parses ab 95',
  parses99: 'Parses ab 99',
  parses100: 'Parses 100',
  bosses90: 'Bosse mit Parse ab 90',
  damageDone: 'Schaden',
  healingDone: 'Heilung',
  damageTaken: 'Erlittener Schaden',
  interrupts: 'Unterbrechungen',
  dispels: 'Dispels',
  deaths: 'Tode',
  fightsDied: 'Kämpfe mit Tod',
  firstDeaths: 'Als Erster gestorben',
  killsWithoutDeath: 'Kills ohne Tod',
  nightsWithoutDeath: 'Abende ohne Tod',
  attendanceStreak: 'Abende in Folge',
  classes: 'Verschiedene Klassen',
  maxKillsOneClass: 'Kills auf einer Klasse',
  maxCombatMsOneClass: 'Kampfzeit auf einer Klasse',
  charactersWithKills: 'Charaktere mit Kills',
  realms: 'Realms',
  mergedCharacters: 'Zusammengeführte Charaktere',
  longestNightMs: 'Längster Abend',
  maxPullsOneNight: 'Meiste Pulls an einem Abend',
  lateNightCombatMs: 'Kampfzeit nach Mitternacht',
  firstNightIndex: 'Erster Abend (Position)',
};

/** Named apart from the METRICS registry's keys, which describe leaderboards. */
export const SUBJECT_METRIC_KEYS = Object.keys(METRIC_LABELS) as MetricKey[];

/** Milliseconds metrics are entered and shown as hours. */
export function unitForMetric(metric: MetricKey): AchievementDefinition['unit'] {
  if (metric.endsWith('Ms')) return 'hours';
  if (metric === 'damageDone' || metric === 'healingDone' || metric === 'damageTaken') {
    return 'amount';
  }
  return 'count';
}

export interface TierStep {
  tier: AchievementTier;
  threshold: number;
}

/** An extra condition a combined achievement requires beyond its own metric. */
export interface Requirement {
  metric: MetricKey;
  threshold: number;
}

export interface AchievementDefinition {
  id: string;
  category: AchievementCategory;
  name: string;
  /** What it measures, in the words a reader needs. */
  description: string;
  metric: MetricKey;
  /** How the metric value is rendered. */
  unit: 'count' | 'hours' | 'amount';
  steps: TierStep[];
  /** All of these must also be met, for the combined awards. */
  requires?: Requirement[];
}

const counts = (...thresholds: number[]): TierStep[] =>
  thresholds.map((threshold, index) => ({
    tier: TIER_ORDER[Math.min(index, TIER_ORDER.length - 1)] as AchievementTier,
    threshold,
  }));

const HOUR = 3_600_000;
const BILLION = 1_000_000_000;

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  // --- Lebenswerk ---------------------------------------------------------
  {
    id: 'raid-veteran',
    category: 'lifetime',
    name: 'Raid Veteran',
    description:
      'Zeit im Raid: vom ersten bis zum letzten Pull jedes Abends, an dem teilgenommen wurde.',
    metric: 'raidTimeMs',
    unit: 'hours',
    steps: counts(100 * HOUR, 250 * HOUR, 500 * HOUR, 1000 * HOUR, 2000 * HOUR),
  },
  {
    id: 'combat-veteran',
    category: 'lifetime',
    name: 'Kampfzeit',
    description:
      'Reine Kampfzeit — die summierte Länge aller Pulls. Deutlich weniger als die Zeit im Raid.',
    metric: 'combatMs',
    unit: 'hours',
    steps: counts(50 * HOUR, 100 * HOUR, 250 * HOUR, 400 * HOUR, 550 * HOUR),
  },
  {
    id: 'pull-machine',
    category: 'lifetime',
    name: 'Pull Machine',
    description: 'Pulls, an denen teilgenommen wurde — Kills wie Wipes.',
    metric: 'pulls',
    unit: 'count',
    steps: counts(250, 500, 1000, 2000, 5000),
  },
  {
    id: 'boss-slayer',
    category: 'lifetime',
    name: 'Bossschlächter',
    description: 'Bosskills, an denen teilgenommen wurde.',
    metric: 'bossKills',
    unit: 'count',
    steps: counts(100, 250, 500, 1000, 2500),
  },
  {
    id: 'night-owl',
    category: 'lifetime',
    name: 'Stammgast',
    description: 'Raidabende, an denen teilgenommen wurde.',
    metric: 'nights',
    unit: 'count',
    steps: counts(25, 50, 100, 250, 500),
  },
  {
    id: 'wipe-survivor',
    category: 'lifetime',
    name: 'Wipe-Veteran',
    description: 'Pulls ohne Kill, die mitgemacht wurden. Der Preis für jeden Progress.',
    metric: 'wipes',
    unit: 'count',
    steps: counts(500, 1000, 2500, 5000),
  },
  {
    id: 'raid-legend',
    category: 'lifetime',
    name: 'Raid Legend',
    description: 'Alles zugleich: Zeit im Raid, Pulls und Bosskills auf Lebenswerk-Niveau.',
    metric: 'raidTimeMs',
    unit: 'hours',
    steps: [
      { tier: 'gold', threshold: 1000 * HOUR },
      { tier: 'diamond', threshold: 2000 * HOUR },
    ],
    requires: [
      { metric: 'pulls', threshold: 2000 },
      { metric: 'bossKills', threshold: 500 },
    ],
  },

  // --- Progress -----------------------------------------------------------
  {
    id: 'expansion-veteran',
    category: 'progress',
    name: 'Expansion Veteran',
    description: 'Verschiedene Classic-Erweiterungen, in denen geraidet wurde.',
    metric: 'expansions',
    unit: 'count',
    steps: [
      { tier: 'bronze', threshold: 2 },
      { tier: 'gold', threshold: 3 },
      { tier: 'diamond', threshold: 4 },
    ],
  },
  {
    id: 'tier-veteran',
    category: 'progress',
    name: 'Tier Veteran',
    description: 'Verschiedene Raids, in denen mindestens ein Pull stattfand.',
    metric: 'zones',
    unit: 'count',
    steps: [
      { tier: 'bronze', threshold: 5 },
      { tier: 'gold', threshold: 10 },
      { tier: 'diamond', threshold: 15 },
    ],
  },
  {
    id: 'boss-collector',
    category: 'progress',
    name: 'Boss Collector',
    description: 'Verschiedene Bosse, die mindestens einmal gelegt wurden.',
    metric: 'bossesKilled',
    unit: 'count',
    steps: [
      { tier: 'bronze', threshold: 25 },
      { tier: 'gold', threshold: 50 },
      { tier: 'diamond', threshold: 100 },
    ],
  },
  {
    id: 'progress-veteran',
    category: 'progress',
    name: 'Progress Veteran',
    description:
      'Pulls auf einen Boss, bevor die Gilde ihn zum ersten Mal gelegt hat. Die Arbeit vor dem Erfolg.',
    metric: 'progressPulls',
    unit: 'count',
    steps: [
      { tier: 'bronze', threshold: 100 },
      { tier: 'gold', threshold: 250 },
      { tier: 'diamond', threshold: 500 },
    ],
  },
  {
    id: 'first-kill-hunter',
    category: 'progress',
    name: 'First Kill Hunter',
    description: 'Dabei gewesen, als die Gilde einen Boss zum ersten Mal legte.',
    metric: 'firstKills',
    unit: 'count',
    steps: [
      { tier: 'bronze', threshold: 10 },
      { tier: 'gold', threshold: 25 },
      { tier: 'diamond', threshold: 50 },
    ],
  },
  {
    id: 'hardmode-veteran',
    category: 'progress',
    name: 'Hardmode Veteran',
    description: 'Bosskills auf Heroic oder Mythic.',
    metric: 'heroicKills',
    unit: 'count',
    steps: [
      { tier: 'bronze', threshold: 25 },
      { tier: 'gold', threshold: 100 },
      { tier: 'diamond', threshold: 250 },
    ],
  },
  {
    id: 'centurion',
    category: 'progress',
    name: 'Centurion',
    description: 'Pulls auf ein und denselben Boss. Irgendwann wird es persönlich.',
    metric: 'maxPullsOneBoss',
    unit: 'count',
    steps: [
      { tier: 'gold', threshold: 100 },
      { tier: 'diamond', threshold: 200 },
    ],
  },
  {
    id: 'progress-monster',
    category: 'progress',
    name: 'Progress Monster',
    description: 'Tausend Wipes und hundert Pulls auf noch ungelegte Bosse.',
    metric: 'wipes',
    unit: 'count',
    steps: [{ tier: 'diamond', threshold: 1000 }],
    requires: [{ metric: 'progressPulls', threshold: 100 }],
  },

  // --- Leistung -----------------------------------------------------------
  {
    id: 'purple-club',
    category: 'performance',
    name: 'Purple Club',
    description: 'Gewertete Kills mit Parse 75 oder höher.',
    metric: 'parses75',
    unit: 'count',
    steps: [
      { tier: 'bronze', threshold: 25 },
      { tier: 'silver', threshold: 50 },
      { tier: 'gold', threshold: 100 },
    ],
  },
  {
    id: 'orange-club',
    category: 'performance',
    name: 'Orange Club',
    description: 'Gewertete Kills mit Parse 95 oder höher.',
    metric: 'parses95',
    unit: 'count',
    steps: [
      { tier: 'bronze', threshold: 50 },
      { tier: 'gold', threshold: 100 },
      { tier: 'diamond', threshold: 250 },
    ],
  },
  {
    id: 'parse-machine',
    category: 'performance',
    name: 'Parse Machine',
    description: 'Gewertete Kills mit Parse 99 oder höher.',
    metric: 'parses99',
    unit: 'count',
    steps: counts(10, 25, 50, 100),
  },
  {
    id: 'perfectionist',
    category: 'performance',
    name: 'Perfektionist',
    description: 'Gewertete Kills mit Parse 100 — der bestmögliche Wert.',
    metric: 'parses100',
    unit: 'count',
    steps: [
      { tier: 'bronze', threshold: 1 },
      { tier: 'silver', threshold: 5 },
      { tier: 'gold', threshold: 10 },
      { tier: 'diamond', threshold: 25 },
    ],
  },
  {
    id: 'allrounder',
    category: 'performance',
    name: 'Allrounder',
    description: 'Verschiedene Bosse mit mindestens einem Parse ab 90.',
    metric: 'bosses90',
    unit: 'count',
    steps: [
      { tier: 'bronze', threshold: 5 },
      { tier: 'gold', threshold: 10 },
      { tier: 'diamond', threshold: 25 },
    ],
  },
  {
    id: 'damage-dealer',
    category: 'performance',
    name: 'Damage Dealer',
    description: 'Verursachter Gesamtschaden.',
    metric: 'damageDone',
    unit: 'amount',
    steps: [
      { tier: 'bronze', threshold: BILLION },
      { tier: 'gold', threshold: 10 * BILLION },
      { tier: 'diamond', threshold: 100 * BILLION },
    ],
  },
  {
    id: 'healer',
    category: 'performance',
    name: 'Lebensretter',
    description: 'Gewirkte Gesamtheilung.',
    metric: 'healingDone',
    unit: 'amount',
    steps: [
      { tier: 'bronze', threshold: BILLION },
      { tier: 'gold', threshold: 10 * BILLION },
      { tier: 'diamond', threshold: 100 * BILLION },
    ],
  },
  {
    id: 'punching-bag',
    category: 'performance',
    name: 'Punching Bag',
    description: 'Erlittener Gesamtschaden. Gescriptete Sofort-Tode zählen nicht mit.',
    metric: 'damageTaken',
    unit: 'amount',
    steps: [
      { tier: 'bronze', threshold: BILLION },
      { tier: 'gold', threshold: 10 * BILLION },
      { tier: 'diamond', threshold: 100 * BILLION },
    ],
  },
  {
    id: 'interrupt-machine',
    category: 'performance',
    name: 'Interrupt Machine',
    description: 'Unterbrochene Zauber.',
    metric: 'interrupts',
    unit: 'count',
    steps: [
      { tier: 'bronze', threshold: 100 },
      { tier: 'gold', threshold: 500 },
      { tier: 'diamond', threshold: 1000 },
    ],
  },
  {
    id: 'dispel-duty',
    category: 'performance',
    name: 'Dispel Duty',
    description: 'Entfernte Effekte.',
    metric: 'dispels',
    unit: 'count',
    steps: [
      { tier: 'bronze', threshold: 100 },
      { tier: 'gold', threshold: 500 },
      { tier: 'diamond', threshold: 1000 },
    ],
  },

  // --- Zuverlässigkeit ----------------------------------------------------
  {
    id: 'attendance-streak',
    category: 'reliability',
    name: 'Dauerbrenner',
    description: 'Raidabende in ununterbrochener Folge.',
    metric: 'attendanceStreak',
    unit: 'count',
    steps: counts(25, 50, 100, 250),
  },
  {
    id: 'survivor',
    category: 'reliability',
    name: 'Survivor',
    description: 'Bosskills, bei denen man von Anfang bis Ende gestanden hat.',
    metric: 'killsWithoutDeath',
    unit: 'count',
    steps: [
      { tier: 'bronze', threshold: 50 },
      { tier: 'gold', threshold: 100 },
      { tier: 'diamond', threshold: 250 },
    ],
  },
  {
    id: 'unkillable',
    category: 'reliability',
    name: 'Unkillable',
    description: 'Ganze Raidabende ohne einen einzigen Tod.',
    metric: 'nightsWithoutDeath',
    unit: 'count',
    steps: [
      { tier: 'bronze', threshold: 1 },
      { tier: 'gold', threshold: 10 },
      { tier: 'diamond', threshold: 25 },
    ],
  },
  {
    id: 'class-veteran',
    category: 'reliability',
    name: 'Class Veteran',
    description: 'Reine Kampfzeit auf ein und derselben Klasse.',
    metric: 'maxCombatMsOneClass',
    unit: 'hours',
    steps: [
      { tier: 'bronze', threshold: 100 * HOUR },
      { tier: 'gold', threshold: 250 * HOUR },
      { tier: 'diamond', threshold: 500 * HOUR },
    ],
  },
  {
    id: 'one-trick',
    category: 'reliability',
    name: 'One Trick',
    description: 'Bosskills auf derselben Klasse. Keine Experimente.',
    metric: 'maxKillsOneClass',
    unit: 'count',
    steps: [
      { tier: 'bronze', threshold: 100 },
      { tier: 'gold', threshold: 250 },
      { tier: 'diamond', threshold: 500 },
    ],
  },

  // --- Kuriositäten -------------------------------------------------------
  {
    id: 'death-collector',
    category: 'fun',
    name: 'Death Collector',
    description: 'Tode. Nur aus Raidabenden, deren Inhalte Warcraft Logs noch vorhält.',
    metric: 'deaths',
    unit: 'count',
    steps: counts(100, 250, 500, 1000),
  },
  {
    id: 'floor-inspector',
    category: 'fun',
    name: 'Floor Inspector',
    description: 'Verschiedene Kämpfe, in denen man den Boden von unten gesehen hat.',
    metric: 'fightsDied',
    unit: 'count',
    steps: [
      { tier: 'bronze', threshold: 50 },
      { tier: 'gold', threshold: 100 },
      { tier: 'diamond', threshold: 250 },
    ],
  },
  {
    id: 'first-blood',
    category: 'fun',
    name: 'First Blood',
    description: 'Als erster Spieler des Raids im Pull gestorben.',
    metric: 'firstDeaths',
    unit: 'count',
    steps: [
      { tier: 'bronze', threshold: 25 },
      { tier: 'gold', threshold: 50 },
      { tier: 'diamond', threshold: 100 },
    ],
  },
  {
    id: 'alt-army',
    category: 'fun',
    name: 'Alt Army',
    description: 'Eigene Charaktere mit mindestens einem Bosskill.',
    metric: 'charactersWithKills',
    unit: 'count',
    steps: [
      { tier: 'bronze', threshold: 3 },
      { tier: 'gold', threshold: 5 },
      { tier: 'diamond', threshold: 10 },
    ],
  },
  {
    id: 'multi-class',
    category: 'fun',
    name: 'Multi-Class',
    description: 'Verschiedene Klassen, mit denen geraidet wurde.',
    metric: 'classes',
    unit: 'count',
    steps: [
      { tier: 'bronze', threshold: 2 },
      { tier: 'gold', threshold: 3 },
      { tier: 'diamond', threshold: 5 },
    ],
  },
  {
    id: 'realm-hopper',
    category: 'fun',
    name: 'Realm Hopper',
    description: 'Realms, auf denen eigene Charaktere geraidet haben.',
    metric: 'realms',
    unit: 'count',
    steps: [
      { tier: 'gold', threshold: 2 },
      { tier: 'diamond', threshold: 3 },
    ],
  },
  {
    id: 'marathon-raider',
    category: 'fun',
    name: 'Marathon Raider',
    description: 'Ein Raidabend, der vom ersten bis zum letzten Pull fünf Stunden dauerte.',
    metric: 'longestNightMs',
    unit: 'hours',
    steps: [
      { tier: 'gold', threshold: 4 * HOUR },
      { tier: 'diamond', threshold: 5 * HOUR },
    ],
  },
  {
    id: 'pull-addict',
    category: 'fun',
    name: 'Pull Addict',
    description: 'Pulls an einem einzigen Abend.',
    metric: 'maxPullsOneNight',
    unit: 'count',
    steps: [
      { tier: 'gold', threshold: 75 },
      { tier: 'diamond', threshold: 100 },
    ],
  },
  {
    id: 'night-shift',
    category: 'fun',
    name: 'Night Shift',
    description: 'Kampfzeit in Pulls, die zwischen Mitternacht und sechs Uhr begannen.',
    metric: 'lateNightCombatMs',
    unit: 'hours',
    steps: [
      { tier: 'bronze', threshold: 10 * HOUR },
      { tier: 'gold', threshold: 50 * HOUR },
      { tier: 'diamond', threshold: 100 * HOUR },
    ],
  },
  {
    id: 'old-guard',
    category: 'fun',
    name: 'Old Guard',
    description:
      'Schon an einem der allerersten gespeicherten Raidabende dabei. Kleiner ist besser.',
    metric: 'firstNightIndex',
    unit: 'count',
    steps: [{ tier: 'diamond', threshold: 5 }],
  },
];

/**
 * Achievements from the concept that are NOT awarded, and why.
 *
 * Listed rather than quietly dropped: a reader who proposed them should be
 * able to see what happened to each one. Several would require guessing at
 * data the logs do not state outright, which is exactly what this project does
 * not do.
 */
export const UNAWARDED_ACHIEVEMENTS: readonly { name: string; reason: string }[] = [
  {
    name: 'Benchwarmer, Comeback',
    reason:
      'Warcraft Logs kennt keine Bank. Wer nicht im Log steht, kann gebenched, krank oder im Urlaub gewesen sein — das ist aus den Daten nicht zu unterscheiden. Käme mit RaidBrain.',
  },
  {
    name: 'Mechanic Magnet, Friendly Fire Victim',
    reason:
      'Setzt voraus, dass eine Fähigkeit als „vermeidbar" oder „von Mitspielern verursacht" eingestuft wird. Das steht so in keinem Log und wäre geraten.',
  },
  {
    name: 'Consistency, Tier Dominator, Late Bloomer, Redemption Arc',
    reason:
      'Brauchen die zeitliche Reihenfolge einzelner Parses statt Summen. Machbar, aber eine eigene Auswertung — später.',
  },
  {
    name: 'Clutch, Last Man Standing, Speedrunner',
    reason:
      'Brauchen die Todesreihenfolge innerhalb eines Pulls und den Vergleich mit allen Kills desselben Bosses. Machbar, noch nicht gebaut.',
  },
  {
    name: 'Name Change Survivor, Expansion Loyalty',
    reason:
      'Hängen daran, dass Charaktere zu Personen verknüpft sind. Bisher hat genau eine Person ihre Charaktere beansprucht; sobald mehr zusammengeführt sind, werden sie sinnvoll.',
  },
];

// --- Evaluation -------------------------------------------------------------

export interface EarnedAchievement {
  definition: AchievementDefinition;
  /** Highest tier reached, or null if none. */
  tier: AchievementTier | null;
  /** The subject's value for the metric. */
  value: number;
  /** Threshold of the next tier, or null when the top is reached. */
  nextThreshold: number | null;
}

function meetsRequirements(
  definition: AchievementDefinition,
  metrics: SubjectMetrics,
): boolean {
  return (definition.requires ?? []).every((rule) => metrics[rule.metric] >= rule.threshold);
}

/**
 * The tier a subject has reached.
 *
 * `firstNightIndex` is the one metric where a SMALLER value is better — being
 * there from the start cannot be accumulated. It is compared the other way
 * round rather than inverted at the source, so the stored number stays the
 * plain "which night was your first".
 */
export function evaluate(
  definition: AchievementDefinition,
  metrics: SubjectMetrics,
): EarnedAchievement {
  const value = metrics[definition.metric];
  const lowerIsBetter = definition.metric === 'firstNightIndex';
  const qualifies = meetsRequirements(definition, metrics);

  let tier: AchievementTier | null = null;
  let nextThreshold: number | null = null;

  for (const step of definition.steps) {
    const reached = lowerIsBetter
      ? value > 0 && value <= step.threshold
      : value >= step.threshold;
    if (reached && qualifies) {
      tier = step.tier;
    } else if (nextThreshold === null) {
      nextThreshold = step.threshold;
    }
  }

  return { definition, tier, value, nextThreshold };
}

export function evaluateAll(
  metrics: SubjectMetrics,
  definitions: readonly AchievementDefinition[] = ACHIEVEMENTS,
): EarnedAchievement[] {
  return definitions.map((definition) => evaluate(definition, metrics));
}

/** An achievement plus how many of the measured subjects hold it. */
export interface AchievementRarity {
  /** Share of eligible subjects holding this achievement at all, 0..1. */
  share: number;
  holders: number;
  eligible: number;
}

export function rarityLabel(share: number): string {
  if (share <= 0.02) return 'Legendär';
  if (share <= 0.1) return 'Selten';
  if (share <= 0.3) return 'Ungewöhnlich';
  return 'Verbreitet';
}
