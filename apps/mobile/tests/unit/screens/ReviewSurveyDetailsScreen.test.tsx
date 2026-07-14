jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ReviewSurveyDetailsScreen } from '@screens/Admin/ReviewSurveyDetailsScreen';
import { buildContext, buildSurvey, buildSurveyor } from '../../helpers/factories';
import { createMockService, renderWithService } from '../../helpers/testUtils';
import {
    mockNavigate,
    resetNavigationMock,
    setRouteParams,
} from '../../helpers/reactNavigationMock';

beforeEach(() => {
    resetNavigationMock();
    setRouteParams({ surveyId: 'survey-1' });
});

const populatedContext = () =>
    buildContext({
        survey: buildSurvey({
            name: 'Dusk count',
            postcode: 'SW1A 1AA',
            date: new Date(2026, 6, 13),
            startTime: new Date(2026, 6, 13, 20, 30),
            endTime: null,
            sunsetTime: new Date(2026, 6, 13, 21, 0),
        }),
        surveyors: [
            buildSurveyor({ isLead: true, name: 'Alice' }),
            buildSurveyor({ isLead: false, name: 'Bob' }),
        ],
    });

describe('ReviewSurveyDetailsScreen', () => {
    it('renders the loaded survey summary', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(populatedContext()),
            getBoundaryImage: jest.fn().mockResolvedValue({ status: 'ready', url: 'https://img/boundary.jpg' }),
        });
        renderWithService(<ReviewSurveyDetailsScreen />, service);
        await waitFor(() => expect(screen.getByText('Dusk count')).toBeOnTheScreen());
        expect(screen.getByText('SW1A 1AA')).toBeOnTheScreen();
        expect(screen.getByText('Lead Surveyor')).toBeOnTheScreen();
        expect(screen.getByText('Surveyor 1')).toBeOnTheScreen();
        expect(screen.getByText('N/A')).toBeOnTheScreen();
    });

    it('navigates to share the code when setup is completed', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(populatedContext()),
        });
        renderWithService(<ReviewSurveyDetailsScreen />, service);
        await waitFor(() => expect(screen.getByText('Dusk count')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Complete Survey Setup'));
        expect(mockNavigate).toHaveBeenCalledWith('ShareCodeScreen', {
            surveyId: 'survey-1',
        });
    });

    it('navigates to the saved screen when saving for later', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(populatedContext()),
        });
        renderWithService(<ReviewSurveyDetailsScreen />, service);
        await waitFor(() => expect(screen.getByText('Dusk count')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Save for Later'));
        expect(mockNavigate).toHaveBeenCalledWith('SurveySavedScreen');
    });

    it('logs an error when the survey fails to load', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            getSurveyContext: jest.fn().mockRejectedValue(new Error('load failed')),
        });
        renderWithService(<ReviewSurveyDetailsScreen />, service);
        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'failed to fetch survey',
                expect.any(Error),
            ),
        );
    });
});
