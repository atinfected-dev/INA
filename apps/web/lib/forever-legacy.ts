/**
 * The Legacy tree: Forever's second progression beside class talents.
 *
 * Legacy Points come from things an account does anyway — reaching 25, 45
 * and 60 with a class, profession milestones, challenges while levelling and
 * exploring. The pool is account-wide, the spend is per character, and at
 * launch a character can commit 16 of roughly 65 earnable points. Points past
 * the cap feed a reward track of cosmetics and prestige, kept away from
 * power on purpose.
 *
 * Nodes and rank counts are what the BlizzCon 2026 show floor displayed;
 * effects are our German summary of the rank-1 tooltip. Seven nodes were
 * placeholders in the demo itself ("to be added in future patch content"),
 * and one node in the professions column was never hovered.
 */

export interface LegacyNode {
  id: string;
  name: string;
  ranks: number;
  icon: string;
  /** Rank-1 effect, in our words. Absent for the demo's placeholders. */
  effect?: string;
  /** Cast time / cooldown notes for the one active node. */
  note?: string;
}

export interface LegacyCategory {
  id: 'professions' | 'adventure' | 'resourcefulness';
  name: string;
  tagline: string;
  icon: string;
  nodes: LegacyNode[];
}

export const LEGACY_RULES = {
  spendableAtLaunch: 16,
  earnableApprox: 65,
  shownCharacterLevel: 38,
  shownCharacterPoints: 4,
} as const;

const placeholder = (n: number): LegacyNode => ({ id: `unknown-${n}`, name: 'Unbekannt', ranks: 1, icon: 'inv_misc_questionmark' });

export const LEGACY_TREE: LegacyCategory[] = [
  {
    id: 'professions',
    name: 'Berufe',
    tagline: 'Sammeln, Handwerk und Handel ergiebiger machen.',
    icon: 'inv_hammer_20',
    nodes: [
      { id: 'working-overtime', name: 'Working Overtime', ranks: 5, icon: 'inv_misc_book_11', effect: 'Fertigkeitsanstiege bei allen Haupt-, Neben- und Klassenberufen kommen 4 % häufiger.' },
      { id: 'bountiful-harvest', name: 'Bountiful Harvest', ranks: 5, icon: 'inv_misc_herb_08', effect: 'Bergbau, Kräuterkunde und Kürschnerei liefern 20 % mehr seltene Materialien.' },
      { id: 'master-chef', name: 'Master Chef', ranks: 5, icon: 'inv_misc_food_15', effect: 'Kochrezepte ergeben mit 10 % Chance ein zusätzliches Ergebnis.' },
      { id: 'performance-bonus', name: 'Performance Bonus', ranks: 3, icon: 'inv_misc_coin_02', effect: 'Beim Abgeben einer Kiste an die Handelsbehörde von Azeroth oder Durotars Versorgung und Logistik mit 5 % Chance doppelte Gunst des Händlers.' },
      { id: 'luremaster', name: 'Luremaster', ranks: 2, icon: 'trade_fishing', effect: 'Mit aktivem Köder beim Angeln mit 25 % Chance ein zweiter Fisch.' },
      { id: 'dedicated-study', name: 'Dedicated Study', ranks: 1, icon: 'inv_misc_book_09', effect: 'Erhöht den niedrigsten eurer Haupt- und Nebenberufe um 1 Fertigkeitspunkt. Steht alles auf 300, gibt es stattdessen 2 bis 4 zufällige Elementaressenzen.', note: '25 Sek. Zauberzeit · 23 Stunden Abklingzeit' },
      placeholder(1),
      placeholder(2),
      { id: 'unread', name: 'Nicht gezeigt', ranks: 1, icon: 'inv_misc_questionmark', effect: 'Ein Knoten in dieser Spalte wurde im Stream nie angefahren — Name und Wirkung sind unbekannt.' },
    ],
  },
  {
    id: 'adventure',
    name: 'Abenteuer',
    tagline: 'Leveln, Reisen und Erkunden erleichtern.',
    icon: 'inv_misc_map02',
    nodes: [
      { id: 'well-rested', name: 'Well Rested', ranks: 5, icon: 'spell_nature_sleep', effect: 'Ausgeruhte Erfahrung sammelt sich 4 % schneller, die Obergrenze steigt um 4 %.' },
      { id: 'talented', name: 'Talented', ranks: 5, icon: 'spell_holy_greaterblessingofkings', effect: 'Talentpunkte gibt es ab Stufe 9 statt 10 — insgesamt bleiben es höchstens 51.' },
      { id: 'field-guide', name: 'Field Guide', ranks: 3, icon: 'inv_misc_map_01', effect: 'Die Abklingzeit beim Hinzufügen von Lagerobjekten sinkt um 8 %.' },
      { id: 'field-medicine', name: 'Field Medicine', ranks: 2, icon: 'inv_misc_bandage_12', effect: 'Nach einem Verband endet „Kürzlich verbunden" 5 Sekunden früher. Wirkt nicht in Dungeons, Schlachtzügen und Schlachtfeldern.' },
      { id: 'frequent-flier', name: 'Frequent Flier', ranks: 1, icon: 'ability_mount_gryphon_01', effect: 'Flugpunkte kosten die Hälfte, der Flug ist 20 % schneller.' },
      placeholder(3),
      placeholder(4),
      placeholder(5),
    ],
  },
  {
    id: 'resourcefulness',
    name: 'Findigkeit',
    tagline: 'Wiederkehrende Reibung aus dem Alltag nehmen.',
    icon: 'inv_misc_bag_08',
    nodes: [
      { id: 'gourmand', name: 'Gourmand', ranks: 3, icon: 'inv_misc_food_64', effect: 'Stärkungen durch Essen halten 33 % länger.' },
      { id: 'reinforce', name: 'Reinforce', ranks: 5, icon: 'inv_misc_armorkit_17', effect: 'Beim Tod 8 % weniger Haltbarkeitsverlust.' },
      { id: 'reagent-economy', name: 'Reagent Economy', ranks: 1, icon: 'inv_misc_dust_02', effect: 'Klassenfähigkeiten brauchen keine beim Händler gekauften Reagenzien mehr; Lagerobjekte der Stufe 1 kosten keine Reagenzien.' },
      { id: 'permanence', name: 'Permanence', ranks: 2, icon: 'spell_holy_championsbond', effect: 'Langlebige Gruppen- und Schlachtzugsstärkungen halten 50 % länger, ebenso die Stärkungen vom Rasten am Lager.' },
      { id: 'for-great-honor', name: 'For Great Honor', ranks: 5, icon: 'inv_misc_tournaments_banner_orc', effect: 'Ehrenpunkte um 2 % erhöht.' },
      placeholder(6),
      placeholder(7),
    ],
  },
];

export function legacyIconUrl(icon: string): string {
  return `https://render.worldofwarcraft.com/eu/icons/56/${icon}.jpg`;
}

// --- Allocation ----------------------------------------------------------------
//
// One digit per node in tree order, categories joined with "-": `5300-...`.
// Only the cap is known; no node has shown a prerequisite, so none is enforced.

export type LegacyRanks = Record<string, number>;

export function legacySpent(ranks: LegacyRanks): number {
  return Object.values(ranks).reduce((sum, n) => sum + n, 0);
}

export function encodeLegacy(ranks: LegacyRanks): string {
  return LEGACY_TREE.map((c) => c.nodes.map((n) => String(ranks[n.id] ?? 0)).join('').replace(/0+$/, ''))
    .join('-')
    .replace(/-+$/, '');
}

export function decodeLegacy(code: string): LegacyRanks {
  const parts = code.split('-');
  const ranks: LegacyRanks = {};
  let spent = 0;
  LEGACY_TREE.forEach((category, i) => {
    const digits = parts[i] ?? '';
    category.nodes.forEach((node, j) => {
      const want = Math.min(Number(digits[j] ?? '0') || 0, node.effect ? node.ranks : 0);
      const take = Math.min(want, LEGACY_RULES.spendableAtLaunch - spent);
      if (take > 0) {
        ranks[node.id] = take;
        spent += take;
      }
    });
  });
  return ranks;
}
