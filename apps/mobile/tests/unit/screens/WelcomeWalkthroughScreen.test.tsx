jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent } from '@testing-library/react-native';
import { WelcomeWalkthroughScreen } from '@screens/Admin/WelcomeWalkthroughScreen';
import { createMockService, renderWithService } from '../../helpers/testUtils';
import { mockNavigate, mockGoBack, resetNavigationMock } from '../../helpers/reactNavigationMock';

beforeEach(resetNavigationMock);

describe('WelcomeWalkthroughScreen', () => {
    it('renders the walkthrough heading', () => {
        renderWithService(<WelcomeWalkthroughScreen />, createMockService());
        expect(screen.getByText('How it works!')).toBeOnTheScreen();
    });

    it('navigates to create survey when getting started', () => {
        renderWithService(<WelcomeWalkthroughScreen />, createMockService());
        fireEvent.press(screen.getByText("Let's get started"));
        expect(mockNavigate).toHaveBeenCalledWith('CreateSurvey');
    });

    it('goes back from the back button', () => {
        renderWithService(<WelcomeWalkthroughScreen />, createMockService());
        fireEvent.press(screen.getByLabelText('Go back'));
        expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
});
