jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

jest.mock('@services/export/exportSurvey', () => ({
    exportSurvey: jest.fn(),
}));

import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SurveyStatusScreen } from '@screens/Admin/SurveyStatusScreen';
import { exportSurvey } from '@services/export/exportSurvey';
import { buildContext, buildSurvey, buildSurveyor } from '../../helpers/factories';
import {
    createMockService,
    mockSubscribeContext,
    renderWithActiveSurvey,
} from '../../helpers/testUtils';
import {
    resetNavigationMock,
    setRouteParams,
} from '../../helpers/reactNavigationMock';

const exportMock = exportSurvey as jest.Mock;

const contextWith = (survey = buildSurvey({ name: 'Dusk count' })) =>
    buildContext({
        survey,
        surveyors: [
            buildSurveyor({ id: 'surveyor-1', name: 'Ada', isLead: true, status: 'done' }),
            buildSurveyor({ id: 'surveyor-2', name: 'Ben', isLead: false, status: 'pending' }),
        ],
    });

const service = createMockService();

beforeEach(() => {
    resetNavigationMock();
    setRouteParams({ surveyId: 'survey-1' });
    service.subscribeSurveyContext = mockSubscribeContext(contextWith());
    exportMock.mockReset();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(0);
        return 0 as unknown as number;
    });
});

describe('SurveyStatusScreen', () => {
    it('shows the survey, overall status and each surveyor', async () => {
        renderWithActiveSurvey(<SurveyStatusScreen />, service);

        expect(await screen.findByText('Dusk count - SW1A 1AA')).toBeOnTheScreen();
        expect(screen.getByText('1 of 2 surveyors completed')).toBeOnTheScreen();
        expect(screen.getByText('Lead Surveyor: Ada')).toBeOnTheScreen();
        expect(screen.getByText('Ben')).toBeOnTheScreen();
    });

    it('omits the postcode when the survey has none', async () => {
        service.subscribeSurveyContext = mockSubscribeContext(
            contextWith(buildSurvey({ name: 'No postcode', postcode: '' })),
        );
        renderWithActiveSurvey(<SurveyStatusScreen />, service);
        expect(await screen.findByText('No postcode')).toBeOnTheScreen();
    });

    it('exports and shares the survey without alerting', async () => {
        exportMock.mockResolvedValue({ fileName: 'export.zip', shared: true });
        renderWithActiveSurvey(<SurveyStatusScreen />, service);

        fireEvent.press(await screen.findByText('Export & Share'));

        await waitFor(() => expect(exportMock).toHaveBeenCalledWith(service, 'survey-1'));
        expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('alerts when sharing is unavailable', async () => {
        exportMock.mockResolvedValue({ fileName: 'export.zip', shared: false });
        renderWithActiveSurvey(<SurveyStatusScreen />, service);

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
        renderWithActiveSurvey(<SurveyStatusScreen />, service);

        fireEvent.press(await screen.findByText('Export & Share'));

        await waitFor(() =>
            expect(Alert.alert).toHaveBeenCalledWith(
                'Export failed',
                'Could not build the survey export. Please try again.',
            ),
        );
    });

    it('shows a loading overlay and disables the button while exporting', async () => {
        let resolveExport: (value: { fileName: string; shared: boolean }) => void = () => {};
        exportMock.mockImplementation(
            () => new Promise((resolve) => { resolveExport = resolve; }),
        );
        renderWithActiveSurvey(<SurveyStatusScreen />, service);

        fireEvent.press(await screen.findByText('Export & Share'));

        expect(await screen.findByText('Generating export…')).toBeOnTheScreen();
        fireEvent.press(screen.getByText('Exporting…'));

        await act(async () => {
            resolveExport({ fileName: 'export.zip', shared: true });
        });

        expect(exportMock).toHaveBeenCalledTimes(1);
        await waitFor(() =>
            expect(screen.queryByText('Generating export…')).toBeNull(),
        );
    });
});
