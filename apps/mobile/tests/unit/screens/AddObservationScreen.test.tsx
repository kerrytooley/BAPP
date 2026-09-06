jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

jest.mock('@react-native-community/datetimepicker', () => {
    const React = require('react');
    const { View } = require('react-native');
    return {
        __esModule: true,
        default: (props: Record<string, unknown>) =>
            React.createElement(View, { testID: 'time-picker', ...props }),
    };
});

jest.mock('@components/AddFlightPathBottomSheet', () => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    const AddFlightPathBottomSheet = React.forwardRef(
        (
            props: { surface: string; onCommitPath: (paths: unknown[]) => void },
            ref: React.Ref<unknown>,
        ) => {
            React.useImperativeHandle(ref, () => ({
                present: jest.fn(),
                dismiss: jest.fn(),
            }));
            return (
                <TouchableOpacity
                    accessibilityLabel={`commit-${props.surface}`}
                    onPress={() => props.onCommitPath([{ surface: props.surface, points: [] }])}
                >
                    <Text>flight-path-sheet</Text>
                </TouchableOpacity>
            );
        },
    );
    return { AddFlightPathBottomSheet };
});

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AddObservationScreen } from '@screens/Surveyor/AddObservationScreen';
import {
    createContextSubscription,
    createMockService,
    mockSubscribeContext,
    renderWithActiveSurvey,
    type MockSurveyService,
} from '../../helpers/testUtils';
import { buildContext, buildObservation } from '../../helpers/factories';
import {
    mockNavigate,
    resetNavigationMock,
    setRouteParams,
} from '../../helpers/reactNavigationMock';

const observation = buildObservation({
    id: 'obs-1',
    species: 'Noctule',
    seenCount: 2,
    heardCount: 1,
    emergence: false,
    flightPaths: [
        { id: 'fp-1', surface: 'boundary', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], data: {} },
    ],
});

type Mocks = {
    updateObservation?: jest.Mock;
    removeObservation?: jest.Mock;
    getBoundaryImage?: jest.Mock;
    getLocationImage?: jest.Mock;
    subscribeSurveyContext?: MockSurveyService['subscribeSurveyContext'];
};

const buildService = (mocks: Mocks = {}) => {
    const service = createMockService({
        subscribeSurveyContext:
            mocks.subscribeSurveyContext ??
            mockSubscribeContext(buildContext({ observations: [observation] })),
        getBoundaryImage:
            mocks.getBoundaryImage ??
            jest.fn().mockResolvedValue({ status: 'ready', url: 'boundary.jpg' }),
    });
    (service as unknown as { getLocationImage: jest.Mock }).getLocationImage =
        mocks.getLocationImage ??
        jest.fn().mockResolvedValue({ status: 'ready', url: 'front.jpg' });
    (service as unknown as { updateObservation: jest.Mock }).updateObservation =
        mocks.updateObservation ?? jest.fn().mockResolvedValue(observation);
    (service as unknown as { removeObservation: jest.Mock }).removeObservation =
        mocks.removeObservation ?? jest.fn().mockResolvedValue(observation);
    return service;
};

beforeEach(() => {
    resetNavigationMock();
    setRouteParams({
        surveyId: 'survey-1',
        surveyorId: 'surveyor-1',
        locationId: 'location-1',
        observationId: 'obs-1',
    });
});

describe('AddObservationScreen', () => {
    it('loads and displays the observation details', async () => {
        renderWithActiveSurvey(<AddObservationScreen />, buildService());
        await waitFor(() => expect(screen.getByText('Noctule')).toBeOnTheScreen());
        expect(screen.getByText('First seen time')).toBeOnTheScreen();
        expect(screen.getByText('Last seen time')).toBeOnTheScreen();
    });

    it('toggles the emergence radio option', async () => {
        renderWithActiveSurvey(<AddObservationScreen />, buildService());
        await waitFor(() => expect(screen.getByTestId('emergence-Yes')).toBeOnTheScreen());
        expect(screen.getByTestId('emergence-No').props.accessibilityState.selected).toBe(true);

        fireEvent.press(screen.getByTestId('emergence-Yes'));
        expect(screen.getByTestId('emergence-Yes').props.accessibilityState.selected).toBe(true);
    });

    it('seeds the edit buffers from context and keeps in-progress edits on re-emit', async () => {
        const sub = createContextSubscription(buildContext({ observations: [observation] }));
        renderWithActiveSurvey(
            <AddObservationScreen />,
            buildService({ subscribeSurveyContext: sub.subscribe }),
        );
        await waitFor(() => expect(screen.getByText('Noctule')).toBeOnTheScreen());
        // Seeded from context.
        expect(screen.getByDisplayValue('a nice bat')).toBeOnTheScreen();

        // Edit the notes buffer, then let the context re-emit different notes.
        fireEvent.changeText(screen.getByDisplayValue('a nice bat'), 'my edit');
        sub.emit(
            buildContext({ observations: [buildObservation({ id: 'obs-1', notes: 'server notes' })] }),
        );
        // The in-progress edit is preserved, not clobbered by the re-emit.
        expect(screen.getByDisplayValue('my edit')).toBeOnTheScreen();
    });

    it('saves the observation with the current values and navigates back', async () => {
        const updateObservation = jest.fn().mockResolvedValue(observation);
        renderWithActiveSurvey(<AddObservationScreen />, buildService({ updateObservation }));
        await waitFor(() => expect(screen.getByText('Noctule')).toBeOnTheScreen());

        fireEvent.press(screen.getByTestId('emergence-Yes'));
        fireEvent.press(screen.getByText('Save Observation'));

        await waitFor(() =>
            expect(updateObservation).toHaveBeenCalledWith(
                'obs-1',
                expect.objectContaining({ emergence: true, seenCount: 2, heardCount: 1 }),
            ),
        );
        expect(mockNavigate).toHaveBeenCalledWith('SurveyScreen', {
            surveyId: 'survey-1',
            locationId: 'location-1',
            surveyorId: 'surveyor-1',
        });
    });

    it('ignores a second save press while the first update is in flight', async () => {
        let resolveUpdate: (value: unknown) => void = () => { };
        const updateObservation = jest.fn(
            () => new Promise((resolve) => {
                resolveUpdate = resolve;
            }),
        );
        renderWithActiveSurvey(<AddObservationScreen />, buildService({ updateObservation }));
        await waitFor(() => expect(screen.getByText('Noctule')).toBeOnTheScreen());

        fireEvent.press(screen.getByText('Save Observation'));
        fireEvent.press(screen.getByText('Save Observation'));

        await waitFor(() => expect(updateObservation).toHaveBeenCalledTimes(1));
        resolveUpdate(observation);
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('SurveyScreen', {
                surveyId: 'survey-1',
                locationId: 'location-1',
                surveyorId: 'surveyor-1',
            }),
        );
    });

    it('deletes the observation and navigates back', async () => {
        const removeObservation = jest.fn().mockResolvedValue(observation);
        renderWithActiveSurvey(<AddObservationScreen />, buildService({ removeObservation }));
        await waitFor(() => expect(screen.getByText('Noctule')).toBeOnTheScreen());

        fireEvent.press(screen.getByText('Delete Observation'));

        await waitFor(() => expect(removeObservation).toHaveBeenCalledWith('obs-1'));
        expect(mockNavigate).toHaveBeenCalledWith('SurveyScreen', {
            surveyId: 'survey-1',
            locationId: 'location-1',
            surveyorId: 'surveyor-1',
        });
    });

    it('increments the seen count, bumping the last seen time', async () => {
        renderWithActiveSurvey(<AddObservationScreen />, buildService());
        await waitFor(() => expect(screen.getByText('Noctule')).toBeOnTheScreen());
        fireEvent.press(screen.getByLabelText('Increase seen count'));
        expect(screen.getByText('3')).toBeOnTheScreen();
    });

    it('ignores a second delete press while the first delete is in flight', async () => {
        let resolveDelete: (value: unknown) => void = () => { };
        const removeObservation = jest.fn(
            () => new Promise((resolve) => {
                resolveDelete = resolve;
            }),
        );
        renderWithActiveSurvey(<AddObservationScreen />, buildService({ removeObservation }));
        await waitFor(() => expect(screen.getByText('Noctule')).toBeOnTheScreen());

        fireEvent.press(screen.getByText('Delete Observation'));
        fireEvent.press(screen.getByText('Delete Observation'));

        await waitFor(() => expect(removeObservation).toHaveBeenCalledTimes(1));
        resolveDelete(observation);
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('SurveyScreen', {
                surveyId: 'survey-1',
                locationId: 'location-1',
                surveyorId: 'surveyor-1',
            }),
        );
    });

    it('increments the heard count', async () => {
        renderWithActiveSurvey(<AddObservationScreen />, buildService());
        await waitFor(() => expect(screen.getByText('Noctule')).toBeOnTheScreen());
        fireEvent.press(screen.getByLabelText('Increase heard count'));
        expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(2);
    });

    it('opens the flight path sheet and commits a boundary path', async () => {
        renderWithActiveSurvey(<AddObservationScreen />, buildService());
        await waitFor(() => expect(screen.getByText('Edit overhead flight path')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Edit overhead flight path'));
        await waitFor(() => expect(screen.getByText('flight-path-sheet')).toBeOnTheScreen());
        fireEvent.press(screen.getByLabelText('commit-boundary'));
    });

    it('re-presents the sheet when the same surface is opened again', async () => {
        renderWithActiveSurvey(<AddObservationScreen />, buildService());
        await waitFor(() => expect(screen.getByText('Edit overhead flight path')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Edit overhead flight path'));
        await waitFor(() => expect(screen.getByText('flight-path-sheet')).toBeOnTheScreen());
        // Second press hits the "already mounted" branch and presents directly.
        fireEvent.press(screen.getByText('Edit overhead flight path'));
        expect(screen.getByText('flight-path-sheet')).toBeOnTheScreen();
    });

    it('opens the flight path sheet for the front view surface', async () => {
        renderWithActiveSurvey(<AddObservationScreen />, buildService());
        await waitFor(() => expect(screen.getByText('Add front-view flight path')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Add front-view flight path'));
        await waitFor(() => expect(screen.getByLabelText('commit-frontView')).toBeOnTheScreen());
    });

    it('shows the edit and add labels based on existing flight paths per surface', async () => {
        const frontViewObservation = buildObservation({
            id: 'obs-1',
            species: 'Noctule',
            flightPaths: [
                { id: 'fp-2', surface: 'frontView', points: [{ x: 0, y: 0 }], data: {} },
            ],
        });
        const service = buildService({
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({ observations: [frontViewObservation] }),
            ),
        });
        renderWithActiveSurvey(<AddObservationScreen />, service);
        await waitFor(() => expect(screen.getByText('Add overhead flight path')).toBeOnTheScreen());
        expect(screen.getByText('Edit front-view flight path')).toBeOnTheScreen();
    });

    it('does not render flight path previews when images are not ready', async () => {
        const service = buildService({
            getBoundaryImage: jest.fn().mockResolvedValue({ status: 'pending' }),
            getLocationImage: jest.fn().mockResolvedValue({ status: 'pending' }),
        });
        renderWithActiveSurvey(<AddObservationScreen />, service);
        await waitFor(() => expect(screen.getByText('Noctule')).toBeOnTheScreen());
        expect(screen.queryByText('Add overhead flight path')).toBeNull();
        expect(screen.queryByText('Add front-view flight path')).toBeNull();
    });

    it('saves null fields when the observation has no recorded details', async () => {
        const bareObservation = buildObservation({
            id: 'obs-1',
            species: 'Noctule',
            firstSeenAt: null,
            lastSeenAt: null,
            frequency: null,
            direction: null,
            notes: null,
            emergence: false,
            flightPaths: [],
        });
        const updateObservation = jest.fn().mockResolvedValue(bareObservation);
        const service = buildService({
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({ observations: [bareObservation] }),
            ),
            updateObservation,
        });

        renderWithActiveSurvey(<AddObservationScreen />, service);
        await waitFor(() => expect(screen.getByText('Noctule')).toBeOnTheScreen());

        fireEvent.press(screen.getByText('Save Observation'));

        await waitFor(() =>
            expect(updateObservation).toHaveBeenCalledWith(
                'obs-1',
                expect.objectContaining({
                    frequency: null,
                    direction: null,
                    notes: null,
                }),
            ),
        );
    });

    it('renders defaults when the observation cannot be found', async () => {
        const service = buildService({
            subscribeSurveyContext: mockSubscribeContext(buildContext({ observations: [] })),
        });

        renderWithActiveSurvey(<AddObservationScreen />, service);
        await waitFor(() => expect(screen.getByText('Unknown Species')).toBeOnTheScreen());
    });

    it('logs an error when loading the observation media fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = buildService({
            getBoundaryImage: jest.fn().mockRejectedValue(new Error('load failed')),
        });
        renderWithActiveSurvey(<AddObservationScreen />, service);
        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'Error loading observation media',
                expect.any(Error),
            ),
        );
        errorSpy.mockRestore();
    });

    it('logs an error when saving fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const updateObservation = jest.fn().mockRejectedValue(new Error('save failed'));
        renderWithActiveSurvey(<AddObservationScreen />, buildService({ updateObservation }));
        await waitFor(() => expect(screen.getByText('Noctule')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Save Observation'));
        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'Error updating observation: ',
                'obs-1',
                expect.any(Error),
            ),
        );
        errorSpy.mockRestore();
    });

    it('logs an error when deleting fails', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        const removeObservation = jest.fn().mockRejectedValue(new Error('delete failed'));
        renderWithActiveSurvey(<AddObservationScreen />, buildService({ removeObservation }));
        await waitFor(() => expect(screen.getByText('Noctule')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Delete Observation'));
        await waitFor(() =>
            expect(logSpy).toHaveBeenCalledWith(
                'Error deleting observation: ',
                'obs-1',
                expect.any(Error),
            ),
        );
        logSpy.mockRestore();
    });
});
