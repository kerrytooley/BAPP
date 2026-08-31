jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { EmailScreen } from '@screens/Admin/EmailScreen';
import { buildContext, buildSurvey } from '../../helpers/factories';
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

describe('EmailScreen', () => {
    it('renders the email field', () => {
        renderWithService(<EmailScreen />, createMockService());
        expect(screen.getByPlaceholderText('Input email address')).toBeOnTheScreen();
    });

    it('persists the email and navigates on continue', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({ survey: buildSurvey({ data: { existing: true } }) }),
            ),
        });
        renderWithService(<EmailScreen />, service);
        fireEvent.changeText(
            screen.getByPlaceholderText('Input email address'),
            'admin@example.com',
        );
        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() =>
            expect(service.updateSurvey).toHaveBeenCalledWith('survey-1', {
                data: { existing: true, adminEmail: 'admin@example.com' },
            }),
        );
        expect(mockNavigate).toHaveBeenCalledWith('SaveAdminCodeScreen', {
            surveyId: 'survey-1',
        });
    });

    it('does not navigate when the update fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            updateSurvey: jest.fn().mockRejectedValue(new Error('nope')),
        });
        renderWithService(<EmailScreen />, service);
        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() => expect(errorSpy).toHaveBeenCalled());
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
