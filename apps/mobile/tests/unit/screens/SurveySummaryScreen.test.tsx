jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

jest.mock('@services/export/exportSurvey', () => ({
    exportSurvey: jest.fn(),
}));

import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SurveySummaryScreen } from '@screens/Surveyor/SurveySummaryScreen';
import { exportSurvey } from '@services/export/exportSurvey';
import { createMockService, renderWithService } from '../../helpers/testUtils';
import {
    resetNavigationMock,
    setRouteParams,
} from '../../helpers/reactNavigationMock';
import { buildContext, buildObservation, buildSurvey, buildSurveyor } from '../../helpers/factories';

const exportMock = exportSurvey as jest.Mock;

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
    exportMock.mockReset();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('SurveySummaryScreen', () => {
    it('shows the summary title', async () => {
        renderWithService(<SurveySummaryScreen />, service);
        expect(await screen.findByText('Survey Summary')).toBeOnTheScreen();
    });

    it('exports and shares the survey when pressing the export button', async () => {
        exportMock.mockResolvedValue({ fileName: 'dusk-count-export.zip', shared: true });
        renderWithService(<SurveySummaryScreen />, service);

        fireEvent.press(await screen.findByText('Export & Share'));

        await waitFor(() => expect(exportMock).toHaveBeenCalledWith(service, 'survey-1'));
        expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('alerts when sharing is unavailable', async () => {
        exportMock.mockResolvedValue({ fileName: 'x.zip', shared: false });
        renderWithService(<SurveySummaryScreen />, service);

        fireEvent.press(await screen.findByText('Export & Share'));

        await waitFor(() =>
            expect(Alert.alert).toHaveBeenCalledWith(
                'Export ready',
                "Sharing isn't available on this device.",
            ),
        );
    });

    it('alerts when the export fails', async () => {
        exportMock.mockRejectedValue(new Error('boom'));
        renderWithService(<SurveySummaryScreen />, service);

        fireEvent.press(await screen.findByText('Export & Share'));

        await waitFor(() =>
            expect(Alert.alert).toHaveBeenCalledWith(
                'Export failed',
                'Could not build the survey export. Please try again.',
            ),
        );
    });

    it('shows a loading overlay while the export is generating', async () => {
        let resolveExport: (value: { fileName: string; shared: boolean }) => void = () => {};
        exportMock.mockImplementation(
            () => new Promise((resolve) => { resolveExport = resolve; }),
        );
        renderWithService(<SurveySummaryScreen />, service);

        fireEvent.press(await screen.findByText('Export & Share'));

        expect(await screen.findByText('Generating export…')).toBeOnTheScreen();

        await act(async () => {
            resolveExport({ fileName: 'x.zip', shared: true });
        });

        await waitFor(() =>
            expect(screen.queryByText('Generating export…')).toBeNull(),
        );
    });

    it('disables the export button while an export is already in progress', async () => {
        let resolveExport: (value: { fileName: string; shared: boolean }) => void = () => {};
        exportMock.mockImplementation(
            () => new Promise((resolve) => { resolveExport = resolve; }),
        );
        renderWithService(<SurveySummaryScreen />, service);

        fireEvent.press(await screen.findByText('Export & Share'));

        // While pending, the button is disabled so further presses are no-ops.
        fireEvent.press(await screen.findByText('Exporting…'));

        await act(async () => {
            resolveExport({ fileName: 'x.zip', shared: true });
        });

        expect(exportMock).toHaveBeenCalledTimes(1);
    });
});
