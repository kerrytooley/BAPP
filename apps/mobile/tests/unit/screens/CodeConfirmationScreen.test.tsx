jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { CodeConfirmationScreen } from '@screens/Surveyor/CodeConfirmationScreen';
import { buildContext, buildSurvey } from '../../helpers/factories';
import {
    createMockService,
    mockSubscribeContext,
    renderWithActiveSurvey,
} from '../../helpers/testUtils';
import {
    mockGoBack,
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
});
