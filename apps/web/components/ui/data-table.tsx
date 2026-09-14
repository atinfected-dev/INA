import type { ReactNode } from 'react';
import styles from './table.module.css';

export interface Column<Row> {
  key: string;
  header: ReactNode;
  /** Right-aligned tabular figures. Use for anything compared down a column. */
  numeric?: boolean;
  render: (row: Row, index: number) => ReactNode;
}

interface DataTableProps<Row> {
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row, index: number) => string;
  /** Prepends a rank column, medalling the top three. */
  showRank?: boolean;
  emptyMessage?: string;
}

// CSS module lookups are `string | undefined` under noUncheckedIndexedAccess,
// so the medal class is resolved through a lookup that tolerates a miss.
const MEDAL_CLASS = [styles.rank1, styles.rank2, styles.rank3];

function rankClass(index: number): string {
  return [styles.rank, MEDAL_CLASS[index]].filter(Boolean).join(' ');
}

/**
 * The one table used by every leaderboard.
 *
 * Sorting, filtering and pagination stay outside on purpose — this component
 * renders what it is given, so the same markup serves a server-rendered
 * leaderboard and a client-filtered one.
 */
export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  showRank = false,
  emptyMessage = 'Keine Daten.',
}: DataTableProps<Row>) {
  if (rows.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }

  return (
    <div className={styles.scroller}>
      <table className={styles.table}>
        <thead>
          <tr>
            {showRank && <th scope="col" className={styles.numeric}>#</th>}
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={column.numeric ? styles.numeric : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)}>
              {showRank && <td className={rankClass(index)}>{index + 1}</td>}
              {columns.map((column) => (
                <td key={column.key} className={column.numeric ? styles.numeric : undefined}>
                  {column.render(row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
