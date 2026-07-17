const { formatWindow } = require('../../src/middleware/aiLimiter');

describe('formatWindow', () => {
    it('uses singular grammar for a one-minute window', () => {
        expect(formatWindow(60 * 1000)).toBe('1 minute');
    });

    it('uses plural grammar for longer windows', () => {
        expect(formatWindow(2 * 60 * 1000)).toBe('2 minutes');
    });
});
