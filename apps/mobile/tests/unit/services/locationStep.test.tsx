import { goToLocationStep } from '@services/locationStep';
import { buildContext, buildLocation, buildSurveyor } from '../../helpers/factories';
import { createMockService } from '../../helpers/testUtils';

const navigation = { navigate: jest.fn() };

beforeEach(() => navigation.navigate.mockReset());

const run = (service: ReturnType<typeof createMockService>) =>
    goToLocationStep(service, navigation as never, 'survey-1', 'surveyor-1');

describe('goToLocationStep', () => {
    it('goes to confirm location when the surveyor has one', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({ surveyors: [buildSurveyor({ id: 'surveyor-1', locationId: 'location-1' })] }),
            ),
        });
        await run(service);
        expect(navigation.navigate).toHaveBeenCalledWith('SurveyorConfirmLocationScreen', {
            surveyId: 'survey-1',
            surveyorId: 'surveyor-1',
        });
        expect(service.addLocation).not.toHaveBeenCalled();
    });

    it('creates a placeholder location, confirms a pending surveyor and goes to photos', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({ surveyors: [buildSurveyor({ id: 'surveyor-1', locationId: null, status: 'pending' })] }),
            ),
            addLocation: jest.fn().mockResolvedValue(buildLocation({ id: 'placeholder' })),
        });
        await run(service);
        expect(service.addLocation).toHaveBeenCalledWith('survey-1', {});
        expect(service.updateSurveyor).toHaveBeenCalledWith('surveyor-1', {
            locationId: 'placeholder',
            status: 'confirmed',
        });
        expect(navigation.navigate).toHaveBeenCalledWith('CapturePhotoScreen', {
            surveyId: 'survey-1',
            locationId: 'placeholder',
            surveyorId: 'surveyor-1',
            photoType: 'frontView',
        });
    });

    it('leaves a non-pending status unchanged', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({ surveyors: [buildSurveyor({ id: 'surveyor-1', locationId: null, status: 'ready' })] }),
            ),
            addLocation: jest.fn().mockResolvedValue(buildLocation({ id: 'placeholder' })),
        });
        await run(service);
        expect(service.updateSurveyor).toHaveBeenCalledWith('surveyor-1', { locationId: 'placeholder' });
    });
});
