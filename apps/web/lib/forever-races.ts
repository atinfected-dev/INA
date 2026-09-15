/**
 * Racial traits in World of Warcraft: Forever, race by race.
 *
 * Facts from the BlizzCon 2026 footage as recorded in the MIT-licensed
 * dataset at github.com/Deradon/wow-forever-talent-calc (data/races), cross-
 * read against the level-60 tooltips shown on stream. Descriptions are the
 * guild's own German wording of what each trait does, not Blizzard's text;
 * values are as shown at level 60 and may still move before launch.
 *
 * Every race has two actives and two passives (the Skyborne five across
 * their two variants). Resistance racials are gone; weapon specialisations
 * grant critical strike chance instead of weapon skill.
 */

export type TraitStatus = 'new' | 'changed' | 'same' | 'removed';

export interface RacialTrait {
  id: string;
  /** English name as shown in game. */
  name: string;
  kind: 'active' | 'passive';
  /** Blizzard icon name, or a `crop-` video crop for the Skyborne. */
  icon: string;
  status: TraitStatus;
  /** What it does, in German, our words. */
  effect: string;
  /** What the Classic Era version did, when it differs or was removed. */
  classic?: string;
  /** Skyborne only: which side has it. */
  variant?: 'alliance' | 'horde';
}

export interface RaceEntry {
  /** Matches FOREVER_RACES ids in @ina/core. */
  id: string;
  name: string;
  faction: 'alliance' | 'horde' | 'neutral';
  /** One line on who they are, in our words. */
  blurb: string;
  traits: RacialTrait[];
  /** Classic racials that Forever dropped. */
  removed: RacialTrait[];
}

const removed = (id: string, name: string, kind: 'active' | 'passive', icon: string, classic: string): RacialTrait => ({
  id,
  name,
  kind,
  icon,
  status: 'removed',
  effect: 'Nicht mehr in Forever.',
  classic,
});

export const FOREVER_RACIALS: RaceEntry[] = [
  {
    id: 'human',
    name: 'Mensch',
    faction: 'alliance',
    blurb: 'Vielseitig und ehrgeizig; in Forever zum ersten Mal auch als Jäger.',
    traits: [
      { id: 'will-to-survive', name: 'Will to Survive', kind: 'active', icon: 'spell_shadow_charm', status: 'new', effect: 'Beendet sofort alle Betäubungseffekte.' },
      { id: 'perception', name: 'Perception', kind: 'active', icon: 'spell_nature_sleep', status: 'same', effect: 'Erkennt 20 Sekunden lang verstohlene Gegner deutlich besser.' },
      { id: 'sword-specialization', name: 'Sword Specialization', kind: 'passive', icon: 'inv_sword_27', status: 'changed', effect: 'Mit Schwertern steigt die kritische Trefferchance von Zaubern und Fähigkeiten um 2 %.', classic: 'Waffenfertigkeit mit Schwertern und Zweihandschwertern +5.' },
      { id: 'the-human-spirit', name: 'The Human Spirit', kind: 'passive', icon: 'spell_holy_blessingofstrength', status: 'same', effect: 'Willenskraft um 5 % erhöht.' },
    ],
    removed: [
      removed('diplomacy', 'Diplomacy', 'passive', 'inv_misc_note_02', 'Rufgewinn um 10 % erhöht.'),
      removed('mace-specialization-human', 'Mace Specialization', 'passive', 'inv_mace_01', 'Waffenfertigkeit mit Streitkolben +5.'),
    ],
  },
  {
    id: 'dwarf',
    name: 'Zwerg',
    faction: 'alliance',
    blurb: 'Zäh, technikbegeistert, schatzverliebt; neu in Forever als Schamane.',
    traits: [
      { id: 'stoneform', name: 'Stoneform', kind: 'active', icon: 'spell_shadow_unsummonbuilding', status: 'changed', effect: 'Entfernt Gift- und Krankheitseffekte und verringert 8 Sekunden lang den erlittenen körperlichen Schaden.', classic: 'Immunität gegen Blutungen, Gifte und Krankheiten, Rüstung +10 %, 8 Sekunden.' },
      { id: 'find-treasure', name: 'Find Treasure', kind: 'active', icon: 'racial_dwarf_findtreasure', status: 'changed', effect: 'Zeigt Schätze in der Nähe auf der Minikarte — und läuft neben einer zweiten Suche wie der nach Mineralien.', classic: 'Zeigt Schätze auf der Minikarte, bis es abgebrochen wird.' },
      { id: 'mace-specialization', name: 'Mace Specialization', kind: 'passive', icon: 'inv_mace_01', status: 'new', effect: 'Mit Streitkolben steigt die kritische Trefferchance von Zaubern und Fähigkeiten um 1 %.' },
      { id: 'big-game-hunter', name: 'Big Game Hunter', kind: 'passive', icon: 'ability_hunter_snipershot', status: 'new', effect: 'Schaden gegen Wildtiere um 5 % erhöht.' },
    ],
    removed: [
      removed('frost-resistance', 'Frost Resistance', 'passive', 'spell_frost_wizardmark', 'Frostwiderstand +10.'),
      removed('gun-specialization', 'Gun Specialization', 'passive', 'inv_weapon_rifle_01', 'Waffenfertigkeit mit Schusswaffen +5.'),
    ],
  },
  {
    id: 'nightelf',
    name: 'Nachtelf',
    faction: 'alliance',
    blurb: 'Uralt, naturverbunden, zu Hause im Schatten.',
    traits: [
      { id: 'elunes-light', name: "Elune's Light", kind: 'active', icon: 'spell_holy_elunesgrace', status: 'new', effect: 'Erhöht 15 Sekunden lang die kritische Trefferchance aller Zauber und Angriffe um 10 %.' },
      { id: 'shadowmeld', name: 'Shadowmeld', kind: 'active', icon: 'ability_ambush', status: 'changed', effect: 'Verschmilzt im Stand mit den Schatten. Schurken und Druiden schleichen wie eine Stufe höher; im Kampf eingesetzt lässt es Gegner von euch ablassen, dann mit 2 Minuten Abklingzeit.', classic: 'Verschmilzt im Stand mit den Schatten; Schurken und Druiden sind verstohlen schwerer zu entdecken.' },
      { id: 'quickness', name: 'Quickness', kind: 'passive', icon: 'ability_druid_dash', status: 'changed', effect: 'Ausweichchance +1 % und Bewegungstempo +2 %.', classic: 'Ausweichchance +1 %.' },
      { id: 'wisp-spirit', name: 'Wisp Spirit', kind: 'passive', icon: 'spell_nature_wispsplode', status: 'changed', effect: 'Als Irrwisch nach dem Tod 75 % schneller unterwegs.', classic: 'Als Irrwisch 50 % schneller.' },
    ],
    removed: [removed('nature-resistance-ne', 'Nature Resistance', 'passive', 'spell_nature_resistnature', 'Naturwiderstand +10.')],
  },
  {
    id: 'gnome',
    name: 'Gnom',
    faction: 'alliance',
    blurb: 'Kluge, schräge Erfinder; in Forever auch Priester.',
    traits: [
      { id: 'eureka', name: 'Eureka!', kind: 'active', icon: 'inv_misc_gear_02', status: 'new', effect: 'Die nächsten drei schädigenden Fähigkeiten kosten halb so viel Mana und richten 10 % mehr Schaden an.' },
      { id: 'escape-artist', name: 'Escape Artist', kind: 'active', icon: 'ability_rogue_trip', status: 'same', effect: 'Befreit aus jeder Bewegungsunfähigkeit und Verlangsamung.' },
      { id: 'expansive-mind', name: 'Expansive Mind', kind: 'passive', icon: 'inv_enchant_essenceeternallarge', status: 'changed', effect: 'Maximales Mana um 5 % erhöht.', classic: 'Intelligenz +5 %.' },
      { id: 'engineering-specialization', name: 'Engineering Specialization', kind: 'passive', icon: 'inv_misc_gear_01', status: 'changed', effect: 'Ingenieursgeräte versagen seltener.', classic: 'Ingenieurskunst +15.' },
    ],
    removed: [removed('arcane-resistance', 'Arcane Resistance', 'passive', 'spell_arcane_blink', 'Arkanwiderstand +10.')],
  },
  {
    id: 'skyborne',
    name: 'Skyborne',
    faction: 'neutral',
    blurb: 'Das neue Elfenvolk von der Zephras-Insel. Allianz-Skyborne (Hohe Ordnung) lesen die Leylinien, Horde-Skyborne (Windformer) reiten die Elementarwinde. Beide Seiten teilen drei der vier Fähigkeiten.',
    traits: [
      { id: 'walk-on-air', name: 'Walk on Air', kind: 'active', icon: 'crop-walk-on-air', status: 'new', effect: '10 Sekunden lang durch die Luft nach unten gleiten.' },
      { id: 'read-ley-line', name: 'Read Ley Line', kind: 'active', icon: 'crop-read-ley-line', status: 'new', effect: 'Aktiviert eine Leylinie: Gesundheits- und Manaregeneration um 100 % erhöht.', variant: 'alliance' },
      { id: 'skysight', name: 'Skysight', kind: 'active', icon: 'crop-skysight', status: 'new', effect: 'Ein Elementarsegen erhöht das Bewegungstempo um 10 %.', variant: 'horde' },
      { id: 'wind-blessed', name: 'Wind Blessed', kind: 'passive', icon: 'crop-wind-blessed', status: 'new', effect: 'Nahkampf-, Fernkampf- und Zaubertempo um 1 % erhöht.' },
      { id: 'elemental-insight', name: 'Elemental Insight', kind: 'passive', icon: 'crop-elemental-insight', status: 'new', effect: 'Schaden gegen Elementare um 5 % erhöht.' },
    ],
    removed: [],
  },
  {
    id: 'orc',
    name: 'Orc',
    faction: 'horde',
    blurb: 'Stärke und Ehre; in Forever zum ersten Mal Magier.',
    traits: [
      { id: 'blood-fury', name: 'Blood Fury', kind: 'active', icon: 'racial_orc_berserkerstrength', status: 'changed', effect: 'Angriffskraft und Zaubermacht 15 Sekunden lang um 10 % erhöht.', classic: 'Nahkampf-Angriffskraft +25 % für 15 Sekunden, dafür 25 Sekunden lang halbierte Heilung.' },
      { id: 'shatter-curse', name: 'Shatter Curse', kind: 'active', icon: 'spell_holy_removecurse', status: 'new', effect: 'Immun gegen Flüche und Banne, dazu 8 Sekunden lang weniger Magieschaden.' },
      { id: 'axe-specialization', name: 'Axe Specialization', kind: 'passive', icon: 'inv_axe_09', status: 'changed', effect: 'Mit Äxten steigt die kritische Trefferchance von Zaubern und Fähigkeiten um 1 %.', classic: 'Waffenfertigkeit mit Äxten und Zweihandäxten +5.' },
      { id: 'hardiness', name: 'Hardiness', kind: 'passive', icon: 'inv_helmet_23', status: 'changed', effect: 'Betäubungen dauern 20 % kürzer.', classic: 'Zusätzliche 25 % Chance, Betäubungen zu widerstehen.' },
    ],
    removed: [removed('command', 'Command', 'passive', 'ability_hunter_beastcall', 'Schaden von Jäger- und Hexenmeisterbegleitern +5 %.')],
  },
  {
    id: 'undead',
    name: 'Untoter',
    faction: 'horde',
    blurb: 'Die Verlassenen; in Forever mit eigener Paladin-Geschichte ab Banderian Keep.',
    traits: [
      { id: 'will-of-the-forsaken', name: 'Will of the Forsaken', kind: 'active', icon: 'spell_shadow_raisedead', status: 'changed', effect: 'Beendet Bezauberung, Furcht und Schlaf — ohne die anschließende Immunität.', classic: '5 Sekunden Immunität gegen Bezauberung, Furcht und Schlaf, auch während des Effekts nutzbar.' },
      { id: 'cannibalize', name: 'Cannibalize', kind: 'active', icon: 'ability_racial_cannibalize', status: 'changed', effect: 'An einer humanoiden oder untoten Leiche 35 % Gesundheit und Mana über 10 Sekunden zurückgewinnen; jede Bewegung bricht ab.', classic: '7 % Gesundheit alle 2 Sekunden über 10 Sekunden, kein Mana.' },
      { id: 'underwater-breathing', name: 'Underwater Breathing', kind: 'passive', icon: 'spell_shadow_demonbreath', status: 'same', effect: 'Atem unter Wasser hält 300 % länger.' },
      { id: 'touch-of-the-grave', name: 'Touch of the Grave', kind: 'passive', icon: 'spell_shadow_lifedrain02', status: 'new', effect: 'Zauber und Angriffe entziehen mit 5 % Chance Gesundheit, bis zu 5 % der eigenen Maximalgesundheit.' },
    ],
    removed: [removed('shadow-resistance', 'Shadow Resistance', 'passive', 'spell_shadow_antishadow', 'Schattenwiderstand +10.')],
  },
  {
    id: 'tauren',
    name: 'Taure',
    faction: 'horde',
    blurb: 'Die friedlichen Wanderer der Ebenen.',
    traits: [
      { id: 'war-stomp', name: 'War Stomp', kind: 'active', icon: 'ability_warstomp', status: 'same', effect: 'Betäubt bis zu fünf Gegner im Umkreis von 8 Metern für 2 Sekunden.' },
      { id: 'cultivation', name: 'Cultivation', kind: 'active', icon: 'inv_misc_herb_08', status: 'changed', effect: 'Lässt Bonus-Kräuter wachsen, die ohne Kräuterkunde gepflückt werden können.', classic: 'Kräuterkunde +15.' },
      { id: 'plainsrunning', name: 'Plainsrunning', kind: 'passive', icon: 'ability_mount_kodo_01', status: 'new', effect: 'Je länger ihr in Bewegung bleibt, desto schneller werdet ihr.' },
      { id: 'endurance', name: 'Endurance', kind: 'passive', icon: 'spell_nature_unyeildingstamina', status: 'changed', effect: 'Gesamtgesundheit +5 % und Trefferchance +1 %.', classic: 'Gesamtgesundheit +5 %.' },
    ],
    removed: [removed('nature-resistance-tauren', 'Nature Resistance', 'passive', 'spell_nature_resistnature', 'Naturwiderstand +10.')],
  },
  {
    id: 'troll',
    name: 'Troll',
    faction: 'horde',
    blurb: 'Regeneration und Wildheit; in Forever auch Hexenmeister.',
    traits: [
      { id: 'berserking', name: 'Berserking', kind: 'active', icon: 'racial_troll_berserk', status: 'changed', effect: 'Angriffs- und Zaubertempo 10 Sekunden lang um 10 % erhöht.', classic: '10 bis 30 %, je verletzter beim Einsatz, desto mehr.' },
      { id: 'rapid-regeneration', name: 'Rapid Regeneration', kind: 'active', icon: 'spell_nature_regenerate', status: 'new', effect: 'Regeneriert über kurze Zeit 50 % der maximalen Gesundheit.' },
      { id: 'regeneration', name: 'Regeneration', kind: 'passive', icon: 'spell_nature_healingtouch', status: 'same', effect: 'Gesundheitsregeneration +10 %, davon 10 % auch im Kampf.' },
      { id: 'beast-slaying', name: 'Beast Slaying', kind: 'passive', icon: 'inv_misc_head_dragon_01', status: 'same', effect: 'Schaden gegen Wildtiere um 5 % erhöht.' },
    ],
    removed: [
      removed('bow-specialization', 'Bow Specialization', 'passive', 'inv_weapon_bow_07', 'Waffenfertigkeit mit Bögen +5.'),
      removed('throwing-specialization', 'Throwing Specialization', 'passive', 'inv_throwingknife_04', 'Waffenfertigkeit mit Wurfwaffen +5.'),
    ],
  },
];

export const RACIAL_STATUS: Record<TraitStatus, { mark: string; label: string }> = {
  new: { mark: '★', label: 'Neu in Forever' },
  changed: { mark: '◆', label: 'Gegenüber Classic geändert' },
  same: { mark: '✓', label: 'Wie in Classic' },
  removed: { mark: '✕', label: 'In Forever entfernt' },
};
