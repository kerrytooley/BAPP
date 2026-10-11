jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { continueResumedSetup, openSetupStep } from '@services/setupResume';
import { getIncompleteSetupSteps } from '@utils/setupProgress';
import { buildContext, buildLocation, buildSurvey, buildSurveyor } from '../../helpers/factories';
import { createMockService } from '../../helpers/testUtils';
import { mockNavigate, mockPush, resetNavigationMock, useNavigation } from '../../helpers/reactNavigationMock';

const image = { sourceRef: 'a', renderRef: 'a', status: 'ready' as const, error: null };
const contextWith = (location = buildLocation({ id: 'location-1' })) => buildContext({
    survey: buildSurvey({ startWeather: null }),
    surveyors: [buildSurveyor({ id: 'surveyor-1', isLead: true, locationId: 'location-1' })],
    locations: [location],
});
const navigation = useNavigation() as never;

beforeEach(resetNavigationMock);

describe('continueResumedSetup', () => {
    it('opens the next unfinished step after the current one', async () => {
        const service = createMockService({ getSurveyContext: jest.fn().mockResolvedValue(contextWith()) });
        await continueResumedSetup(service, navigation, 'survey-1', 'surveyor-1', 'startWeather');
        expect(mockPush).toHaveBeenCalledWith('CapturePhotoScreen', {
            surveyId: 'survey-1', locationId: 'location-1', surveyorId: 'surveyor-1', photoType: 'frontView', mode: 'resume',
        });
    });

    it('returns to the survey once nothing after the current step is unfinished', async () => {
        const done = buildLocation({
            id: 'location-1',
            frontViewImage: image,
            equipmentImage: image,
            equipmentInformation: { audioLabel: 'A', videoLabel: 'V', otherInfo: 'O' },
        });
        const service = createMockService({ getSurveyContext: jest.fn().mockResolvedValue(contextWith(done)) });
        await continueResumedSetup(service, navigation, 'survey-1', 'surveyor-1', 'startWeather');
        expect(mockPush).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('SurveyScreen', { surveyId: 'survey-1', surveyorId: 'surveyor-1', locationId: 'location-1' });
    });

    it('falls back to an empty location id for an unknown surveyor', async () => {
        const service = createMockService({ getSurveyContext: jest.fn().mockResolvedValue(contextWith()) });
        await continueResumedSetup(service, navigation, 'survey-1', 'someone-else', 'equipmentDetails');
        expect(mockNavigate).toHaveBeenCalledWith('SurveyScreen', { surveyId: 'survey-1', surveyorId: 'someone-else', locationId: '' });
    });
});

describe('openSetupStep', () => {
    it('pushes the step so repeated screens open fresh', () => {
        const [first] = getIncompleteSetupSteps(contextWith(), 'surveyor-1');
        openSetupStep(navigation, first);
        expect(mockPush).toHaveBeenCalledWith('WeatherConditionsScreen', expect.objectContaining({ type: 'start', mode: 'resume' }));
    });
});
