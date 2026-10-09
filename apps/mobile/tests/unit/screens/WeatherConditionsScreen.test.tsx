jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import type { Survey } from '@bapp/domain';
import { WeatherConditionsScreen } from '@screens/Surveyor/WeatherConditionsScreen';
import { createMockService, renderWithService } from '../../helpers/testUtils';
import { buildContext, buildLocation, buildSurvey, buildSurveyor } from '../../helpers/factories';
import {
    mockNavigate,
    resetNavigationMock,
    setRouteParams,
} from '../../helpers/reactNavigationMock';

const startParams = { surveyId: 'survey-1', surveyorId: 'surveyor-1', locationId: 'location-1', type: 'start' };
const endParams = { ...startParams, type: 'end' };

const locatedService = (overrides: Parameters<typeof createMockService>[0] = {}) =>
    createMockService({
        getSurveyContext: jest.fn().mockResolvedValue(
            buildContext({ surveyors: [buildSurveyor({ id: 'surveyor-1', locationId: 'location-1' })] }),
        ),
        ...overrides,
    });

beforeEach(() => {
    resetNavigationMock();
    setRouteParams(startParams);
});

describe('WeatherConditionsScreen', () => {
    it('saves the trimmed start conditions and continues to confirm location', async () => {
        const service = locatedService();
        renderWithService(<WeatherConditionsScreen />, service);

        fireEvent.changeText(screen.getByPlaceholderText('Input Temperature'), ' -2.5 ');
        fireEvent.press(screen.getByText('Wet'));
        fireEvent.press(screen.getByText('Continue'));

        await waitFor(() =>
            expect(service.updateSurvey).toHaveBeenCalledWith('survey-1', {
                startWeather: { temperature: '-2.5', cloudCover: '', humidity: '', wind: '', rain: 'Wet' },
            }),
        );
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('SurveyorConfirmLocationScreen', {
                surveyId: 'survey-1',
                surveyorId: 'surveyor-1',
            }),
        );
    });

    it('saves end conditions with rain minutes and continues to the summary', async () => {
        setRouteParams(endParams);
        const service = createMockService();
        renderWithService(<WeatherConditionsScreen />, service);

        expect(screen.queryByText('Wet')).toBeNull();
        fireEvent.changeText(screen.getByPlaceholderText('Input Rain'), '15');
        fireEvent.press(screen.getByText('Continue'));

        await waitFor(() =>
            expect(service.updateSurvey).toHaveBeenCalledWith('survey-1', {
                endWeather: expect.objectContaining({ rain: '15' }),
            }),
        );
        expect(mockNavigate).toHaveBeenCalledWith('SurveySummaryScreen', {
            surveyId: 'survey-1',
            surveyorId: 'surveyor-1',
            locationId: 'location-1',
        });
    });

    it('disables continue until something is entered', () => {
        renderWithService(<WeatherConditionsScreen />, createMockService());
        expect(screen.getByLabelText('Continue')).toBeDisabled();
        fireEvent.changeText(screen.getByPlaceholderText('Input Wind'), '3');
        expect(screen.getByLabelText('Continue')).toBeEnabled();
    });

    it('shows field errors after editing and blocks continue while invalid', () => {
        const service = createMockService();
        renderWithService(<WeatherConditionsScreen />, service);

        const cloudCover = screen.getByPlaceholderText('Input Cloud Cover');
        fireEvent.changeText(cloudCover, '150');
        expect(screen.queryByText('Enter a value between 0 and 100')).toBeNull();
        fireEvent(cloudCover, 'endEditing');
        expect(screen.getByText('Enter a value between 0 and 100')).toBeOnTheScreen();

        const wind = screen.getByPlaceholderText('Input Wind');
        fireEvent.changeText(wind, '2.5');
        fireEvent(wind, 'endEditing');
        expect(screen.getByText('Enter a whole number')).toBeOnTheScreen();

        expect(screen.getByLabelText('Continue')).toBeDisabled();
        fireEvent.press(screen.getByText('Continue'));
        expect(service.updateSurvey).not.toHaveBeenCalled();
    });

    it('skips without saving anything', async () => {
        const service = locatedService();
        renderWithService(<WeatherConditionsScreen />, service);

        fireEvent.changeText(screen.getByPlaceholderText('Input Temperature'), '12');
        fireEvent.press(screen.getByText('Skip'));

        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('SurveyorConfirmLocationScreen', {
                surveyId: 'survey-1',
                surveyorId: 'surveyor-1',
            }),
        );
        expect(service.updateSurvey).not.toHaveBeenCalled();
    });

    it('skips confirm location when the surveyor has no location', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({ surveyors: [buildSurveyor({ id: 'surveyor-1', locationId: null })] }),
            ),
            addLocation: jest.fn().mockResolvedValue(buildLocation({ id: 'placeholder' })),
        });
        renderWithService(<WeatherConditionsScreen />, service);

        fireEvent.press(screen.getByText('Skip'));

        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('CapturePhotoScreen', {
                surveyId: 'survey-1',
                locationId: 'placeholder',
                surveyorId: 'surveyor-1',
                photoType: 'frontView',
            }),
        );
    });

    it('logs an error when the location step fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            getSurveyContext: jest.fn().mockRejectedValue(new Error('offline')),
        });
        renderWithService(<WeatherConditionsScreen />, service);

        fireEvent.press(screen.getByText('Skip'));

        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith('Unable to continue to the location step', expect.any(Error)),
        );
        expect(mockNavigate).not.toHaveBeenCalled();
        errorSpy.mockRestore();
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

        fireEvent.press(screen.getByText('Dry'));
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
        const service = locatedService();
        service.updateSurvey.mockImplementation(
            () => new Promise<Survey>((resolve) => {
                resolveUpdate = resolve;
            }),
        );
        renderWithService(<WeatherConditionsScreen />, service);

        fireEvent.press(screen.getByText('Dry'));
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
