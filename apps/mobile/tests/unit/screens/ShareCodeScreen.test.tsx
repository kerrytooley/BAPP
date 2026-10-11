jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ShareCodeScreen } from '@screens/Admin/ShareCodeScreen';
import { buildContext, buildSurvey } from '../../helpers/factories';
import {
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
    setRouteParams({ surveyId: 'survey-1' });
});

describe('ShareCodeScreen', () => {
    it('displays the loaded surveyor code', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({ survey: buildSurvey({ surveyorCode: 'BAT123' }) }),
            ),
        });
        renderWithActiveSurvey(<ShareCodeScreen />, service);
        await waitFor(() => expect(screen.getByText('BAT123')).toBeOnTheScreen());
    });

    it('returns home when the button is pressed', () => {
        renderWithActiveSurvey(<ShareCodeScreen />, createMockService());
        fireEvent.press(screen.getByText('Return Home'));
        expect(mockNavigate).toHaveBeenCalledWith('Welcome');
    });
});
