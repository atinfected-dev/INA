import type { ClassTalents } from './talent-rules';
import warrior from '../data/talents/warrior.json';
import paladin from '../data/talents/paladin.json';
import hunter from '../data/talents/hunter.json';
import rogue from '../data/talents/rogue.json';
import priest from '../data/talents/priest.json';
import shaman from '../data/talents/shaman.json';
import mage from '../data/talents/mage.json';
import warlock from '../data/talents/warlock.json';
import druid from '../data/talents/druid.json';

/**
 * The Forever talent data, one file per class, compiled from the MIT-licensed
 * dataset at github.com/Deradon/wow-forever-talent-calc (read from the
 * BlizzCon 2026 footage, with the Classic Era client as the baseline). See
 * data/talents/SOURCES.md for what is firm and what is not.
 */

export const CLASS_SLUGS = [
  'warrior',
  'paladin',
  'hunter',
  'rogue',
  'priest',
  'shaman',
  'mage',
  'warlock',
  'druid',
] as const;

export type ClassSlug = (typeof CLASS_SLUGS)[number];

export function isClassSlug(value: string): value is ClassSlug {
  return (CLASS_SLUGS as readonly string[]).includes(value);
}

const DATA: Record<ClassSlug, ClassTalents> = {
  warrior: warrior as ClassTalents,
  paladin: paladin as ClassTalents,
  hunter: hunter as ClassTalents,
  rogue: rogue as ClassTalents,
  priest: priest as ClassTalents,
  shaman: shaman as ClassTalents,
  mage: mage as ClassTalents,
  warlock: warlock as ClassTalents,
  druid: druid as ClassTalents,
};

export function loadClassTalents(slug: ClassSlug): ClassTalents {
  return DATA[slug];
}

/** German class names, keyed by slug; the English name lives in the data. */
export const CLASS_DE: Record<ClassSlug, string> = {
  warrior: 'Krieger',
  paladin: 'Paladin',
  hunter: 'Jäger',
  rogue: 'Schurke',
  priest: 'Priester',
  shaman: 'Schamane',
  mage: 'Magier',
  warlock: 'Hexenmeister',
  druid: 'Druide',
};

/** The English class name the rest of the site uses for colours and icons. */
export const CLASS_EN: Record<ClassSlug, string> = {
  warrior: 'Warrior',
  paladin: 'Paladin',
  hunter: 'Hunter',
  rogue: 'Rogue',
  priest: 'Priest',
  shaman: 'Shaman',
  mage: 'Mage',
  warlock: 'Warlock',
  druid: 'Druid',
};

/** German tree names, as the German client has called them since 2005. */
export const TREE_DE: Record<string, string> = {
  arms: 'Waffen',
  fury: 'Furor',
  protection: 'Schutz',
  holy: 'Heilig',
  retribution: 'Vergeltung',
  'beast-mastery': 'Tierherrschaft',
  marksmanship: 'Treffsicherheit',
  survival: 'Überleben',
  assassination: 'Meucheln',
  combat: 'Kampf',
  subtlety: 'Täuschung',
  discipline: 'Disziplin',
  'shadow-magic': 'Schattenmagie',
  shadow: 'Schatten',
  'elemental-combat': 'Elementarkampf',
  elemental: 'Elementar',
  enhancement: 'Verstärkung',
  restoration: 'Wiederherstellung',
  arcane: 'Arkan',
  fire: 'Feuer',
  frost: 'Frost',
  affliction: 'Gebrechen',
  demonology: 'Dämonologie',
  destruction: 'Zerstörung',
  balance: 'Gleichgewicht',
  'feral-combat': 'Wilder Kampf',
  feral: 'Wildheit',
};

export function treeLabel(id: string, fallback: string): string {
  return TREE_DE[id] ?? fallback;
}

/** Icon URL: Blizzard's render CDN for named icons, our own copy for video crops. */
export function talentIconUrl(icon: string): string {
  if (icon.startsWith('crop-')) return `/talent-icons/${icon}.png`;
  return `https://render.worldofwarcraft.com/eu/icons/56/${icon}.jpg`;
}

export function classIcon(slug: ClassSlug): string {
  return `https://render.worldofwarcraft.com/eu/icons/56/classicon_${slug}.jpg`;
}
