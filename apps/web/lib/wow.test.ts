import { describe, expect, it } from 'vitest';
import { classVar, parseBracket } from './wow';

describe('classVar', () => {
  // Warcraft Logs spells this without a space, which previously left every
  // Death Knight rendered in the default text colour.
  it('colours Death Knights whatever the spelling', () => {
    const expected = 'var(--class-death-knight)';
    for (const spelling of ['DeathKnight', 'Death Knight', 'death knight', 'DEATHKNIGHT']) {
      expect(classVar(spelling)).toBe(expected);
    }
  });

  it('colours every known class', () => {
    for (const name of ['Mage', 'Warlock', 'Monk', 'Paladin', 'Shaman']) {
      expect(classVar(name)).toBe(`var(--class-${name.toLowerCase()})`);
    }
  });

  it('falls back for an unknown or missing class', () => {
    expect(classVar('Unknown')).toBe('var(--text-primary)');
    expect(classVar(null)).toBe('var(--text-primary)');
    expect(classVar('')).toBe('var(--text-primary)');
  });
});

describe('parseBracket', () => {
  it('follows the Warcraft Logs colour convention', () => {
    expect(parseBracket(100).cssVar).toBe('--q-artifact');
    expect(parseBracket(99).cssVar).toBe('--q-astounding');
    expect(parseBracket(95).cssVar).toBe('--q-legendary');
    expect(parseBracket(75).cssVar).toBe('--q-epic');
    expect(parseBracket(50).cssVar).toBe('--q-rare');
    expect(parseBracket(25).cssVar).toBe('--q-uncommon');
    expect(parseBracket(0).cssVar).toBe('--q-poor');
  });

  it('never returns undefined, even for nonsense input', () => {
    expect(parseBracket(-5).cssVar).toBe('--q-poor');
    expect(parseBracket(Number.NaN).cssVar).toBe('--q-poor');
  });
});
