jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { ValidationError, type Surveyor } from '@bapp/domain';
import { SurveySummaryScreen } from '@screens/Surveyor/SurveySummaryScreen';
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
import { buildContext, buildObservation, buildSurvey, buildSurveyor } from '../../helpers/factories';

const service = createMockService({
    subscribeSurveyContext: mockSubscribeContext(
        buildContext({
            survey: buildSurvey({ name: 'Dusk count' }),
            surveyors: [buildSurveyor({ id: 'surveyor-1', name: 'Ada' })],
            observations: [buildObservation({ id: 'obs-1', surveyorId: 'surveyor-1' })],
        }),
    ),
});

beforeEach(() => {
    resetNavigationMock();
    setRouteParams({ surveyId: 'survey-1', surveyorId: 'surveyor-1' });
    service.completeSurveyor.mockReset().mockResolvedValue(buildSurveyor({ status: 'done' }));
    service.completeSurvey.mockReset().mockResolvedValue(buildSurvey({ status: 'completed' }));
});

describe('SurveySummaryScreen', () => {
    it('shows the summary title', async () => {
        renderWithActiveSurvey(<SurveySummaryScreen />, service);
        expect(await screen.findByText('Survey Summary')).toBeOnTheScreen();
    });

    it('is read-only when the admin views a surveyor\'s results', async () => {
        setRouteParams({ surveyId: 'survey-1', surveyorId: 'surveyor-1', locationId: '', viewOnly: true });
        renderWithActiveSurvey(<SurveySummaryScreen />, service);

        expect(await screen.findByText('Surveyor Results')).toBeOnTheScreen();
        expect(screen.queryByText('Complete and Save Survey')).toBeNull();
        expect(screen.queryByText('Edit')).toBeNull();
    });

    it('opens the equipment and weather screens to edit each card', async () => {
        const params = { surveyId: 'survey-1', surveyorId: 'surveyor-1', locationId: 'location-1' };
        setRouteParams(params);
        renderWithActiveSurvey(<SurveySummaryScreen />, service);
        await screen.findByText('Survey Summary');

        fireEvent.press(screen.getByLabelText('Edit Equipment Details'));
        expect(mockNavigate).toHaveBeenCalledWith('EquipmentDetailsScreen', { ...params, mode: 'edit' });

        fireEvent.press(screen.getByLabelText('Edit Start Weather Conditions'));
        expect(mockNavigate).toHaveBeenCalledWith('WeatherConditionsScreen', { ...params, type: 'start', mode: 'edit' });

        fireEvent.press(screen.getByLabelText('Edit End Weather Conditions'));
        expect(mockNavigate).toHaveBeenCalledWith('WeatherConditionsScreen', { ...params, type: 'end', mode: 'edit' });
    });

    it('shows each observation\'s overhead and front-view flight path letters', async () => {
        const withPaths = createMockService({
            subscribeSurveyContext: mockSubscribeContext(buildContext({
                surveyors: [buildSurveyor({ id: 'surveyor-1', name: 'Ada' })],
                observations: [
                    buildObservation({
                        id: 'obs-1',
                        flightPaths: [{ id: 'fp-1', surface: 'boundary', points: [] }],
                    }),
                    buildObservation({
                        id: 'obs-2',
                        flightPaths: [
                            { id: 'fp-2', surface: 'boundary', points: [] },
                            { id: 'fp-3', surface: 'frontView', points: [] },
                        ],
                    }),
                ],
            })),
        });
        renderWithActiveSurvey(<SurveySummaryScreen />, withPaths);

        expect(await screen.findByText('A')).toBeOnTheScreen();
        expect(screen.getByText('B, A')).toBeOnTheScreen();
    });

    it('lets the lead add weather that was skipped', async () => {
        const skipped = createMockService({
            subscribeSurveyContext: mockSubscribeContext(buildContext({
                survey: buildSurvey({ endWeather: null }),
                surveyors: [buildSurveyor({ id: 'surveyor-1', name: 'Ada' })],
            })),
        });
        renderWithActiveSurvey(<SurveySummaryScreen />, skipped);

        expect(await screen.findByText('Not recorded')).toBeOnTheScreen();
        expect(screen.getByLabelText('Edit End Weather Conditions')).toBeOnTheScreen();
    });

    it('completes the surveyor and survey then confirms results were sent', async () => {
        renderWithActiveSurvey(<SurveySummaryScreen />, service);

        fireEvent.press(await screen.findByText('Complete and Save Survey'));

        await waitFor(() =>
            expect(service.completeSurveyor).toHaveBeenCalledWith('surveyor-1'),
        );
        expect(service.completeSurvey).toHaveBeenCalledWith('survey-1');
        expect(await screen.findByText('Results sent')).toBeOnTheScreen();
        expect(
            screen.getByText('Your results have been saved and sent to the survey admin.'),
        ).toBeOnTheScreen();
    });

    it('navigates to Welcome when confirming the results dialog', async () => {
        renderWithActiveSurvey(<SurveySummaryScreen />, service);

        fireEvent.press(await screen.findByText('Complete and Save Survey'));

        fireEvent.press(await screen.findByText('Done'));
        expect(mockNavigate).toHaveBeenCalledWith('Welcome');
    });

    it('still confirms results when the survey cannot be completed yet', async () => {
        service.completeSurvey.mockRejectedValue(new ValidationError('not all surveyors done'));
        renderWithActiveSurvey(<SurveySummaryScreen />, service);

        fireEvent.press(await screen.findByText('Complete and Save Survey'));

        expect(await screen.findByText('Results sent')).toBeOnTheScreen();
    });

    it('shows a failure message when completing the surveyor fails', async () => {
        service.completeSurveyor.mockRejectedValue(new Error('boom'));
        renderWithActiveSurvey(<SurveySummaryScreen />, service);

        fireEvent.press(await screen.findByText('Complete and Save Survey'));

        expect(await screen.findByText('Save failed')).toBeOnTheScreen();
        expect(screen.getByText('Could not save your results. Please try again.')).toBeOnTheScreen();

        fireEvent.press(screen.getByText('OK'));
        await waitFor(() => expect(screen.queryByText('OK')).toBeNull());
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shows a loading overlay while the results are saving', async () => {
        let resolveComplete: (value: Surveyor) => void = () => { };
        service.completeSurveyor.mockImplementation(
            () => new Promise((resolve) => { resolveComplete = resolve; }),
        );
        renderWithActiveSurvey(<SurveySummaryScreen />, service);

        fireEvent.press(await screen.findByText('Complete and Save Survey'));

        expect(await screen.findByText('Saving your results…')).toBeOnTheScreen();

        await act(async () => {
            resolveComplete(buildSurveyor({ status: 'done' }));
        });

        await waitFor(() =>
            expect(screen.queryByText('Saving your results…')).toBeNull(),
        );
    });

    it('disables the button while saving is already in progress', async () => {
        let resolveComplete: (value: Surveyor) => void = () => { };
        service.completeSurveyor.mockImplementation(
            () => new Promise((resolve) => { resolveComplete = resolve; }),
        );
        renderWithActiveSurvey(<SurveySummaryScreen />, service);

        fireEvent.press(await screen.findByText('Complete and Save Survey'));
        fireEvent.press(await screen.findByText('Saving…'));

        await act(async () => {
            resolveComplete(buildSurveyor({ status: 'done' }));
        });

        expect(service.completeSurveyor).toHaveBeenCalledTimes(1);
    });
});
