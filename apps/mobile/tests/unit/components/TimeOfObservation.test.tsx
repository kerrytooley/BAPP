import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { TimeOfObservation } from '@components/DateTime/TimeOfObservation';

jest.mock('@react-native-community/datetimepicker', () => {
    const React = require('react');
    const { View } = require('react-native');
    return {
        __esModule: true,
        default: (props: Record<string, unknown>) =>
            React.createElement(View, { testID: 'time-picker', ...props }),
    };
});

describe('TimeOfObservation', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('renders the default label and formatted time', () => {
        render(<TimeOfObservation observationTime={new Date(2026, 6, 13, 20, 5)} onChange={jest.fn()} />);
        expect(screen.getByText('Time')).toBeOnTheScreen();
        expect(screen.getByText('20:05')).toBeOnTheScreen();
    });

    it('renders a custom label', () => {
        render(
            <TimeOfObservation
                label="Last seen time"
                observationTime={new Date(2026, 6, 13, 20, 5)}
                onChange={jest.fn()}
            />,
        );
        expect(screen.getByText('Last seen time')).toBeOnTheScreen();
    });

    it('is closed until Edit is pressed', () => {
        render(<TimeOfObservation observationTime={new Date(2026, 6, 13, 20, 5)} onChange={jest.fn()} />);
        expect(screen.queryByTestId('time-picker')).toBeNull();
        fireEvent.press(screen.getByText('Edit'));
        expect(screen.getByTestId('time-picker')).toBeOnTheScreen();
    });

    it('emits the selected time and closes the picker', () => {
        const onChange = jest.fn();
        render(<TimeOfObservation observationTime={new Date(2026, 6, 13, 20, 5)} onChange={onChange} />);
        fireEvent.press(screen.getByText('Edit'));
        const selected = new Date(2026, 6, 13, 21, 30);
        fireEvent(screen.getByTestId('time-picker'), 'change', { type: 'set' }, selected);
        expect(onChange).toHaveBeenCalledWith(selected);
        act(() => {
            jest.advanceTimersByTime(200);
        });
        expect(screen.queryByTestId('time-picker')).toBeNull();
    });

    it('ignores a change event with no selected date', () => {
        const onChange = jest.fn();
        render(<TimeOfObservation observationTime={new Date(2026, 6, 13, 20, 5)} onChange={onChange} />);
        fireEvent.press(screen.getByText('Edit'));
        fireEvent(screen.getByTestId('time-picker'), 'change', { type: 'dismissed' }, undefined);
        expect(onChange).not.toHaveBeenCalled();
    });
});
