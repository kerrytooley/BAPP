jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { SelectSurveyorScreen } from '@screens/Surveyor/SelectSurveyorScreen';
import { loadRecentSurveys } from '@services/recentSurveys';
import { buildContext, buildLocation, buildSurveyor } from '../../helpers/factories';
import {
    createMockService,
    mockSubscribeContext,
    renderWithActiveSurvey,
} from '../../helpers/testUtils';
import {
    mockNavigate,
    resetNavigationMock,
    setRouteParams,
} from '../../helpers/reactNavigationMock';

beforeEach(() => {
    resetNavigationMock();
    setRouteParams({ surveyId: 'survey-1' });
});

const context = () =>
    buildContext({
        surveyors: [
            buildSurveyor({ id: 'lead-1', isLead: true, name: 'Ada' }),
            buildSurveyor({ id: 'no-name', isLead: false, name: '' }),
        ],
    });

describe('SelectSurveyorScreen', () => {
    it('lists the lead and names, with a fallback for missing names', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(context()),
        });
        renderWithActiveSurvey(<SelectSurveyorScreen />, service);
        await waitFor(() =>
            expect(screen.getByText('Lead Surveyor: Ada')).toBeOnTheScreen(),
        );
        expect(screen.getByText('Name not found')).toBeOnTheScreen();
    });

    it('navigates to confirm the chosen surveyor', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(context()),
        });
        renderWithActiveSurvey(<SelectSurveyorScreen />, service);
        await waitFor(() =>
            expect(screen.getByText('Lead Surveyor: Ada')).toBeOnTheScreen(),
        );
        fireEvent.press(screen.getByText('Lead Surveyor: Ada'));
        expect(mockNavigate).toHaveBeenCalledWith({
            name: 'ConfirmSurveyorDetailsScreen',
            params: { surveyId: 'survey-1', surveyorId: 'lead-1' },
        });
        await waitFor(async () => {
            const [stored] = await loadRecentSurveys();
            expect(stored).toEqual(expect.objectContaining({ surveyId: 'survey-1', role: 'surveyor', surveyorId: 'lead-1' }));
        });
    });

    it('sends a surveyor who has already completed to the completed screen', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({
                    surveyors: [buildSurveyor({ id: 'done-1', name: 'Bea', isLead: false, status: 'done', locationId: 'location-1' })],
                }),
            ),
        });
        renderWithActiveSurvey(<SelectSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('Bea')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Bea'));
        expect(mockNavigate).toHaveBeenCalledWith({
            name: 'SurveyorCompleteScreen',
            params: { surveyId: 'survey-1', surveyorId: 'done-1', locationId: 'location-1' },
        });
    });

    describe('a surveyor who has already started', () => {
        const image = { sourceRef: 'a', renderRef: 'a', status: 'ready' as const, error: null };
        const startedContext = (location = buildLocation({ id: 'location-1' })) =>
            buildContext({
                surveyors: [buildSurveyor({ id: 's-1', name: 'Bea', isLead: false, status: 'ready', locationId: 'location-1' })],
                locations: [location],
            });
        const params = { surveyId: 'survey-1', locationId: 'location-1', surveyorId: 's-1' };

        it('is asked about incomplete setup before returning to the survey', async () => {
            const service = createMockService({ subscribeSurveyContext: mockSubscribeContext(startedContext()) });
            renderWithActiveSurvey(<SelectSurveyorScreen />, service);
            await waitFor(() => expect(screen.getByText('Bea')).toBeOnTheScreen());
            fireEvent.press(screen.getByText('Bea'));
            expect(mockNavigate).toHaveBeenCalledWith({ name: 'SetupIncompleteScreen', params });
        });

        it('goes straight back to the survey when setup is complete', async () => {
            const complete = buildLocation({
                id: 'location-1',
                frontViewImage: image,
                equipmentImage: image,
                equipmentInformation: { audioLabel: 'A1', videoLabel: '', otherInfo: '' },
            });
            const service = createMockService({ subscribeSurveyContext: mockSubscribeContext(startedContext(complete)) });
            renderWithActiveSurvey(<SelectSurveyorScreen />, service);
            await waitFor(() => expect(screen.getByText('Bea')).toBeOnTheScreen());
            fireEvent.press(screen.getByText('Bea'));
            expect(mockNavigate).toHaveBeenCalledWith({ name: 'SurveyScreen', params });
        });
    });
});
