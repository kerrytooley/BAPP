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

const readyImage = { status: 'ready', url: 'file://boundary.png' };

describe('SurveyorConfirmLocationScreen', () => {
    it('updates the existing location and continues with it', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({
                    surveyors: [
                        buildSurveyor({ id: 'surveyor-1', locationId: 'location-9' }),
                    ],
                    locations: [buildLocation({ id: 'location-9' })],
                }),
            ),
            getBoundaryImage: jest.fn().mockResolvedValue(readyImage),
        });
        renderWithService(<SurveyorConfirmLocationScreen />, service);

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
                photoType: 'FRONT_VIEW',
            }),
        );
    });

    it('adds a location for a surveyor without one and links it', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({
                    surveyors: [buildSurveyor({ id: 'surveyor-1', locationId: null })],
                }),
            ),
            getBoundaryImage: jest.fn().mockResolvedValue(readyImage),
            addLocation: jest.fn().mockResolvedValue(buildLocation({ id: 'location-1' })),
        });
        renderWithService(<SurveyorConfirmLocationScreen />, service);

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

        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('CapturePhotoScreen', {
                surveyId: 'survey-1',
                locationId: 'location-1',
                surveyorId: 'surveyor-1',
                photoType: 'FRONT_VIEW',
            }),
        );
    });

    it('adds a location when the surveyor is not found and links it via the route', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({ surveyors: [] }),
            ),
            getBoundaryImage: jest.fn().mockResolvedValue(readyImage),
            addLocation: jest.fn().mockResolvedValue(buildLocation({ id: 'location-1' })),
        });
        renderWithService(<SurveyorConfirmLocationScreen />, service);

        await waitFor(() => expect(service.getBoundaryImage).toHaveBeenCalled());
        fireEvent.press(screen.getByLabelText('save-location'));
        await waitFor(() =>
            expect(service.updateSurveyor).toHaveBeenCalledWith('surveyor-1', {
                locationId: 'location-1',
            }),
        );

        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('CapturePhotoScreen', {
                surveyId: 'survey-1',
                locationId: 'location-1',
                surveyorId: 'surveyor-1',
                photoType: 'FRONT_VIEW',
            }),
        );
    });

    it('opens the location sheet when changing location', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({
                    surveyors: [buildSurveyor({ id: 'surveyor-1', locationId: null })],
                }),
            ),
            getBoundaryImage: jest.fn().mockResolvedValue(readyImage),
        });
        renderWithService(<SurveyorConfirmLocationScreen />, service);

        await waitFor(() => expect(service.getBoundaryImage).toHaveBeenCalled());
        fireEvent.press(screen.getByText('Change Location'));
        expect(screen.getByText('Confirm Location')).toBeOnTheScreen();
    });

    it('logs when the boundary image is not ready and skips the pin layer', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({ surveyors: [] }),
            ),
            getBoundaryImage: jest.fn().mockResolvedValue({ status: 'pending' }),
        });
        renderWithService(<SurveyorConfirmLocationScreen />, service);

        await waitFor(() =>
            expect(logSpy).toHaveBeenCalledWith(
                'Boundary image not available, status: pending',
            ),
        );
    });

    it('logs errors when the survey context or boundary image fail', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            getSurveyContext: jest.fn().mockRejectedValue(new Error('ctx failed')),
            getBoundaryImage: jest.fn().mockRejectedValue(new Error('img failed')),
        });
        renderWithService(<SurveyorConfirmLocationScreen />, service);

        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'Error fetching survey context',
                expect.any(Error),
            ),
        );
        expect(errorSpy).toHaveBeenCalledWith(
            'Error fetching boundary image',
            expect.any(Error),
        );
    });
});
