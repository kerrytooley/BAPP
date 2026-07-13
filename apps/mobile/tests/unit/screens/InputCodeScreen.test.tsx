jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { InputCodeScreen } from '@screens/Surveyor/InputCodeScreen';
import { buildContext, buildSurvey } from '../../helpers/factories';
import { createMockService, renderWithService } from '../../helpers/testUtils';
import {
    mockNavigate,
    resetNavigationMock,
} from '../../helpers/reactNavigationMock';

beforeEach(resetNavigationMock);

describe('InputCodeScreen', () => {
    it('renders the code input', () => {
        renderWithService(<InputCodeScreen />, createMockService());
        expect(screen.getByPlaceholderText('XXXXXX')).toBeOnTheScreen();
    });

    it('joins the survey and confirms the code', async () => {
        const service = createMockService({
            joinSurvey: jest.fn().mockResolvedValue(
                buildContext({ survey: buildSurvey({ id: 'joined-survey' }) }),
            ),
        });
        renderWithService(<InputCodeScreen />, service);
        fireEvent.changeText(screen.getByPlaceholderText('XXXXXX'), 'BAT123');
        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() => expect(service.joinSurvey).toHaveBeenCalledWith('BAT123'));
        expect(mockNavigate).toHaveBeenCalledWith('CodeConfirmationScreen', {
            surveyId: 'joined-survey',
        });
    });

    it('does not navigate when joining fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            joinSurvey: jest.fn().mockRejectedValue(new Error('bad code')),
        });
        renderWithService(<InputCodeScreen />, service);
        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() => expect(errorSpy).toHaveBeenCalled());
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
