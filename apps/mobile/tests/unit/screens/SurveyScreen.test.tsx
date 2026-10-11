jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { act, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { SurveyScreen } from '@screens/Surveyor/SurveyScreen';
import {
    createContextSubscription,
    createMockService,
    mockSubscribeContext,
    renderWithActiveSurvey,
} from '../../helpers/testUtils';
import { buildContext, buildObservation, buildSurvey, buildSurveyor } from '../../helpers/factories';
import {
    mockNavigate,
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
    describe('started status', () => {
        const withSurveyor = (status: 'confirmed' | 'ready', updateSurveyor = jest.fn().mockResolvedValue({})) => {
            const service = serviceWith(jest.fn(), buildContext({
                surveyors: [buildSurveyor({ id: 'surveyor-1', status })],
                observations: [observation],
            }));
            (service as unknown as { updateSurveyor: jest.Mock }).updateSurveyor = updateSurveyor;
            return service;
        };

        it('marks a surveyor as started on reaching the survey', async () => {
            const service = withSurveyor('confirmed');
            renderWithActiveSurvey(<SurveyScreen />, service);
            await waitFor(() =>
                expect(service.updateSurveyor).toHaveBeenCalledWith('surveyor-1', { status: 'ready' }),
            );
        });

        it('does not update a surveyor who has already started', async () => {
            const service = withSurveyor('ready');
            renderWithActiveSurvey(<SurveyScreen />, service);
            await waitFor(() => expect(screen.getByText('End Survey')).toBeOnTheScreen());
            expect(service.updateSurveyor).not.toHaveBeenCalled();
        });

        it('logs an error when marking the surveyor as started fails', async () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            renderWithActiveSurvey(<SurveyScreen />, withSurveyor('confirmed', jest.fn().mockRejectedValue(new Error('offline'))));
            await waitFor(() =>
                expect(errorSpy).toHaveBeenCalledWith('Error marking surveyor as started', expect.any(Error)),
            );
            errorSpy.mockRestore();
        });
    });

    describe('survey timing', () => {
        // Survey times are anchored to the survey date at whole minutes.
        const NOW = new Date(2026, 9, 11, 18, 0);
        const fromNow = (ms: number) => new Date(NOW.getTime() + ms);
        const timedService = (startInMs: number, endInMs: number) =>
            serviceWith(jest.fn(), buildContext({
                survey: buildSurvey({ date: new Date(2026, 9, 11), startTime: fromNow(startInMs), endTime: fromNow(endInMs) }),
                observations: [observation],
            }));

        beforeEach(() => jest.useFakeTimers({ now: NOW }));
        afterEach(() => jest.useRealTimers());

        it('counts down to an end time after midnight', async () => {
            const service = serviceWith(jest.fn(), buildContext({
                survey: buildSurvey({
                    date: new Date(2026, 9, 11),
                    startTime: new Date(2026, 9, 11, 17, 0),
                    endTime: new Date(2026, 9, 11, 0, 30),
                }),
                observations: [observation],
            }));
            renderWithActiveSurvey(<SurveyScreen />, service);
            await waitFor(() => expect(screen.getByText('End Survey')).toBeOnTheScreen());

            fireEvent.press(screen.getByText('End Survey'));

            expect(screen.getByText('This survey still has time remaining. Are you sure you want to end it?')).toBeOnTheScreen();
        });

        it('warns that time remains when ending before the end time', async () => {
            renderWithActiveSurvey(<SurveyScreen />, timedService(-60_000, 60 * 60_000));
            await waitFor(() => expect(screen.getByText('End Survey')).toBeOnTheScreen());

            fireEvent.press(screen.getByText('End Survey'));

            expect(screen.getByText('This survey still has time remaining. Are you sure you want to end it?')).toBeOnTheScreen();
        });

        it('prompts once the start time is reached with a single Okay', async () => {
            renderWithActiveSurvey(<SurveyScreen />, timedService(60_000, 120 * 60_000));
            await waitFor(() => expect(screen.getByText('End Survey')).toBeOnTheScreen());
            expect(screen.queryByText('Time to begin the survey')).toBeNull();

            act(() => jest.advanceTimersByTime(60_000));

            expect(screen.getByText('Time to begin the survey')).toBeOnTheScreen();
            expect(screen.queryByText('Cancel')).toBeNull();
            fireEvent.press(screen.getByText('Okay'));
            await waitFor(() => expect(screen.queryByText('Time to begin the survey')).toBeNull());
        });

        it('prompts at the end time and ends the survey on request', async () => {
            renderWithActiveSurvey(<SurveyScreen />, timedService(-60_000, 60_000));
            await waitFor(() => expect(screen.getByText('End Survey')).toBeOnTheScreen());

            act(() => jest.advanceTimersByTime(60_000));

            expect(screen.getByText('Survey end time reached')).toBeOnTheScreen();
            fireEvent.press(screen.getByText('End survey'));
            expect(mockNavigate).toHaveBeenCalledWith('SurveySummaryScreen', {
                surveyId: 'survey-1',
                surveyorId: 'surveyor-1',
                locationId: 'location-1',
            });
        });

        it('lets the surveyor keep recording past the end time', async () => {
            renderWithActiveSurvey(<SurveyScreen />, timedService(-60_000, 60_000));
            await waitFor(() => expect(screen.getByText('End Survey')).toBeOnTheScreen());

            act(() => jest.advanceTimersByTime(60_000));
            fireEvent.press(screen.getByText('Okay'));

            await waitFor(() => expect(screen.queryByText('Survey end time reached')).toBeNull());
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it('does not prompt for times that have already passed', async () => {
            renderWithActiveSurvey(<SurveyScreen />, timedService(-120_000, -60_000));
            await waitFor(() => expect(screen.getByText('End Survey')).toBeOnTheScreen());

            act(() => jest.advanceTimersByTime(24 * 60 * 60_000));

            expect(screen.queryByText('Time to begin the survey')).toBeNull();
            expect(screen.queryByText('Survey end time reached')).toBeNull();
        });

        it('returns home after a short pause without ending the survey', async () => {
            const service = timedService(-60_000, 60 * 60_000);
            renderWithActiveSurvey(<SurveyScreen />, service);
            await waitFor(() => expect(screen.getByText('End Survey')).toBeOnTheScreen());

            fireEvent.press(screen.getByLabelText('Return home'));
            expect(screen.getByText('Saving your results')).toBeOnTheScreen();
            expect(mockNavigate).not.toHaveBeenCalled();

            act(() => jest.advanceTimersByTime(2500));

            expect(mockNavigate).toHaveBeenCalledWith('Welcome');
            expect(service.completeSurveyor).not.toHaveBeenCalled();
        });

        it('stays on the survey when returning home is cancelled', async () => {
            renderWithActiveSurvey(<SurveyScreen />, timedService(-60_000, 60 * 60_000));
            await waitFor(() => expect(screen.getByText('End Survey')).toBeOnTheScreen());

            fireEvent.press(screen.getByLabelText('Return home'));
            fireEvent.press(screen.getByText('Cancel'));
            act(() => jest.advanceTimersByTime(10_000));

            expect(mockNavigate).not.toHaveBeenCalled();
            expect(screen.queryByText('Saving your results')).toBeNull();
        });
    });
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
        expect(mockNavigate).toHaveBeenCalledWith('SelectSpeciesScreen', {
            surveyId: 'survey-1',
            surveyorId: 'surveyor-1',
            locationId: 'location-1',
        });
    });

    it('navigates to the survey summary after confirming end survey', async () => {
        renderWithActiveSurvey(<SurveyScreen />, serviceWith());
        await waitFor(() => expect(screen.getByText('End Survey')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('End Survey'));
        expect(mockNavigate).not.toHaveBeenCalled();

        fireEvent.press(screen.getByText('End survey'));
        expect(mockNavigate).toHaveBeenCalledWith('SurveySummaryScreen', {
            surveyId: 'survey-1',
            surveyorId: 'surveyor-1',
            locationId: 'location-1',
        });
    });

    it('stays on the survey when end survey is cancelled', async () => {
        renderWithActiveSurvey(<SurveyScreen />, serviceWith());
        await waitFor(() => expect(screen.getByText('End Survey')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('End Survey'));
        expect(screen.getByText('End survey?')).toBeOnTheScreen();

        fireEvent.press(screen.getByText('Cancel'));
        await waitFor(() => expect(screen.queryByText('End survey?')).toBeNull());
        expect(mockNavigate).not.toHaveBeenCalled();
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
