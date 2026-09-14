import { describe, expect, it } from 'vitest';
import { sumByActor } from './interrupts';

/**
 * Shaped after a real response from the live API (report x1HnJgZKTfFpraYb).
 *
 * The nesting is the point, and it is unlike every other table: `data.entries`
 * holds a WRAPPER, the wrapper holds the abilities that were interrupted, and
 * the players hang under each ability. Reading it one level too shallow costs
 * nothing loudly — it simply writes zeroes everywhere, which is how it was
 * caught here.
 */
const table = {
  data: {
    totalTime: 366_000,
    entries: [
      {
        entries: [
          {
            name: 'Forbidden Magic',
            guid: 145_230,
            details: [
              { name: 'Seyhres', id: 9, type: 'Warlock', total: 1 },
              { name: 'Xarnak', id: 25, type: 'Warrior', total: 1 },
              { name: 'Idonuts', id: 13, type: 'Paladin', total: 1 },
            ],
          },
          {
            name: 'Summon Shadow Vortex',
            guid: 145_235,
            details: [
              { name: 'Xarnak', id: 25, type: 'Warrior', total: 3 },
              { name: 'Seyhres', id: 9, type: 'Warlock', total: 2 },
            ],
          },
        ],
      },
    ],
  },
};

describe('sumByActor', () => {
  it('adds a player up across every ability they interrupted', () => {
    const totals = sumByActor(table);
    expect(totals.get(25)).toBe(4);
    expect(totals.get(9)).toBe(3);
    expect(totals.get(13)).toBe(1);
  });

  it('counts nobody who is not in the table', () => {
    expect(sumByActor(table).get(999)).toBeUndefined();
  });

  it('also reads the shape without the wrapper level', () => {
    // Tolerated rather than required, so a flattened response would still be
    // read correctly instead of silently counting nothing.
    const flat = {
      data: { entries: [{ name: 'Whatever', details: [{ id: 4, total: 6 }] }] },
    };
    expect(sumByActor(flat).get(4)).toBe(6);
  });

  it('returns nothing rather than guessing when the shape is unfamiliar', () => {
    expect(sumByActor(null).size).toBe(0);
    expect(sumByActor({}).size).toBe(0);
    expect(sumByActor({ data: {} }).size).toBe(0);
    expect(sumByActor({ data: { entries: 'nope' } }).size).toBe(0);
    expect(sumByActor({ data: { entries: [{ entries: 'nope' }] } }).size).toBe(0);
  });

  it('skips entries whose actor or total is missing', () => {
    const partial = {
      data: {
        entries: [
          {
            entries: [
              {
                details: [{ id: 7, total: 2 }, { id: null, total: 5 }, { id: 8 }],
              },
            ],
          },
        ],
      },
    };
    const totals = sumByActor(partial);
    expect(totals.get(7)).toBe(2);
    expect(totals.size).toBe(1);
  });
});
