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
            screen.getByText('Your results have been saved and sent to the lead surveyor.'),
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
