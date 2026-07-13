import { render, screen, fireEvent } from '@testing-library/react-native';
import { InputField } from '@components/InputField';

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
});
