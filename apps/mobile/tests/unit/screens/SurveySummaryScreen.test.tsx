jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { Surveyor } from '@bapp/domain';
import { SurveySummaryScreen } from '@screens/Surveyor/SurveySummaryScreen';
import { createMockService, renderWithService } from '../../helpers/testUtils';
import {
    mockNavigate,
    resetNavigationMock,
    setRouteParams,
} from '../../helpers/reactNavigationMock';
import { buildContext, buildObservation, buildSurvey, buildSurveyor } from '../../helpers/factories';

const service = createMockService({
    getSurveyContext: jest.fn().mockResolvedValue(
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
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('SurveySummaryScreen', () => {
    it('shows the summary title', async () => {
        renderWithService(<SurveySummaryScreen />, service);
        expect(await screen.findByText('Survey Summary')).toBeOnTheScreen();
    });

    it('completes the surveyor and survey then confirms results were sent', async () => {
        renderWithService(<SurveySummaryScreen />, service);

        fireEvent.press(await screen.findByText('Complete and Save Survey'));

        await waitFor(() =>
            expect(service.completeSurveyor).toHaveBeenCalledWith('surveyor-1'),
        );
        expect(service.completeSurvey).toHaveBeenCalledWith('survey-1');
        expect(Alert.alert).toHaveBeenCalledWith(
            'Results sent',
            'Your results have been saved and sent to the lead surveyor.',
            expect.any(Array),
        );
    });

    it('navigates to Welcome when confirming the results dialog', async () => {
        renderWithService(<SurveySummaryScreen />, service);

        fireEvent.press(await screen.findByText('Complete and Save Survey'));

        await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
        const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
        buttons[0].onPress();
        expect(mockNavigate).toHaveBeenCalledWith('Welcome');
    });

    it('still confirms results when the survey cannot be completed yet', async () => {
        service.completeSurvey.mockRejectedValue(new Error('not all surveyors done'));
        renderWithService(<SurveySummaryScreen />, service);

        fireEvent.press(await screen.findByText('Complete and Save Survey'));

        await waitFor(() =>
            expect(Alert.alert).toHaveBeenCalledWith(
                'Results sent',
                'Your results have been saved and sent to the lead surveyor.',
                expect.any(Array),
            ),
        );
    });

    it('alerts when completing the surveyor fails', async () => {
        service.completeSurveyor.mockRejectedValue(new Error('boom'));
        renderWithService(<SurveySummaryScreen />, service);

        fireEvent.press(await screen.findByText('Complete and Save Survey'));

        await waitFor(() =>
            expect(Alert.alert).toHaveBeenCalledWith(
                'Save failed',
                'Could not save your results. Please try again.',
            ),
        );
    });

    it('shows a loading overlay while the results are saving', async () => {
        let resolveComplete: (value: Surveyor) => void = () => {};
        service.completeSurveyor.mockImplementation(
            () => new Promise((resolve) => { resolveComplete = resolve; }),
        );
        renderWithService(<SurveySummaryScreen />, service);

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
        let resolveComplete: (value: Surveyor) => void = () => {};
        service.completeSurveyor.mockImplementation(
            () => new Promise((resolve) => { resolveComplete = resolve; }),
        );
        renderWithService(<SurveySummaryScreen />, service);

        fireEvent.press(await screen.findByText('Complete and Save Survey'));
        fireEvent.press(await screen.findByText('Saving…'));

        await act(async () => {
            resolveComplete(buildSurveyor({ status: 'done' }));
        });

        expect(service.completeSurveyor).toHaveBeenCalledTimes(1);
    });
});
