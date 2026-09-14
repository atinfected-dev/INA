import { ImageResponse } from 'next/og';
import { prisma } from '@ina/db';
import { HERO_ART } from '../lib/zone-art';

/**
 * The card a link to the site unfolds into — Discord, WhatsApp, Twitter.
 *
 * The Terrace of Endless Spring under a dark wash, the guild name in gold,
 * and the headline numbers, live. Rendered on request and cached for the
 * revalidation window, so it is never a stale screenshot.
 */

export const runtime = 'nodejs';
export const revalidate = 3600;
export const alt = 'Is Not Alone — Raidgeschichte seit Wrath of the Lich King';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const de = (n: number): string => n.toLocaleString('de-DE');

export default async function OpenGraphImage() {
  const [nights, fights, kills] = await Promise.all([
    prisma.raidSession.count(),
    prisma.fight.count(),
    prisma.fight.count({ where: { kill: true, encounterId: { not: null } } }),
  ]);

  // The painting travels inline: the image renderer cannot fetch during
  // layout, and a failed fetch must not take the whole card down.
  let art: string | null = null;
  try {
    const response = await fetch(HERO_ART);
    if (response.ok) {
      const bytes = Buffer.from(await response.arrayBuffer());
      art = `data:image/jpeg;base64,${bytes.toString('base64')}`;
    }
  } catch {
    art = null;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: '#0a1512',
          fontFamily: 'Georgia, serif',
        }}
      >
        {art && (
          <img
            src={art}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 40%',
            }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(10,21,18,0.55) 0%, rgba(10,21,18,0.35) 45%, rgba(8,12,11,0.96) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '0 64px 52px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              fontSize: 22,
              letterSpacing: 8,
              color: '#8fe0bd',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            Wrath bis Pandaria
          </div>
          <div
            style={{
              fontSize: 96,
              lineHeight: 1,
              color: '#f6e6b4',
              textShadow: '0 3px 0 #000, 0 0 40px rgba(58,168,130,0.6)',
              marginBottom: 26,
            }}
          >
            Is Not Alone
          </div>
          <div style={{ display: 'flex', gap: 48 }}>
            {[
              [de(nights), 'Raidabende'],
              [de(fights), 'Pulls'],
              [de(kills), 'Bosskills'],
            ].map(([value, label]) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 44, color: '#e5cc80', textShadow: '0 2px 0 #000' }}>
                  {value}
                </div>
                <div style={{ fontSize: 18, letterSpacing: 4, color: '#5fcaa0', textTransform: 'uppercase' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            right: 64,
            bottom: 56,
            fontSize: 24,
            color: '#c8aa6e',
            letterSpacing: 2,
          }}
        >
          isnotalone.de
        </div>
      </div>
    ),
    { ...size },
  );
}
