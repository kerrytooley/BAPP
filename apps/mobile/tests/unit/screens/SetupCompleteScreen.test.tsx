jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { render, screen, fireEvent } from '@testing-library/react-native';
import { SetupCompleteScreen } from '@screens/Surveyor/SetupCompleteScreen';
import {
    mockNavigate,
    resetNavigationMock,
    setRouteParams,
} from '../../helpers/reactNavigationMock';

beforeEach(() => {
    resetNavigationMock();
    setRouteParams({
        surveyId: 'survey-1',
        surveyorId: 'surveyor-1',
        locationId: 'location-1',
    });
});

describe('SetupCompleteScreen', () => {
    it('shows the setup-complete title', () => {
        render(<SetupCompleteScreen />);
        expect(screen.getByText('Survey Setup Complete!')).toBeOnTheScreen();
    });

    it('navigates to the survey screen when pressing next', () => {
        render(<SetupCompleteScreen />);
        fireEvent.press(screen.getByText('Next'));
        expect(mockNavigate).toHaveBeenCalledWith('SurveyScreen', {
            surveyId: 'survey-1',
            locationId: 'location-1',
            surveyorId: 'surveyor-1',
        });
    });
});
