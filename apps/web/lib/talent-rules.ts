/**
 * The talent rules, as pure functions.
 *
 * Classic's rules, assumed for Forever until Blizzard says otherwise: 51
 * points from level 10 to 60, each row of a tree opens after five points in
 * that tree, a prerequisite must be trained before its dependant, and a
 * point can only be taken out again if nothing above it would lose its
 * footing. The calculator and the build-link decoder both go through here,
 * so a link can never describe a build the rules would not allow.
 */

export type TalentStatus = 'new' | 'changed' | 'moved' | 'unchanged' | 'removed';

export interface Talent {
  id: string;
  name: string;
  icon: string;
  row: number;
  col: number;
  maxRank: number;
  /** One rendered description per rank. */
  ranks: string[];
  requires?: { talent: string; rank: number };
  status?: TalentStatus;
  /** What the Classic Era talent said, when Forever changed it. */
  classic?: { name: string; maxRank: number; ranks: string[] };
  caveats?: ('ranks' | 'reading')[];
}

export interface Tree {
  id: string;
  name: string;
  icon?: string;
  talents: Talent[];
}

export interface Rules {
  maxPoints: number;
  pointsPerRow: number;
  firstPointLevel: number;
  maxLevel: number;
}

export interface ClassTalents {
  class: string;
  name: string;
  rules: Rules;
  trees: Tree[];
  classic: { build: string; trees: Tree[] };
}

/** Points per talent id. Talent ids are unique within a class. */
export type Ranks = Record<string, number>;

export const ROWS = 7;
export const COLS = 4;

export function treeOf(trees: Tree[], talentId: string): Tree | undefined {
  return trees.find((tree) => tree.talents.some((t) => t.id === talentId));
}

export function pointsIn(tree: Tree, ranks: Ranks): number {
  return tree.talents.reduce((sum, t) => sum + (ranks[t.id] ?? 0), 0);
}

export function pointsTotal(trees: Tree[], ranks: Ranks): number {
  return trees.reduce((sum, tree) => sum + pointsIn(tree, ranks), 0);
}

/** Points spent in rows above the given one, within a tree. */
function pointsAbove(tree: Tree, ranks: Ranks, row: number): number {
  return tree.talents.filter((t) => t.row < row).reduce((sum, t) => sum + (ranks[t.id] ?? 0), 0);
}

export function requiredLevel(rules: Rules, spent: number): number {
  return spent === 0 ? 1 : Math.min(rules.maxLevel, rules.firstPointLevel + spent - 1);
}

/** Why a talent cannot take another point right now, or null if it can. */
export function blockedReason(
  trees: Tree[],
  rules: Rules,
  ranks: Ranks,
  tree: Tree,
  talent: Talent,
): string | null {
  if ((ranks[talent.id] ?? 0) >= talent.maxRank) return 'maxed';
  if (pointsTotal(trees, ranks) >= rules.maxPoints) return 'no-points';
  const needed = talent.row * rules.pointsPerRow;
  if (pointsAbove(tree, ranks, talent.row) < needed) return 'row';
  if (talent.requires && (ranks[talent.requires.talent] ?? 0) < talent.requires.rank) return 'prerequisite';
  return null;
}

/** Whether every point in the tree still stands on solid ground. */
function treeValid(tree: Tree, rules: Rules, ranks: Ranks): boolean {
  for (const t of tree.talents) {
    const r = ranks[t.id] ?? 0;
    if (r === 0) continue;
    if (r > t.maxRank) return false;
    if (pointsAbove(tree, ranks, t.row) < t.row * rules.pointsPerRow) return false;
    if (t.requires && (ranks[t.requires.talent] ?? 0) < t.requires.rank) return false;
  }
  return true;
}

export function canRemove(tree: Tree, rules: Rules, ranks: Ranks, talent: Talent): boolean {
  const r = ranks[talent.id] ?? 0;
  if (r === 0) return false;
  return treeValid(tree, rules, { ...ranks, [talent.id]: r - 1 });
}

export function add(trees: Tree[], rules: Rules, ranks: Ranks, tree: Tree, talent: Talent, count = 1): Ranks {
  let next = ranks;
  for (let i = 0; i < count; i += 1) {
    if (blockedReason(trees, rules, next, tree, talent)) break;
    next = { ...next, [talent.id]: (next[talent.id] ?? 0) + 1 };
  }
  return next;
}

export function remove(tree: Tree, rules: Rules, ranks: Ranks, talent: Talent, count = 1): Ranks {
  let next = ranks;
  for (let i = 0; i < count; i += 1) {
    if (!canRemove(tree, rules, next, talent)) break;
    next = { ...next, [talent.id]: (next[talent.id] ?? 0) - 1 };
  }
  return next;
}

export function resetTree(tree: Tree, ranks: Ranks): Ranks {
  const next = { ...ranks };
  for (const t of tree.talents) delete next[t.id];
  return next;
}

// --- Build codes -------------------------------------------------------------
//
// One decimal digit per talent, trees in order and row-major within a tree,
// joined with "-", trailing zeros dropped: `05320-0-3102`. The same shape
// Wowhead and the other Forever calculators use, so a link stays short and
// readable and can be typed into a chat.

function ordered(tree: Tree): Talent[] {
  return [...tree.talents].sort((a, b) => a.row - b.row || a.col - b.col);
}

export function encodeBuild(trees: Tree[], ranks: Ranks): string {
  return trees
    .map((tree) =>
      ordered(tree)
        .map((t) => String(ranks[t.id] ?? 0))
        .join('')
        .replace(/0+$/, ''),
    )
    .join('-');
}

/**
 * Decodes a code by replaying it through the rules. Digits that the rules
 * refuse are dropped rather than trusted, so a hand-edited or stale link
 * yields the largest legal build it contains.
 */
export function decodeBuild(trees: Tree[], rules: Rules, code: string): Ranks {
  const parts = code.split('-');
  const wanted: { tree: Tree; talent: Talent; rank: number }[] = [];
  trees.forEach((tree, i) => {
    const digits = parts[i] ?? '';
    ordered(tree).forEach((talent, j) => {
      const rank = Number(digits[j] ?? '0');
      if (Number.isInteger(rank) && rank > 0) wanted.push({ tree, talent, rank: Math.min(rank, talent.maxRank) });
    });
  });

  // Rows fill top-down, but a same-row prerequisite may sit to the right of
  // its dependant; keep passing until nothing more can be placed.
  let ranks: Ranks = {};
  let progress = true;
  while (progress) {
    progress = false;
    for (const w of wanted) {
      while ((ranks[w.talent.id] ?? 0) < w.rank && !blockedReason(trees, rules, ranks, w.tree, w.talent)) {
        ranks = { ...ranks, [w.talent.id]: (ranks[w.talent.id] ?? 0) + 1 };
        progress = true;
      }
    }
  }
  return ranks;
}

export function isBuildCode(value: string): boolean {
  return /^[0-9]{0,40}(-[0-9]{0,40}){0,2}$/.test(value);
}
