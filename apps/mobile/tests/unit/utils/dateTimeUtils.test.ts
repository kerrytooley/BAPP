import { formatDate, formatTime, formatCountdown } from '@utils/dateTimeUtils';

describe('formatDate', () => {
    it('formats a date as DD/MM/YYYY (en-GB)', () => {
        expect(formatDate(new Date(2026, 6, 13))).toBe('13/07/2026');
    });

    it('zero-pads single digit days and months', () => {
        expect(formatDate(new Date(2026, 0, 5))).toBe('05/01/2026');
    });

    it('returns a fallback when value is undefined', () => {
        expect(formatDate(undefined)).toBe('Date not found');
    });

    it('returns a fallback when value is null', () => {
        expect(formatDate(null)).toBe('Date not found');
    });
});

describe('formatTime', () => {
    it('formats a time as HH:MM in 24-hour form', () => {
        expect(formatTime(new Date(2026, 6, 13, 14, 30))).toBe('14:30');
    });

    it('zero-pads single digit hours and minutes', () => {
        expect(formatTime(new Date(2026, 6, 13, 9, 5))).toBe('09:05');
    });

    it('formats midnight as 00:00', () => {
        expect(formatTime(new Date(2026, 6, 13, 0, 0))).toBe('00:00');
    });

    it('returns a fallback when value is undefined', () => {
        expect(formatTime(undefined)).toBe('Time not found');
    });

    it('returns a fallback when value is null', () => {
        expect(formatTime(null)).toBe('Time not found');
    });
});

describe('formatCountdown', () => {
    it('zero-pads hours, minutes and seconds', () => {
        expect(formatCountdown(1, 2, 3)).toBe('01:02:03');
    });

    it('keeps double-digit values intact', () => {
        expect(formatCountdown(12, 34, 56)).toBe('12:34:56');
    });
});
