jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ShareCodeScreen } from '@screens/Admin/ShareCodeScreen';
import { buildContext, buildSurvey } from '../../helpers/factories';
import { createMockService, renderWithService } from '../../helpers/testUtils';
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
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({ survey: buildSurvey({ surveyorCode: 'BAT123' }) }),
            ),
        });
        renderWithService(<ShareCodeScreen />, service);
        await waitFor(() => expect(screen.getByText('BAT123')).toBeOnTheScreen());
    });

    it('returns home when the button is pressed', () => {
        renderWithService(<ShareCodeScreen />, createMockService());
        fireEvent.press(screen.getByText('Return Home'));
        expect(mockNavigate).toHaveBeenCalledWith('Welcome');
    });

    it('logs an error when the survey fails to load', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            getSurveyContext: jest.fn().mockRejectedValue(new Error('load failed')),
        });
        renderWithService(<ShareCodeScreen />, service);
        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'failed to load survey',
                expect.any(Error),
            ),
        );
    });
});
