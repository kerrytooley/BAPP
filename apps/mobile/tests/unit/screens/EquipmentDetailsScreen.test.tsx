jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { EquipmentDetailsScreen } from '@screens/Surveyor/EquipmentDetailsScreen';
import {
    createContextSubscription,
    createMockService,
    mockSubscribeContext,
    renderWithActiveSurvey,
} from '../../helpers/testUtils';
import { buildContext, buildLocation, buildSurveyor } from '../../helpers/factories';
import {
    mockGoBack,
    mockNavigate,
    resetNavigationMock,
    setRouteParams,
} from '../../helpers/reactNavigationMock';

const params = { surveyId: 'survey-1', surveyorId: 'surveyor-1', locationId: 'location-1' };

beforeEach(() => {
    resetNavigationMock();
    setRouteParams(params);
});

describe('EquipmentDetailsScreen', () => {
    it('disables continue until a field has text', () => {
        renderWithActiveSurvey(<EquipmentDetailsScreen />, createMockService());
        expect(screen.getByLabelText('Continue')).toBeDisabled();

        fireEvent.changeText(screen.getByPlaceholderText('Input audio equipment label'), '   ');
        expect(screen.getByLabelText('Continue')).toBeDisabled();

        fireEvent.changeText(screen.getByPlaceholderText('Input audio equipment label'), 'A1');
        expect(screen.getByLabelText('Continue')).toBeEnabled();
    });

    it('saves trimmed equipment details and continues', async () => {
        const service = createMockService();
        renderWithActiveSurvey(<EquipmentDetailsScreen />, service);

        fireEvent.changeText(screen.getByPlaceholderText('Input audio equipment label'), ' A1 ');
        fireEvent.changeText(screen.getByPlaceholderText('Input video equipment label'), 'V2');
        fireEvent.press(screen.getByText('Continue'));

        await waitFor(() =>
            expect(service.updateLocation).toHaveBeenCalledWith('location-1', {
                equipmentInformation: { audioLabel: 'A1', videoLabel: 'V2', otherInfo: '' },
            }),
        );
        expect(mockNavigate).toHaveBeenCalledWith('SetupCompleteScreen', params);
    });

    it('skips without saving anything', () => {
        const service = createMockService();
        renderWithActiveSurvey(<EquipmentDetailsScreen />, service);

        fireEvent.changeText(screen.getByPlaceholderText('Input audio equipment label'), 'A1');
        fireEvent.press(screen.getByText('Skip'));

        expect(service.updateLocation).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('SetupCompleteScreen', params);
    });

    it('logs an error and does not navigate when saving fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            updateLocation: jest.fn().mockRejectedValue(new Error('save failed')),
        });
        renderWithActiveSurvey(<EquipmentDetailsScreen />, service);

        fireEvent.changeText(screen.getByPlaceholderText('Input audio equipment label'), 'A1');
        fireEvent.press(screen.getByText('Continue'));

        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith('Failed to save equipment information', expect.any(Error)),
        );
        expect(mockNavigate).not.toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    describe('opened from the survey summary to edit', () => {
        const saved = { audioLabel: 'A1', videoLabel: 'V1', otherInfo: 'Tripod' };
        const savedContext = (equipmentInformation = saved) => buildContext({
            locations: [buildLocation({ id: 'location-1', equipmentInformation })],
        });
        const editService = () => createMockService({ subscribeSurveyContext: mockSubscribeContext(savedContext()) });

        beforeEach(() => setRouteParams({ ...params, mode: 'edit' }));

        it('shows the saved details and saves changes back to the summary', async () => {
            const service = editService();
            renderWithActiveSurvey(<EquipmentDetailsScreen />, service);

            expect(await screen.findByDisplayValue('Tripod')).toBeOnTheScreen();
            expect(service.getSurveyContext).not.toHaveBeenCalled();
            fireEvent.changeText(screen.getByDisplayValue('V1'), 'V9');
            fireEvent.press(screen.getByText('Save'));

            await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
            expect(service.updateLocation).toHaveBeenCalledWith('location-1', {
                equipmentInformation: { ...saved, videoLabel: 'V9' },
            });
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it('cancels without saving', async () => {
            const service = editService();
            renderWithActiveSurvey(<EquipmentDetailsScreen />, service);
            await screen.findByDisplayValue('Tripod');

            fireEvent.press(screen.getByText('Cancel'));

            expect(mockGoBack).toHaveBeenCalled();
            expect(service.updateLocation).not.toHaveBeenCalled();
        });

        it('keeps edits in progress when the live context re-emits', async () => {
            const subscription = createContextSubscription(savedContext());
            renderWithActiveSurvey(<EquipmentDetailsScreen />, createMockService({ subscribeSurveyContext: subscription.subscribe }));
            await screen.findByDisplayValue('Tripod');

            fireEvent.changeText(screen.getByDisplayValue('V1'), 'V9');
            subscription.emit(savedContext({ ...saved, videoLabel: 'V5' }));

            expect(screen.getByDisplayValue('V9')).toBeOnTheScreen();
            expect(screen.queryByDisplayValue('V5')).toBeNull();
        });
    });

    it('returns to the survey when resuming and nothing else is unfinished', async () => {
        setRouteParams({ ...params, mode: 'resume' });
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(buildContext({
                surveyors: [buildSurveyor({ id: 'surveyor-1', locationId: 'location-1' })],
                locations: [buildLocation({ id: 'location-1', equipmentInformation: null })],
            })),
        });
        renderWithActiveSurvey(<EquipmentDetailsScreen />, service);

        fireEvent.press(screen.getByText('Skip'));

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('SurveyScreen', params));
    });
});
