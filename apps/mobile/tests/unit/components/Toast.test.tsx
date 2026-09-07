import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Toast } from '@components/Common/Toast';

describe('Toast', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('renders nothing when not visible', () => {
        render(<Toast visible={false} message="hidden" onUndo={jest.fn()} onDone={jest.fn()} />);
        expect(screen.queryByText('hidden')).toBeNull();
    });

    it('renders the message and action buttons when visible', () => {
        render(<Toast visible message="Count updated" onUndo={jest.fn()} onDone={jest.fn()} />);
        expect(screen.getByText('Count updated')).toBeOnTheScreen();
        expect(screen.getByLabelText('Undo')).toBeOnTheScreen();
        expect(screen.getByLabelText('Done')).toBeOnTheScreen();
    });

    it('calls onUndo when Undo is pressed', () => {
        const onUndo = jest.fn();
        render(<Toast visible message="x" onUndo={onUndo} onDone={jest.fn()} />);
        fireEvent.press(screen.getByLabelText('Undo'));
        expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('calls onDone when Done is pressed', () => {
        const onDone = jest.fn();
        render(<Toast visible message="x" onUndo={jest.fn()} onDone={onDone} />);
        fireEvent.press(screen.getByLabelText('Done'));
        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('auto-dismisses after the given duration', () => {
        const onDone = jest.fn();
        render(<Toast visible message="x" onUndo={jest.fn()} onDone={onDone} duration={2000} />);
        act(() => {
            jest.advanceTimersByTime(2000);
        });
        expect(onDone).toHaveBeenCalledTimes(1);
    });
});
