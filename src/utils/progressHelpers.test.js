import { calculateCurrentStreak } from './heatmapHelpers';
import { calculateLongestStreak, calculateTrackStreak, lastLoggedDate } from './progressHelpers';

describe('progressHelpers', () => {
  const today = new Date(2026, 7, 21);

  it('computes the longest run of logged days in the past year', () => {
    const data = [
      { date: '2026-08-18', count: 1 },
      { date: '2026-08-19', count: 2 },
      { date: '2026-08-20', count: 1 },
      { date: '2026-08-21', count: 0 },
    ];

    expect(calculateLongestStreak(data, { today })).toBe(3);
    expect(calculateCurrentStreak(data, { today })).toBe(3);
  });

  it('derives a track streak from didLog rows', () => {
    const logs = [
      { logDate: '2026-08-21', didLog: true },
      { logDate: '2026-08-20', didLog: true },
      { logDate: '2026-08-19', didLog: false },
    ];

    expect(calculateTrackStreak(logs, { today })).toBe(2);
    expect(lastLoggedDate(logs)).toBe('2026-08-21');
  });
});
