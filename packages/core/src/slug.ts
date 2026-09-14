/**
 * URL slug for names that come from the game: raids, bosses, players.
 *
 * Handles German umlauts and apostrophes explicitly, because WoW is full of
 * both (Mogu'shan Vaults, Val'anyr) and a naive replace turns them into
 * unreadable double hyphens.
 */
const TRANSLITERATE: Record<string, string> = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  ß: 'ss',
  æ: 'ae',
  ø: 'o',
  å: 'a',
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[äöüßæøå]/g, (char) => TRANSLITERATE[char] ?? char)
    // Apostrophes join the word rather than splitting it: Mogu'shan -> mogushan
    .replace(/['’]/g, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
