jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

jest.mock('@services/export/exportSurvey', () => ({
    exportSurvey: jest.fn(),
}));

import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Share } from 'react-native';
import { SurveyStatusScreen } from '@screens/Admin/SurveyStatusScreen';
import { exportSurvey } from '@services/export/exportSurvey';
import { buildContext, buildSurvey, buildSurveyor } from '../../helpers/factories';
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
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(0);
        return 0 as unknown as number;
    });
});

describe('SurveyStatusScreen', () => {
    it('shows the surveyor code and shares an invite message', async () => {
        const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
        renderWithActiveSurvey(<SurveyStatusScreen />, service);

        expect(await screen.findByText('BAT123')).toBeOnTheScreen();
        fireEvent.press(screen.getByLabelText('Share surveyor code'));

        await waitFor(() => expect(shareSpy).toHaveBeenCalledTimes(1));
        expect(shareSpy.mock.calls[0][0].message).toContain('Enter this code to join: BAT123');
    });

    it('shows each surveyor progress label and a setup dot in the header', async () => {
        renderWithActiveSurvey(<SurveyStatusScreen />, service);

        expect(await screen.findByText('Survey ended')).toBeOnTheScreen();
        expect(screen.getByText('Not started')).toBeOnTheScreen();
        // Default factory locations are absent, so both surveyors are missing setup.
        expect(screen.getAllByTestId('status-dot-missing').length).toBeGreaterThanOrEqual(2);
    });

    it('expands a surveyor to show their setup rows', async () => {
        renderWithActiveSurvey(<SurveyStatusScreen />, service);
        await screen.findByText('Ben');
        expect(screen.queryByText('Front view photo')).toBeNull();

        fireEvent.press(screen.getByLabelText('Ben'));

        expect(screen.getByLabelText('Ben').props.accessibilityState).toEqual(expect.objectContaining({ expanded: true }));
        expect(screen.getByText('Front view photo')).toBeOnTheScreen();
        expect(screen.queryByText('Start weather')).toBeNull();
    });

    it('links to the results of a surveyor who has ended their survey', async () => {
        renderWithActiveSurvey(<SurveyStatusScreen />, service);
        await screen.findByText('Ben');

        fireEvent.press(screen.getByLabelText('Ben'));
        expect(screen.queryByText('See surveyor results')).toBeNull();

        fireEvent.press(screen.getByLabelText('Lead Surveyor: Ada'));
        fireEvent.press(screen.getByText('See surveyor results'));

        expect(mockNavigate).toHaveBeenCalledWith('SurveyorResultsScreen', {
            surveyId: 'survey-1',
            surveyorId: 'surveyor-1',
            locationId: '',
            viewOnly: true,
        });
    });

    it('expands survey setup and edits each item', async () => {
        renderWithActiveSurvey(<SurveyStatusScreen />, service);
        await screen.findByText('Setup details');

        fireEvent.press(screen.getByLabelText('Survey setup'));
        expect(screen.getByText('Survey details')).toBeOnTheScreen();

        fireEvent.press(screen.getByLabelText('Edit Survey details'));
        expect(mockNavigate).toHaveBeenLastCalledWith('CreateSurvey', { surveyId: 'survey-1', editing: true });
        fireEvent.press(screen.getByLabelText('Edit Red line boundary'));
        expect(mockNavigate).toHaveBeenLastCalledWith('UploadRedLineBoundaryScreen', { surveyId: 'survey-1', editing: true });
        fireEvent.press(screen.getByLabelText('Edit Surveyors & locations'));
        expect(mockNavigate).toHaveBeenLastCalledWith('AddSurveyorScreen', { surveyId: 'survey-1', editing: true });
    });
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

    it('exports and shares the survey without a message', async () => {
        exportMock.mockResolvedValue({ fileName: 'export.zip', shared: true });
        renderWithActiveSurvey(<SurveyStatusScreen />, service);

        fireEvent.press(await screen.findByText(/^Export & Share/));

        await waitFor(() => expect(exportMock).toHaveBeenCalledWith(service, 'survey-1'));
        await waitFor(() => expect(screen.queryByText('Generating export…')).toBeNull());
        expect(screen.queryByText('Export ready')).toBeNull();
        expect(screen.queryByText('Export failed')).toBeNull();
    });

    it('tells the admin when sharing is unavailable', async () => {
        exportMock.mockResolvedValue({ fileName: 'export.zip', shared: false });
        renderWithActiveSurvey(<SurveyStatusScreen />, service);

        fireEvent.press(await screen.findByText(/^Export & Share/));

        expect(await screen.findByText('Export ready')).toBeOnTheScreen();
        expect(screen.getByText("Sharing isn't available on this device.")).toBeOnTheScreen();
        fireEvent.press(screen.getByText('OK'));
        await waitFor(() => expect(screen.queryByText('Export ready')).toBeNull());
    });

    it('tells the admin when the export fails', async () => {
        exportMock.mockRejectedValue(new Error('boom'));
        renderWithActiveSurvey(<SurveyStatusScreen />, service);

        fireEvent.press(await screen.findByText(/^Export & Share/));

        expect(await screen.findByText('Export failed')).toBeOnTheScreen();
        expect(screen.getByText('Could not build the survey export. Please try again.')).toBeOnTheScreen();
    });

    it('shows a loading overlay and disables the button while exporting', async () => {
        let resolveExport: (value: { fileName: string; shared: boolean }) => void = () => { };
        exportMock.mockImplementation(
            () => new Promise((resolve) => { resolveExport = resolve; }),
        );
        renderWithActiveSurvey(<SurveyStatusScreen />, service);

        fireEvent.press(await screen.findByText(/^Export & Share/));

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

    describe('date and times', () => {
        it('shows the survey date and times', async () => {
            renderWithActiveSurvey(<SurveyStatusScreen />, service);
            expect(await screen.findByText('13/07/2026')).toBeOnTheScreen();
            expect(screen.getByText('20:00')).toBeOnTheScreen();
            expect(screen.getByText('21:15')).toBeOnTheScreen();
            expect(screen.getByText('22:00')).toBeOnTheScreen();
        });

        it('shows when a date or time has not been set', async () => {
            service.subscribeSurveyContext = mockSubscribeContext(contextWith(
                buildSurvey({ date: null, startTime: null, sunsetTime: null, endTime: null }),
            ));
            renderWithActiveSurvey(<SurveyStatusScreen />, service);
            expect(await screen.findAllByText('Not set')).toHaveLength(4);
        });

        it.each(['Survey date', 'Start time', 'Sunrise/sunset time', 'End time'])(
            'opens the survey details editor from %s',
            async (label) => {
                renderWithActiveSurvey(<SurveyStatusScreen />, service);
                fireEvent.press(await screen.findByLabelText(`Edit ${label}`));
                expect(mockNavigate).toHaveBeenCalledWith('CreateSurvey', { surveyId: 'survey-1', editing: true });
            },
        );
    });
});
