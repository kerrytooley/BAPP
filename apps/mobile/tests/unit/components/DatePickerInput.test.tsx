import { render, screen, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { DatePickerInput } from '@components/DateTime/DatePickerInput';

jest.mock('@react-native-community/datetimepicker', () => {
    const React = require('react');
    const { View } = require('react-native');
    return {
        __esModule: true,
        default: (props: Record<string, unknown>) =>
            React.createElement(View, { testID: 'date-picker', ...props }),
    };
});

describe('DatePickerInput', () => {
    it('shows the placeholder when there is no value', () => {
        render(<DatePickerInput fieldLabel="Date" />);
        expect(screen.getByText('DD/MM/YYYY')).toBeOnTheScreen();
    });

    it('shows the formatted date when a value is set', () => {
        render(<DatePickerInput fieldLabel="Date" value={new Date(2026, 6, 13)} />);
        expect(screen.getByText('13/07/2026')).toBeOnTheScreen();
    });

    it('is closed initially', () => {
        render(<DatePickerInput fieldLabel="Date" />);
        expect(screen.queryByTestId('date-picker')).toBeNull();
    });

    it('opens the picker, fires onOpen, and seeds a date when empty', () => {
        const onOpen = jest.fn();
        const onChange = jest.fn();
        render(
            <DatePickerInput fieldLabel="Date" onOpen={onOpen} onChange={onChange} />,
        );
        fireEvent.press(screen.getByText('DD/MM/YYYY'));
        expect(screen.getByTestId('date-picker')).toBeOnTheScreen();
        expect(onOpen).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(expect.any(Date));
    });

    it('does not seed a date on open when a value already exists', () => {
        const onChange = jest.fn();
        render(
            <DatePickerInput
                fieldLabel="Date"
                value={new Date(2026, 6, 13)}
                onChange={onChange}
            />,
        );
        fireEvent.press(screen.getByText('13/07/2026'));
        expect(onChange).not.toHaveBeenCalled();
    });

    it('toggles the picker closed on a second press', () => {
        render(<DatePickerInput fieldLabel="Date" />);
        fireEvent.press(screen.getByText('DD/MM/YYYY'));
        fireEvent.press(screen.getByText('DD/MM/YYYY'));
        expect(screen.queryByTestId('date-picker')).toBeNull();
    });

    it('emits the selected date on change', () => {
        const onChange = jest.fn();
        render(<DatePickerInput fieldLabel="Date" onChange={onChange} />);
        fireEvent.press(screen.getByText('DD/MM/YYYY'));
        onChange.mockClear();
        const selected = new Date(2026, 0, 1);
        fireEvent(screen.getByTestId('date-picker'), 'change', { type: 'set' }, selected);
        expect(onChange).toHaveBeenCalledWith(selected);
    });

    it('closes without emitting when dismissed', () => {
        const onChange = jest.fn();
        render(<DatePickerInput fieldLabel="Date" onChange={onChange} />);
        fireEvent.press(screen.getByText('DD/MM/YYYY'));
        onChange.mockClear();
        fireEvent(screen.getByTestId('date-picker'), 'change', { type: 'dismissed' });
        expect(screen.queryByTestId('date-picker')).toBeNull();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('ignores a set event with no selected date', () => {
        const onChange = jest.fn();
        render(<DatePickerInput fieldLabel="Date" onChange={onChange} />);
        fireEvent.press(screen.getByText('DD/MM/YYYY'));
        onChange.mockClear();
        fireEvent(screen.getByTestId('date-picker'), 'change', { type: 'set' }, undefined);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('closes the Android dialog once a date is chosen', () => {
        jest.replaceProperty(Platform, 'OS', 'android');
        const onChange = jest.fn();
        render(<DatePickerInput fieldLabel="Date" onChange={onChange} />);
        fireEvent.press(screen.getByText('DD/MM/YYYY'));
        const selected = new Date(2026, 6, 13);
        fireEvent(screen.getByTestId('date-picker'), 'change', { type: 'set' }, selected);
        expect(onChange).toHaveBeenLastCalledWith(selected);
        expect(screen.queryByTestId('date-picker')).toBeNull();
        jest.restoreAllMocks();
    });
});
