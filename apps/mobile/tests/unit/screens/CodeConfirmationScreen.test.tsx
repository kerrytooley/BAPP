jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { CodeConfirmationScreen } from '@screens/Surveyor/CodeConfirmationScreen';
import { buildContext, buildSurvey, buildSurveyor } from '../../helpers/factories';
import {
    createMockService,
    mockSubscribeContext,
    renderWithActiveSurvey,
} from '../../helpers/testUtils';
import {
    mockGoBack,
    mockNavigate,
    resetNavigationMock,
    setRouteParams,
} from '../../helpers/reactNavigationMock';
import { formatDate } from '@utils/dateTimeUtils';

beforeEach(() => {
    resetNavigationMock();
    setRouteParams({ surveyId: 'survey-1' });
});

describe('CodeConfirmationScreen', () => {
    it('shows the survey name, postcode and date once loaded', async () => {
        const date = new Date(2026, 6, 13);
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({
                    survey: buildSurvey({ name: 'Dusk count', postcode: 'SW1A 1AA', date }),
                }),
            ),
        });
        renderWithActiveSurvey(<CodeConfirmationScreen />, service);
        await waitFor(() =>
            expect(screen.getByText('Dusk count - SW1A 1AA')).toBeOnTheScreen(),
        );
        expect(screen.getByText(formatDate(date))).toBeOnTheScreen();
    });

    it('shows fallbacks when the survey details are missing', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({
                    survey: buildSurvey({ name: '', postcode: '', date: null }),
                }),
            ),
        });
        renderWithActiveSurvey(<CodeConfirmationScreen />, service);
        await waitFor(() =>
            expect(screen.getByText('Survey name not found')).toBeOnTheScreen(),
        );
        expect(screen.getByText('Survey date not found')).toBeOnTheScreen();
    });

    it('goes back when the details do not look right', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(buildContext()),
        });
        renderWithActiveSurvey(<CodeConfirmationScreen />, service);
        fireEvent.press(screen.getByText('Continue'));
        fireEvent.press(screen.getByText("Doesn't look right?"));
        expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('continues to surveyor selection for a new join', () => {
        renderWithActiveSurvey(<CodeConfirmationScreen />, createMockService());
        fireEvent.press(screen.getByText('Continue'));
        expect(mockNavigate).toHaveBeenCalledWith('SelectSurveyorScreen', { surveyId: 'survey-1' });
    });

    describe('when returning from the recent surveys menu', () => {
        const service = () => createMockService({
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({ surveyors: [buildSurveyor({ id: 's-1', name: 'Ada' })] }),
            ),
        });

        it('asks the surveyor to confirm the survey', () => {
            setRouteParams({ surveyId: 'survey-1', returning: true, surveyorId: 's-1' });
            renderWithActiveSurvey(<CodeConfirmationScreen />, service());
            expect(screen.getByText('Is this your survey?')).toBeOnTheScreen();
        });

        it('welcomes back the remembered surveyor', () => {
            setRouteParams({ surveyId: 'survey-1', returning: true, surveyorId: 's-1' });
            renderWithActiveSurvey(<CodeConfirmationScreen />, service());
            fireEvent.press(screen.getByText('Continue'));
            expect(mockNavigate).toHaveBeenCalledWith('WelcomeBackScreen', { surveyId: 'survey-1', surveyorId: 's-1' });
        });

        it('asks who they are when the remembered surveyor is gone', () => {
            setRouteParams({ surveyId: 'survey-1', returning: true, surveyorId: 'removed' });
            renderWithActiveSurvey(<CodeConfirmationScreen />, service());
            fireEvent.press(screen.getByText('Continue'));
            expect(mockNavigate).toHaveBeenCalledWith('SelectSurveyorScreen', { surveyId: 'survey-1' });
        });

        it('returns to the welcome screen when it is the wrong survey', () => {
            setRouteParams({ surveyId: 'survey-1', returning: true, surveyorId: 's-1' });
            renderWithActiveSurvey(<CodeConfirmationScreen />, service());
            fireEvent.press(screen.getByText("Doesn't look right?"));
            expect(mockNavigate).toHaveBeenCalledWith('Welcome');
            expect(mockGoBack).not.toHaveBeenCalled();
        });
    });
});
