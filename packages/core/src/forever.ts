/**
 * World of Warcraft: Forever — what is known, as data.
 *
 * Announced at BlizzCon on 12 September 2026, beta from 17 September, launch
 * on 4 November 2026. A new branch of the game built on the original 2004
 * setting, level cap 60, with new zones, quests, dungeons and raids, one new
 * race and a handful of new race/class pairings.
 *
 * Everything here is the state of the announcement. The race/class table is
 * compiled from Blizzard's reveal and the coverage of it; the pairings marked
 * `isNew` are the ones Blizzard has shown or named. Until launch this can
 * still move, and the page says so.
 */

export const FOREVER_DATES = {
  announced: '2026-09-12',
  beta: '2026-09-17',
  release: '2026-11-04',
} as const;

export type Faction = 'alliance' | 'horde';

export const FACTION_LABELS: Record<Faction, string> = {
  alliance: 'Allianz',
  horde: 'Horde',
};

export const FOREVER_CLASSES = [
  'Warrior',
  'Paladin',
  'Hunter',
  'Rogue',
  'Priest',
  'Shaman',
  'Mage',
  'Warlock',
  'Druid',
] as const;
export type ForeverClass = (typeof FOREVER_CLASSES)[number];

export const CLASS_LABELS: Record<ForeverClass, string> = {
  Warrior: 'Krieger',
  Paladin: 'Paladin',
  Hunter: 'Jäger',
  Rogue: 'Schurke',
  Priest: 'Priester',
  Shaman: 'Schamane',
  Mage: 'Magier',
  Warlock: 'Hexenmeister',
  Druid: 'Druide',
};

export const FOREVER_ROLES = ['Tank', 'Heiler', 'Schaden'] as const;
export type ForeverRole = (typeof FOREVER_ROLES)[number];

export interface ForeverRace {
  id: string;
  name: string;
  /** Neutral races pick a faction at creation. */
  faction: Faction | 'neutral';
  /** Icon slug on Blizzard's render CDN (`achievement_character_<slug>_male`), or null. */
  icon: string | null;
  /** Classes playable regardless of faction. */
  classes: readonly ForeverClass[];
  /** Extra classes that depend on the faction chosen (neutral races only). */
  byFaction?: Partial<Record<Faction, readonly ForeverClass[]>>;
  /** Pairings new in Forever, for the badge. */
  newClasses: readonly ForeverClass[];
  isNewRace?: boolean;
}

export const FOREVER_RACES: readonly ForeverRace[] = [
  // --- Alliance -----------------------------------------------------------
  {
    id: 'human',
    name: 'Mensch',
    faction: 'alliance',
    icon: 'human',
    classes: ['Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Mage', 'Warlock'],
    newClasses: ['Hunter'],
  },
  {
    id: 'dwarf',
    name: 'Zwerg',
    faction: 'alliance',
    icon: 'dwarf',
    classes: ['Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Shaman'],
    newClasses: ['Shaman'],
  },
  {
    id: 'nightelf',
    name: 'Nachtelf',
    faction: 'alliance',
    icon: 'nightelf',
    classes: ['Warrior', 'Hunter', 'Rogue', 'Priest', 'Druid'],
    newClasses: [],
  },
  {
    id: 'gnome',
    name: 'Gnom',
    faction: 'alliance',
    icon: 'gnome',
    classes: ['Warrior', 'Rogue', 'Priest', 'Mage', 'Warlock'],
    newClasses: ['Priest'],
  },
  // --- Horde --------------------------------------------------------------
  {
    id: 'orc',
    name: 'Orc',
    faction: 'horde',
    icon: 'orc',
    classes: ['Warrior', 'Hunter', 'Rogue', 'Shaman', 'Mage', 'Warlock'],
    newClasses: ['Mage'],
  },
  {
    id: 'undead',
    name: 'Untoter',
    faction: 'horde',
    icon: 'undead',
    classes: ['Warrior', 'Paladin', 'Rogue', 'Priest', 'Mage', 'Warlock'],
    newClasses: ['Paladin'],
  },
  {
    id: 'tauren',
    name: 'Taure',
    faction: 'horde',
    icon: 'tauren',
    classes: ['Warrior', 'Hunter', 'Shaman', 'Druid'],
    newClasses: [],
  },
  {
    id: 'troll',
    name: 'Troll',
    faction: 'horde',
    icon: 'troll',
    classes: ['Warrior', 'Hunter', 'Rogue', 'Priest', 'Shaman', 'Mage', 'Warlock'],
    newClasses: ['Warlock'],
  },
  // --- The new race, joining either side ------------------------------------
  {
    id: 'skyborne',
    name: 'Skyborne',
    faction: 'neutral',
    icon: null,
    classes: ['Warrior', 'Hunter', 'Rogue', 'Druid'],
    byFaction: { alliance: ['Mage'], horde: ['Shaman'] },
    newClasses: ['Warrior', 'Hunter', 'Rogue', 'Druid', 'Mage', 'Shaman'],
    isNewRace: true,
  },
];

export function raceById(id: string): ForeverRace | undefined {
  return FOREVER_RACES.find((race) => race.id === id);
}

/** Which classes a race can play once its faction is settled. */
export function classesFor(race: ForeverRace, faction: Faction): readonly ForeverClass[] {
  const extra = race.byFaction?.[faction] ?? [];
  return [...race.classes, ...extra];
}

/** The faction a race ends up in, given the choice for neutral ones. */
export function factionFor(race: ForeverRace, chosen: Faction | null): Faction | null {
  if (race.faction === 'neutral') return chosen;
  return race.faction;
}

export function isForeverClass(value: string): value is ForeverClass {
  return (FOREVER_CLASSES as readonly string[]).includes(value);
}

export function isForeverRole(value: string): value is ForeverRole {
  return (FOREVER_ROLES as readonly string[]).includes(value);
}

export function isFaction(value: string): value is Faction {
  return value === 'alliance' || value === 'horde';
}

/** Whole days until launch from a given moment; negative once it is out. */
export function daysUntilRelease(now: Date): number {
  const release = new Date(`${FOREVER_DATES.release}T00:00:00+01:00`);
  return Math.ceil((release.getTime() - now.getTime()) / 86_400_000);
}
