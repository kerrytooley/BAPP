/**
 * Pure field-format rules shared by the UI (live inline errors) and
 * `FieldValidator` (write-time enforcement). Each rule returns an error message,
 * or `null` when valid. Blank input means "not provided" and is always valid —
 * whether a field is required is a UI concern, not a domain one.
 */

import type { Weather } from './models/survey';

export type FieldError = string | null;

export function isBlank(value: string | null | undefined): boolean {
    return value == null || value.trim() === '';
}

export function validateRequiredText(value: string | null | undefined, label: string): FieldError {
    return isBlank(value) ? `${label} is required` : null;
}

export interface NumberRule {
    min?: number;
    max?: number;
    integer?: boolean;
}

const DECIMAL = /^-?\d+(\.\d+)?$/;
const INTEGER = /^-?\d+$/;

export function validateNumber(value: string | null | undefined, rule: NumberRule = {}): FieldError {
    if (isBlank(value)) return null;
    const text = (value as string).trim();
    if (rule.integer ? !INTEGER.test(text) : !DECIMAL.test(text)) {
        return rule.integer ? 'Enter a whole number' : 'Enter a number';
    }
    const n = Number(text);
    if (rule.min !== undefined && rule.max !== undefined && (n < rule.min || n > rule.max)) {
        return `Enter a value between ${rule.min} and ${rule.max}`;
    }
    if (rule.min !== undefined && n < rule.min) return `Enter a value of ${rule.min} or more`;
    if (rule.max !== undefined && n > rule.max) return `Enter a value of ${rule.max} or less`;
    return null;
}

const SURVEY_CODE = /^[a-z0-9]{6}$/i;

export function validateSurveyCode(value: string | null | undefined): FieldError {
    if (isBlank(value)) return null;
    return SURVEY_CODE.test((value as string).trim()) ? null : 'Codes are 6 letters or numbers';
}

export const WEATHER_RULES = {
    temperature: { min: -20, max: 45 },
    cloudCover: { min: 0, max: 100 },
    humidity: { min: 0, max: 100 },
    wind: { min: 0, max: 12, integer: true },
    endRainMinutes: { min: 0, integer: true },
} as const satisfies Record<string, NumberRule>;

export const START_RAIN_OPTIONS = ['Wet', 'Dry'] as const;

export type WeatherKind = 'start' | 'end';
export type WeatherErrors = Partial<Record<keyof Weather, string>>;

export function validateRain(value: string | null | undefined, kind: WeatherKind): FieldError {
    if (isBlank(value)) return null;
    if (kind === 'end') return validateNumber(value, WEATHER_RULES.endRainMinutes);
    return (START_RAIN_OPTIONS as readonly string[]).includes((value as string).trim())
        ? null
        : `Choose ${START_RAIN_OPTIONS.join(' or ')}`;
}

/** Errors keyed by field; empty object when every provided reading is valid. */
export function validateWeather(weather: Partial<Weather> | null | undefined, kind: WeatherKind): WeatherErrors {
    const errors: WeatherErrors = {};
    if (!weather) return errors;
    const checks: [keyof Weather, FieldError][] = [
        ['temperature', validateNumber(weather.temperature, WEATHER_RULES.temperature)],
        ['cloudCover', validateNumber(weather.cloudCover, WEATHER_RULES.cloudCover)],
        ['humidity', validateNumber(weather.humidity, WEATHER_RULES.humidity)],
        ['wind', validateNumber(weather.wind, WEATHER_RULES.wind)],
        ['rain', validateRain(weather.rain, kind)],
    ];
    for (const [key, error] of checks) {
        if (error) errors[key] = error;
    }
    return errors;
}

export const FREQUENCY_KHZ_RULE: NumberRule = { min: 10, max: 150 };

export function validateFrequencyKhz(value: string | null | undefined): FieldError {
    return validateNumber(value, FREQUENCY_KHZ_RULE);
}

export function validateCount(value: number | null | undefined): FieldError {
    if (value == null) return null;
    return Number.isInteger(value) && value >= 0 ? null : 'Counts must be a whole number of 0 or more';
}

export function validateLastSeen(firstSeenAt: Date | null | undefined, lastSeenAt: Date | null | undefined): FieldError {
    if (!firstSeenAt || !lastSeenAt) return null;
    return lastSeenAt.getTime() < firstSeenAt.getTime() ? "Last seen time can't be before the first seen time" : null;
}

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i;

export function validatePostcode(value: string | null | undefined): FieldError {
    if (isBlank(value)) return null;
    return UK_POSTCODE.test((value as string).trim()) ? null : 'Enter a valid UK postcode, e.g. SW1A 1AA';
}

// Survey times only carry a time of day; their date part is whenever they were picked.
const minutesOfDay = (time: Date) => time.getHours() * 60 + time.getMinutes();

const DAY_MINUTES = 24 * 60;
export const MAX_SURVEY_HOURS = 12;

// A time earlier in the day than `from` is read as the next day, so surveys can cross midnight.
const minutesAfter = (from: Date, time: Date) =>
    (minutesOfDay(time) - minutesOfDay(from) + DAY_MINUTES) % DAY_MINUTES;

const withinSurvey = (offset: number) => offset > 0 && offset <= MAX_SURVEY_HOURS * 60;

/**
 * Place a picked last-seen time (only its time of day is meaningful) relative to
 * the first sighting: on the same date, or the next day when it is earlier in the
 * day but within {@link MAX_SURVEY_HOURS} after it — e.g. 00:05 after 23:55.
 * Otherwise it stays earlier, for {@link validateLastSeen} to reject.
 */
export function lastSeenAfter(firstSeenAt: Date, lastSeenTime: Date): Date {
    const lastSeen = new Date(firstSeenAt);
    lastSeen.setHours(lastSeenTime.getHours(), lastSeenTime.getMinutes(), lastSeenTime.getSeconds(), lastSeenTime.getMilliseconds());
    if (lastSeen < firstSeenAt && withinSurvey(minutesAfter(firstSeenAt, lastSeenTime))) {
        lastSeen.setDate(lastSeen.getDate() + 1);
    }
    return lastSeen;
}

const SUNSET_AFTER_START = `Sunrise/sunset time must be within ${MAX_SURVEY_HOURS} hours after the start time`;
const END_AFTER_START = `End time must be within ${MAX_SURVEY_HOURS} hours after the start time`;
const END_AFTER_SUNSET = 'End time must be after the sunrise/sunset time';

export function validateSurveySunset(startTime: Date | null | undefined, sunsetTime: Date | null | undefined): FieldError {
    if (!startTime || !sunsetTime) return null;
    return withinSurvey(minutesAfter(startTime, sunsetTime)) ? null : SUNSET_AFTER_START;
}

export function validateSurveyEnd(
    startTime: Date | null | undefined,
    endTime: Date | null | undefined,
    sunsetTime?: Date | null,
): FieldError {
    if (!endTime) return null;
    if (!startTime) {
        return sunsetTime && !withinSurvey(minutesAfter(sunsetTime, endTime)) ? END_AFTER_SUNSET : null;
    }
    const endOffset = minutesAfter(startTime, endTime);
    if (!withinSurvey(endOffset)) return END_AFTER_START;
    // An out-of-range sunset is reported on the sunset field instead.
    const sunsetOffset = sunsetTime ? minutesAfter(startTime, sunsetTime) : null;
    if (sunsetOffset !== null && withinSurvey(sunsetOffset) && sunsetOffset >= endOffset) return END_AFTER_SUNSET;
    return null;
}

/** The start may be the current minute — times carry no seconds. */
export function validateSurveyStart(
    date: Date | null | undefined,
    startTime: Date | null | undefined,
    now: Date = new Date(),
): FieldError {
    if (!date) return null;
    const start = new Date(date);
    if (startTime) start.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
    else start.setHours(23, 59, 59, 999);
    const currentMinute = new Date(now);
    currentMinute.setSeconds(0, 0);
    return start >= currentMinute ? null : "Survey start can't be in the past";
}

export interface SurveyTiming {
    date?: Date | null;
    startTime?: Date | null;
    sunsetTime?: Date | null;
    endTime?: Date | null;
}

export interface SurveyTimingErrors {
    start: FieldError;
    sunset: FieldError;
    end: FieldError;
}

/**
 * `checkStart` is off when editing a survey whose date and start are unchanged,
 * so an already-started survey can still have its other times corrected.
 */
export function validateSurveyTiming(
    timing: SurveyTiming,
    { checkStart = true, now = new Date() }: { checkStart?: boolean; now?: Date } = {},
): SurveyTimingErrors {
    return {
        start: checkStart ? validateSurveyStart(timing.date, timing.startTime, now) : null,
        sunset: validateSurveySunset(timing.startTime, timing.sunsetTime),
        end: validateSurveyEnd(timing.startTime, timing.endTime, timing.sunsetTime),
    };
}
