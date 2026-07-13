import { render, screen, fireEvent } from '@testing-library/react-native';
import { CodeInput } from '@components/CodeInput';

describe('CodeInput', () => {
    it('renders the placeholder', () => {
        render(<CodeInput placeholder="ABC123" />);
        expect(screen.getByPlaceholderText('ABC123')).toBeOnTheScreen();
    });

    it('shows the current value', () => {
        render(<CodeInput value="ABC123" />);
        expect(screen.getByDisplayValue('ABC123')).toBeOnTheScreen();
    });

    it('calls onChangeText when the text changes', () => {
        const onChangeText = jest.fn();
        render(<CodeInput placeholder="Code" onChangeText={onChangeText} />);
        fireEvent.changeText(screen.getByPlaceholderText('Code'), 'xyz');
        expect(onChangeText).toHaveBeenCalledWith('xyz');
    });

    it('disables auto-capitalisation', () => {
        render(<CodeInput placeholder="Code" />);
        expect(screen.getByPlaceholderText('Code').props.autoCapitalize).toBe('none');
    });
});
