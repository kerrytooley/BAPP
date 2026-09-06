jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { SaveAdminCodeScreen } from '@screens/Admin/SaveAdminCodeScreen';
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

describe('SaveAdminCodeScreen', () => {
    it('displays the loaded admin code', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({ survey: buildSurvey({ adminCode: 'ADMIN1' }) }),
            ),
        });
        renderWithActiveSurvey(<SaveAdminCodeScreen />, service);
        await waitFor(() => expect(screen.getByText('ADMIN1')).toBeOnTheScreen());
    });

    it('continues to the upload boundary screen', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({ survey: buildSurvey({ adminCode: 'ADMIN1' }) }),
            ),
        });
        renderWithActiveSurvey(<SaveAdminCodeScreen />, service);

        await waitFor(() => expect(screen.getByText('ADMIN1')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Continue'));
        expect(mockNavigate).toHaveBeenCalledWith('UploadRedLineBoundaryScreen', {
            surveyId: 'survey-1',
        });
    });
});
