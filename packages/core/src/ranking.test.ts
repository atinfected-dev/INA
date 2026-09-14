import { describe, expect, it } from 'vitest';
import {
  consistencyRating,
  parseMetric,
  rankByParseMetric,
  type ParseAggregate,
} from './ranking';

function aggregate(partial: Partial<ParseAggregate>): ParseAggregate {
  return {
    sampleSize: 1,
    bossCount: 1,
    bestPerBossMean: 0,
    best: 0,
    mean: 0,
    median: 0,
    stdDev: 0,
    count100: 0,
    count99: 0,
    count95plus: 0,
    count90plus: 0,
    count80plus: 0,
    ...partial,
  };
}

describe('rankByParseMetric', () => {
  // The case the whole fairness requirement exists for.
  it('keeps a single lucky 100 out of the rated average', () => {
    const rows = [
      { subject: 'Glückspilz', aggregate: aggregate({ sampleSize: 1, mean: 100, best: 100 }) },
      { subject: 'Stammraider', aggregate: aggregate({ sampleSize: 150, mean: 96.2, best: 99 }) },
    ];

    const rated = rankByParseMetric(rows, parseMetric('average'), 10);
    expect(rated).toHaveLength(1);
    expect(rated[0]?.subject).toBe('Stammraider');
  });

  it('still shows the lucky parse in the raw average, which has no threshold', () => {
    const rows = [
      { subject: 'Glückspilz', aggregate: aggregate({ sampleSize: 1, mean: 100 }) },
      { subject: 'Stammraider', aggregate: aggregate({ sampleSize: 150, mean: 96.2 }) },
    ];

    const raw = rankByParseMetric(rows, parseMetric('averageRaw'), 10);
    expect(raw.map((r) => r.subject)).toEqual(['Glückspilz', 'Stammraider']);
  });

  it('breaks ties in favour of the larger sample', () => {
    const rows = [
      { subject: 'Wenig', aggregate: aggregate({ sampleSize: 12, mean: 90 }) },
      { subject: 'Viel', aggregate: aggregate({ sampleSize: 200, mean: 90 }) },
    ];

    const ranked = rankByParseMetric(rows, parseMetric('average'), 10);
    expect(ranked[0]?.subject).toBe('Viel');
  });

  it('ranks the steadier player above the streakier one at equal means', () => {
    const steady = aggregate({ sampleSize: 50, mean: 90, stdDev: 3 });
    const streaky = aggregate({ sampleSize: 50, mean: 90, stdDev: 20 });

    const ranked = rankByParseMetric(
      [
        { subject: 'Schwankend', aggregate: streaky },
        { subject: 'Konstant', aggregate: steady },
      ],
      parseMetric('consistency'),
      10,
    );

    expect(ranked[0]?.subject).toBe('Konstant');
    expect(ranked[0]?.value).toBe(87);
  });

  it('reports the sample size alongside every value', () => {
    const ranked = rankByParseMetric(
      [{ subject: 'A', aggregate: aggregate({ sampleSize: 37, mean: 80 }) }],
      parseMetric('average'),
      10,
    );
    expect(ranked[0]?.sampleSize).toBe(37);
  });
});

describe('bestPerBoss', () => {
  // The metric raiders recognise: Warcraft Logs averages the best parse per
  // boss, not every kill. Mixing the two up made the leaderboard look wrong.
  it('ranks by the best-per-boss average, not the all-kills average', () => {
    const rows = [
      {
        subject: 'Farmt viel',
        aggregate: aggregate({ sampleSize: 300, mean: 55, bestPerBossMean: 95 }),
      },
      {
        subject: 'Spielt selten, aber sauber',
        aggregate: aggregate({ sampleSize: 120, mean: 78, bestPerBossMean: 84 }),
      },
    ];

    expect(rankByParseMetric(rows, parseMetric('bestPerBoss'), 100)[0]?.subject).toBe('Farmt viel');
    // The harsher metric orders them the other way round — both are shown.
    expect(rankByParseMetric(rows, parseMetric('average'), 100)[0]?.subject).toBe(
      'Spielt selten, aber sauber',
    );
  });
});

describe('consistencyRating', () => {
  it('is the mean when performance never varies', () => {
    expect(consistencyRating(94.8, 0)).toBe(94.8);
  });

  it('penalises spread', () => {
    expect(consistencyRating(90, 12)).toBe(78);
  });
});

describe('parseMetric', () => {
  it('rejects an unknown key rather than silently ranking by nothing', () => {
    expect(() => parseMetric('erfunden')).toThrow(/Unknown parse metric/);
  });

  it('documents a formula for every metric', () => {
    for (const key of [
      'bestPerBoss',
      'average',
      'averageRaw',
      'consistency',
      'median',
      'best',
    ] as const) {
      expect(parseMetric(key).formula.length).toBeGreaterThan(20);
    }
  });
});
