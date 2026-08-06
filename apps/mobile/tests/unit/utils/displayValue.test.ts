import { displayValue } from '@utils/displayValue';
import { formatTime } from '@utils/dateTimeUtils';

describe('displayValue', () => {
    it('formats a date as a time when the time format is requested', () => {
        const date = new Date(2026, 6, 13, 20, 30);
        expect(displayValue(date, 'time')).toBe(formatTime(date));
    });

    it('returns a string value unchanged', () => {
        expect(displayValue('SW1A 1AA')).toBe('SW1A 1AA');
    });

    it('returns the date unchanged when no time format is requested', () => {
        const date = new Date(2026, 6, 13);
        expect(displayValue(date)).toBe(date);
    });

    it('falls back to N/A for undefined', () => {
        expect(displayValue(undefined)).toBe('N/A');
    });

    it('falls back to N/A for null', () => {
        expect(displayValue(null)).toBe('N/A');
    });

    it('falls back to N/A for an empty string', () => {
        expect(displayValue('')).toBe('N/A');
    });
});
