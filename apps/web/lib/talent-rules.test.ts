import { describe, expect, it } from 'vitest';
import {
  add,
  blockedReason,
  canRemove,
  decodeBuild,
  encodeBuild,
  pointsTotal,
  remove,
  requiredLevel,
  type ClassTalents,
  type Ranks,
} from './talent-rules';
import warrior from '../data/talents/warrior.json';

const data = warrior as ClassTalents;
const { rules, trees } = data;
const arms = trees[0]!;
const byId = (id: string) => arms.talents.find((t) => t.id === id)!;

function fill(ranks: Ranks, ids: [string, number][]): Ranks {
  let next = ranks;
  for (const [id, n] of ids) next = add(trees, rules, next, arms, byId(id), n);
  return next;
}

describe('talent rules (warrior, arms)', () => {
  it('opens a row only after five points per row above it', () => {
    const rowOne = arms.talents.find((t) => t.row === 1)!;
    expect(blockedReason(trees, rules, {}, arms, rowOne)).toBe('row');
    const firstRow = arms.talents.filter((t) => t.row === 0);
    const ranks = fill({}, firstRow.map((t) => [t.id, t.maxRank]));
    expect(pointsTotal(trees, ranks)).toBeGreaterThanOrEqual(5);
    expect(blockedReason(trees, rules, ranks, arms, rowOne)).toBeNull();
  });

  it('enforces prerequisites and protects them from removal', () => {
    const dependant = arms.talents.find((t) => t.requires)!;
    const prereq = byId(dependant.requires!.talent);
    // Enough points above both rows, prerequisite still empty.
    let ranks: Ranks = {};
    for (const t of arms.talents.filter((x) => x.row < dependant.row && x.id !== prereq.id)) {
      ranks = add(trees, rules, ranks, arms, t, t.maxRank);
    }
    expect(blockedReason(trees, rules, ranks, arms, dependant)).toBe('prerequisite');
    ranks = add(trees, rules, ranks, arms, prereq, prereq.maxRank);
    expect(blockedReason(trees, rules, ranks, arms, dependant)).toBeNull();
    ranks = add(trees, rules, ranks, arms, dependant);
    expect(canRemove(arms, rules, ranks, prereq)).toBe(false);
    ranks = remove(arms, rules, ranks, dependant);
    expect(canRemove(arms, rules, ranks, prereq)).toBe(true);
  });

  it('never exceeds 51 points and reports level 60 at the cap', () => {
    let ranks: Ranks = {};
    for (const tree of trees) {
      for (const t of [...tree.talents].sort((a, b) => a.row - b.row || a.col - b.col)) {
        ranks = add(trees, rules, ranks, tree, t, t.maxRank);
      }
    }
    expect(pointsTotal(trees, ranks)).toBe(51);
    expect(requiredLevel(rules, 51)).toBe(60);
    expect(requiredLevel(rules, 0)).toBe(1);
    expect(requiredLevel(rules, 1)).toBe(10);
  });

  it('round-trips a build through its code and drops what the rules refuse', () => {
    const ranks = fill({}, [
      ['improved-heroic-strike', 3],
      ['deflection', 2],
      ['improved-rend', 3],
    ]);
    const code = encodeBuild(trees, ranks);
    expect(code.startsWith('323')).toBe(true);
    expect(decodeBuild(trees, rules, code)).toEqual(ranks);
    // A digit deep in the tree with nothing above it is not a build.
    const bogus = `${'0'.repeat(10)}5--`;
    expect(pointsTotal(trees, decodeBuild(trees, rules, bogus))).toBe(0);
  });
});
