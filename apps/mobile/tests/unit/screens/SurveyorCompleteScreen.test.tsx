jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { render, screen, fireEvent } from '@testing-library/react-native';
import { SurveyorCompleteScreen } from '@screens/Surveyor/SurveyorCompleteScreen';
import { mockNavigate, mockGoBack, resetNavigationMock, setRouteParams } from '../../helpers/reactNavigationMock';

const params = { surveyId: 'survey-1', surveyorId: 's-1', locationId: 'location-1' };

beforeEach(() => {
    resetNavigationMock();
    setRouteParams(params);
});

describe('SurveyorCompleteScreen', () => {
    it('lets the surveyor review their results read-only', () => {
        render(<SurveyorCompleteScreen />);
        fireEvent.press(screen.getByText('Review your results'));
        expect(mockNavigate).toHaveBeenCalledWith('SurveySummaryScreen', { ...params, viewOnly: true });
    });

    it('tells the surveyor their survey is complete and how to make changes', () => {
        render(<SurveyorCompleteScreen />);
        expect(screen.getByText('Survey completed')).toBeOnTheScreen();
        expect(screen.getByText(/Contact your admin/)).toBeOnTheScreen();
    });

    it('returns home when the button is pressed', () => {
        render(<SurveyorCompleteScreen />);
        fireEvent.press(screen.getByText('Return Home'));
        expect(mockNavigate).toHaveBeenCalledWith('Welcome');
    });

    it('goes back when the back button is pressed', () => {
        render(<SurveyorCompleteScreen />);
        fireEvent.press(screen.getByLabelText('Go back'));
        expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
});
