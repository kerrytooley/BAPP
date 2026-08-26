import { renderHook, act } from '@testing-library/react-native';
import { useCountdown } from '../../../src/hooks/countdown';

describe('useCountdown', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date(2026, 6, 13, 12, 0, 0));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('returns zero and completes when the target is null', () => {
        const { result } = renderHook(() => useCountdown(null));
        expect(result.current.remainingMs).toBe(0);
        expect(result.current.isComplete).toBe(true);
    });

    it('breaks the remaining time into hours, minutes and seconds', () => {
        const target = new Date(Date.now() + (2 * 3600 + 3 * 60 + 4) * 1000);
        const { result } = renderHook(() => useCountdown(target));
        expect(result.current.hours).toBe(2);
        expect(result.current.minutes).toBe(3);
        expect(result.current.seconds).toBe(4);
        expect(result.current.isComplete).toBe(false);
    });

    it('recalculates the remaining time every second', () => {
        const target = new Date(Date.now() + 10_000);
        const { result } = renderHook(() => useCountdown(target));
        expect(result.current.seconds).toBe(10);
        act(() => {
            jest.advanceTimersByTime(1000);
        });
        expect(result.current.seconds).toBe(9);
    });

    it('clamps to zero once the target passes', () => {
        const target = new Date(Date.now() - 5000);
        const { result } = renderHook(() => useCountdown(target));
        expect(result.current.remainingMs).toBe(0);
        expect(result.current.isComplete).toBe(true);
    });

    it('clears the interval on unmount', () => {
        const clearSpy = jest.spyOn(global, 'clearInterval');
        const { unmount } = renderHook(() => useCountdown(new Date(Date.now() + 10_000)));
        unmount();
        expect(clearSpy).toHaveBeenCalled();
    });
});
