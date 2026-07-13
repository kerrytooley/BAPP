import type {
    Survey,
    Surveyor,
    Location,
    SurveyContext,
} from '@bapp/domain';

const now = new Date(2026, 6, 13, 12, 0, 0);

export const buildSurvey = (overrides: Partial<Survey> = {}): Survey => ({
    id: 'survey-1',
    adminCode: 'ADMIN1',
    surveyorCode: 'BAT123',
    name: 'Dusk count',
    postcode: 'SW1A 1AA',
    date: new Date(2026, 6, 13),
    sunsetTime: new Date(2026, 6, 13, 21, 15),
    startTime: new Date(2026, 6, 13, 20, 0),
    endTime: new Date(2026, 6, 13, 22, 0),
    boundaryImageRef: null,
    status: 'draft',
    weather: {},
    data: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
});

export const buildSurveyor = (
    overrides: Partial<Surveyor> = {},
): Surveyor => ({
    id: 'surveyor-1',
    surveyId: 'survey-1',
    locationId: null,
    name: 'Ada',
    isLead: true,
    status: 'pending',
    data: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
});

export const buildLocation = (
    overrides: Partial<Location> = {},
): Location => ({
    id: 'location-1',
    surveyId: 'survey-1',
    name: null,
    boundaryPosition: { x: 0.5, y: 0.5 },
    frontViewImageRef: null,
    equipmentImageRef: null,
    data: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
});

export const buildContext = (
    overrides: Partial<SurveyContext> = {},
): SurveyContext => ({
    survey: buildSurvey(),
    locations: [],
    surveyors: [],
    observations: [],
    ...overrides,
});
