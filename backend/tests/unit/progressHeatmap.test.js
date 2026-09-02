const { fillHeatmapDays, HEATMAP_DAY_COUNT, isValidCalendarIsoDate, resolveHeatmapEndDate, shiftIsoDate } = require('../../src/lib/progressHeatmap');

describe('isValidCalendarIsoDate', () => {
    it('accepts valid calendar dates', () => {
        expect(isValidCalendarIsoDate('2026-08-21')).toBe(true);
        expect(isValidCalendarIsoDate('2024-02-29')).toBe(true);
    });

    it('rejects calendar-invalid dates', () => {
        expect(isValidCalendarIsoDate('2026-02-30')).toBe(false);
        expect(isValidCalendarIsoDate('2023-02-29')).toBe(false);
    });
});

describe('resolveHeatmapEndDate', () => {
    it('falls back when end is calendar-invalid', () => {
        const resolved = resolveHeatmapEndDate('2026-02-30');
        expect(resolved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(resolved).not.toBe('2026-02-30');
    });
});

describe('fillHeatmapDays', () => {
    it('returns 365 consecutive days including zeros', () => {
        const days = fillHeatmapDays(
            [{ log_date: '2026-08-20', did_log: true, track_name: 'DSA' }],
            '2026-08-24'
        );

        expect(days).toHaveLength(HEATMAP_DAY_COUNT);
        expect(days[0].date).toBe(shiftIsoDate('2026-08-24', -(HEATMAP_DAY_COUNT - 1)));
        expect(days[days.length - 1]).toEqual({
            date: '2026-08-24',
            count: 0,
            tracks: [],
        });

        const logged = days.find((day) => day.date === '2026-08-20');
        expect(logged).toEqual({
            date: '2026-08-20',
            count: 1,
            tracks: ['DSA'],
        });
    });

    it('counts only did_log rows and aggregates multiple tracks on one day', () => {
        const days = fillHeatmapDays(
            [
                { log_date: '2026-08-21', did_log: true, track_name: 'DSA' },
                { log_date: '2026-08-21', did_log: true, track_name: 'System Design' },
                { log_date: '2026-08-21', did_log: false, track_name: 'Reading' },
            ],
            '2026-08-21'
        );

        const logged = days.find((day) => day.date === '2026-08-21');
        expect(logged.count).toBe(2);
        expect(logged.tracks).toEqual(['DSA', 'System Design']);
    });
});
