jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AdminCodeScreen } from '@screens/Admin/AdminCodeScreen';
import { loadRecentSurveys } from '@services/recentSurveys';
import { buildContext, buildSurvey } from '../../helpers/factories';
import { createMockService, renderWithService } from '../../helpers/testUtils';
import {
    mockNavigate,
    resetNavigationMock,
} from '../../helpers/reactNavigationMock';

beforeEach(() => {
    resetNavigationMock();
});

describe('AdminCodeScreen', () => {
    it('renders the code input', () => {
        renderWithService(<AdminCodeScreen />, createMockService());
        expect(screen.getByPlaceholderText('XXXXXX')).toBeOnTheScreen();
    });

    it('resumes the survey and navigates to the status screen', async () => {
        const service = createMockService({
            resumeSurvey: jest.fn().mockResolvedValue(
                buildContext({ survey: buildSurvey({ id: 'resumed-survey' }) }),
            ),
        });
        renderWithService(<AdminCodeScreen />, service);

        fireEvent.changeText(screen.getByPlaceholderText('XXXXXX'), 'ADMIN1');
        fireEvent.press(screen.getByText('Continue'));

        await waitFor(() => expect(service.resumeSurvey).toHaveBeenCalledWith('ADMIN1'));
        expect(mockNavigate).toHaveBeenCalledWith('SurveyStatusScreen', {
            surveyId: 'resumed-survey',
        });
        await waitFor(async () =>
            expect(await loadRecentSurveys()).toEqual([
                expect.objectContaining({ surveyId: 'resumed-survey', role: 'admin' }),
            ]),
        );
    });

    it('shows a not-found message and does not navigate when the code is not found', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            resumeSurvey: jest.fn().mockRejectedValue(new Error('not found')),
        });
        renderWithService(<AdminCodeScreen />, service);

        fireEvent.changeText(screen.getByPlaceholderText('XXXXXX'), 'zzz999');
        fireEvent.press(screen.getByText('Continue'));

        expect(await screen.findByText('Survey not found')).toBeOnTheScreen();
        expect(screen.getByText('No survey matches that admin code. Please check and try again.')).toBeOnTheScreen();
        expect(mockNavigate).not.toHaveBeenCalled();

        fireEvent.press(screen.getByText('OK'));
        await waitFor(() => expect(screen.queryByText('Survey not found')).toBeNull());
        errorSpy.mockRestore();
    });

    it('disables continue until a valid code is entered', () => {
        const service = createMockService();
        renderWithService(<AdminCodeScreen />, service);
        expect(screen.getByLabelText('Continue')).toBeDisabled();

        fireEvent.changeText(screen.getByPlaceholderText('XXXXXX'), 'abc');
        expect(screen.getByLabelText('Continue')).toBeDisabled();
        expect(screen.queryByText('Codes are 6 letters or numbers')).toBeNull();

        fireEvent.changeText(screen.getByPlaceholderText('XXXXXX'), 'ab-12c');
        expect(screen.getByText('Codes are 6 letters or numbers')).toBeOnTheScreen();
        fireEvent.press(screen.getByText('Continue'));
        expect(service.resumeSurvey).not.toHaveBeenCalled();

        fireEvent.changeText(screen.getByPlaceholderText('XXXXXX'), 'abc123');
        expect(screen.getByLabelText('Continue')).toBeEnabled();
    });
});
