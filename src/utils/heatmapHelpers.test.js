import { parseLocalDate } from './dateHelpers';
import {
  addLocalDays,
  buildHeatmapGrid,
  calculateCurrentStreak,
  countLoggedDays,
  formatHeatmapTooltip,
  formatLocalDate,
  getBestWeekLoggedDays,
  getCellAriaLabel,
  getIntensityLevel,
  getMondayStart,
  indexHeatmapData,
} from './heatmapHelpers';

describe('heatmapHelpers', () => {
  describe('formatLocalDate', () => {
    it('uses local calendar fields instead of the UTC ISO date', () => {
      const localMorning = new Date(2026, 7, 21, 0, 30, 0);
      expect(formatLocalDate(localMorning)).toBe('2026-08-21');

      const utcEvening = new Date(Date.UTC(2026, 7, 21, 22, 15, 0));
      const localKey = formatLocalDate(utcEvening);
      const isoKey = utcEvening.toISOString().slice(0, 10);
      expect(localKey).toBe(
        `${utcEvening.getFullYear()}-${String(utcEvening.getMonth() + 1).padStart(2, '0')}-${String(utcEvening.getDate()).padStart(2, '0')}`
      );
      if (utcEvening.getTimezoneOffset() < 0) {
        expect(localKey).not.toBe(isoKey);
      }
    });
  });

  describe('parseLocalDate', () => {
    it('does not shift YYYY-MM-DD into the previous UTC day', () => {
      const parsed = parseLocalDate('2026-08-21');
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(7);
      expect(parsed.getDate()).toBe(21);
    });
  });

  describe('getIntensityLevel', () => {
    it('maps counts onto the four heatmap levels', () => {
      expect(getIntensityLevel(0)).toBe(0);
      expect(getIntensityLevel(1)).toBe(1);
      expect(getIntensityLevel(2)).toBe(2);
      expect(getIntensityLevel(3)).toBe(2);
      expect(getIntensityLevel(4)).toBe(3);
      expect(getIntensityLevel(9)).toBe(3);
    });

    it('treats invalid counts as empty', () => {
      expect(getIntensityLevel(null)).toBe(0);
      expect(getIntensityLevel(-2)).toBe(0);
    });
  });

  describe('getMondayStart', () => {
    it('returns the Monday of the containing week', () => {
      // 21 Aug 2026 is a Friday.
      const monday = getMondayStart(new Date(2026, 7, 21));
      expect(formatLocalDate(monday)).toBe('2026-08-17');
      expect(monday.getDay()).toBe(1);
    });
  });

  describe('buildHeatmapGrid', () => {
    const today = new Date(2026, 7, 21, 18, 45, 0);

    it('builds Monday-start weeks covering 365 local days', () => {
      const grid = buildHeatmapGrid([], { today });

      expect(grid.today).toBe('2026-08-21');
      expect(grid.rangeStart).toBe('2025-08-22');
      expect(grid.rangeEnd).toBe('2026-08-21');
      expect(grid.weeks.length).toBeGreaterThanOrEqual(53);
      expect(grid.weeks.every((week) => week.length === 7)).toBe(true);
      expect(grid.weeks[0][0].weekday).toBe(0);
      expect(grid.weeks[0][0].date).toBe('2025-08-18');
    });

    it('fills sparse counts and marks days outside the range as padding', () => {
      const grid = buildHeatmapGrid(
        [{ date: '2026-08-20', count: 2, tracks: ['DSA'] }],
        { today }
      );
      const days = grid.weeks.flat();
      const logged = days.find((day) => day.date === '2026-08-20');
      const empty = days.find((day) => day.date === '2026-08-19');
      const padding = days.find((day) => day.date === '2025-08-18');
      const todayCell = days.find((day) => day.date === '2026-08-21');

      expect(logged).toMatchObject({
        count: 2,
        intensity: 2,
        isPadding: false,
        tracks: ['DSA'],
      });
      expect(empty).toMatchObject({ count: 0, intensity: 0, isPadding: false });
      expect(padding.isPadding).toBe(true);
      expect(padding.intensity).toBeNull();
      expect(todayCell.isToday).toBe(true);
    });

    it('places month labels on the week that contains the first', () => {
      const grid = buildHeatmapGrid([], { today });
      const augustWeek = grid.weeks.findIndex((week) => week.some((day) => day.date === '2026-08-01'));
      expect(grid.monthLabels[augustWeek]).toBe('Aug');
    });
  });

  describe('indexHeatmapData', () => {
    it('merges duplicate dates and unique tracks', () => {
      const indexed = indexHeatmapData([
        { date: '2026-08-20', count: 1, tracks: ['DSA'] },
        { date: '2026-08-20', count: 1, tracks: ['DSA', 'System Design'] },
        { date: 'bad', count: 4 },
      ]);

      expect(indexed.get('2026-08-20')).toEqual({
        date: '2026-08-20',
        count: 2,
        tracks: ['DSA', 'System Design'],
      });
      expect(indexed.has('bad')).toBe(false);
    });
  });

  describe('streaks and summaries', () => {
    const today = new Date(2026, 7, 21, 9, 0, 0);

    it('starts the current streak from yesterday when today is empty', () => {
      const data = [
        { date: '2026-08-19', count: 1 },
        { date: '2026-08-20', count: 2 },
      ];
      expect(calculateCurrentStreak(data, { today })).toBe(2);
    });

    it('includes today when it has a log', () => {
      const data = [
        { date: '2026-08-19', count: 1 },
        { date: '2026-08-20', count: 1 },
        { date: '2026-08-21', count: 1 },
      ];
      expect(calculateCurrentStreak(data, { today })).toBe(3);
    });

    it('counts distinct logged days and the best week', () => {
      const monday = getMondayStart(today);
      const data = [0, 1, 2, 3, 4].map((offset) => ({
        date: formatLocalDate(addLocalDays(monday, offset)),
        count: 1,
      }));

      expect(countLoggedDays(data)).toBe(5);
      expect(getBestWeekLoggedDays(data, { today })).toBe(5);
    });
  });

  describe('tooltip copy', () => {
    it('uses log language rather than contributions', () => {
      expect(formatHeatmapTooltip({
        date: '2026-08-20',
        count: 2,
        isPadding: false,
      })).toBe('Thu, Aug 20 · 2 logs');
      expect(formatHeatmapTooltip({
        date: '2026-08-21',
        count: 1,
        isPadding: false,
      })).toBe('Fri, Aug 21 · 1 log');
    });

    it('includes track names in the accessible label', () => {
      expect(getCellAriaLabel({
        date: '2026-08-20',
        count: 2,
        tracks: ['DSA', 'System Design'],
        isPadding: false,
      })).toBe('Thu, Aug 20 · 2 logs. DSA, System Design');
    });
  });
});
