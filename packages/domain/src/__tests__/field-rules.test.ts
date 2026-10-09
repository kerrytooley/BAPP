import { describe, it, expect } from 'vitest';
import {
    isBlank,
    validateCount,
    validateFrequencyKhz,
    validateNumber,
    validateRain,
    validateRequiredText,
    validateSurveyCode,
    validateWeather,
} from '../field-rules';

describe('isBlank', () => {
    it.each([undefined, null, '', '   '])('treats %j as blank', (value) => {
        expect(isBlank(value)).toBe(true);
    });

    it('treats text as not blank', () => {
        expect(isBlank(' a ')).toBe(false);
    });
});

describe('validateRequiredText', () => {
    it('requires non-blank text', () => {
        expect(validateRequiredText('  ', 'Survey name')).toBe('Survey name is required');
        expect(validateRequiredText('Dusk', 'Survey name')).toBeNull();
    });
});

describe('validateNumber', () => {
    it('accepts blank as not provided', () => {
        expect(validateNumber('', { min: 0, max: 1 })).toBeNull();
        expect(validateNumber(undefined)).toBeNull();
    });

    it('accepts decimals and negatives, trimming whitespace', () => {
        expect(validateNumber(' -3.5 ')).toBeNull();
    });

    it.each(['abc', '1.', '.5', '1e3', '1,5'])('rejects non-numeric %j', (value) => {
        expect(validateNumber(value)).toBe('Enter a number');
    });

    it('rejects decimals for integer rules', () => {
        expect(validateNumber('2.5', { integer: true })).toBe('Enter a whole number');
        expect(validateNumber('2', { integer: true })).toBeNull();
    });

    it('reports range bounds', () => {
        expect(validateNumber('101', { min: 0, max: 100 })).toBe('Enter a value between 0 and 100');
        expect(validateNumber('-1', { min: 0 })).toBe('Enter a value of 0 or more');
        expect(validateNumber('11', { max: 10 })).toBe('Enter a value of 10 or less');
        expect(validateNumber('100', { min: 0, max: 100 })).toBeNull();
    });
});

describe('validateSurveyCode', () => {
    it('accepts 6 letters or numbers in any case', () => {
        expect(validateSurveyCode(' AB12cd ')).toBeNull();
        expect(validateSurveyCode('')).toBeNull();
    });

    it.each(['abc', 'abc1234', 'ab-12c'])('rejects %j', (value) => {
        expect(validateSurveyCode(value)).toBe('Codes are 6 letters or numbers');
    });
});

describe('validateRain', () => {
    it('accepts Wet or Dry at the start', () => {
        expect(validateRain('Wet', 'start')).toBeNull();
        expect(validateRain('Dry', 'start')).toBeNull();
        expect(validateRain('Damp', 'start')).toBe('Choose Wet or Dry');
    });

    it('expects whole minutes at the end', () => {
        expect(validateRain('15', 'end')).toBeNull();
        expect(validateRain('1.5', 'end')).toBe('Enter a whole number');
        expect(validateRain('-1', 'end')).toBe('Enter a value of 0 or more');
    });
});

describe('validateWeather', () => {
    it('returns no errors for missing or valid weather', () => {
        expect(validateWeather(null, 'start')).toEqual({});
        expect(validateWeather({ temperature: '12.5', cloudCover: '40', humidity: '80', wind: '3', rain: 'Dry' }, 'start')).toEqual({});
    });

    it('keys errors by field', () => {
        expect(validateWeather({ temperature: '60', cloudCover: 'lots', humidity: '', wind: '2.5', rain: '5' }, 'start')).toEqual({
            temperature: 'Enter a value between -20 and 45',
            cloudCover: 'Enter a number',
            wind: 'Enter a whole number',
            rain: 'Choose Wet or Dry',
        });
    });
});

describe('validateFrequencyKhz', () => {
    it('accepts 10 to 150 kHz', () => {
        expect(validateFrequencyKhz('45.5')).toBeNull();
        expect(validateFrequencyKhz(null)).toBeNull();
        expect(validateFrequencyKhz('5')).toBe('Enter a value between 10 and 150');
    });
});

describe('validateCount', () => {
    it('accepts whole numbers of 0 or more', () => {
        expect(validateCount(0)).toBeNull();
        expect(validateCount(null)).toBeNull();
        expect(validateCount(-1)).toBe('Counts must be a whole number of 0 or more');
        expect(validateCount(1.5)).toBe('Counts must be a whole number of 0 or more');
    });
});
