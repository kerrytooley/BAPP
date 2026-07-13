import type { ReactElement } from 'react';
import { render } from '@testing-library/react-native';
import type { SurveyService } from '@bapp/domain';
import { SurveyServiceProvider } from '@services/surveyServiceContext';
import { buildContext, buildLocation, buildSurvey, buildSurveyor } from './factories';

export type MockSurveyService = jest.Mocked<
    Pick<
        SurveyService,
        | 'createSurvey'
        | 'getSurveyContext'
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
    >
>;

export const createMockService = (
    overrides: Partial<MockSurveyService> = {},
): MockSurveyService => ({
    createSurvey: jest.fn().mockResolvedValue(buildSurvey()),
    getSurveyContext: jest.fn().mockResolvedValue(buildContext()),
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
