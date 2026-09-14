import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  type SubjectMetrics,
  evaluate,
  evaluateAll,
  rarityLabel,
} from './achievements';

const empty: SubjectMetrics = {
  combatMs: 0,
  raidTimeMs: 0,
  pulls: 0,
  bossKills: 0,
  nights: 0,
  wipes: 0,
  expansions: 0,
  zones: 0,
  bossesKilled: 0,
  progressPulls: 0,
  firstKills: 0,
  heroicKills: 0,
  maxPullsOneBoss: 0,
  parses75: 0,
  parses90: 0,
  parses95: 0,
  parses99: 0,
  parses100: 0,
  bosses90: 0,
  damageDone: 0,
  healingDone: 0,
  damageTaken: 0,
  interrupts: 0,
  dispels: 0,
  deaths: 0,
  fightsDied: 0,
  firstDeaths: 0,
  killsWithoutDeath: 0,
  nightsWithoutDeath: 0,
  attendanceStreak: 0,
  classes: 0,
  maxKillsOneClass: 0,
  maxCombatMsOneClass: 0,
  charactersWithKills: 0,
  realms: 0,
  mergedCharacters: 0,
  longestNightMs: 0,
  maxPullsOneNight: 0,
  lateNightCombatMs: 0,
  firstNightIndex: 0,
};

const find = (id: string) => {
  const definition = ACHIEVEMENTS.find((entry) => entry.id === id);
  if (!definition) throw new Error(`no such achievement: ${id}`);
  return definition;
};

describe('evaluate', () => {
  it('awards the highest tier reached, not the first', () => {
    const result = evaluate(find('pull-machine'), { ...empty, pulls: 2400 });
    expect(result.tier).toBe('platinum');
    expect(result.nextThreshold).toBe(5000);
  });

  it('awards nothing below the first step and points at it', () => {
    const result = evaluate(find('pull-machine'), { ...empty, pulls: 249 });
    expect(result.tier).toBeNull();
    expect(result.nextThreshold).toBe(250);
  });

  it('reports no next threshold once the top tier is held', () => {
    const result = evaluate(find('pull-machine'), { ...empty, pulls: 9000 });
    expect(result.tier).toBe('diamond');
    expect(result.nextThreshold).toBeNull();
  });

  it('withholds a combined award until every condition is met', () => {
    const hours = 1200 * 3_600_000;
    // Enough time at the raid, but nowhere near the pulls and kills it also asks for.
    const short = evaluate(find('raid-legend'), { ...empty, raidTimeMs: hours, pulls: 100 });
    expect(short.tier).toBeNull();

    const full = evaluate(find('raid-legend'), {
      ...empty,
      raidTimeMs: hours,
      pulls: 2000,
      bossKills: 500,
    });
    expect(full.tier).toBe('gold');
  });

  it('treats an early first night as better, not worse', () => {
    // The one metric where smaller wins: being there from the start.
    expect(evaluate(find('old-guard'), { ...empty, firstNightIndex: 3 }).tier).toBe('diamond');
    expect(evaluate(find('old-guard'), { ...empty, firstNightIndex: 40 }).tier).toBeNull();
    // Zero means "never attended", which must not read as the earliest night.
    expect(evaluate(find('old-guard'), { ...empty, firstNightIndex: 0 }).tier).toBeNull();
  });

  it('gives a brand new raider nothing at all', () => {
    expect(evaluateAll(empty).every((entry) => entry.tier === null)).toBe(true);
  });

  it('has unique ids, so nothing silently shadows another', () => {
    const ids = ACHIEVEMENTS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lists every set of steps in ascending order', () => {
    // A descending step would make the "highest tier reached" loop award the
    // wrong one without ever failing loudly.
    for (const definition of ACHIEVEMENTS) {
      const thresholds = definition.steps.map((step) => step.threshold);
      expect(thresholds).toEqual([...thresholds].sort((a, b) => a - b));
    }
  });
});

describe('rarityLabel', () => {
  it('calls two percent legendary and half the guild common', () => {
    expect(rarityLabel(0.02)).toBe('Legendär');
    expect(rarityLabel(0.08)).toBe('Selten');
    expect(rarityLabel(0.25)).toBe('Ungewöhnlich');
    expect(rarityLabel(0.5)).toBe('Verbreitet');
  });
});
