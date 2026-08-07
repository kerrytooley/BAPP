jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ConfirmSurveyorDetailsScreen } from '@screens/Surveyor/ConfirmSurveyorDetailsScreen';
import { buildContext, buildSurvey, buildSurveyor } from '../../helpers/factories';
import { createMockService, renderWithService } from '../../helpers/testUtils';
import {
    mockNavigate,
    resetNavigationMock,
    setRouteParams,
} from '../../helpers/reactNavigationMock';

beforeEach(() => {
    resetNavigationMock();
    setRouteParams({ surveyId: 'survey-1', surveyorId: 'surveyor-1' });
});

const context = (isLead: boolean, name = 'Ada') =>
    buildContext({
        survey: buildSurvey({ name: 'Dusk count', postcode: 'SW1A 1AA' }),
        surveyors: [buildSurveyor({ id: 'surveyor-1', isLead, name })],
    });

describe('ConfirmSurveyorDetailsScreen', () => {
    it('shows the lead surveyor summary and continues to weather conditions', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(context(true)),
            getBoundaryImage: jest.fn().mockResolvedValue({
                status: 'ready',
                url: 'https://img/boundary.jpg',
            }),
        });
        renderWithService(<ConfirmSurveyorDetailsScreen />, service);
        await waitFor(() =>
            expect(screen.getByText('Lead Surveyor')).toBeOnTheScreen(),
        );
        expect(screen.getByText('Dusk count')).toBeOnTheScreen();
        fireEvent.press(screen.getByText('Continue'));
        expect(mockNavigate).toHaveBeenCalledWith('WeatherConditionsScreen', {
            surveyId: 'survey-1',
            surveyorId: 'surveyor-1',
        });
    });

    it('continues a non-lead surveyor to confirm their location', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(context(false, 'Bob')),
            getBoundaryImage: jest.fn().mockResolvedValue({ status: 'none' }),
        });
        renderWithService(<ConfirmSurveyorDetailsScreen />, service);
        await waitFor(() => expect(screen.getByText('Bob')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Continue'));
        expect(mockNavigate).toHaveBeenCalledWith('SurveyorConfirmLocationScreen', {
            surveyId: 'survey-1',
            surveyorId: 'surveyor-1',
        });
    });

    it('returns to the code entry when the details do not look right', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(context(true)),
            getBoundaryImage: jest.fn().mockResolvedValue({ status: 'none' }),
        });
        renderWithService(<ConfirmSurveyorDetailsScreen />, service);
        await waitFor(() =>
            expect(screen.getByText('Lead Surveyor')).toBeOnTheScreen(),
        );
        fireEvent.press(screen.getByText("Doesn't look right?"));
        expect(mockNavigate).toHaveBeenCalledWith('InputCodeScreen');
    });

    it('logs an error when the survey context fails to load', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            getSurveyContext: jest.fn().mockRejectedValue(new Error('load failed')),
        });
        renderWithService(<ConfirmSurveyorDetailsScreen />, service);
        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'Error: unable to fetch survey context',
                expect.any(Error),
            ),
        );
    });
});
