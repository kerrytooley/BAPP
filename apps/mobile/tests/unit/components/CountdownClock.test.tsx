import { render, screen } from '@testing-library/react-native';
import { CountdownClock } from '@components/DateTime/CountdownClock';

describe('CountdownClock', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date(2026, 6, 13, 12, 0, 0));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('counts down to the start when the survey has not begun', () => {
        const startTime = new Date(Date.now() + 3_600_000);
        const endTime = new Date(Date.now() + 7_200_000);
        render(<CountdownClock startTime={startTime} endTime={endTime} />);
        expect(screen.getByText('Time until survey start:')).toBeOnTheScreen();
        expect(screen.getByText('01:00:00')).toBeOnTheScreen();
    });

    it('counts down to the end once the survey has started', () => {
        const startTime = new Date(Date.now() - 60_000);
        const endTime = new Date(Date.now() + 1_800_000);
        render(<CountdownClock startTime={startTime} endTime={endTime} />);
        expect(screen.getByText('Time until survey end:')).toBeOnTheScreen();
        expect(screen.getByText('00:30:00')).toBeOnTheScreen();
    });
});
