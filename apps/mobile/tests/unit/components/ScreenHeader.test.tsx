import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ScreenHeader } from '@components/Common/ScreenHeader';

const makeNavigation = () => ({ goBack: jest.fn(), navigate: jest.fn() });

describe('ScreenHeader', () => {
    it('goes back', () => {
        const navigation = makeNavigation();
        render(<ScreenHeader navigation={navigation} />);
        fireEvent.press(screen.getByLabelText('Go back'));
        expect(navigation.goBack).toHaveBeenCalledTimes(1);
    });

    it('confirms before returning home', () => {
        const navigation = makeNavigation();
        render(<ScreenHeader navigation={navigation} />);

        fireEvent.press(screen.getByLabelText('Return home'));
        expect(screen.getByText('Return home?')).toBeOnTheScreen();
        expect(navigation.navigate).not.toHaveBeenCalled();

        fireEvent.press(screen.getByText('Return home'));
        expect(navigation.navigate).toHaveBeenCalledWith('Welcome');
    });

    it('stays put when returning home is cancelled', async () => {
        const navigation = makeNavigation();
        render(<ScreenHeader navigation={navigation} />);

        fireEvent.press(screen.getByLabelText('Return home'));
        fireEvent.press(screen.getByText('Cancel'));

        await waitFor(() => expect(screen.queryByText('Return home?')).toBeNull());
        expect(navigation.navigate).not.toHaveBeenCalled();
    });

    it('uses a custom home action when given', () => {
        const navigation = makeNavigation();
        const onHome = jest.fn();
        render(<ScreenHeader navigation={navigation} onHome={onHome} />);

        fireEvent.press(screen.getByLabelText('Return home'));

        expect(onHome).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('Return home?')).toBeNull();
    });
});
