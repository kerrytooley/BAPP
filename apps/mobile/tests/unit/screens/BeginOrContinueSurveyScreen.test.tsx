jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent } from '@testing-library/react-native';
import { BeginOrContinueSurveyScreen } from '@screens/Admin/BeginOrContinueSurveyScreen';
import { createMockService, renderWithService } from '../../helpers/testUtils';
import { mockNavigate, mockGoBack, resetNavigationMock } from '../../helpers/reactNavigationMock';

beforeEach(resetNavigationMock);

describe('BeginOrContinueSurveyScreen', () => {
    it('navigates to the welcome walkthrough when beginning a new survey', () => {
        const service = createMockService();
        renderWithService(<BeginOrContinueSurveyScreen />, service);
        fireEvent.press(screen.getByText('Begin a new survey'));
        expect(service.createSurvey).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('WelcomeWalkthroughScreen');
    });

    it('navigates to the admin code screen when choosing to continue an existing survey', () => {
        const service = createMockService();
        renderWithService(<BeginOrContinueSurveyScreen />, service);
        fireEvent.press(screen.getByText('Continue existing survey'));
        expect(service.createSurvey).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('AdminCodeScreen');
    });

    it('goes back from the back button', () => {
        const service = createMockService();
        renderWithService(<BeginOrContinueSurveyScreen />, service);
        fireEvent.press(screen.getByLabelText('Go back'));
        expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
});
