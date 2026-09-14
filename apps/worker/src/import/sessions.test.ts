import { describe, expect, it } from 'vitest';
import { groupFightsIntoSessions } from './sessions';

const HOUR = 3_600_000;

function fight(id: string, reportId: string, startHours: number, lengthMinutes = 5) {
  const start = new Date(Date.UTC(2026, 0, 1) + startHours * HOUR);
  const durationMs = lengthMinutes * 60_000;
  return { id, reportId, startTime: start, endTime: new Date(start.getTime() + durationMs), durationMs };
}

describe('groupFightsIntoSessions', () => {
  it('keeps pulls of one evening together despite short breaks', () => {
    const sessions = groupFightsIntoSessions(
      [fight('a', 'r1', 0), fight('b', 'r1', 0.5), fight('c', 'r1', 2)],
      6 * HOUR,
    );
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.fightIds).toEqual(['a', 'b', 'c']);
  });

  // The reason sessions are cut from fights rather than reports: a raid night
  // is routinely split across several logs.
  it('merges an evening that spans several reports', () => {
    const sessions = groupFightsIntoSessions(
      [fight('a', 'r1', 0), fight('b', 'r2', 1), fight('c', 'r2', 2)],
      6 * HOUR,
    );
    expect(sessions).toHaveLength(1);
    expect([...(sessions[0]?.reportIds ?? [])].sort()).toEqual(['r1', 'r2']);
  });

  // The other direction: one report left running for days is not one night.
  it('splits a single report that spans several nights', () => {
    const sessions = groupFightsIntoSessions(
      [fight('a', 'r1', 0), fight('b', 'r1', 24), fight('c', 'r1', 48)],
      6 * HOUR,
    );
    expect(sessions).toHaveLength(3);
    for (const session of sessions) expect([...session.reportIds]).toEqual(['r1']);
  });

  it('sums combat time rather than the span', () => {
    const sessions = groupFightsIntoSessions(
      [fight('a', 'r1', 0, 10), fight('b', 'r1', 3, 20)],
      6 * HOUR,
    );
    // Three hours apart, but only half an hour of fighting.
    expect(sessions[0]?.combatMs).toBe(30 * 60_000);
  });

  it('carries the furthest end, even if a long pull overlaps the next', () => {
    const long = fight('long', 'r1', 0, 120);
    const short = fight('short', 'r1', 1, 5);
    const sessions = groupFightsIntoSessions([long, short], 6 * HOUR);
    expect(sessions[0]?.end).toEqual(long.endTime);
  });

  it('returns nothing for no fights', () => {
    expect(groupFightsIntoSessions([], 6 * HOUR)).toEqual([]);
  });
});
