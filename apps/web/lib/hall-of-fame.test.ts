import { describe, expect, it } from 'vitest';
import { topHolders } from './hall-of-fame';

describe('topHolders', () => {
  // The bug this exists to prevent: 29 characters have a parse of 100, and
  // awarding "highest parse" to whichever one sorted first is a coin toss
  // dressed up as an honour.
  it('returns every holder sharing the top value', () => {
    const rows = [
      { name: 'A', value: 100 },
      { name: 'B', value: 100 },
      { name: 'C', value: 100 },
      { name: 'D', value: 99 },
    ];
    expect(topHolders(rows).map((r) => r.name)).toEqual(['A', 'B', 'C']);
  });

  it('returns a single holder when the top value is unique', () => {
    const rows = [
      { name: 'Daggerdenis', value: 12 },
      { name: 'Aventhiah', value: 6 },
    ];
    expect(topHolders(rows)).toHaveLength(1);
    expect(topHolders(rows)[0]?.name).toBe('Daggerdenis');
  });

  it('handles an empty result without inventing a holder', () => {
    expect(topHolders([])).toEqual([]);
  });

  it('ignores lower values that appear again later', () => {
    const rows = [
      { name: 'A', value: 5 },
      { name: 'B', value: 3 },
      { name: 'C', value: 5 },
    ];
    // Rows arrive ordered; an out-of-order duplicate must not sneak in.
    expect(topHolders(rows).map((r) => r.name)).toEqual(['A', 'C']);
  });
});
