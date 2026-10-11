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
        render(<Toast visible={false} position={0} message="hidden" onUndo={jest.fn()} onDone={jest.fn()} />);
        expect(screen.queryByText('hidden')).toBeNull();
    });

    it('renders the message and action buttons when visible', () => {
        render(<Toast visible position={0} message="Count updated" onUndo={jest.fn()} onDone={jest.fn()} />);
        expect(screen.getByText('Count updated')).toBeOnTheScreen();
        expect(screen.getByLabelText('Undo')).toBeOnTheScreen();
        expect(screen.getByLabelText('Done')).toBeOnTheScreen();
    });

    it('calls onUndo when Undo is pressed', () => {
        const onUndo = jest.fn();
        render(<Toast visible position={0} message="x" onUndo={onUndo} onDone={jest.fn()} />);
        fireEvent.press(screen.getByLabelText('Undo'));
        expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('calls onDone when Done is pressed', () => {
        const onDone = jest.fn();
        render(<Toast visible position={0} message="x" onUndo={jest.fn()} onDone={onDone} />);
        fireEvent.press(screen.getByLabelText('Done'));
        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('auto-dismisses after the given duration', () => {
        const onDone = jest.fn();
        render(<Toast visible position={0} message="x" onUndo={jest.fn()} onDone={onDone} duration={2000} />);
        act(() => {
            jest.advanceTimersByTime(2000);
        });
        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('still auto-dismisses on time when the parent re-renders with a new onDone', () => {
        // Parents pass inline callbacks, so every re-render (e.g. a live survey
        // update) hands the toast a fresh onDone. That must not restart the timer.
        const onDone = jest.fn();
        const { rerender } = render(<Toast visible position={0} message="x" onDone={() => onDone()} duration={2000} />);
        for (let i = 0; i < 4; i++) {
            act(() => {
                jest.advanceTimersByTime(600);
            });
            rerender(<Toast visible position={0} message="x" onDone={() => onDone()} duration={2000} />);
        }
        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('restarts the timer when a new message replaces the old one', () => {
        const onDone = jest.fn();
        const { rerender } = render(<Toast visible position={0} message="first" onDone={onDone} duration={2000} />);
        act(() => {
            jest.advanceTimersByTime(1500);
        });
        rerender(<Toast visible position={0} message="second" onDone={onDone} duration={2000} />);
        act(() => {
            jest.advanceTimersByTime(1500);
        });
        expect(onDone).not.toHaveBeenCalled();
        act(() => {
            jest.advanceTimersByTime(500);
        });
        expect(onDone).toHaveBeenCalledTimes(1);
    });
});
