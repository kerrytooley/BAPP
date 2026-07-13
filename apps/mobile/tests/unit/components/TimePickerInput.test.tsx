import { render, screen, fireEvent } from '@testing-library/react-native';
import { TimePickerInput } from '@components/TimePickerInput';

jest.mock('@react-native-community/datetimepicker', () => {
    const React = require('react');
    const { View } = require('react-native');
    return {
        __esModule: true,
        default: (props: Record<string, unknown>) =>
            React.createElement(View, { testID: 'time-picker', ...props }),
    };
});

describe('TimePickerInput', () => {
    it('shows the placeholder when there is no value', () => {
        render(<TimePickerInput fieldLabel="Start" />);
        expect(screen.getByText('HH:MM')).toBeOnTheScreen();
    });

    it('shows the formatted time when a value is set', () => {
        render(<TimePickerInput fieldLabel="Start" value={new Date(2026, 6, 13, 9, 5)} />);
        expect(screen.getByText('09:05')).toBeOnTheScreen();
    });

    it('is closed initially', () => {
        render(<TimePickerInput fieldLabel="Start" />);
        expect(screen.queryByTestId('time-picker')).toBeNull();
    });

    it('opens the picker, fires onOpen, and seeds a time when empty', () => {
        const onOpen = jest.fn();
        const onChange = jest.fn();
        render(
            <TimePickerInput fieldLabel="Start" onOpen={onOpen} onChange={onChange} />,
        );
        fireEvent.press(screen.getByText('HH:MM'));
        expect(screen.getByTestId('time-picker')).toBeOnTheScreen();
        expect(onOpen).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(expect.any(Date));
    });

    it('does not seed a time on open when a value already exists', () => {
        const onChange = jest.fn();
        render(
            <TimePickerInput
                fieldLabel="Start"
                value={new Date(2026, 6, 13, 9, 5)}
                onChange={onChange}
            />,
        );
        fireEvent.press(screen.getByText('09:05'));
        expect(onChange).not.toHaveBeenCalled();
    });

    it('toggles the picker closed on a second press', () => {
        render(<TimePickerInput fieldLabel="Start" />);
        fireEvent.press(screen.getByText('HH:MM'));
        fireEvent.press(screen.getByText('HH:MM'));
        expect(screen.queryByTestId('time-picker')).toBeNull();
    });

    it('emits the selected time on change', () => {
        const onChange = jest.fn();
        render(<TimePickerInput fieldLabel="Start" onChange={onChange} />);
        fireEvent.press(screen.getByText('HH:MM'));
        onChange.mockClear();
        const selected = new Date(2026, 0, 1, 18, 30);
        fireEvent(screen.getByTestId('time-picker'), 'change', { type: 'set' }, selected);
        expect(onChange).toHaveBeenCalledWith(selected);
    });

    it('closes without emitting when dismissed', () => {
        const onChange = jest.fn();
        render(<TimePickerInput fieldLabel="Start" onChange={onChange} />);
        fireEvent.press(screen.getByText('HH:MM'));
        onChange.mockClear();
        fireEvent(screen.getByTestId('time-picker'), 'change', { type: 'dismissed' });
        expect(screen.queryByTestId('time-picker')).toBeNull();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('ignores a set event with no selected time', () => {
        const onChange = jest.fn();
        render(<TimePickerInput fieldLabel="Start" onChange={onChange} />);
        fireEvent.press(screen.getByText('HH:MM'));
        onChange.mockClear();
        fireEvent(screen.getByTestId('time-picker'), 'change', { type: 'set' }, undefined);
        expect(onChange).not.toHaveBeenCalled();
    });
});
