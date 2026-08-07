jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { WeatherConditionsScreen } from '@screens/Surveyor/WeatherConditionsScreen';
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
});
