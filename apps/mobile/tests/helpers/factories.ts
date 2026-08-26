import type {
    Survey,
    Surveyor,
    Location,
    SurveyContext,
    Observation,
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
    boundary: null,
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
    frontViewImage: null,
    equipmentImage: null,
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

export const buildObservation = (
    overrides: Partial<Observation> = {},
): Observation => ({
    id: 'obs-1',
    surveyId: 'survey-1',
    locationId: 'location-1',
    surveyorId: 'surveyor-1',
    species: 'Noctule',
    firstSeenAt: new Date(2026, 6, 13, 20, 30),
    lastSeenAt: new Date(2026, 6, 13, 20, 45),
    seenCount: 2,
    heardCount: 1,
    frequency: '45',
    direction: 'N->S',
    notes: 'a nice bat',
    emergence: false,
    flightPaths: [],
    data: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
});
