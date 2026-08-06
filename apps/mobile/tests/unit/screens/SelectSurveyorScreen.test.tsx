jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { SelectSurveyorScreen } from '@screens/Surveyor/SelectSurveyorScreen';
import { buildContext, buildSurveyor } from '../../helpers/factories';
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

const context = () =>
    buildContext({
        surveyors: [
            buildSurveyor({ id: 'lead-1', isLead: true, name: 'Ada' }),
            buildSurveyor({ id: 'no-name', isLead: false, name: '' }),
        ],
    });

describe('SelectSurveyorScreen', () => {
    it('lists the lead and names, with a fallback for missing names', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(context()),
        });
        renderWithService(<SelectSurveyorScreen />, service);
        await waitFor(() =>
            expect(screen.getByText('Lead Surveyor: Ada')).toBeOnTheScreen(),
        );
        expect(screen.getByText('Name not found')).toBeOnTheScreen();
    });

    it('navigates to confirm the chosen surveyor', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(context()),
        });
        renderWithService(<SelectSurveyorScreen />, service);
        await waitFor(() =>
            expect(screen.getByText('Lead Surveyor: Ada')).toBeOnTheScreen(),
        );
        fireEvent.press(screen.getByText('Lead Surveyor: Ada'));
        expect(mockNavigate).toHaveBeenCalledWith('ConfirmSurveyorDetailsScreen', {
            surveyId: 'survey-1',
            surveyorId: 'lead-1',
        });
    });

    it('logs an error when the surveyors fail to load', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            getSurveyContext: jest.fn().mockRejectedValue(new Error('load failed')),
        });
        renderWithService(<SelectSurveyorScreen />, service);
        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith('Error: unable to fetch surveyors'),
        );
    });
});
