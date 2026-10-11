import { describe, it, expect } from 'vitest';
import {
    isBlank,
    validateCount,
    validateFrequencyKhz,
    validateLastSeen,
    validateNumber,
    validatePostcode,
    validateRain,
    validateRequiredText,
    validateSurveyCode,
    validateSurveyEnd,
    validateSurveyStart,
    validateSurveySunset,
    validateSurveyTiming,
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

describe('validateLastSeen', () => {
    const at = (h: number, m = 0) => new Date(2026, 9, 11, h, m);

    it('rejects a last seen time before the first seen time', () => {
        expect(validateLastSeen(at(20, 30), at(20, 29))).toBe("Last seen time can't be before the first seen time");
    });

    it('accepts equal or later times, including after midnight', () => {
        expect(validateLastSeen(at(20, 30), at(20, 30))).toBeNull();
        expect(validateLastSeen(at(23, 55), new Date(2026, 9, 12, 0, 5))).toBeNull();
    });

    it('ignores missing times', () => {
        expect(validateLastSeen(null, at(20))).toBeNull();
        expect(validateLastSeen(at(20), null)).toBeNull();
    });
});

describe('validatePostcode', () => {
    it.each(['SW1A 1AA', 'sw1a1aa', 'M1 1AE', 'B33 8TH', 'CR2 6XH', 'DN55 1PT', null, ''])('accepts %j', (value) => {
        expect(validatePostcode(value)).toBeNull();
    });

    it.each(['SW1A-1AA', 'SW1A 1A@', 'BS1 #4DJ', '12345', 'ABC'])('rejects %j', (value) => {
        expect(validatePostcode(value)).toBe('Enter a valid UK postcode, e.g. SW1A 1AA');
    });
});

describe('validateSurveyEnd', () => {
    const at = (h: number, m = 0) => new Date(2026, 0, 1, h, m);
    const END_AFTER_START = 'End time must be within 12 hours after the start time';

    it('requires the end time to be within 12 hours after the start time of day', () => {
        expect(validateSurveyEnd(at(20), at(22))).toBeNull();
        expect(validateSurveyEnd(at(20), new Date(2025, 5, 5, 22, 0))).toBeNull();
        expect(validateSurveyEnd(at(20), at(8))).toBeNull();
        expect(validateSurveyEnd(at(20), at(20))).toBe(END_AFTER_START);
        expect(validateSurveyEnd(at(20), at(19, 59))).toBe(END_AFTER_START);
        expect(validateSurveyEnd(at(20), at(8, 1))).toBe(END_AFTER_START);
    });

    it('allows the survey to cross midnight', () => {
        expect(validateSurveyEnd(at(22, 30), at(0, 30))).toBeNull();
        expect(validateSurveyEnd(at(22, 30), at(0, 30), at(23, 45))).toBeNull();
        expect(validateSurveyEnd(at(22, 30), at(1), at(0, 15))).toBeNull();
    });

    it('ignores missing times', () => {
        expect(validateSurveyEnd(null, at(20))).toBeNull();
        expect(validateSurveyEnd(at(20), undefined)).toBeNull();
    });

    it('requires the end time to be after the sunrise/sunset time', () => {
        expect(validateSurveyEnd(at(20), at(22), at(21))).toBeNull();
        expect(validateSurveyEnd(at(20), at(21), at(21))).toBe('End time must be after the sunrise/sunset time');
        expect(validateSurveyEnd(at(23), at(0, 30), at(1))).toBe('End time must be after the sunrise/sunset time');
        expect(validateSurveyEnd(null, at(21), at(22))).toBe('End time must be after the sunrise/sunset time');
        expect(validateSurveyEnd(null, at(0, 30), at(23))).toBeNull();
        expect(validateSurveyEnd(at(20), at(19), at(21))).toBe(END_AFTER_START);
    });

    it('leaves an out-of-range sunrise/sunset to its own field', () => {
        expect(validateSurveyEnd(at(20), at(22), at(19))).toBeNull();
    });
});

describe('validateSurveySunset', () => {
    const at = (h: number, m = 0) => new Date(2026, 0, 1, h, m);
    const SUNSET_AFTER_START = 'Sunrise/sunset time must be within 12 hours after the start time';

    it('requires sunrise/sunset to be within 12 hours after the start time', () => {
        expect(validateSurveySunset(at(20), at(20, 15))).toBeNull();
        expect(validateSurveySunset(at(23), at(0, 15))).toBeNull();
        expect(validateSurveySunset(at(20), at(20))).toBe(SUNSET_AFTER_START);
        expect(validateSurveySunset(at(4), at(3, 30))).toBe(SUNSET_AFTER_START);
    });

    it('ignores missing times', () => {
        expect(validateSurveySunset(null, at(20))).toBeNull();
        expect(validateSurveySunset(at(20), null)).toBeNull();
    });
});

describe('validateSurveyTiming', () => {
    const at = (h: number, m = 0) => new Date(2026, 0, 1, h, m);
    const now = new Date(2026, 9, 11, 18, 0);

    it('reports each timing error', () => {
        expect(validateSurveyTiming(
            { date: new Date(2026, 9, 10), startTime: at(20), sunsetTime: at(19), endTime: at(19, 30) },
            { now },
        )).toEqual({
            start: "Survey start can't be in the past",
            sunset: 'Sunrise/sunset time must be within 12 hours after the start time',
            end: 'End time must be within 12 hours after the start time',
        });
    });

    it('skips the start check when asked', () => {
        expect(validateSurveyTiming({ date: new Date(2026, 9, 10), startTime: at(20) }, { checkStart: false, now }))
            .toEqual({ start: null, sunset: null, end: null });
    });
});

describe('validateSurveyStart', () => {
    const now = new Date(2026, 9, 11, 18, 0);

    it('requires the start date and time to be now or later', () => {
        expect(validateSurveyStart(new Date(2026, 9, 11), new Date(2020, 0, 1, 20, 0), now)).toBeNull();
        expect(validateSurveyStart(new Date(2026, 9, 11), new Date(2020, 0, 1, 17, 0), now)).toBe("Survey start can't be in the past");
        expect(validateSurveyStart(new Date(2026, 9, 10), new Date(2020, 0, 1, 20, 0), now)).toBe("Survey start can't be in the past");
    });

    it('accepts the current minute', () => {
        const midMinute = new Date(2026, 9, 11, 18, 0, 42);
        expect(validateSurveyStart(new Date(2026, 9, 11), new Date(2020, 0, 1, 18, 0), midMinute)).toBeNull();
        expect(validateSurveyStart(new Date(2026, 9, 11), new Date(2020, 0, 1, 17, 59), midMinute)).toBe("Survey start can't be in the past");
    });

    it('treats today as valid when no start time is chosen', () => {
        expect(validateSurveyStart(new Date(2026, 9, 11), null, now)).toBeNull();
        expect(validateSurveyStart(new Date(2026, 9, 10), null, now)).toBe("Survey start can't be in the past");
        expect(validateSurveyStart(null, null, now)).toBeNull();
    });
});
