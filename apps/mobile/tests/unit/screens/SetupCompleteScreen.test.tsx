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

    it('navigates to the species screen when pressing next', () => {
        render(<SetupCompleteScreen />);
        fireEvent.press(screen.getByText('Next'));
        expect(mockNavigate).toHaveBeenCalledWith('SelectSpeciesScreen', {
            surveyId: 'survey-1',
            locationId: 'location-1',
            surveyorId: 'surveyor-1',
        });
    });
});
