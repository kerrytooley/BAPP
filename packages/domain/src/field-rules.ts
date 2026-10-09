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
