jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { render, screen, fireEvent } from '@testing-library/react-native';
import { WelcomeScreen } from '@screens/WelcomeScreen';
import { mockNavigate, resetNavigationMock } from '../../helpers/reactNavigationMock';

beforeEach(resetNavigationMock);

describe('WelcomeScreen', () => {
    it('renders both entry options', () => {
        render(<WelcomeScreen />);
        expect(screen.getByText('Join as Survey Admin')).toBeOnTheScreen();
        expect(screen.getByText('Join as Surveyor')).toBeOnTheScreen();
    });

    it('navigates to the Admin flow', () => {
        render(<WelcomeScreen />);
        fireEvent.press(screen.getByText('Join as Survey Admin'));
        expect(mockNavigate).toHaveBeenCalledWith('Admin');
    });

    it('navigates to the Surveyor flow', () => {
        render(<WelcomeScreen />);
        fireEvent.press(screen.getByText('Join as Surveyor'));
        expect(mockNavigate).toHaveBeenCalledWith('Surveyor');
    });
});
