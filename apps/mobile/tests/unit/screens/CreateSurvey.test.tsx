jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { View } from 'react-native';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { CreateSurvey } from '@screens/Admin/CreateSurvey';
import { createMockService, renderWithService } from '../../helpers/testUtils';
import {
    mockNavigate,
    resetNavigationMock,
    setRouteParams,
} from '../../helpers/reactNavigationMock';

beforeEach(() => {
    resetNavigationMock();
    setRouteParams({ surveyId: 'survey-1' });
});

describe('CreateSurvey', () => {
    it('renders all survey detail inputs', () => {
        renderWithService(<CreateSurvey />, createMockService());
        expect(screen.getByPlaceholderText('Input survey name')).toBeOnTheScreen();
        expect(screen.getByPlaceholderText('Input survey postcode')).toBeOnTheScreen();
        expect(screen.getByText('Survey Date')).toBeOnTheScreen();
        expect(screen.getByText('Start Time')).toBeOnTheScreen();
        expect(screen.getByText('End Time')).toBeOnTheScreen();
    });

    it('saves the entered details and navigates on continue', async () => {
        const service = createMockService();
        renderWithService(<CreateSurvey />, service);
        fireEvent.changeText(
            screen.getByPlaceholderText('Input survey name'),
            'Dusk count',
        );
        fireEvent.changeText(
            screen.getByPlaceholderText('Input survey postcode'),
            'SW1A 1AA',
        );
        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() =>
            expect(service.updateSurvey).toHaveBeenCalledWith('survey-1', {
                name: 'Dusk count',
                postcode: 'SW1A 1AA',
                date: null,
                startTime: null,
                endTime: null,
                sunsetTime: null,
            }),
        );
        expect(mockNavigate).toHaveBeenCalledWith('SaveAdminCodeScreen', {
            surveyId: 'survey-1',
        });
    });

    it('does not navigate when the update fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            updateSurvey: jest.fn().mockRejectedValue(new Error('nope')),
        });
        renderWithService(<CreateSurvey />, service);
        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() => expect(errorSpy).toHaveBeenCalled());
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('reuses a created survey after an update failure', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            createSurvey: jest.fn().mockResolvedValue({
                id: 'created-survey',
            }),
            updateSurvey: jest.fn()
                .mockRejectedValueOnce(new Error('nope'))
                .mockResolvedValueOnce({}),
        });
        renderWithService(<CreateSurvey />, service);

        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() => expect(errorSpy).toHaveBeenCalled());
        fireEvent.press(screen.getByText('Continue'));

        await waitFor(() =>
            expect(service.updateSurvey).toHaveBeenCalledTimes(2),
        );
        expect(service.createSurvey).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('SaveAdminCodeScreen', {
            surveyId: 'created-survey',
        });
    });

    it('ignores scroll requests for fields that have not been laid out', () => {
        renderWithService(<CreateSurvey />, createMockService());
        fireEvent.press(screen.getByText('DD/MM/YYYY'));
        expect(screen.getByText('Survey Date')).toBeOnTheScreen();
    });

    it('scrolls a laid-out field into view when its picker opens', () => {
        jest.useFakeTimers();
        try {
            renderWithService(<CreateSurvey />, createMockService());
            screen
                .UNSAFE_getAllByType(View)
                .filter((node) => typeof node.props.onLayout === 'function')
                .forEach((node) =>
                    fireEvent(node, 'layout', { nativeEvent: { layout: { y: 200 } } }),
                );
            fireEvent.press(screen.getByText('DD/MM/YYYY'));
            screen
                .getAllByText('HH:MM')
                .forEach((picker) => fireEvent.press(picker));
            jest.runAllTimers();
            expect(screen.getByText('Survey Date')).toBeOnTheScreen();
        } finally {
            jest.useRealTimers();
        }
    });
});
