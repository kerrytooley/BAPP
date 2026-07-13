jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { render, screen, fireEvent } from '@testing-library/react-native';
import { SurveySavedScreen } from '@screens/Admin/SurveySavedScreen';
import { mockNavigate, mockGoBack, resetNavigationMock } from '../../helpers/reactNavigationMock';

beforeEach(resetNavigationMock);

describe('SurveySavedScreen', () => {
    it('shows the saved confirmation', () => {
        render(<SurveySavedScreen />);
        expect(screen.getByText('Survey Saved!')).toBeOnTheScreen();
    });

    it('returns home when the button is pressed', () => {
        render(<SurveySavedScreen />);
        fireEvent.press(screen.getByText('Return Home'));
        expect(mockNavigate).toHaveBeenCalledWith('Welcome');
    });

    it('goes back when the back button is pressed', () => {
        render(<SurveySavedScreen />);
        fireEvent.press(screen.getByLabelText('Go back'));
        expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
});
