import { routeForSurveyor } from '@utils/surveyorRoute';
import { buildContext, buildLocation, buildSurveyor } from '../../helpers/factories';

const image = { sourceRef: 'a', renderRef: 'a', status: 'ready' as const, error: null };
const completeLocation = buildLocation({
    id: 'location-1',
    frontViewImage: image,
    equipmentImage: image,
    equipmentInformation: { audioLabel: 'A1', videoLabel: '', otherInfo: '' },
});

const routeFor = (status: 'pending' | 'confirmed' | 'ready' | 'done', location = completeLocation, locationId: string | null = 'location-1') => {
    const surveyor = buildSurveyor({ id: 's-1', isLead: false, status, locationId });
    return routeForSurveyor(buildContext({ surveyors: [surveyor], locations: [location] }), surveyor);
};

describe('routeForSurveyor', () => {
    it('always sends a surveyor who has ended their survey to the completed screen', () => {
        const incomplete = buildLocation({ id: 'location-1' });
        expect(routeFor('done', incomplete)).toEqual({
            name: 'SurveyorCompleteScreen',
            params: { surveyId: 'survey-1', surveyorId: 's-1', locationId: 'location-1' },
        });
        expect(routeFor('done', incomplete, null).params).toEqual(expect.objectContaining({ locationId: '' }));
    });

    it('asks a started surveyor about incomplete setup, else returns to the survey', () => {
        expect(routeFor('ready', buildLocation({ id: 'location-1' })).name).toBe('SetupIncompleteScreen');
        expect(routeFor('ready').name).toBe('SurveyScreen');
    });

    it('resumes photos for a confirmed surveyor', () => {
        expect(routeFor('confirmed')).toEqual({
            name: 'CapturePhotoScreen',
            params: { surveyId: 'survey-1', surveyorId: 's-1', locationId: 'location-1', photoType: 'frontView' },
        });
    });

    it('starts from the details screen otherwise', () => {
        expect(routeFor('pending').name).toBe('ConfirmSurveyorDetailsScreen');
        expect(routeFor('ready', completeLocation, null).name).toBe('ConfirmSurveyorDetailsScreen');
    });
});
