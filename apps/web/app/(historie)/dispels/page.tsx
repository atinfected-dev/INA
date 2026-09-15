import type { Metadata } from 'next';
import { UtilityLeaderboard } from '../../../components/utility-leaderboard';

export const metadata: Metadata = { title: 'Dispels' };
export const revalidate = 900;

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function DispelsPage({ searchParams }: { searchParams: Search }) {
  return <UtilityLeaderboard kind="dispels" path="/dispels" search={await searchParams} />;
}
