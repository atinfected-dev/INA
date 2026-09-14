import type { Metadata } from 'next';
import { UtilityLeaderboard } from '../../components/utility-leaderboard';

export const metadata: Metadata = { title: 'Unterbrechungen' };
export const revalidate = 900;

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function InterruptsPage({ searchParams }: { searchParams: Search }) {
  return (
    <UtilityLeaderboard kind="interrupts" path="/unterbrechungen" search={await searchParams} />
  );
}
