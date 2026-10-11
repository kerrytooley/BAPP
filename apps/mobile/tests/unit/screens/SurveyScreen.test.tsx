jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { SurveyScreen } from '@screens/Surveyor/SurveyScreen';
import {
    createContextSubscription,
    createMockService,
    mockSubscribeContext,
    renderWithActiveSurvey,
} from '../../helpers/testUtils';
import { buildContext, buildObservation } from '../../helpers/factories';
import {
    mockNavigate,
    mockPush,
    resetNavigationMock,
    setRouteParams,
} from '../../helpers/reactNavigationMock';

const observation = buildObservation({ id: 'obs-1', seenCount: 2, heardCount: 1 });

const serviceWith = (
    updateObservation = jest.fn(),
    context = buildContext({ observations: [observation] }),
) => {
    const service = createMockService({
        subscribeSurveyContext: mockSubscribeContext(context),
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
    it('renders the observation entry from the live context', async () => {
        renderWithActiveSurvey(<SurveyScreen />, serviceWith());
        await waitFor(() => expect(screen.getByText('Noc')).toBeOnTheScreen());
    });

    it('updates only the matching observation and omits the time when unknown', async () => {
        const other = buildObservation({ id: 'obs-2', species: 'Serotine', seenCount: 9 });
        const updateObservation = jest
            .fn()
            .mockResolvedValue(buildObservation({ id: 'obs-1', seenCount: 3, lastSeenAt: null }));
        const service = serviceWith(
            updateObservation,
            buildContext({ observations: [observation, other] }),
        );

        renderWithActiveSurvey(<SurveyScreen />, service);
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
        renderWithActiveSurvey(<SurveyScreen />, serviceWith(updateObservation));
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
        renderWithActiveSurvey(<SurveyScreen />, serviceWith(updateObservation));
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
        renderWithActiveSurvey(<SurveyScreen />, serviceWith(updateObservation));
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
        renderWithActiveSurvey(<SurveyScreen />, serviceWith(updateObservation));
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
        renderWithActiveSurvey(<SurveyScreen />, serviceWith(updateObservation));
        await waitFor(() => expect(screen.getByText('S (2)')).toBeOnTheScreen());

        fireEvent.press(screen.getByLabelText('Add seen count'));
        await waitFor(() => expect(screen.getByLabelText('Done')).toBeOnTheScreen());

        fireEvent.press(screen.getByLabelText('Done'));
        await waitFor(() => expect(screen.queryByLabelText('Done')).toBeNull());
    });

    it('navigates to the observation screen when editing an entry', async () => {
        renderWithActiveSurvey(<SurveyScreen />, serviceWith());
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
        renderWithActiveSurvey(<SurveyScreen />, serviceWith());
        fireEvent.press(screen.getByText('Add new bat observation'));
        expect(mockPush).toHaveBeenCalledWith('SelectSpeciesScreen', {
            surveyId: 'survey-1',
            surveyorId: 'surveyor-1',
            locationId: 'location-1',
        });
    });

    it('navigates to the survey summary when ending the survey', async () => {
        renderWithActiveSurvey(<SurveyScreen />, serviceWith());
        await waitFor(() => expect(screen.getByText('End Survey')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('End Survey'));
        expect(mockNavigate).toHaveBeenCalledWith('SurveySummaryScreen', {
            surveyId: 'survey-1',
            surveyorId: 'surveyor-1',
        });
    });

    it('logs an error when a count update fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const updateObservation = jest.fn().mockRejectedValue(new Error('update failed'));
        renderWithActiveSurvey(<SurveyScreen />, serviceWith(updateObservation));
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
        renderWithActiveSurvey(<SurveyScreen />, serviceWith(updateObservation));
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
        renderWithActiveSurvey(<SurveyScreen />, serviceWith(updateObservation));
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

    it('reflects observation changes pushed by the live context', async () => {
        const sub = createContextSubscription(
            buildContext({ observations: [buildObservation({ id: 'obs-1', species: 'Noctule', seenCount: 2 })] }),
        );
        const service = createMockService({ subscribeSurveyContext: sub.subscribe });
        (service as unknown as { updateObservation: jest.Mock }).updateObservation = jest.fn();

        renderWithActiveSurvey(<SurveyScreen />, service);
        await waitFor(() => expect(screen.getByText('S (2)')).toBeOnTheScreen());

        sub.emit(
            buildContext({ observations: [buildObservation({ id: 'obs-2', species: 'Serotine', seenCount: 7 })] }),
        );

        await waitFor(() => expect(screen.getByText('S (7)')).toBeOnTheScreen());
    });
});
