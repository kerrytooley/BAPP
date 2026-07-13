import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import { CodeShare } from '@components/CodeShare';

describe('CodeShare', () => {
    afterEach(() => jest.restoreAllMocks());

    it('displays the code value', () => {
        render(<CodeShare value="BAT123" />);
        expect(screen.getByText('BAT123')).toBeOnTheScreen();
    });

    it('shares a message containing the code when pressed', async () => {
        const shareSpy = jest
            .spyOn(Share, 'share')
            .mockResolvedValue({ action: 'sharedAction' });
        render(<CodeShare value="BAT123" />);
        fireEvent.press(screen.getByLabelText('Share survey code'));
        await waitFor(() => expect(shareSpy).toHaveBeenCalledTimes(1));
        expect(shareSpy.mock.calls[0][0].message).toContain('BAT123');
    });

    it('logs an error when sharing fails', async () => {
        const error = new Error('share failed');
        jest.spyOn(Share, 'share').mockRejectedValue(error);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        render(<CodeShare value="BAT123" />);
        fireEvent.press(screen.getByLabelText('Share survey code'));
        await waitFor(() =>
            expect(consoleSpy).toHaveBeenCalledWith('Failed to share code', error),
        );
    });
});
