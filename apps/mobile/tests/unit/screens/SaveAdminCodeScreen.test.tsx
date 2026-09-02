jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { SaveAdminCodeScreen } from '@screens/Admin/SaveAdminCodeScreen';
import { buildSurvey } from '../../helpers/factories';
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

describe('SaveAdminCodeScreen', () => {
    it('displays the loaded admin code', async () => {
        const service = createMockService({
            getSurvey: jest.fn().mockResolvedValue(buildSurvey({ adminCode: 'ADMIN1' })),
        });
        renderWithService(<SaveAdminCodeScreen />, service);
        await waitFor(() => expect(screen.getByText('ADMIN1')).toBeOnTheScreen());
    });

    it('continues to the upload boundary screen', async () => {
        const service = createMockService({
            getSurvey: jest.fn().mockResolvedValue(buildSurvey({ adminCode: 'ADMIN1' })),
        });
        renderWithService(<SaveAdminCodeScreen />, service);

        await waitFor(() => expect(screen.getByText('ADMIN1')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Continue'));
        expect(mockNavigate).toHaveBeenCalledWith('UploadRedLineBoundaryScreen', {
            surveyId: 'survey-1',
        });
    });

    it('logs an error when the survey fails to load', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            getSurvey: jest.fn().mockRejectedValue(new Error('load failed')),
        });
        renderWithService(<SaveAdminCodeScreen />, service);
        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'failed to load survey',
                expect.any(Error),
            ),
        );
        errorSpy.mockRestore();
    });
});
