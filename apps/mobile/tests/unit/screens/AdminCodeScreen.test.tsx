jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { AdminCodeScreen } from '@screens/Admin/AdminCodeScreen';
import { buildContext, buildSurvey } from '../../helpers/factories';
import { createMockService, renderWithService } from '../../helpers/testUtils';
import {
    mockNavigate,
    resetNavigationMock,
} from '../../helpers/reactNavigationMock';

beforeEach(() => {
    resetNavigationMock();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
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
    });

    it('alerts and does not navigate when the code is not found', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const service = createMockService({
            resumeSurvey: jest.fn().mockRejectedValue(new Error('not found')),
        });
        renderWithService(<AdminCodeScreen />, service);

        fireEvent.press(screen.getByText('Continue'));

        await waitFor(() =>
            expect(Alert.alert).toHaveBeenCalledWith(
                'Survey not found',
                'No survey matches that admin code. Please check and try again.',
            ),
        );
        expect(mockNavigate).not.toHaveBeenCalled();
        errorSpy.mockRestore();
    });
});
