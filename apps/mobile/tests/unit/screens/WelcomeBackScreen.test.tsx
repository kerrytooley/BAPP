jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent } from '@testing-library/react-native';
import { WelcomeBackScreen } from '@screens/Surveyor/WelcomeBackScreen';
import { buildContext, buildLocation, buildSurveyor } from '../../helpers/factories';
import {
    createMockService,
    mockSubscribeContext,
    renderWithActiveSurvey,
} from '../../helpers/testUtils';
import {
    mockNavigate,
    resetNavigationMock,
    setRouteParams,
} from '../../helpers/reactNavigationMock';

const serviceWith = (surveyors = [buildSurveyor({ id: 's-1', name: 'Ada', status: 'done', locationId: 'location-1' })]) =>
    createMockService({
        subscribeSurveyContext: mockSubscribeContext(
            buildContext({ surveyors, locations: [buildLocation({ id: 'location-1' })] }),
        ),
    });

beforeEach(() => {
    resetNavigationMock();
    setRouteParams({ surveyId: 'survey-1', surveyorId: 's-1' });
});

describe('WelcomeBackScreen', () => {
    it('greets the surveyor by name', () => {
        renderWithActiveSurvey(<WelcomeBackScreen />, serviceWith());
        expect(screen.getByText('Welcome back Ada')).toBeOnTheScreen();
    });

    it('continues to where the surveyor left off', () => {
        renderWithActiveSurvey(<WelcomeBackScreen />, serviceWith());
        fireEvent.press(screen.getByText('Continue'));
        expect(mockNavigate).toHaveBeenCalledWith({
            name: 'SurveyorCompleteScreen',
            params: { surveyId: 'survey-1', surveyorId: 's-1', locationId: 'location-1' },
        });
    });

    it('lets them change surveyor', () => {
        renderWithActiveSurvey(<WelcomeBackScreen />, serviceWith());
        fireEvent.press(screen.getByText('Change surveyor'));
        expect(mockNavigate).toHaveBeenCalledWith('SelectSurveyorScreen', { surveyId: 'survey-1' });
    });

    it('asks who they are when the surveyor no longer exists', () => {
        renderWithActiveSurvey(<WelcomeBackScreen />, serviceWith([]));
        expect(screen.getByText('Welcome back')).toBeOnTheScreen();
        fireEvent.press(screen.getByText('Continue'));
        expect(mockNavigate).toHaveBeenCalledWith('SelectSurveyorScreen', { surveyId: 'survey-1' });
    });
});
