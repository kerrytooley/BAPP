jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { BeginOrContinueSurveyScreen } from '@screens/Admin/BeginOrContinueSurveyScreen';
import { buildSurvey } from '../../helpers/factories';
import { createMockService, renderWithService } from '../../helpers/testUtils';
import { mockNavigate, mockGoBack, resetNavigationMock } from '../../helpers/reactNavigationMock';

beforeEach(resetNavigationMock);

describe('BeginOrContinueSurveyScreen', () => {
    it('creates a survey and navigates to the email screen', async () => {
        const service = createMockService({
            createSurvey: jest.fn().mockResolvedValue(buildSurvey({ id: 'new-survey' })),
        });
        renderWithService(<BeginOrContinueSurveyScreen />, service);
        fireEvent.press(screen.getByText('Begin a new survey'));
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('EmailScreen', {
                surveyId: 'new-survey',
            }),
        );
    });

    it('does not navigate when survey creation fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            createSurvey: jest.fn().mockRejectedValue(new Error('boom')),
        });
        renderWithService(<BeginOrContinueSurveyScreen />, service);
        fireEvent.press(screen.getByText('Begin a new survey'));
        await waitFor(() => expect(errorSpy).toHaveBeenCalled());
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does nothing when choosing to continue an existing survey', () => {
        const service = createMockService();
        renderWithService(<BeginOrContinueSurveyScreen />, service);
        fireEvent.press(screen.getByText('Continue existing survey'));
        expect(service.createSurvey).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('goes back from the back button', () => {
        const service = createMockService();
        renderWithService(<BeginOrContinueSurveyScreen />, service);
        fireEvent.press(screen.getByLabelText('Go back'));
        expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
});
