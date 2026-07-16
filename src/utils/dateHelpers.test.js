import { getDaysRemaining, isOverdue, formatDate, formatTime } from './dateHelpers';

describe('dateHelpers', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-06-08T12:00:00Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('getDaysRemaining', () => {
        it('returns positive days for future deadlines', () => {
            expect(getDaysRemaining('2026-06-15')).toBe(7);
        });

        it('returns 0 for today', () => {
            expect(getDaysRemaining('2026-06-08')).toBe(0);
        });

        it('returns negative days for past deadlines', () => {
            expect(getDaysRemaining('2026-06-01')).toBe(-7);
        });
    });

    describe('isOverdue', () => {
        it('returns true when deadline is in the past', () => {
            expect(isOverdue('2026-06-01')).toBe(true);
        });

        it('returns false when deadline is today or future', () => {
            expect(isOverdue('2026-06-08')).toBe(false);
            expect(isOverdue('2026-06-20')).toBe(false);
        });
    });

    describe('formatDate', () => {
        it('formats valid dates', () => {
            expect(formatDate('2026-06-08')).toBe('Jun 8, 2026');
        });

        it('returns empty string for falsy input', () => {
            expect(formatDate(null)).toBe('');
            expect(formatDate('')).toBe('');
        });
    });

    describe('formatTime', () => {
        it('formats database TIME values without a timezone conversion', () => {
            expect(formatTime('15:00:00')).toBe('3:00 PM');
            expect(formatTime('09:05')).toBe('9:05 AM');
        });

        it('returns an empty string for invalid values', () => {
            expect(formatTime('25:00')).toBe('');
            expect(formatTime(null)).toBe('');
        });
    });
});
