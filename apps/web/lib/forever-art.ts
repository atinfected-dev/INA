/**
 * Blizzard's own World of Warcraft: Forever artwork.
 *
 * Everything here is served from Blizzard's content CDN — the same files
 * their Forever page shows — and used under the Blizzard Fan Content Policy
 * on a members-only fan page. Nothing is copied into this repository; if
 * Blizzard replaces a file, the page simply shows the wash behind it.
 *
 * The CDN resizes on request (`width`, `quality`, `format=webply`), so each
 * use asks for the size its layout needs instead of the 2600px original.
 */

const BASE = 'https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec';

interface Options {
  width?: number;
  quality?: number;
}

function blz(path: string, { width, quality = 72 }: Options = {}): string {
  const params = new URLSearchParams({ format: 'webply', quality: String(quality) });
  if (width) params.set('width', String(width));
  return `${BASE}/${path}?${params}`;
}

/** The compass-rose logo (transparent) and its gold monogram. */
export const FOREVER_LOGO = blz('blt527dd61848a757c7/6aa3316cad92093ee45628fd/camelot-logo-gamepage.png', {
  width: 700,
  quality: 85,
});
export const FOREVER_MARK = blz('bltee571c6de7ccbaf6/6a95adbf1deff31d75439029/camelot-icon.png', {
  width: 96,
  quality: 85,
});

/** Full-bleed backgrounds. */
export const FOREVER_BG = {
  /** The party above Dalaran — the masthead of Blizzard's Forever page. */
  masthead: blz('blt4d412035d16da095/6aa204fb2c0580bfcf273e54/masthead-art.jpg', { width: 2000 }),
  mastheadNarrow: blz('blt27ce9eca34bd523d/6aa1eb902c0580208d273e42/masthead-art-md.jpg', { width: 900 }),
  /** Deep blue star chart behind the countdown. */
  countdown: blz('blt195a9f74585f069a/6a95c2dc2924f56db28aa8b8/countdown-timer-bg.jpg', { width: 2000 }),
  /** A Skyborne above the Zephras Isle. */
  skyborne: blz('blt86ec9f1909d2e4f3/6a99ff068102310aeb81e0de/Skyborne-BG.jpg', { width: 2000 }),
  /** Parchment for the light sections. */
  paper: blz('blt3be5fbbd8ab0160d/6a9bc736f8f1240c84bcb8fd/paper-bg.jpg', { width: 1200, quality: 60 }),
  /** A soft cloud, tiled and drifted over the masthead. */
  cloud: blz('blt02bb7f71ad85e730/6aa18e5c6cec0d8e7bb14378/cloud-2.png', { width: 512 }),
} as const;

/** The reworked zones, as shown on Blizzard's page. */
export const FOREVER_ZONES = {
  felwood: blz('blt013749cb805b2c05/6a985e23dee884432bcba951/Updates_Felwood.jpg', { width: 1800 }),
  ashenvale: blz('blt58abba267979c75c/6a985e232437ed4648d48726/Updates_Ashenvale_01.jpg', { width: 1800 }),
  darkshore: blz('blt7c732bea431c18cf/6a985e239b942e1f62f74267/Updates_Darkshore.jpg', { width: 1800 }),
  dustwallow: blz('blt7bdf8e7ba8e4b30a/6a985e232c05804582273c55/Updates_Dustwallow.jpg', { width: 1800 }),
  barrens: blz('blta4c0f5c59e8c1615/6a985e243ad3924af56f8e16/Updates_TheBarrens.jpg', { width: 1800 }),
  mulgore: blz('bltf8ea7f909345c09b/6a985e23203da3e3fcf0e10e/Updates_Mulgore.jpg', { width: 1800 }),
} as const;

/** Feature stills, 16:9, each with Blizzard's gold flourish frame baked in. */
export const FOREVER_FEATURES = {
  power: blz('blt2dc686732f526be5/6aa09db81deff3540b439161/Claim_New_Power.jpg', { width: 900 }),
  expanses: blz('blt491397daad992c6d/6aa09e0ec751e10dc30c50e0/Soak_in_Breathtaking_Expanses.jpg', { width: 900 }),
  stories: blz('blt4865ad3281f25cb8/6aa09df51deff31ac7439163/Explore_Untold_Stories.jpg', { width: 900 }),
  paths: blz('blt7a58f20dd8f6b2d9/6aa09f1c7ec8fef91000059e/Take_Unknown_Paths.jpg', { width: 900 }),
  revamps: blz('blt50839e89a98e4d22/6aa09f512437ed84d9d48846/System_Revamps.jpg', { width: 900 }),
  journey: blz('blt848d2f0dbc2d2d1e/6aa09dd67ec8fedf4f00059c/Every_Journey_Matters.jpg', { width: 900 }),
  skyborne: blz('blt86ec9f1909d2e4f3/6a99ff068102310aeb81e0de/Skyborne-BG.jpg', { width: 900 }),
  collection: blz('blt93cdf699622c1b0d/6aa43b37f8f1245cfdbcbb80/WoWForever_Collection.jpg', { width: 900 }),
} as const;

/** The editions, as Blizzard pictures them. */
export const FOREVER_EDITIONS = {
  heroic: blz('blteb250711dec6ee18/6a96037132e602b75fc0dadb/Heroic_Comp.jpg', { width: 700 }),
  epic: blz('blt08431c31023ba96e/6a9603712c05804cc3273c15/Epic_Comp.jpg', { width: 700 }),
  collection: blz('bltc02ff90fbb5fae15/6a9603716cec0d6339b1415e/Warcraft_Forever_Collection_Comp.jpg', { width: 700 }),
} as const;

export type FeatureKey = keyof typeof FOREVER_FEATURES;
export type ZoneKey = keyof typeof FOREVER_ZONES;
