jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { WelcomeScreen } from '@screens/WelcomeScreen';
import { loadRecentSurveys, recordRecentSurvey } from '@services/recentSurveys';
import { buildContext, buildLocation, buildSurvey, buildSurveyor } from '../../helpers/factories';
import { createMockService, renderWithService } from '../../helpers/testUtils';
import { mockNavigate, resetNavigationMock } from '../../helpers/reactNavigationMock';

const survey = buildSurvey({ id: 'survey-1', name: 'Dusk count', postcode: 'SW1A 1AA', createdAt: new Date() });

beforeEach(() => {
    resetNavigationMock();
    // Finish the panel slide instantly; real-time animations make these tests slow and flaky under load.
    jest.spyOn(Animated, 'timing').mockImplementation((value, config) => ({
        start: (callback?: Animated.EndCallback) => {
            (value as Animated.Value).setValue(config.toValue as number);
            callback?.({ finished: true });
        },
        stop: () => { },
        reset: () => { },
    }));
});

afterEach(() => jest.restoreAllMocks());

const openMenu = async () => {
    fireEvent.press(screen.getByLabelText('Recent surveys'));
    await screen.findByText('Your recent surveys');
};

describe('WelcomeScreen', () => {
    it('renders both entry options', () => {
        renderWithService(<WelcomeScreen />, createMockService());
        expect(screen.getByText('Join as Survey Admin')).toBeOnTheScreen();
        expect(screen.getByText('Join as Surveyor')).toBeOnTheScreen();
    });

    it('navigates to the Admin flow', () => {
        renderWithService(<WelcomeScreen />, createMockService());
        fireEvent.press(screen.getByText('Join as Survey Admin'));
        expect(mockNavigate).toHaveBeenCalledWith('Admin');
    });

    it('navigates to the Surveyor flow', () => {
        renderWithService(<WelcomeScreen />, createMockService());
        fireEvent.press(screen.getByText('Join as Surveyor'));
        expect(mockNavigate).toHaveBeenCalledWith('Surveyor');
    });

    describe('recent surveys menu', () => {
        it('reopens an admin survey on its status screen without a code', async () => {
            await recordRecentSurvey(survey, 'admin');
            const service = createMockService({ getSurveyContext: jest.fn().mockResolvedValue(buildContext({ survey })) });
            renderWithService(<WelcomeScreen />, service);
            await openMenu();

            fireEvent.press(await screen.findByLabelText('Open Dusk count - SW1A 1AA'));

            await waitFor(() =>
                expect(mockNavigate).toHaveBeenCalledWith('Admin', { screen: 'SurveyStatusScreen', params: { surveyId: 'survey-1' } }),
            );
            await waitFor(() => expect(screen.queryByText('Your recent surveys')).toBeNull());
        });

        it('takes a surveyor who has ended their survey to the completed screen', async () => {
            await recordRecentSurvey(survey, 'surveyor', 's-1');
            const context = buildContext({
                survey,
                surveyors: [buildSurveyor({ id: 's-1', status: 'done', locationId: 'location-1' })],
                locations: [buildLocation({ id: 'location-1' })],
            });
            renderWithService(<WelcomeScreen />, createMockService({ getSurveyContext: jest.fn().mockResolvedValue(context) }));
            await openMenu();

            fireEvent.press(await screen.findByLabelText('Open Dusk count - SW1A 1AA'));

            await waitFor(() =>
                expect(mockNavigate).toHaveBeenCalledWith('Surveyor', {
                    screen: 'SurveyorCompleteScreen',
                    params: { surveyId: 'survey-1', surveyorId: 's-1', locationId: 'location-1' },
                }),
            );
        });

        it('asks a surveyor to pick themselves when none is remembered', async () => {
            await recordRecentSurvey(survey, 'surveyor');
            renderWithService(<WelcomeScreen />, createMockService({
                getSurveyContext: jest.fn().mockResolvedValue(buildContext({ survey })),
            }));
            await openMenu();

            fireEvent.press(await screen.findByLabelText('Open Dusk count - SW1A 1AA'));

            await waitFor(() =>
                expect(mockNavigate).toHaveBeenCalledWith('Surveyor', {
                    screen: 'SelectSurveyorScreen',
                    params: { surveyId: 'survey-1' },
                }),
            );
        });

        it('offers to remove a survey that can no longer be opened', async () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            await recordRecentSurvey(survey, 'admin');
            renderWithService(<WelcomeScreen />, createMockService({
                getSurveyContext: jest.fn().mockRejectedValue(new Error('Survey survey-1 not found')),
            }));
            await openMenu();

            fireEvent.press(await screen.findByLabelText('Open Dusk count - SW1A 1AA'));
            fireEvent.press(await screen.findByText('Remove from list'));

            await waitFor(() => expect(screen.getByText('Surveys you create or join will appear here.')).toBeOnTheScreen());
            expect(await loadRecentSurveys()).toEqual([]);
            expect(mockNavigate).not.toHaveBeenCalled();
            errorSpy.mockRestore();
        });

        it('keeps a survey that failed to open when asked', async () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            await recordRecentSurvey(survey, 'admin');
            renderWithService(<WelcomeScreen />, createMockService({
                getSurveyContext: jest.fn().mockRejectedValue(new Error('offline')),
            }));
            await openMenu();

            fireEvent.press(await screen.findByLabelText('Open Dusk count - SW1A 1AA'));
            fireEvent.press(await screen.findByText('Keep'));

            await waitFor(() => expect(screen.queryByText('Remove from list')).toBeNull());
            expect(screen.getByLabelText('Open Dusk count - SW1A 1AA')).toBeOnTheScreen();
            errorSpy.mockRestore();
        });

        // Re-rendering the gesture-handler rows is slow in Jest, so allow extra time under a parallel run.
        it('removes a survey after confirming', async () => {
            await recordRecentSurvey(survey, 'admin');
            renderWithService(<WelcomeScreen />, createMockService());
            await openMenu();

            fireEvent.press(await screen.findByLabelText('Remove Dusk count - SW1A 1AA'));
            fireEvent.press(screen.getByText('Remove'));

            await waitFor(() => expect(screen.queryByLabelText('Open Dusk count - SW1A 1AA')).toBeNull(), { timeout: 10000 });
        }, 20000);

        it('closes the menu', async () => {
            renderWithService(<WelcomeScreen />, createMockService());
            await openMenu();
            fireEvent.press(screen.getByLabelText('Close recent surveys'));
            await waitFor(() => expect(screen.queryByText('Your recent surveys')).toBeNull());
        });
    });
});
