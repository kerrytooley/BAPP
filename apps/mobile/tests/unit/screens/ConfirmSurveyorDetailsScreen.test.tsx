jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ConfirmSurveyorDetailsScreen } from '@screens/Surveyor/ConfirmSurveyorDetailsScreen';
import { DocumentPreview } from '@components/Display/DocumentPreview';
import { buildContext, buildLocation, buildSurvey, buildSurveyor } from '../../helpers/factories';
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

jest.mock('@components/Display/DocumentPreview', () => ({
    DocumentPreview: jest.fn(() => null),
}));

beforeEach(() => {
    resetNavigationMock();
    setRouteParams({ surveyId: 'survey-1', surveyorId: 'surveyor-1' });
});

const context = (isLead: boolean, name = 'Ada') =>
    buildContext({
        survey: buildSurvey({ name: 'Dusk count', postcode: 'SW1A 1AA' }),
        surveyors: [buildSurveyor({ id: 'surveyor-1', isLead, name })],
    });

const positionedLocations = [
    buildLocation({ id: 'location-1', boundaryPosition: { x: 0.1, y: 0.2 } }),
    buildLocation({ id: 'location-2', boundaryPosition: { x: 0.3, y: 0.4 } }),
];

describe('ConfirmSurveyorDetailsScreen', () => {
    it('shows the lead surveyor summary and continues to weather conditions', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(context(true)),
            getBoundaryImage: jest.fn().mockResolvedValue({
                status: 'ready',
                url: 'https://img/boundary.jpg',
            }),
        });
        renderWithActiveSurvey(<ConfirmSurveyorDetailsScreen />, service);
        await waitFor(() =>
            expect(screen.getByText('Lead Surveyor')).toBeOnTheScreen(),
        );
        expect(screen.getByText('Dusk count')).toBeOnTheScreen();
        fireEvent.press(screen.getByText('Continue'));
        expect(mockNavigate).toHaveBeenCalledWith('WeatherConditionsScreen', {
            surveyId: 'survey-1',
            surveyorId: 'surveyor-1',
            locationId: '',
            type: 'start',
        });
    });

    it('passes all positioned locations to a lead surveyor', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({
                    surveyors: [buildSurveyor({ id: 'surveyor-1', isLead: true })],
                    locations: positionedLocations,
                }),
            ),
        });
        renderWithActiveSurvey(<ConfirmSurveyorDetailsScreen />, service);

        await waitFor(() =>
            expect(DocumentPreview).toHaveBeenLastCalledWith(
                expect.objectContaining({ values: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }] }),
                undefined,
            ),
        );
    });

    it('passes only the assigned positioned location to a non-lead surveyor', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({
                    surveyors: [buildSurveyor({ id: 'surveyor-1', isLead: false, locationId: 'location-2' })],
                    locations: positionedLocations,
                }),
            ),
        });
        renderWithActiveSurvey(<ConfirmSurveyorDetailsScreen />, service);

        await waitFor(() =>
            expect(DocumentPreview).toHaveBeenLastCalledWith(
                expect.objectContaining({ values: [{ x: 0.3, y: 0.4 }] }),
                undefined,
            ),
        );
    });

    it('continues a non-lead surveyor with a location to confirm it', async () => {
        const located = buildContext({
            surveyors: [buildSurveyor({ id: 'surveyor-1', isLead: false, name: 'Bob', locationId: 'location-1' })],
        });
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(located),
            getSurveyContext: jest.fn().mockResolvedValue(located),
            getBoundaryImage: jest.fn().mockResolvedValue({ status: 'none' }),
        });
        renderWithActiveSurvey(<ConfirmSurveyorDetailsScreen />, service);
        await waitFor(() => expect(screen.getByText('Bob')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('SurveyorConfirmLocationScreen', {
                surveyId: 'survey-1',
                surveyorId: 'surveyor-1',
            }),
        );
    });

    it('skips confirm location for a non-lead surveyor without a location', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(context(false, 'Bob')),
            getSurveyContext: jest.fn().mockResolvedValue(context(false, 'Bob')),
            addLocation: jest.fn().mockResolvedValue(buildLocation({ id: 'placeholder' })),
        });
        renderWithActiveSurvey(<ConfirmSurveyorDetailsScreen />, service);
        await waitFor(() => expect(screen.getByText('Bob')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('CapturePhotoScreen', {
                surveyId: 'survey-1',
                locationId: 'placeholder',
                surveyorId: 'surveyor-1',
                photoType: 'frontView',
            }),
        );
        expect(mockNavigate).not.toHaveBeenCalledWith('SurveyorConfirmLocationScreen', expect.anything());
    });

    it('logs an error when the location step fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(context(false, 'Bob')),
            getSurveyContext: jest.fn().mockRejectedValue(new Error('offline')),
        });
        renderWithActiveSurvey(<ConfirmSurveyorDetailsScreen />, service);
        await waitFor(() => expect(screen.getByText('Bob')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith('Unable to continue to the location step', expect.any(Error)),
        );
        expect(mockNavigate).not.toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    it('tells the surveyor when the admin added no red line boundary', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(context(false, 'Bob')),
        });
        renderWithActiveSurvey(<ConfirmSurveyorDetailsScreen />, service);
        await waitFor(() =>
            expect(DocumentPreview).toHaveBeenLastCalledWith(
                expect.objectContaining({ imageUri: null, emptyMessage: 'No red line boundary added by admin' }),
                undefined,
            ),
        );
    });

    it('returns to the code entry when the details do not look right', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(context(true)),
            getBoundaryImage: jest.fn().mockResolvedValue({ status: 'none' }),
        });
        renderWithActiveSurvey(<ConfirmSurveyorDetailsScreen />, service);
        await waitFor(() =>
            expect(screen.getByText('Lead Surveyor')).toBeOnTheScreen(),
        );
        fireEvent.press(screen.getByText("Doesn't look right?"));
        expect(mockNavigate).toHaveBeenCalledWith('InputCodeScreen');
    });

    it('logs an error when the boundary image fails to load', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(context(true)),
            getBoundaryImage: jest.fn().mockRejectedValue(new Error('img failed')),
        });
        renderWithActiveSurvey(<ConfirmSurveyorDetailsScreen />, service);
        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'Error: unable to fetch boundary image',
                expect.any(Error),
            ),
        );
        errorSpy.mockRestore();
    });
});
