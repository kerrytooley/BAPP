import { getIncompleteSetupSteps } from '@utils/setupProgress';
import type { MediaAsset } from '@bapp/domain';
import { buildContext, buildLocation, buildSurvey, buildSurveyor } from '../../helpers/factories';

const image: MediaAsset = { sourceRef: 'a.jpg', renderRef: 'a.jpg', status: 'ready', error: null };
const weather = { temperature: '12', cloudCover: '', humidity: '', wind: '', rain: 'Dry' };

const completeLocation = buildLocation({
    id: 'location-1',
    frontViewImage: image,
    equipmentImage: image,
    equipmentInformation: { audioLabel: 'A1', videoLabel: '', otherInfo: '' },
});

const contextWith = ({
    isLead = false,
    location = completeLocation,
    survey = buildSurvey({ startWeather: weather }),
} = {}) =>
    buildContext({
        survey,
        surveyors: [buildSurveyor({ id: 'surveyor-1', isLead, locationId: 'location-1' })],
        locations: [location],
    });

const labels = (context: ReturnType<typeof contextWith>) =>
    getIncompleteSetupSteps(context, 'surveyor-1').map((s) => s.label);

describe('getIncompleteSetupSteps', () => {
    it('reports nothing when every step is done', () => {
        expect(labels(contextWith({ isLead: true }))).toEqual([]);
    });

    it('lists every missing step in flow order', () => {
        const context = contextWith({
            isLead: true,
            survey: buildSurvey({ startWeather: null, boundary: image }),
            location: buildLocation({ id: 'location-1', boundaryPosition: null }),
        });
        expect(labels(context)).toEqual([
            'Start weather conditions',
            'Survey location',
            'Front view photo',
            'Equipment photo',
            'Equipment details',
        ]);
        expect(getIncompleteSetupSteps(context, 'surveyor-1')[0].route).toEqual({
            name: 'WeatherConditionsScreen',
            params: { surveyId: 'survey-1', surveyorId: 'surveyor-1', locationId: 'location-1', type: 'start' },
        });
    });

    it('treats blank weather and equipment details as missing', () => {
        const context = contextWith({
            isLead: true,
            survey: buildSurvey({ startWeather: { temperature: ' ', cloudCover: '', humidity: '', wind: '', rain: '' } }),
            location: { ...completeLocation, equipmentInformation: { audioLabel: '', videoLabel: ' ', otherInfo: '' } },
        });
        expect(labels(context)).toEqual(['Start weather conditions', 'Equipment details']);
    });

    it('only asks the lead surveyor for weather', () => {
        expect(labels(contextWith({ survey: buildSurvey({ startWeather: null }) }))).toEqual([]);
    });

    it('does not ask for a location pin when there is no red line boundary', () => {
        const context = contextWith({ location: { ...completeLocation, boundaryPosition: null } });
        expect(labels(context)).toEqual([]);
    });

    it('returns nothing for an unknown surveyor or one without a location', () => {
        expect(getIncompleteSetupSteps(contextWith(), 'missing')).toEqual([]);
        const noLocation = buildContext({ surveyors: [buildSurveyor({ id: 'surveyor-1', locationId: null })] });
        expect(getIncompleteSetupSteps(noLocation, 'surveyor-1')).toEqual([]);
    });
});
