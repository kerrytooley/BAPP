jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

jest.mock('@components/SurveyorCard', () => {
    const React = require('react');
    const { Text, TextInput } = require('react-native');
    return {
        SurveyorCard: ({
            isLead,
            name,
            onChangeName,
            onEndEditingName,
            onAddLocation,
            onClose,
        }: {
            isLead: boolean;
            name: string;
            onChangeName: (text: string) => void;
            onEndEditingName: () => void;
            onAddLocation: () => void;
            onClose: () => void;
        }) => {
            const suffix = isLead ? 'lead' : name || 'blank';
            return (
                <>
                    <TextInput
                        testID={`name-${suffix}`}
                        value={name}
                        onChangeText={onChangeName}
                    />
                    <Text onPress={onEndEditingName}>{`save-${suffix}`}</Text>
                    <Text onPress={onAddLocation}>{`add-location-${suffix}`}</Text>
                    <Text onPress={onClose}>{`close-${suffix}`}</Text>
                </>
            );
        },
    };
});

jest.mock('@components/AddLocationBottomSheet', () => {
    const React = require('react');
    const { Text } = require('react-native');
    return {
        AddLocationBottomSheet: React.forwardRef(
            (
                { onChange }: { onChange: (position: { x: number; y: number }) => void },
                _ref: unknown,
            ) => <Text onPress={() => onChange({ x: 1, y: 2 })}>submit-location</Text>,
        ),
    };
});

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AddSurveyorScreen } from '@screens/Admin/AddSurveyorScreen';
import {
    buildContext,
    buildLocation,
    buildSurveyor,
} from '../../helpers/factories';
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

const leadOnlyContext = () =>
    buildContext({
        surveyors: [buildSurveyor({ id: 'lead-1', isLead: true, name: 'Alice' })],
        locations: [],
    });

describe('AddSurveyorScreen', () => {
    it('creates a lead surveyor when the survey has none', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({ surveyors: [], locations: [] }),
            ),
            addSurveyor: jest.fn().mockResolvedValue(
                buildSurveyor({ id: 'lead-1', isLead: true, name: '' }),
            ),
        });
        renderWithService(<AddSurveyorScreen />, service);
        await waitFor(() =>
            expect(service.addSurveyor).toHaveBeenCalledWith('survey-1', {
                name: '',
                isLead: true,
            }),
        );
        expect(screen.getByText('save-lead')).toBeOnTheScreen();
    });

    it('renders existing surveyors without creating a lead', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(leadOnlyContext()),
        });
        renderWithService(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-lead')).toBeOnTheScreen());
        expect(service.addSurveyor).not.toHaveBeenCalled();
    });

    it('logs an error when loading surveyors fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            getSurveyContext: jest.fn().mockRejectedValue(new Error('load failed')),
        });
        renderWithService(<AddSurveyorScreen />, service);
        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'Failed to load surveyors',
                expect.any(Error),
            ),
        );
    });

    it('logs an error when the boundary image fails to load', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(leadOnlyContext()),
            getBoundaryImage: jest.fn().mockRejectedValue(new Error('no image')),
        });
        renderWithService(<AddSurveyorScreen />, service);
        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'Failed to fetch boundary image',
                expect.any(Error),
            ),
        );
    });

    it('adds another surveyor', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(leadOnlyContext()),
            addSurveyor: jest.fn().mockResolvedValue(
                buildSurveyor({ id: 's2', isLead: false, name: '' }),
            ),
        });
        renderWithService(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-lead')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Add More Surveyors'));
        await waitFor(() =>
            expect(service.addSurveyor).toHaveBeenCalledWith('survey-1', {
                name: '',
                isLead: false,
            }),
        );
        expect(screen.getByText('save-blank')).toBeOnTheScreen();
    });

    it('removes a surveyor that has no location', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({
                    surveyors: [
                        buildSurveyor({ id: 'lead-1', isLead: true, name: 'Alice' }),
                        buildSurveyor({ id: 's2', isLead: false, name: 'Bob', locationId: null }),
                    ],
                    locations: [],
                }),
            ),
        });
        renderWithService(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-Bob')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('close-Bob'));
        await waitFor(() => expect(service.removeSurveyor).toHaveBeenCalledWith('s2'));
        expect(service.removeLocation).not.toHaveBeenCalled();
    });

    it('removes a surveyor and their location', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({
                    surveyors: [
                        buildSurveyor({ id: 'lead-1', isLead: true, name: 'Alice' }),
                        buildSurveyor({ id: 's2', isLead: false, name: 'Bob', locationId: 'loc-1' }),
                    ],
                    locations: [buildLocation({ id: 'loc-1' })],
                }),
            ),
        });
        renderWithService(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-Bob')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('close-Bob'));
        await waitFor(() =>
            expect(service.removeLocation).toHaveBeenCalledWith('loc-1'),
        );
    });

    it('logs an error when removing the location fails', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({
                    surveyors: [
                        buildSurveyor({ id: 'lead-1', isLead: true, name: 'Alice' }),
                        buildSurveyor({ id: 's2', isLead: false, name: 'Bob', locationId: 'loc-1' }),
                    ],
                    locations: [buildLocation({ id: 'loc-1' })],
                }),
            ),
            removeLocation: jest.fn().mockRejectedValue(new Error('remove failed')),
        });
        renderWithService(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-Bob')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('close-Bob'));
        await waitFor(() =>
            expect(logSpy).toHaveBeenCalledWith(
                'Error removing surveyor location',
                expect.any(Error),
            ),
        );
    });

    it('saves a surveyor name on end editing', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(leadOnlyContext()),
        });
        renderWithService(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-lead')).toBeOnTheScreen());
        fireEvent.changeText(screen.getByTestId('name-lead'), 'Alicia');
        fireEvent.press(screen.getByText('save-lead'));
        await waitFor(() =>
            expect(service.updateSurveyor).toHaveBeenCalledWith('lead-1', {
                name: 'Alicia',
            }),
        );
    });

    it('logs an error when saving a name fails', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(leadOnlyContext()),
            updateSurveyor: jest.fn().mockRejectedValue(new Error('save failed')),
        });
        renderWithService(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-lead')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('save-lead'));
        await waitFor(() =>
            expect(logSpy).toHaveBeenCalledWith(
                'Error saving surveyor name',
                expect.any(Error),
            ),
        );
    });

    it('adds a new location for a surveyor without one', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(leadOnlyContext()),
            addLocation: jest.fn().mockResolvedValue(buildLocation({ id: 'loc-new' })),
        });
        renderWithService(<AddSurveyorScreen />, service);
        await waitFor(() =>
            expect(screen.getByText('add-location-lead')).toBeOnTheScreen(),
        );
        fireEvent.press(screen.getByText('add-location-lead'));
        fireEvent.press(screen.getByText('submit-location'));
        await waitFor(() =>
            expect(service.addLocation).toHaveBeenCalledWith('survey-1', {
                boundaryPosition: { x: 1, y: 2 },
            }),
        );
        expect(service.updateSurveyor).toHaveBeenCalledWith('lead-1', {
            locationId: 'loc-new',
        });
    });

    it('updates the existing location for a surveyor', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({
                    surveyors: [
                        buildSurveyor({ id: 'lead-1', isLead: true, name: 'Alice', locationId: 'loc-1' }),
                    ],
                    locations: [buildLocation({ id: 'loc-1' })],
                }),
            ),
            updateLocation: jest.fn().mockResolvedValue(buildLocation({ id: 'loc-1' })),
        });
        renderWithService(<AddSurveyorScreen />, service);
        await waitFor(() =>
            expect(screen.getByText('add-location-lead')).toBeOnTheScreen(),
        );
        fireEvent.press(screen.getByText('add-location-lead'));
        fireEvent.press(screen.getByText('submit-location'));
        await waitFor(() =>
            expect(service.updateLocation).toHaveBeenCalledWith('loc-1', {
                boundaryPosition: { x: 1, y: 2 },
            }),
        );
    });

    it('ignores a location submission when no surveyor is active', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(leadOnlyContext()),
        });
        renderWithService(<AddSurveyorScreen />, service);
        await waitFor(() =>
            expect(screen.getByText('submit-location')).toBeOnTheScreen(),
        );
        fireEvent.press(screen.getByText('submit-location'));
        await waitFor(() => expect(service.addLocation).not.toHaveBeenCalled());
        expect(service.updateLocation).not.toHaveBeenCalled();
    });

    it('saves surveyors and continues to review, dropping blank entries', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(leadOnlyContext()),
            addSurveyor: jest
                .fn()
                .mockResolvedValueOnce(buildSurveyor({ id: 's2', isLead: false, name: '' }))
                .mockResolvedValueOnce(buildSurveyor({ id: 's3', isLead: false, name: '' })),
        });
        renderWithService(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-lead')).toBeOnTheScreen());

        fireEvent.press(screen.getByText('Add More Surveyors'));
        await waitFor(() => expect(screen.getByTestId('name-blank')).toBeTruthy());
        fireEvent.changeText(screen.getByTestId('name-blank'), 'Bob');
        fireEvent.press(screen.getByText('Add More Surveyors'));
        await waitFor(() => expect(screen.getByText('save-blank')).toBeOnTheScreen());

        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() => expect(service.removeSurveyor).toHaveBeenCalledWith('s3'));
        expect(service.updateSurveyor).toHaveBeenCalledWith('s2', { name: 'Bob' });
        expect(service.updateSurveyor).toHaveBeenCalledWith('lead-1', { name: 'Alice' });
        expect(mockNavigate).toHaveBeenCalledWith('ReviewSurveyDetailsScreen', {
            surveyId: 'survey-1',
        });
    });

    it('logs an error when continuing to review fails', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(leadOnlyContext()),
            updateSurveyor: jest.fn().mockRejectedValue(new Error('save failed')),
        });
        renderWithService(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-lead')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() =>
            expect(logSpy).toHaveBeenCalledWith(
                'Error saving surveyors',
                expect.any(Error),
            ),
        );
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('skips straight to review', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(leadOnlyContext()),
        });
        renderWithService(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-lead')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Skip'));
        expect(mockNavigate).toHaveBeenCalledWith('ReviewSurveyDetailsScreen', {
            surveyId: 'survey-1',
        });
    });

    it('updates and adds locations across multiple surveyors', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({
                    surveyors: [
                        buildSurveyor({ id: 'lead-1', isLead: true, name: 'Alice' }),
                        buildSurveyor({ id: 's-bob', isLead: false, name: 'Bob', locationId: 'loc-1' }),
                        buildSurveyor({ id: 's-carol', isLead: false, name: 'Carol', locationId: null }),
                    ],
                    locations: [buildLocation({ id: 'loc-1' }), buildLocation({ id: 'loc-2' })],
                }),
            ),
            updateLocation: jest.fn().mockResolvedValue(buildLocation({ id: 'loc-1' })),
            addLocation: jest.fn().mockResolvedValue(buildLocation({ id: 'loc-new' })),
        });
        renderWithService(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('add-location-Bob')).toBeOnTheScreen());

        fireEvent.press(screen.getByText('add-location-Bob'));
        fireEvent.press(screen.getByText('submit-location'));
        await waitFor(() =>
            expect(service.updateLocation).toHaveBeenCalledWith('loc-1', {
                boundaryPosition: { x: 1, y: 2 },
            }),
        );

        fireEvent.press(screen.getByText('add-location-Carol'));
        fireEvent.press(screen.getByText('submit-location'));
        await waitFor(() =>
            expect(service.addLocation).toHaveBeenCalledWith('survey-1', {
                boundaryPosition: { x: 1, y: 2 },
            }),
        );
        expect(service.updateSurveyor).toHaveBeenCalledWith('s-carol', {
            locationId: 'loc-new',
        });
    });

    it('continues with nullable surveyor names and located blank entries', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({
                    surveyors: [
                        buildSurveyor({ id: 'lead-1', isLead: true, name: 'Alice' }),
                        buildSurveyor({ id: 's-null', isLead: false, name: null, locationId: 'loc-1' }),
                        buildSurveyor({ id: 's-bob', isLead: false, name: 'Bob', locationId: null }),
                        buildSurveyor({ id: 's-blank', isLead: false, name: '', locationId: null }),
                    ],
                    locations: [buildLocation({ id: 'loc-1' })],
                }),
            ),
        });
        renderWithService(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-Bob')).toBeOnTheScreen());

        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() =>
            expect(service.removeSurveyor).toHaveBeenCalledWith('s-blank'),
        );
        expect(service.updateSurveyor).toHaveBeenCalledWith('s-null', { name: '' });
        expect(service.updateSurveyor).toHaveBeenCalledWith('s-bob', { name: 'Bob' });
        expect(mockNavigate).toHaveBeenCalledWith('ReviewSurveyDetailsScreen', {
            surveyId: 'survey-1',
        });
    });

    it('disables continue when the lead has no name', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({
                    surveyors: [buildSurveyor({ id: 'lead-1', isLead: true, name: null })],
                    locations: [],
                }),
            ),
        });
        renderWithService(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-lead')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Continue'));
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('saves a null surveyor name as an empty string', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({
                    surveyors: [
                        buildSurveyor({ id: 'lead-1', isLead: true, name: 'Alice' }),
                        buildSurveyor({ id: 's-null', isLead: false, name: null }),
                    ],
                    locations: [],
                }),
            ),
        });
        renderWithService(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-blank')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('save-blank'));
        await waitFor(() =>
            expect(service.updateSurveyor).toHaveBeenCalledWith('s-null', { name: '' }),
        );
    });

    it('disables continue when there is no lead surveyor', async () => {
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({
                    surveyors: [buildSurveyor({ id: 's-bob', isLead: false, name: 'Bob' })],
                    locations: [],
                }),
            ),
        });
        renderWithService(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-Bob')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Continue'));
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
