import { screen, fireEvent, render } from '@testing-library/react-native';
import { FirebaseConnectionError } from '@components/FirebaseConnectionError';

describe('FirebaseConnectionError', () => {
    it('shows the connection error message', () => {
        render(<FirebaseConnectionError onRetry={() => {}} />);
        expect(screen.getByText("Can't connect to the server")).toBeOnTheScreen();
    });

    it('calls onRetry when the button is pressed', () => {
        const onRetry = jest.fn();
        render(<FirebaseConnectionError onRetry={onRetry} />);
        fireEvent.press(screen.getByText('Try again'));
        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('shows the detail text when provided', () => {
        render(<FirebaseConnectionError onRetry={() => {}} detail="auth/network-request-failed" />);
        expect(screen.getByText('auth/network-request-failed')).toBeOnTheScreen();
    });

    it('omits the detail text when not provided', () => {
        render(<FirebaseConnectionError onRetry={() => {}} />);
        expect(screen.queryByText('auth/network-request-failed')).toBeNull();
    });
});
