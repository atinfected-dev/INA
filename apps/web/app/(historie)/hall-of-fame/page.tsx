import type { Metadata } from 'next';
import { OrnateFrame } from '../../../components/ui/frame';
import { PAGE_ART, zoneArt } from '../../../lib/zone-art';
import { Divider } from '../../../components/ui/bits';
import { loadSettings } from '../../../lib/settings';
import { loadHallOfFame } from '../../../lib/hall-of-fame';
import { Plaque, PlaqueGrid } from '../../../components/hall-of-fame/plaque';

export const metadata: Metadata = { title: 'Hall of Fame' };
export const revalidate = 900;

export default async function HallOfFamePage() {
  const settings = await loadSettings();
  const holders = await loadHallOfFame(settings.hallOfFameTitles);

  const awarded = holders.filter((h) => !h.unavailable);
  const pending = holders.filter((h) => h.unavailable);

  return (
    <>
      <OrnateFrame
        art={PAGE_ART.hallOfFame}
        title="Hall of Fame"
        subtitle="Ehrentafeln über die gesamte Gildenhistorie"
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '66ch' }}>
          Jeder Titel geht an die Person mit dem höchsten Wert einer Kennzahl — über die gesamte
          Gildenhistorie, alle Charaktere zusammengerechnet. Teilen sich mehrere den Spitzenwert,
          steht der Titel als geteilt, statt ihn zufällig einem zuzusprechen.
        </p>
      </OrnateFrame>

      <Divider label="Ehrentafeln" />

      <PlaqueGrid>
        {awarded.map((holder) => (
          <Plaque key={holder.title.id} holder={holder} />
        ))}
      </PlaqueGrid>

      {pending.length > 0 && (
        <>
          <Divider label="Noch nicht vergeben" />
          <PlaqueGrid>
            {pending.map((holder) => (
              <Plaque key={holder.title.id} holder={holder} />
            ))}
          </PlaqueGrid>
        </>
      )}
    </>
  );
}
