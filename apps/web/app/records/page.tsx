import type { Metadata } from 'next';
import { OrnateFrame } from '../../components/ui/frame';
import { PAGE_ART, zoneArt } from '../../lib/zone-art';
import { Divider, TooltipCard, TooltipRow } from '../../components/ui/bits';
import { loadRecords, type RecordEntry } from '../../lib/records';
import { classVar } from '../../lib/wow';
import styles from './records.module.css';

export const metadata: Metadata = { title: 'Rekorde' };
export const revalidate = 900;

function RecordCard({ record }: { record: RecordEntry }) {
  if (record.unavailable) {
    return (
      <div className={styles.pending}>
        <div className={styles.pendingLabel}>{record.label}</div>
        <p className={styles.pendingText}>{record.unavailable}</p>
      </div>
    );
  }

  return (
    <TooltipCard
      title={record.holder ?? '—'}
      titleColor={classVar(record.holderClass)}
      meta={record.context ?? undefined}
    >
      <div className={styles.value}>{record.value}</div>
      <TooltipRow label={record.label} value="" />
      <p className={styles.formula}>{record.formula}</p>
    </TooltipCard>
  );
}

export default async function RecordsPage() {
  const records = await loadRecords();
  const available = records.filter((r) => !r.unavailable);
  const pending = records.filter((r) => r.unavailable);

  return (
    <>
      <OrnateFrame
        art={PAGE_ART.records}
        title="Gildenrekorde"
        subtitle="Das Äußerste, was in den Logs steht — über die gesamte Historie"
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '66ch' }}>
          Jeder Rekord nennt darunter, wie er ermittelt wurde. Rekorde über einzelne Kämpfe stammen
          aus einem Pull, Summen aus allen erfassten Raidabenden.
        </p>
      </OrnateFrame>

      <Divider label="Rekorde" />

      <div className={styles.grid}>
        {available.map((record) => (
          <RecordCard key={record.key} record={record} />
        ))}
      </div>

      {pending.length > 0 && (
        <>
          <Divider label="Noch offen" />
          <p style={{ color: 'var(--text-secondary)', maxWidth: '66ch' }}>
            Diese Rekorde aus der Spezifikation lassen sich noch nicht füllen. Sie stehen hier
            benannt, statt stillschweigend zu fehlen.
          </p>
          <div className={styles.grid}>
            {pending.map((record) => (
              <RecordCard key={record.key} record={record} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
