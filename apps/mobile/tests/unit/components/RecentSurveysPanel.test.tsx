import { render, screen, fireEvent } from '@testing-library/react-native';
import { RecentSurveysPanel, type RecentSurveysPanelProps } from '@components/Navigation/RecentSurveysPanel';
import type { RecentSurvey } from '@services/recentSurveys';

const survey = (overrides: Partial<RecentSurvey> = {}): RecentSurvey => ({
    surveyId: 'survey-1',
    role: 'admin',
    name: 'Dusk count',
    postcode: 'SW1A 1AA',
    surveyCreatedAt: '2026-10-01T00:00:00.000Z',
    lastOpenedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
});

const renderPanel = (props: Partial<RecentSurveysPanelProps> = {}) => {
    const handlers = {
        onClose: jest.fn(),
        onOpen: jest.fn(),
        onRemove: jest.fn(),
        onDismissFailure: jest.fn(),
    };
    render(<RecentSurveysPanel visible surveys={[]} {...handlers} {...props} />);
    return handlers;
};

describe('RecentSurveysPanel', () => {
    it('shows an empty state', () => {
        renderPanel();
        expect(screen.getByText('Your recent surveys')).toBeOnTheScreen();
        expect(screen.getByText('Surveys you create or join will appear here.')).toBeOnTheScreen();
    });

    it('groups surveys under Admin and Surveyor as "name - postcode"', () => {
        renderPanel({
            surveys: [survey(), survey({ surveyId: 'survey-2', role: 'surveyor', name: null, postcode: null })],
        });
        expect(screen.getByText('Admin')).toBeOnTheScreen();
        expect(screen.getByText('Surveyor')).toBeOnTheScreen();
        expect(screen.getByText('Dusk count - SW1A 1AA')).toBeOnTheScreen();
        expect(screen.getByText('Untitled survey')).toBeOnTheScreen();
    });

    it('opens, removes and closes', () => {
        const handlers = renderPanel({ surveys: [survey()] });
        expect(screen.getByText('Swipe left on a survey to remove it.')).toBeOnTheScreen();
        fireEvent.press(screen.getByLabelText('Open Dusk count - SW1A 1AA'));
        expect(handlers.onOpen).toHaveBeenCalledWith(survey());
        fireEvent.press(screen.getByLabelText('Remove Dusk count - SW1A 1AA'));
        expect(screen.getByText('Remove from recent surveys?')).toBeOnTheScreen();
        expect(handlers.onRemove).not.toHaveBeenCalled();
        fireEvent.press(screen.getByText('Remove'));
        expect(handlers.onRemove).toHaveBeenCalledWith(survey());
        expect(screen.queryByText('Remove from recent surveys?')).toBeNull();
        fireEvent.press(screen.getByTestId('recent-surveys-backdrop'));
        fireEvent.press(screen.getByLabelText('Close recent surveys'));
        expect(handlers.onClose).toHaveBeenCalledTimes(2);
    });

    it('keeps a survey when removal is cancelled', () => {
        const handlers = renderPanel({ surveys: [survey()] });
        fireEvent.press(screen.getByLabelText('Remove Dusk count - SW1A 1AA'));
        fireEvent.press(screen.getByText('Cancel'));
        expect(screen.queryByText('Remove from recent surveys?')).toBeNull();
        expect(handlers.onRemove).not.toHaveBeenCalled();
    });

    it('shows 10 per section and expands with See more', () => {
        const many = Array.from({ length: 12 }, (_, i) => survey({ surveyId: `s${i}`, name: `Survey ${i}`, postcode: null }));
        renderPanel({ surveys: many });
        expect(screen.queryByText('Survey 10')).toBeNull();
        fireEvent.press(screen.getByText('See more (2)'));
        expect(screen.getByText('Survey 11')).toBeOnTheScreen();
        fireEvent.press(screen.getByText('Show less'));
        expect(screen.queryByText('Survey 11')).toBeNull();
    });

    it('blocks other taps while one survey is opening', () => {
        const handlers = renderPanel({ surveys: [survey()], opening: survey() });
        expect(screen.getByLabelText('Open Dusk count - SW1A 1AA')).toBeDisabled();
        fireEvent.press(screen.getByLabelText('Open Dusk count - SW1A 1AA'));
        expect(handlers.onOpen).not.toHaveBeenCalled();
    });

    it('offers to remove or keep a survey that failed to open', () => {
        const handlers = renderPanel({ surveys: [survey()], failed: survey() });
        expect(screen.getByText(/We couldn't open Dusk count - SW1A 1AA/)).toBeOnTheScreen();
        fireEvent.press(screen.getByText('Remove from list'));
        expect(handlers.onRemove).toHaveBeenCalledWith(survey());
        fireEvent.press(screen.getByText('Keep'));
        expect(handlers.onDismissFailure).toHaveBeenCalled();
    });
});
