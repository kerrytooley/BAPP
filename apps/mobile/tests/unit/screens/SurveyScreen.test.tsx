jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { SurveyScreen } from '@screens/Surveyor/SurveyScreen';
import { createMockService, renderWithService } from '../../helpers/testUtils';
import { buildContext, buildObservation } from '../../helpers/factories';
import {
    mockAddListener,
    mockNavigate,
    mockPush,
    resetNavigationMock,
    setRouteParams,
} from '../../helpers/reactNavigationMock';

const observation = buildObservation({ id: 'obs-1', seenCount: 2, heardCount: 1 });

const serviceWith = (updateObservation = jest.fn()) => {
    const service = createMockService({
        getSurveyContext: jest.fn().mockResolvedValue(
            buildContext({ observations: [observation] }),
        ),
    });
    (service as unknown as { updateObservation: jest.Mock }).updateObservation =
        updateObservation;
    return service;
};

beforeEach(() => {
    resetNavigationMock();
    setRouteParams({
        surveyId: 'survey-1',
        surveyorId: 'surveyor-1',
        locationId: 'location-1',
    });
});

describe('SurveyScreen', () => {
    it('renders the observation entry once the context loads', async () => {
        renderWithService(<SurveyScreen />, serviceWith());
        await waitFor(() => expect(screen.getByText('Noc')).toBeOnTheScreen());
    });

    it('updates only the matching observation and omits the time when unknown', async () => {
        const other = buildObservation({ id: 'obs-2', species: 'Serotine', seenCount: 9 });
        const updateObservation = jest
            .fn()
            .mockResolvedValue(buildObservation({ id: 'obs-1', seenCount: 3, lastSeenAt: null }));
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({ observations: [observation, other] }),
            ),
        });
        (service as unknown as { updateObservation: jest.Mock }).updateObservation =
            updateObservation;

        renderWithService(<SurveyScreen />, service);
        await waitFor(() => expect(screen.getByText('S (9)')).toBeOnTheScreen());

        fireEvent.press(screen.getAllByLabelText('Add seen count')[0]);

        await waitFor(() =>
            expect(screen.getByText('Seen count updated to 3. Last seen')).toBeOnTheScreen(),
        );
        // The unrelated observation is left untouched.
        expect(screen.getByText('S (9)')).toBeOnTheScreen();
    });

    it('increments the seen count and shows a confirmation toast', async () => {
        const updateObservation = jest
            .fn()
            .mockResolvedValue(buildObservation({ id: 'obs-1', seenCount: 3, lastSeenAt: new Date(2026, 6, 13, 21, 0) }));
        renderWithService(<SurveyScreen />, serviceWith(updateObservation));
        await waitFor(() => expect(screen.getByText('S (2)')).toBeOnTheScreen());

        fireEvent.press(screen.getByLabelText('Add seen count'));

        await waitFor(() =>
            expect(updateObservation).toHaveBeenCalledWith('obs-1', {
                seenCount: 3,
                lastSeenAt: expect.any(Date),
            }),
        );
        await waitFor(() =>
            expect(screen.getByText(/Seen count updated to 3/)).toBeOnTheScreen(),
        );
    });

    it('increments the heard count and shows a confirmation toast', async () => {
        const updateObservation = jest
            .fn()
            .mockResolvedValue(buildObservation({ id: 'obs-1', heardCount: 2, lastSeenAt: new Date(2026, 6, 13, 21, 0) }));
        renderWithService(<SurveyScreen />, serviceWith(updateObservation));
        await waitFor(() => expect(screen.getByText('H (1)')).toBeOnTheScreen());

        fireEvent.press(screen.getByLabelText('Add heard count'));

        await waitFor(() =>
            expect(screen.getByText(/Heard count updated to 2/)).toBeOnTheScreen(),
        );
    });

    it('omits the time in the heard toast when the update has no last seen', async () => {
        const updateObservation = jest
            .fn()
            .mockResolvedValue(buildObservation({ id: 'obs-1', heardCount: 2, lastSeenAt: null }));
        renderWithService(<SurveyScreen />, serviceWith(updateObservation));
        await waitFor(() => expect(screen.getByText('H (1)')).toBeOnTheScreen());

        fireEvent.press(screen.getByLabelText('Add heard count'));

        await waitFor(() =>
            expect(screen.getByText('Heard count updated to 2. Last seen')).toBeOnTheScreen(),
        );
    });

    it('undoes a count update, restoring the previous values', async () => {
        const updateObservation = jest
            .fn()
            .mockResolvedValueOnce(buildObservation({ id: 'obs-1', seenCount: 3 }))
            .mockResolvedValueOnce(buildObservation({ id: 'obs-1', seenCount: 2 }));
        renderWithService(<SurveyScreen />, serviceWith(updateObservation));
        await waitFor(() => expect(screen.getByText('S (2)')).toBeOnTheScreen());

        fireEvent.press(screen.getByLabelText('Add seen count'));
        await waitFor(() => expect(screen.getByLabelText('Undo')).toBeOnTheScreen());

        fireEvent.press(screen.getByLabelText('Undo'));
        await waitFor(() =>
            expect(updateObservation).toHaveBeenLastCalledWith('obs-1', {
                seenCount: 2,
                heardCount: 1,
                lastSeenAt: observation.lastSeenAt,
            }),
        );
    });

    it('dismisses the toast when Done is pressed', async () => {
        const updateObservation = jest
            .fn()
            .mockResolvedValue(buildObservation({ id: 'obs-1', seenCount: 3 }));
        renderWithService(<SurveyScreen />, serviceWith(updateObservation));
        await waitFor(() => expect(screen.getByText('S (2)')).toBeOnTheScreen());

        fireEvent.press(screen.getByLabelText('Add seen count'));
        await waitFor(() => expect(screen.getByLabelText('Done')).toBeOnTheScreen());

        fireEvent.press(screen.getByLabelText('Done'));
        await waitFor(() => expect(screen.queryByLabelText('Done')).toBeNull());
    });

    it('navigates to the observation screen when editing an entry', async () => {
        renderWithService(<SurveyScreen />, serviceWith());
        await waitFor(() => expect(screen.getByText('Edit')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Edit'));
        expect(mockNavigate).toHaveBeenCalledWith('AddObservationScreen', {
            surveyId: 'survey-1',
            locationId: 'location-1',
            surveyorId: 'surveyor-1',
            observationId: 'obs-1',
        });
    });

    it('navigates to the species screen when adding a new observation', async () => {
        renderWithService(<SurveyScreen />, serviceWith());
        fireEvent.press(screen.getByText('Add new bat observation'));
        expect(mockPush).toHaveBeenCalledWith('SelectSpeciesScreen', {
            surveyId: 'survey-1',
            surveyorId: 'surveyor-1',
            locationId: 'location-1',
        });
    });

    it('logs an error when loading the context fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            getSurveyContext: jest.fn().mockRejectedValue(new Error('load failed')),
        });
        renderWithService(<SurveyScreen />, service);
        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'Error loading survey context',
                expect.any(Error),
            ),
        );
        errorSpy.mockRestore();
    });

    it('logs an error when a count update fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const updateObservation = jest.fn().mockRejectedValue(new Error('update failed'));
        renderWithService(<SurveyScreen />, serviceWith(updateObservation));
        await waitFor(() => expect(screen.getByText('S (2)')).toBeOnTheScreen());
        fireEvent.press(screen.getByLabelText('Add seen count'));
        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'Error updating seen count: ',
                'obs-1',
                expect.any(Error),
            ),
        );
        errorSpy.mockRestore();
    });

    it('logs an error when a heard count update fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const updateObservation = jest.fn().mockRejectedValue(new Error('update failed'));
        renderWithService(<SurveyScreen />, serviceWith(updateObservation));
        await waitFor(() => expect(screen.getByText('H (1)')).toBeOnTheScreen());
        fireEvent.press(screen.getByLabelText('Add heard count'));
        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'Error updating heard count: ',
                'obs-1',
                expect.any(Error),
            ),
        );
        errorSpy.mockRestore();
    });

    it('logs an error when undoing a count update fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const updateObservation = jest
            .fn()
            .mockResolvedValueOnce(buildObservation({ id: 'obs-1', seenCount: 3 }))
            .mockRejectedValueOnce(new Error('undo failed'));
        renderWithService(<SurveyScreen />, serviceWith(updateObservation));
        await waitFor(() => expect(screen.getByText('S (2)')).toBeOnTheScreen());

        fireEvent.press(screen.getByLabelText('Add seen count'));
        await waitFor(() => expect(screen.getByLabelText('Undo')).toBeOnTheScreen());
        fireEvent.press(screen.getByLabelText('Undo'));

        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'Error undoing count update: ',
                'obs-1',
                expect.any(Error),
            ),
        );
        errorSpy.mockRestore();
    });

    it('reloads the observations when the screen regains focus', async () => {
        const first = buildObservation({ id: 'obs-1', species: 'Noctule', seenCount: 2 });
        const refreshed = buildObservation({ id: 'obs-2', species: 'Serotine', seenCount: 7 });
        let context = buildContext({ observations: [first] });
        const getSurveyContext = jest.fn((_surveyId: string) => Promise.resolve(context));
        const service = createMockService({ getSurveyContext });
        (service as unknown as { updateObservation: jest.Mock }).updateObservation = jest.fn();

        renderWithService(<SurveyScreen />, service);
        await waitFor(() => expect(screen.getByText('S (2)')).toBeOnTheScreen());

        context = buildContext({ observations: [refreshed] });
        const focusCallback = mockAddListener.mock.calls.find(([event]) => event === 'focus')?.[1];
        expect(focusCallback).toBeDefined();
        focusCallback?.();

        await waitFor(() => expect(screen.getByText('S (7)')).toBeOnTheScreen());
    });
});