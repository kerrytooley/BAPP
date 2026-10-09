jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { SetupIncompleteScreen } from '@screens/Surveyor/SetupIncompleteScreen';
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

const params = { surveyId: 'survey-1', surveyorId: 'surveyor-1', locationId: 'location-1' };

const renderWith = (location = buildLocation({ id: 'location-1' })) =>
    renderWithActiveSurvey(
        <SetupIncompleteScreen />,
        createMockService({
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({
                    surveyors: [buildSurveyor({ id: 'surveyor-1', isLead: false, locationId: 'location-1', status: 'ready' })],
                    locations: [location],
                }),
            ),
        }),
    );

beforeEach(() => {
    resetNavigationMock();
    setRouteParams(params);
});

describe('SetupIncompleteScreen', () => {
    it('lists the missing setup steps', async () => {
        renderWith();
        expect(screen.getByText('Your survey setup is incomplete')).toBeOnTheScreen();
        await waitFor(() => expect(screen.getByText('\u2022 Front view photo')).toBeOnTheScreen());
        expect(screen.getByText('\u2022 Equipment photo')).toBeOnTheScreen();
        expect(screen.getByText('\u2022 Equipment details')).toBeOnTheScreen();
    });

    it('goes to the first missing step to complete setup', async () => {
        renderWith();
        await waitFor(() => expect(screen.getByText('\u2022 Front view photo')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Complete setup'));
        expect(mockNavigate).toHaveBeenCalledWith({
            name: 'CapturePhotoScreen',
            params: { ...params, photoType: 'frontView' },
        });
    });

    it('returns to the survey screen', async () => {
        renderWith();
        fireEvent.press(screen.getByText('Return to survey'));
        expect(mockNavigate).toHaveBeenCalledWith('SurveyScreen', params);
    });

    it('disables completing setup once nothing is missing', async () => {
        const image = { sourceRef: 'a', renderRef: 'a', status: 'ready' as const, error: null };
        renderWith(buildLocation({
            id: 'location-1',
            frontViewImage: image,
            equipmentImage: image,
            equipmentInformation: { audioLabel: 'A1', videoLabel: '', otherInfo: '' },
        }));
        await waitFor(() => expect(screen.getByLabelText('Complete setup')).toBeDisabled());
        fireEvent.press(screen.getByText('Complete setup'));
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
