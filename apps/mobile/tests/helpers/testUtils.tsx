import type { ReactElement } from 'react';
import { render } from '@testing-library/react-native';
import type { SurveyContext, SurveyService, Unsubscribe } from '@bapp/domain';
import { SurveyServiceProvider } from '@services/surveyServiceContext';
import { ActiveSurveyProvider } from '@services/ActiveSurveyProvider';
import { buildContext, buildLocation, buildSurvey, buildSurveyor } from './factories';

export type MockSurveyService = jest.Mocked<
    Pick<
        SurveyService,
        | 'createSurvey'
        | 'getSurveyContext'
        | 'subscribeSurveyContext'
        | 'prefetchMedia'
        | 'updateSurvey'
        | 'setBoundaryImage'
        | 'getBoundaryImage'
        | 'joinSurvey'
        | 'addSurveyor'
        | 'removeSurveyor'
        | 'removeLocation'
        | 'updateSurveyor'
        | 'addLocation'
        | 'updateLocation'
        | 'setLocationImage'
        | 'completeSurveyor'
        | 'completeSurvey'
        | 'resumeSurvey'
        | 'getSurvey'
    >
>;

/**
 * Builds a `subscribeSurveyContext` double that synchronously pushes a canned
 * context to the callback (mirroring the cache-first repository) and returns a
 * no-op unsubscribe. This is how the converted consumer screens receive their
 * data via the ActiveSurveyProvider.
 */
export const mockSubscribeContext = (
    context: SurveyContext = buildContext(),
): MockSurveyService['subscribeSurveyContext'] =>
    jest.fn((_surveyId: string, callback: (ctx: SurveyContext) => void): Unsubscribe => {
        callback(context);
        return jest.fn();
    });

export const createMockService = (
    overrides: Partial<MockSurveyService> = {},
): MockSurveyService => ({
    createSurvey: jest.fn().mockResolvedValue(buildSurvey()),
    getSurveyContext: jest.fn().mockResolvedValue(buildContext()),
    subscribeSurveyContext: mockSubscribeContext(),
    prefetchMedia: jest.fn(),
    updateSurvey: jest.fn().mockResolvedValue(buildSurvey()),
    setBoundaryImage: jest.fn().mockResolvedValue(undefined),
    getBoundaryImage: jest.fn().mockResolvedValue({ status: 'none' }),
    joinSurvey: jest.fn().mockResolvedValue(buildContext()),
    addSurveyor: jest.fn().mockResolvedValue(buildSurveyor()),
    removeSurveyor: jest.fn().mockResolvedValue(undefined),
    removeLocation: jest.fn().mockResolvedValue(undefined),
    updateSurveyor: jest.fn().mockResolvedValue(buildSurveyor()),
    addLocation: jest.fn().mockResolvedValue(buildLocation()),
    updateLocation: jest.fn().mockResolvedValue(buildLocation()),
    setLocationImage: jest.fn().mockResolvedValue(buildLocation()),
    completeSurveyor: jest.fn().mockResolvedValue(buildSurveyor({ status: 'done' })),
    completeSurvey: jest.fn().mockResolvedValue(buildSurvey({ status: 'completed' })),
    resumeSurvey: jest.fn().mockResolvedValue(buildContext()),
    getSurvey: jest.fn().mockResolvedValue(buildSurvey()),
    ...overrides,
});

export const renderWithService = (
    ui: ReactElement,
    service: MockSurveyService,
) =>
    render(
        <SurveyServiceProvider value={service as unknown as SurveyService}>
            {ui}
        </SurveyServiceProvider>,
    );

/**
 * Like `renderWithService`, but also wraps the screen in an ActiveSurveyProvider
 * for the given `surveyId` — required by screens that read live data via
 * `useActiveSurvey()`.
 */
export const renderWithActiveSurvey = (
    ui: ReactElement,
    service: MockSurveyService,
    surveyId: string | undefined = 'survey-1',
) =>
    render(
        <SurveyServiceProvider value={service as unknown as SurveyService}>
            <ActiveSurveyProvider surveyId={surveyId}>{ui}</ActiveSurveyProvider>
        </SurveyServiceProvider>,
    );
