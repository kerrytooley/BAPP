jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { View } from 'react-native';
import type { ReactElement } from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { CreateSurvey } from '@screens/Admin/CreateSurvey';
import { loadRecentSurveys } from '@services/recentSurveys';
import {
    createMockService,
    mockSubscribeContext,
    renderWithActiveSurvey,
    type MockSurveyService,
} from '../../helpers/testUtils';
import { buildContext, buildSurvey } from '../../helpers/factories';
import {
    mockNavigate,
    mockPopTo,
    resetNavigationMock,
    setRouteParams,
} from '../../helpers/reactNavigationMock';

const renderWithService = (ui: ReactElement, service: MockSurveyService) =>
    renderWithActiveSurvey(ui, service, undefined);

beforeEach(() => {
    resetNavigationMock();
    setRouteParams({ surveyId: 'survey-1' });
});

describe('CreateSurvey in edit mode', () => {
    const existing = buildSurvey({ name: 'Dusk count', postcode: 'SW1A 1AA' });
    const editService = () => createMockService({
        subscribeSurveyContext: mockSubscribeContext(buildContext({ survey: existing })),
    });

    beforeEach(() => setRouteParams({ surveyId: 'survey-1', editing: true }));

    it('prefills the existing details', async () => {
        renderWithActiveSurvey(<CreateSurvey />, editService());
        expect(screen.getByText('Edit Survey Details')).toBeOnTheScreen();
        await waitFor(() => expect(screen.getByDisplayValue('Dusk count')).toBeOnTheScreen());
        expect(screen.getByDisplayValue('SW1A 1AA')).toBeOnTheScreen();
    });

    it('saves to the existing survey and returns to survey status', async () => {
        const service = editService();
        renderWithActiveSurvey(<CreateSurvey />, service);
        await waitFor(() => expect(screen.getByDisplayValue('Dusk count')).toBeOnTheScreen());

        fireEvent.changeText(screen.getByDisplayValue('Dusk count'), 'Dawn count');
        fireEvent.press(screen.getByText('Save'));

        await waitFor(() =>
            expect(service.updateSurvey).toHaveBeenCalledWith('survey-1', expect.objectContaining({ name: 'Dawn count' })),
        );
        expect(service.createSurvey).not.toHaveBeenCalled();
        expect(mockPopTo).toHaveBeenCalledWith('SurveyStatusScreen', { surveyId: 'survey-1' });
    });

    it('lets an already-started survey be edited without changing its start', async () => {
        const started = buildSurvey({
            name: 'Dusk count',
            date: new Date(2020, 0, 1),
            startTime: new Date(2020, 0, 1, 20, 0),
            endTime: new Date(2020, 0, 1, 22, 0),
        });
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(buildContext({ survey: started })),
        });
        renderWithActiveSurvey(<CreateSurvey />, service);
        await waitFor(() => expect(screen.getByDisplayValue('Dusk count')).toBeOnTheScreen());

        expect(screen.queryByText('Survey start must be in the future')).toBeNull();
        expect(screen.getByLabelText('Save')).toBeEnabled();
    });

    it('cancels back to survey status without saving', async () => {
        const service = editService();
        renderWithActiveSurvey(<CreateSurvey />, service);
        await waitFor(() => expect(screen.getByDisplayValue('Dusk count')).toBeOnTheScreen());

        fireEvent.press(screen.getByText('Cancel'));

        expect(service.updateSurvey).not.toHaveBeenCalled();
        expect(mockPopTo).toHaveBeenCalledWith('SurveyStatusScreen', { surveyId: 'survey-1' });
    });
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
            '  Dusk count ',
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
        await waitFor(async () =>
            expect(await loadRecentSurveys()).toEqual([
                expect.objectContaining({ surveyId: 'survey-1', role: 'admin' }),
            ]),
        );
    });

    it('does not navigate when the update fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            updateSurvey: jest.fn().mockRejectedValue(new Error('nope')),
        });
        renderWithService(<CreateSurvey />, service);
        fireEvent.changeText(screen.getByPlaceholderText('Input survey name'), 'Dusk count');
        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() => expect(errorSpy).toHaveBeenCalled());
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('requires a survey name before continuing', () => {
        const service = createMockService();
        renderWithService(<CreateSurvey />, service);
        expect(screen.getByLabelText('Continue')).toBeDisabled();

        const nameInput = screen.getByPlaceholderText('Input survey name');
        fireEvent.changeText(nameInput, '   ');
        fireEvent(nameInput, 'endEditing');
        expect(screen.getByText('Survey name is required')).toBeOnTheScreen();
        fireEvent.press(screen.getByText('Continue'));
        expect(service.createSurvey).not.toHaveBeenCalled();

        fireEvent.changeText(nameInput, 'Dusk count');
        expect(screen.getByLabelText('Continue')).toBeEnabled();
        expect(screen.queryByText('Survey name is required')).toBeNull();
    });

    it('rejects a postcode with special characters', () => {
        renderWithService(<CreateSurvey />, createMockService());
        fireEvent.changeText(screen.getByPlaceholderText('Input survey name'), 'Dusk count');
        const postcodeInput = screen.getByPlaceholderText('Input survey postcode');
        fireEvent.changeText(postcodeInput, 'SW1A-1AA!');
        fireEvent(postcodeInput, 'endEditing');

        expect(screen.getByText('Enter a valid UK postcode, e.g. SW1A 1AA')).toBeOnTheScreen();
        expect(screen.getByLabelText('Continue')).toBeDisabled();

        fireEvent.changeText(postcodeInput, 'SW1A 1AA');
        expect(screen.getByLabelText('Continue')).toBeEnabled();
    });

    it('requires the survey to start in the future', () => {
        jest.useFakeTimers({ now: new Date(2026, 9, 11, 18, 0, 30) });
        try {
            renderWithService(<CreateSurvey />, createMockService());
            fireEvent.changeText(screen.getByPlaceholderText('Input survey name'), 'Dusk count');
            fireEvent.press(screen.getByText('DD/MM/YYYY'));
            expect(screen.queryByText('Survey start must be in the future')).toBeNull();

            // Opening an empty time picker seeds it with the current time, which is already past.
            fireEvent.press(screen.getAllByText('HH:MM')[0]);
            expect(screen.getByText('Survey start must be in the future')).toBeOnTheScreen();
            expect(screen.getByLabelText('Continue')).toBeDisabled();
        } finally {
            jest.useRealTimers();
        }
    });

    it('requires the end time to be after the start time', () => {
        renderWithService(<CreateSurvey />, createMockService());
        fireEvent.changeText(screen.getByPlaceholderText('Input survey name'), 'Dusk count');
        const [start, , end] = screen.getAllByText('HH:MM');
        fireEvent.press(start);
        fireEvent.press(end);

        expect(screen.getByText('End time must be after the start time')).toBeOnTheScreen();
        expect(screen.getByLabelText('Continue')).toBeDisabled();
    });

    it('saves an empty postcode as null', async () => {
        const service = createMockService();
        renderWithService(<CreateSurvey />, service);
        fireEvent.changeText(screen.getByPlaceholderText('Input survey name'), 'Dusk count');
        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() =>
            expect(service.updateSurvey).toHaveBeenCalledWith(
                'survey-1',
                expect.objectContaining({ postcode: null }),
            ),
        );
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
        fireEvent.changeText(screen.getByPlaceholderText('Input survey name'), 'Dusk count');

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
