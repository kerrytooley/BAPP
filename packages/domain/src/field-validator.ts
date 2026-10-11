import type { SurveyContext } from './survey-context';
import type { SurveyChange, SurveyValidator } from './validation';
import { ValidationError } from './validation-error';
import {
    isBlank,
    validateCount,
    validateFrequencyKhz,
    validatePostcode,
    validateSurveyEnd,
    validateSurveySunset,
    validateWeather,
    type FieldError,
} from './field-rules';

/**
 * Enforces field formats (see field-rules.ts) on the changed entity only, and —
 * for updates — only on the fields in the patch, so pre-existing bad data in
 * untouched fields never blocks unrelated writes.
 */
export class FieldValidator implements SurveyValidator {
    validate(context: SurveyContext, change: SurveyChange): void {
        const touched = (field: string) => !change.fields || change.fields.includes(field);
        const errors: FieldError[] = [];

        switch (change.type) {
            case 'survey': {
                const { survey } = context;
                if (touched('startWeather')) errors.push(...Object.values(validateWeather(survey.startWeather, 'start')));
                if (touched('endWeather')) errors.push(...Object.values(validateWeather(survey.endWeather, 'end')));
                if (touched('postcode')) errors.push(validatePostcode(survey.postcode));
                if (touched('startTime') || touched('sunsetTime') || touched('endTime')) {
                    errors.push(validateSurveySunset(survey.startTime, survey.sunsetTime));
                    errors.push(validateSurveyEnd(survey.startTime, survey.endTime, survey.sunsetTime));
                }
                break;
            }
            case 'location': {
                const location = context.locations.find((l) => l.id === change.locationId);
                if (location && touched('notes') && location.notes?.some((n) => isBlank(n.text))) {
                    errors.push('Notes cannot be blank');
                }
                break;
            }
            case 'observation': {
                const observation = context.observations.find((o) => o.id === change.observationId);
                if (!observation) break;
                if (touched('frequency')) errors.push(validateFrequencyKhz(observation.frequency));
                if (touched('seenCount')) errors.push(validateCount(observation.seenCount));
                if (touched('heardCount')) errors.push(validateCount(observation.heardCount));
                break;
            }
            case 'surveyor':
                break;
        }

        const first = errors.find((e): e is string => !!e);
        if (first) throw new ValidationError(first);
    }
}
