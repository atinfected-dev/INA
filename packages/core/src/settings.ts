/**
 * Configurable behaviour, in one place.
 *
 * Everything here is stored in the `Setting` table and editable in the admin
 * UI. The defaults below are what a fresh install starts with — they are not
 * the authority once a row exists.
 *
 * These values are quoted verbatim in the "how is this calculated" popovers,
 * so a change in the admin UI changes both the numbers and their explanation.
 */

export interface AppSettings {
  /**
   * Minimum number of ranked kills before a player appears in an *averaged*
   * leaderboard. Raw leaderboards ignore this and are shown alongside, so the
   * threshold is a labelled filter rather than a hidden one.
   *
   * 100 is a guild decision, not a statistical one: it keeps the list to
   * raiders with a real body of work behind them. At this level 172 damage
   * dealers and 44 healers qualify from the imported history.
   */
  minKillsForAverage: number;

  /**
   * A player counts as present at a raid night once either threshold is met.
   * Two thresholds rather than one, because a short raid and a long raid need
   * different yardsticks.
   */
  attendanceMinMinutes: number;
  /** Share of the session, 0..1. */
  attendanceMinParticipation: number;

  /**
   * Reports of the same guild closer together than this belong to one raid
   * night. Raid leaders routinely split a night into several logs.
   */
  sessionGapHours: number;

  /**
   * Incremental syncs re-scan this far back before the newest known report, so
   * logs uploaded days after the raid are still picked up.
   */
  syncOverlapHours: number;

  /** Titles shown on the Hall of Fame. Freely editable. */
  hallOfFameTitles: HallOfFameTitle[];
}

export interface HallOfFameTitle {
  /** Stable key; the metric it is awarded for. */
  id: string;
  title: string;
  subtitle: string;
  /** Metric key from METRICS. */
  metric: string;
  /** Whether the highest or lowest value wins. */
  direction: 'highest' | 'lowest';
}

export const DEFAULT_SETTINGS: AppSettings = {
  minKillsForAverage: 100,
  attendanceMinMinutes: 30,
  attendanceMinParticipation: 0.25,
  sessionGapHours: 8,
  syncOverlapHours: 72,
  hallOfFameTitles: [
    {
      id: 'parse-machine',
      title: 'Parse Machine',
      subtitle: 'Die meisten Parses ab 99',
      metric: 'parse.count99plus',
      direction: 'highest',
    },
    {
      id: 'sharpshooter',
      title: 'Scharfrichter',
      subtitle: 'Die meisten Parses von genau 100',
      // Deliberately not "highest parse": 29 characters have hit 100, so that
      // title would be a 29-way tie decided by sort order.
      metric: 'parse.count100',
      direction: 'highest',
    },
    {
      id: 'floor-inspector',
      title: 'Floor Inspector',
      subtitle: 'Die meisten Tode',
      metric: 'deaths.total',
      direction: 'highest',
    },
    {
      id: 'progress-veteran',
      title: 'Progress Veteran',
      subtitle: 'Die meisten Wipes mitgemacht',
      metric: 'wipes.total',
      direction: 'highest',
    },
    {
      id: 'evergreen',
      title: 'Dauerbrenner',
      subtitle: 'Die meisten Raidabende',
      metric: 'attendance.nights',
      direction: 'highest',
    },
    {
      id: 'bosskiller',
      title: 'Bosskiller',
      subtitle: 'Die meisten Bosskills',
      metric: 'kills.total',
      direction: 'highest',
    },
    {
      id: 'damage-dealer',
      title: 'Schadensmaschine',
      subtitle: 'Der meiste Schaden über alle Jahre',
      metric: 'damage.total',
      direction: 'highest',
    },
    {
      id: 'lifesaver',
      title: 'Lebensretter',
      subtitle: 'Die meiste Heilung über alle Jahre',
      metric: 'healing.total',
      direction: 'highest',
    },
  ],
};

export const SETTINGS_KEY = 'app' as const;
