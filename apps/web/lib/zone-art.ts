/**
 * Raid artwork from Blizzard's render CDN.
 *
 * These are the Encounter Journal images the Battle.net API hands out as
 * instance media — one 2400×1200 painting per raid, served from Blizzard's
 * own host. Used here under the Blizzard Fan Content Policy (non-commercial
 * fan site, notice in the footer). Nothing is scraped or re-hosted; the page
 * links to the files exactly where Blizzard keeps them.
 *
 * Warcraft Logs folds some raids into one zone ("HoF / ToES"), so a WCL slug
 * can map to several paintings. The first is the one used where only one
 * fits; the rest are there for anything that wants to show all of them.
 */

const ZONE_ART: Record<string, string[]> = {
  'ruins-of-ahnqiraj': ['ruins-of-ahnqiraj'],
  'naxx-sarth-maly': ['naxxramas', 'the-obsidian-sanctum', 'the-eye-of-eternity'],
  ulduar: ['ulduar'],
  'trial-of-the-crusader': ['trial-of-the-crusader'],
  onyxia: ['onyxias-lair'],
  'icecrown-citadel': ['icecrown-citadel'],
  'ruby-sanctum': ['the-ruby-sanctum'],
  'vault-of-archavon': ['vault-of-archavon'],
  'totfw-bwd-bot': ['blackwing-descent', 'the-bastion-of-twilight', 'throne-of-the-four-winds'],
  firelands: ['firelands'],
  'dragon-soul': ['dragon-soul'],
  'baradin-hold': ['baradin-hold'],
  'mogushan-vaults': ['mogushan-vaults'],
  'hof-toes': ['heart-of-fear', 'terrace-of-endless-spring'],
  'throne-of-thunder': ['throne-of-thunder'],
  'siege-of-orgrimmar': ['siege-of-orgrimmar'],
};

/** The painting that stands for a whole expansion on the front door. */
const EXPANSION_ART: Record<string, string> = {
  classic: 'ruins-of-ahnqiraj',
  'wrath-of-the-lich-king': 'icecrown-citadel',
  cataclysm: 'dragon-soul',
  'mists-of-pandaria': 'siege-of-orgrimmar',
};

export type ArtSize = 'small' | 'large';

/** `small` is 600×300, `large` 2400×1200. */
export function artUrl(blizzardSlug: string, size: ArtSize = 'large'): string {
  return `https://render.worldofwarcraft.com/eu/zones/${blizzardSlug}-${size}.jpg`;
}

export function zoneArt(wclSlug: string, size: ArtSize = 'large'): string | null {
  const first = ZONE_ART[wclSlug]?.[0];
  return first ? artUrl(first, size) : null;
}

export function zoneArtAll(wclSlug: string, size: ArtSize = 'large'): string[] {
  return (ZONE_ART[wclSlug] ?? []).map((slug) => artUrl(slug, size));
}

export function expansionArt(expansionSlug: string, size: ArtSize = 'large'): string | null {
  const slug = EXPANSION_ART[expansionSlug];
  return slug ? artUrl(slug, size) : null;
}

/** The painting behind the hero. Pandaria at its most Pandaria. */
export const HERO_ART = artUrl('terrace-of-endless-spring');
/** Behind the Hall of Fame: the storm over the Throne of Thunder. */
export const HONOURS_ART = artUrl('throne-of-thunder');
/** Behind the records: the Heart of Fear. */
export const RECORDS_ART = artUrl('heart-of-fear');

/**
 * The painting each page carries in its header. Spread across the raids the
 * guild actually fought in, Pandaria first, so no two neighbouring pages wear
 * the same picture.
 */
export const PAGE_ART = {
  leaderboards: artUrl('throne-of-thunder'),
  attendance: artUrl('mogushan-vaults'),
  deaths: artUrl('heart-of-fear'),
  damageTaken: artUrl('siege-of-orgrimmar'),
  utility: artUrl('terrace-of-endless-spring'),
  records: artUrl('dragon-soul'),
  hallOfFame: artUrl('throne-of-thunder'),
  members: artUrl('mogushan-vaults'),
  players: artUrl('heart-of-fear'),
  raids: artUrl('siege-of-orgrimmar'),
  achievements: artUrl('terrace-of-endless-spring'),
  account: artUrl('icecrown-citadel'),
  auth: artUrl('ulduar'),
} as const;

/**
 * The original raids, for the Forever page — Blizzard's paintings of the
 * places Forever brings back. All present on the render CDN.
 */
export const FOREVER_ART = {
  hero: artUrl('blackwing-lair'),
  band: artUrl('molten-core'),
  raids: [
    { slug: 'onyxias-lair', name: "Onyxias Hort", url: artUrl('onyxias-lair', 'small') },
    { slug: 'molten-core', name: 'Geschmolzener Kern', url: artUrl('molten-core', 'small') },
    { slug: 'blackwing-lair', name: 'Pechschwingenhort', url: artUrl('blackwing-lair', 'small') },
    { slug: 'zulgurub', name: "Zul'Gurub", url: artUrl('zulgurub', 'small') },
    { slug: 'ruins-of-ahnqiraj', name: "Ruinen von Ahn'Qiraj", url: artUrl('ruins-of-ahnqiraj', 'small') },
    { slug: 'ahnqiraj-temple', name: "Tempel von Ahn'Qiraj", url: artUrl('ahnqiraj-temple', 'small') },
    { slug: 'naxxramas', name: 'Naxxramas', url: artUrl('naxxramas', 'small') },
  ],
} as const;

/** Official race icons, the character-achievement set: present for every original race. */
export function raceIconUrl(iconSlug: string, size: 56 | 36 = 56): string {
  return `https://render.worldofwarcraft.com/eu/icons/${size}/achievement_character_${iconSlug}_male.jpg`;
}
