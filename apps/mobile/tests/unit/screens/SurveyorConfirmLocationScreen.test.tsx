jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

jest.mock('@utils/image', () => ({
    getAspectRatio: jest.fn(() => Promise.resolve(1)),
}));

jest.mock('@components/AddLocationBottomSheet', () => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return {
        __esModule: true,
        AddLocationBottomSheet: React.forwardRef((props: any, ref: any) => {
            React.useImperativeHandle(ref, () => ({
                present: () => { },
                dismiss: () => { },
            }));
            return React.createElement(
                Pressable,
                {
                    accessibilityRole: 'button',
                    accessibilityLabel: 'save-location',
                    onPress: () => props.onChange({ x: 0.9, y: 0.9 }),
                },
                React.createElement(Text, null, 'save-location'),
            );
        }),
    };
});

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { SurveyorConfirmLocationScreen } from '@screens/Surveyor/SurveyorConfirmLocationScreen';
import {
    buildContext,
    buildLocation,
    buildSurveyor,
} from '../../helpers/factories';
import {
    createContextSubscription,
    createMockService,
    mockSubscribeContext,
    renderWithActiveSurvey,
} from '../../helpers/testUtils';
import {
    mockNavigate,
    resetNavigationMock,
    setRouteParams,
} from '../../helpers/reactNavigationMock';

beforeEach(() => {
    resetNavigationMock();
    setRouteParams({ surveyId: 'survey-1', surveyorId: 'surveyor-1' });
});

const readyImage = { status: 'ready', url: 'file://boundary.png' };

describe('SurveyorConfirmLocationScreen', () => {
    it('updates the existing location and continues with it', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({
                    surveyors: [
                        buildSurveyor({ id: 'surveyor-1', locationId: 'location-9', status: 'ready' }),
                    ],
                    locations: [buildLocation({ id: 'location-9' })],
                }),
            ),
            getBoundaryImage: jest.fn().mockResolvedValue(readyImage),
        });
        renderWithActiveSurvey(<SurveyorConfirmLocationScreen />, service);

        await waitFor(() => expect(service.getBoundaryImage).toHaveBeenCalled());
        fireEvent.press(screen.getByLabelText('save-location'));
        await waitFor(() =>
            expect(service.updateLocation).toHaveBeenCalledWith('location-9', {
                boundaryPosition: { x: 0.9, y: 0.9 },
            }),
        );

        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('CapturePhotoScreen', {
                surveyId: 'survey-1',
                locationId: 'location-9',
                surveyorId: 'surveyor-1',
                photoType: 'frontView',
            }),
        );
    });

    it('adds a location for a surveyor without one and links it', async () => {
        const sub = createContextSubscription(
            buildContext({
                surveyors: [buildSurveyor({ id: 'surveyor-1', locationId: null, status: 'ready' })],
            }),
        );
        const service = createMockService({
            subscribeSurveyContext: sub.subscribe,
            getBoundaryImage: jest.fn().mockResolvedValue(readyImage),
            addLocation: jest.fn().mockResolvedValue(buildLocation({ id: 'location-1' })),
        });
        renderWithActiveSurvey(<SurveyorConfirmLocationScreen />, service);

        await waitFor(() => expect(service.getBoundaryImage).toHaveBeenCalled());
        fireEvent.press(screen.getByLabelText('save-location'));
        await waitFor(() =>
            expect(service.addLocation).toHaveBeenCalledWith('survey-1', {
                boundaryPosition: { x: 0.9, y: 0.9 },
            }),
        );
        expect(service.updateSurveyor).toHaveBeenCalledWith('surveyor-1', {
            locationId: 'location-1',
        });

        // The write re-emits: the surveyor is now linked to the new location.
        sub.emit(
            buildContext({
                surveyors: [buildSurveyor({ id: 'surveyor-1', locationId: 'location-1', status: 'ready' })],
                locations: [buildLocation({ id: 'location-1' })],
            }),
        );
        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('CapturePhotoScreen', {
                surveyId: 'survey-1',
                locationId: 'location-1',
                surveyorId: 'surveyor-1',
                photoType: 'frontView',
            }),
        );
    });

    it('adds a location when the surveyor is not found and links it via the route', async () => {
        const sub = createContextSubscription(buildContext({ surveyors: [] }));
        const service = createMockService({
            subscribeSurveyContext: sub.subscribe,
            getBoundaryImage: jest.fn().mockResolvedValue(readyImage),
            addLocation: jest.fn().mockResolvedValue(buildLocation({ id: 'location-1' })),
        });
        renderWithActiveSurvey(<SurveyorConfirmLocationScreen />, service);

        await waitFor(() => expect(service.getBoundaryImage).toHaveBeenCalled());
        fireEvent.press(screen.getByLabelText('save-location'));
        await waitFor(() =>
            expect(service.updateSurveyor).toHaveBeenCalledWith('surveyor-1', {
                locationId: 'location-1',
            }),
        );

        sub.emit(
            buildContext({
                surveyors: [buildSurveyor({ id: 'surveyor-1', locationId: 'location-1', status: 'ready' })],
                locations: [buildLocation({ id: 'location-1' })],
            }),
        );
        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('CapturePhotoScreen', {
                surveyId: 'survey-1',
                locationId: 'location-1',
                surveyorId: 'surveyor-1',
                photoType: 'frontView',
            }),
        );
    });

    it('opens the location sheet when changing location', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({
                    surveyors: [buildSurveyor({ id: 'surveyor-1', locationId: null })],
                }),
            ),
            getBoundaryImage: jest.fn().mockResolvedValue(readyImage),
        });
        renderWithActiveSurvey(<SurveyorConfirmLocationScreen />, service);

        await waitFor(() => expect(service.getBoundaryImage).toHaveBeenCalled());
        fireEvent.press(screen.getByText('Change Location'));
        expect(screen.getByText('Confirm Location')).toBeOnTheScreen();
    });

    it('logs when the boundary image is not ready and skips the pin layer', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(buildContext({ surveyors: [] })),
            getBoundaryImage: jest.fn().mockResolvedValue({ status: 'pending' }),
        });
        renderWithActiveSurvey(<SurveyorConfirmLocationScreen />, service);

        await waitFor(() =>
            expect(logSpy).toHaveBeenCalledWith(
                'Boundary image not available, status: pending',
            ),
        );
        logSpy.mockRestore();
    });

    it('logs an error when the boundary image fails to load', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(buildContext({ surveyors: [] })),
            getBoundaryImage: jest.fn().mockRejectedValue(new Error('img failed')),
        });
        renderWithActiveSurvey(<SurveyorConfirmLocationScreen />, service);

        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'Error fetching boundary image',
                expect.any(Error),
            ),
        );
        errorSpy.mockRestore();
    });

    it('creates a placeholder location and continues when none was set', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({
                    surveyors: [buildSurveyor({ id: 'surveyor-1', locationId: null })],
                }),
            ),
            getBoundaryImage: jest.fn().mockResolvedValue(readyImage),
            addLocation: jest.fn().mockResolvedValue(buildLocation({ id: 'location-1' })),
        });
        renderWithActiveSurvey(<SurveyorConfirmLocationScreen />, service);

        await waitFor(() => expect(service.getBoundaryImage).toHaveBeenCalled());
        fireEvent.press(screen.getByText('Continue'));

        await waitFor(() =>
            expect(service.addLocation).toHaveBeenCalledWith('survey-1', {}),
        );
        expect(service.updateSurveyor).toHaveBeenCalledWith('surveyor-1', {
            locationId: 'location-1',
        });
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('CapturePhotoScreen', {
                surveyId: 'survey-1',
                locationId: 'location-1',
                surveyorId: 'surveyor-1',
                photoType: 'frontView',
            }),
        );
    });

    it('creates a placeholder location even when the surveyor is not loaded', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(buildContext({ surveyors: [] })),
            getBoundaryImage: jest.fn().mockResolvedValue(readyImage),
            addLocation: jest.fn().mockResolvedValue(buildLocation({ id: 'location-2' })),
        });
        renderWithActiveSurvey(<SurveyorConfirmLocationScreen />, service);

        await waitFor(() => expect(service.getBoundaryImage).toHaveBeenCalled());
        fireEvent.press(screen.getByText('Continue'));

        await waitFor(() =>
            expect(service.addLocation).toHaveBeenCalledWith('survey-1', {}),
        );
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('CapturePhotoScreen', {
                surveyId: 'survey-1',
                locationId: 'location-2',
                surveyorId: 'surveyor-1',
                photoType: 'frontView',
            }),
        );
    });

    it('continues without changing status when the surveyor is not pending', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({
                    surveyors: [
                        buildSurveyor({ id: 'surveyor-1', locationId: 'location-9', status: 'ready' }),
                    ],
                    locations: [buildLocation({ id: 'location-9' })],
                }),
            ),
            getBoundaryImage: jest.fn().mockResolvedValue(readyImage),
        });
        renderWithActiveSurvey(<SurveyorConfirmLocationScreen />, service);

        await waitFor(() => expect(service.getBoundaryImage).toHaveBeenCalled());
        fireEvent.press(screen.getByText('Continue'));

        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('CapturePhotoScreen', {
                surveyId: 'survey-1',
                locationId: 'location-9',
                surveyorId: 'surveyor-1',
                photoType: 'frontView',
            }),
        );
        expect(service.updateSurveyor).not.toHaveBeenCalledWith('surveyor-1', {
            status: 'ready',
        });
    });

    it('logs an error and does not navigate when continuing fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({
                    surveyors: [buildSurveyor({ id: 'surveyor-1', locationId: null })],
                }),
            ),
            getBoundaryImage: jest.fn().mockResolvedValue(readyImage),
            addLocation: jest.fn().mockRejectedValue(new Error('add failed')),
        });
        renderWithActiveSurvey(<SurveyorConfirmLocationScreen />, service);

        await waitFor(() => expect(service.getBoundaryImage).toHaveBeenCalled());
        fireEvent.press(screen.getByText('Continue'));

        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'Unable to continue to photo capture',
                expect.any(Error),
            ),
        );
        expect(mockNavigate).not.toHaveBeenCalledWith(
            'CapturePhotoScreen',
            expect.anything(),
        );
        errorSpy.mockRestore();
    });
});
