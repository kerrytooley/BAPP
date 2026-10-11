import { render, screen, fireEvent } from '@testing-library/react-native';
import { InputField } from '@components/Common/InputField';

describe('InputField', () => {
    it('renders the placeholder', () => {
        render(<InputField placeholderText="Survey name" />);
        expect(screen.getByPlaceholderText('Survey name')).toBeOnTheScreen();
    });

    it('renders the field label when provided', () => {
        render(<InputField placeholderText="Survey name" fieldLabel="Name" />);
        expect(screen.getByText('Name')).toBeOnTheScreen();
    });

    it('does not render a label when none is provided', () => {
        render(<InputField placeholderText="Survey name" />);
        expect(screen.queryByText('Name')).toBeNull();
    });

    it('shows the current value', () => {
        render(<InputField placeholderText="Survey name" value="Bats" />);
        expect(screen.getByDisplayValue('Bats')).toBeOnTheScreen();
    });

    it('calls onChangeText when the text changes', () => {
        const onChangeText = jest.fn();
        render(
            <InputField placeholderText="Survey name" onChangeText={onChangeText} />,
        );
        fireEvent.changeText(screen.getByPlaceholderText('Survey name'), 'Owls');
        expect(onChangeText).toHaveBeenCalledWith('Owls');
    });

    it('calls onEndEditing when editing finishes', () => {
        const onEndEditing = jest.fn();
        render(
            <InputField placeholderText="Survey name" onEndEditing={onEndEditing} />,
        );
        fireEvent(screen.getByPlaceholderText('Survey name'), 'endEditing');
        expect(onEndEditing).toHaveBeenCalledTimes(1);
    });

    it('renders the unit when variant is "unit"', () => {
        render(
            <InputField placeholderText="Distance" variant="unit" unit="m" />,
        );
        expect(screen.getByText('m')).toBeOnTheScreen();
    });

    it('does not render a unit for the primary variant', () => {
        render(<InputField placeholderText="Distance" unit="m" />);
        expect(screen.queryByText('m')).toBeNull();
    });

    it('enables multiline for the large size', () => {
        render(<InputField placeholderText="Notes" size="large" />);
        expect(screen.getByPlaceholderText('Notes').props.multiline).toBe(true);
    });

    it('is single line for the standard size', () => {
        render(<InputField placeholderText="Notes" />);
        expect(screen.getByPlaceholderText('Notes').props.multiline).toBe(false);
    });

    it('does not error when focused and blurred', () => {
        render(<InputField placeholderText="Survey name" />);
        const input = screen.getByPlaceholderText('Survey name');
        fireEvent(input, 'focus');
        fireEvent(input, 'blur');
        expect(input).toBeOnTheScreen();
    });

    it('calls onFocus when focused', () => {
        const onFocus = jest.fn();
        render(<InputField placeholderText="Survey name" onFocus={onFocus} />);
        fireEvent(screen.getByPlaceholderText('Survey name'), 'focus');
        expect(onFocus).toHaveBeenCalledTimes(1);
    });

    it('shows an error message only when one is given', () => {
        const { rerender } = render(<InputField placeholderText="Wind" error="Enter a whole number" />);
        expect(screen.getByText('Enter a whole number')).toBeOnTheScreen();
        rerender(<InputField placeholderText="Wind" error={null} />);
        expect(screen.queryByText('Enter a whole number')).toBeNull();
    });

    it('passes the keyboard type through', () => {
        render(<InputField placeholderText="Wind" keyboardType="number-pad" />);
        expect(screen.getByPlaceholderText('Wind').props.keyboardType).toBe('number-pad');
    });

    it('toggles a minus sign when negatives are allowed', () => {
        const onChangeText = jest.fn();
        const { rerender } = render(<InputField placeholderText="Temp" value="5" allowNegative onChangeText={onChangeText} />);
        fireEvent.press(screen.getByLabelText('Make negative'));
        expect(onChangeText).toHaveBeenLastCalledWith('-5');

        rerender(<InputField placeholderText="Temp" value="-5" allowNegative onChangeText={onChangeText} />);
        fireEvent.press(screen.getByLabelText('Make positive'));
        expect(onChangeText).toHaveBeenLastCalledWith('5');
    });

    it('starts a negative number from an empty field', () => {
        const onChangeText = jest.fn();
        render(<InputField placeholderText="Temp" allowNegative onChangeText={onChangeText} />);
        fireEvent.press(screen.getByLabelText('Make negative'));
        expect(onChangeText).toHaveBeenLastCalledWith('-');
    });

    it('has no sign toggle by default', () => {
        render(<InputField placeholderText="Wind" />);
        expect(screen.queryByLabelText('Make negative')).toBeNull();
    });
});
