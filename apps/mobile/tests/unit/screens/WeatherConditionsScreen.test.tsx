jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import type { Survey } from '@bapp/domain';
import { WeatherConditionsScreen } from '@screens/Surveyor/WeatherConditionsScreen';
import { createMockService, renderWithService } from '../../helpers/testUtils';
import { buildSurvey } from '../../helpers/factories';
import {
    mockNavigate,
    resetNavigationMock,
    setRouteParams,
} from '../../helpers/reactNavigationMock';

beforeEach(() => {
    resetNavigationMock();
    setRouteParams({ surveyId: 'survey-1', surveyorId: 'surveyor-1' });
});

describe('WeatherConditionsScreen', () => {
    it('saves the entered conditions and continues to confirm location', async () => {
        const service = createMockService();
        renderWithService(<WeatherConditionsScreen />, service);

        fireEvent.changeText(screen.getByPlaceholderText('Input Temperature'), '20');
        fireEvent.press(screen.getByText('Wet'));
        fireEvent.press(screen.getByText('Continue'));

        await waitFor(() =>
            expect(service.updateSurvey).toHaveBeenCalledWith(
                'survey-1',
                expect.objectContaining({
                    weather: expect.objectContaining({ temperature: '20', rain: 'Wet' }),
                }),
            ),
        );
        expect(mockNavigate).toHaveBeenCalledWith('SurveyorConfirmLocationScreen', {
            surveyId: 'survey-1',
            surveyorId: 'surveyor-1',
        });
    });

    it('marks the chosen rain option as selected', () => {
        renderWithService(<WeatherConditionsScreen />, createMockService());
        fireEvent.press(screen.getByText('Dry'));
        const states = screen
            .getAllByRole('radio')
            .map((radio) => radio.props.accessibilityState?.selected);
        expect(states).toContain(true);
        expect(states).toContain(false);
    });

    it('logs an error and does not navigate when saving fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            updateSurvey: jest.fn().mockRejectedValue(new Error('save failed')),
        });
        renderWithService(<WeatherConditionsScreen />, service);

        fireEvent.press(screen.getByText('Continue'));

        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'Failed to save weather conditions',
                expect.any(Error),
            ),
        );
        expect(mockNavigate).not.toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    it('ignores a second continue press while the first save is in flight', async () => {
        let resolveUpdate: (value: Survey) => void = () => { };
        const service = createMockService();
        service.updateSurvey.mockImplementation(
            () => new Promise<Survey>((resolve) => {
                resolveUpdate = resolve;
            }),
        );
        renderWithService(<WeatherConditionsScreen />, service);

        fireEvent.press(screen.getByText('Continue'));
        fireEvent.press(screen.getByText('Continue'));

        await waitFor(() => expect(service.updateSurvey).toHaveBeenCalledTimes(1));
        resolveUpdate(buildSurvey());
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('SurveyorConfirmLocationScreen', {
                surveyId: 'survey-1',
                surveyorId: 'surveyor-1',
            }),
        );
    });
});
