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
            canAddLocation,
            onLocationUnavailable,
            onClose,
        }: {
            isLead: boolean;
            name: string;
            onChangeName: (text: string) => void;
            onEndEditingName: () => void;
            onAddLocation: () => void;
            canAddLocation: boolean;
            onLocationUnavailable: () => void;
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
                    <Text onPress={canAddLocation ? onAddLocation : onLocationUnavailable}>{`add-location-${suffix}`}</Text>
                    <Text onPress={onClose}>{`close-${suffix}`}</Text>
                </>
            );
        },
    };
});

jest.mock('@components/BottomSheets/AddLocationBottomSheet', () => {
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
import {
    createContextSubscription,
    createMockService,
    mockSubscribeContext,
    renderWithActiveSurvey,
} from '../../helpers/testUtils';
import {
    mockNavigate,
    mockPopTo,
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

const readyBoundary = () => jest.fn().mockResolvedValue({ status: 'ready', url: 'file://boundary.png' });

describe('AddSurveyorScreen', () => {
    it('creates a lead surveyor when the survey has none', async () => {
        const lead = buildSurveyor({ id: 'lead-1', isLead: true, name: '' });
        const sub = createContextSubscription(
            buildContext({ surveyors: [], locations: [] }),
        );
        const service = createMockService({
            subscribeSurveyContext: sub.subscribe,
            addSurveyor: jest.fn().mockResolvedValue(lead),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() =>
            expect(service.addSurveyor).toHaveBeenCalledWith('survey-1', {
                name: '',
                isLead: true,
            }),
        );
        // The created lead arrives via the subscription re-emitting.
        sub.emit(buildContext({ surveyors: [lead] }));
        expect(screen.getByText('save-lead')).toBeOnTheScreen();
    });

    it('creates the lead only once even as the context re-emits', async () => {
        const sub = createContextSubscription(
            buildContext({ surveyors: [], locations: [] }),
        );
        const service = createMockService({
            subscribeSurveyContext: sub.subscribe,
            addSurveyor: jest.fn().mockResolvedValue(
                buildSurveyor({ id: 'lead-1', isLead: true, name: '' }),
            ),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() => expect(service.addSurveyor).toHaveBeenCalledTimes(1));
        // A stale re-emit still reporting zero surveyors must not create another.
        sub.emit(buildContext({ surveyors: [], locations: [] }));
        expect(service.addSurveyor).toHaveBeenCalledTimes(1);
    });

    it('renders existing surveyors without creating a lead', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(leadOnlyContext()),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-lead')).toBeOnTheScreen());
        expect(service.addSurveyor).not.toHaveBeenCalled();
    });

    it('logs an error when creating the lead surveyor fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({ surveyors: [], locations: [] }),
            ),
            addSurveyor: jest.fn().mockRejectedValue(new Error('create failed')),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'Failed to create lead surveyor',
                expect.any(Error),
            ),
        );
        errorSpy.mockRestore();
    });

    it('loads a ready boundary image without error', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(leadOnlyContext()),
            getBoundaryImage: jest.fn().mockResolvedValue({ status: 'ready', url: 'file://boundary.png' }),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() => expect(service.getBoundaryImage).toHaveBeenCalledWith('survey-1'));
        expect(errorSpy).not.toHaveBeenCalledWith(
            'Failed to fetch boundary image',
            expect.any(Error),
        );
        errorSpy.mockRestore();
    });

    it('logs an error when the boundary image fails to load', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(leadOnlyContext()),
            getBoundaryImage: jest.fn().mockRejectedValue(new Error('no image')),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'Failed to fetch boundary image',
                expect.any(Error),
            ),
        );
        errorSpy.mockRestore();
    });

    it('adds another surveyor, shown once the context re-emits', async () => {
        const lead = buildSurveyor({ id: 'lead-1', isLead: true, name: 'Alice' });
        const s2 = buildSurveyor({ id: 's2', isLead: false, name: '' });
        const sub = createContextSubscription(buildContext({ surveyors: [lead] }));
        const service = createMockService({
            subscribeSurveyContext: sub.subscribe,
            addSurveyor: jest.fn().mockResolvedValue(s2),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-lead')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Add More Surveyors'));
        await waitFor(() =>
            expect(service.addSurveyor).toHaveBeenCalledWith('survey-1', {
                name: '',
                isLead: false,
            }),
        );
        sub.emit(buildContext({ surveyors: [lead, s2] }));
        expect(screen.getByText('save-blank')).toBeOnTheScreen();
    });

    it('removes a surveyor that has no location', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({
                    surveyors: [
                        buildSurveyor({ id: 'lead-1', isLead: true, name: 'Alice' }),
                        buildSurveyor({ id: 's2', isLead: false, name: 'Bob', locationId: null }),
                    ],
                    locations: [],
                }),
            ),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-Bob')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('close-Bob'));
        await waitFor(() => expect(service.removeSurveyor).toHaveBeenCalledWith('s2'));
        expect(service.removeLocation).not.toHaveBeenCalled();
    });

    it('removes a surveyor and their location', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({
                    surveyors: [
                        buildSurveyor({ id: 'lead-1', isLead: true, name: 'Alice' }),
                        buildSurveyor({ id: 's2', isLead: false, name: 'Bob', locationId: 'loc-1' }),
                    ],
                    locations: [buildLocation({ id: 'loc-1' })],
                }),
            ),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-Bob')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('close-Bob'));
        await waitFor(() =>
            expect(service.removeLocation).toHaveBeenCalledWith('loc-1'),
        );
    });

    it('logs an error when removing the location fails', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(
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
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-Bob')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('close-Bob'));
        await waitFor(() =>
            expect(logSpy).toHaveBeenCalledWith(
                'Error removing surveyor location',
                expect.any(Error),
            ),
        );
        logSpy.mockRestore();
    });

    it('does not save a name when editing ends, only on continue (trimmed)', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(leadOnlyContext()),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-lead')).toBeOnTheScreen());
        fireEvent.changeText(screen.getByTestId('name-lead'), '  Alicia  ');
        fireEvent.press(screen.getByText('save-lead'));
        expect(service.updateSurveyor).not.toHaveBeenCalled();

        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() =>
            expect(service.updateSurveyor).toHaveBeenCalledWith('lead-1', {
                name: 'Alicia',
            }),
        );
    });

    it('adds a new location for a surveyor without one', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(leadOnlyContext()),
            getBoundaryImage: readyBoundary(),
            addLocation: jest.fn().mockResolvedValue(buildLocation({ id: 'loc-new' })),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() =>
            expect(screen.getByText('add-location-lead')).toBeOnTheScreen(),
        );
        await waitFor(() => expect(service.getBoundaryImage).toHaveBeenCalled());
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
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({
                    surveyors: [
                        buildSurveyor({ id: 'lead-1', isLead: true, name: 'Alice', locationId: 'loc-1' }),
                    ],
                    locations: [buildLocation({ id: 'loc-1' })],
                }),
            ),
            updateLocation: jest.fn().mockResolvedValue(buildLocation({ id: 'loc-1' })),
            getBoundaryImage: readyBoundary(),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() =>
            expect(screen.getByText('add-location-lead')).toBeOnTheScreen(),
        );
        await waitFor(() => expect(service.getBoundaryImage).toHaveBeenCalled());
        fireEvent.press(screen.getByText('add-location-lead'));
        fireEvent.press(screen.getByText('submit-location'));
        await waitFor(() =>
            expect(service.updateLocation).toHaveBeenCalledWith('loc-1', {
                boundaryPosition: { x: 1, y: 2 },
            }),
        );
    });

    it('explains that a red line boundary is needed when there is none', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(leadOnlyContext()),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() => expect(service.getBoundaryImage).toHaveBeenCalled());

        fireEvent.press(screen.getByText('add-location-lead'));
        expect(screen.getByText('Red line boundary needed')).toBeOnTheScreen();
        expect(screen.getByText('Upload a red line boundary to add surveyor locations.')).toBeOnTheScreen();

        fireEvent.press(screen.getByText('OK'));
        await waitFor(() => expect(screen.queryByText('Red line boundary needed')).toBeNull());
        expect(service.addLocation).not.toHaveBeenCalled();
    });

    it('ignores a location submission when no surveyor is active', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(leadOnlyContext()),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() =>
            expect(screen.getByText('submit-location')).toBeOnTheScreen(),
        );
        fireEvent.press(screen.getByText('submit-location'));
        await waitFor(() => expect(service.addLocation).not.toHaveBeenCalled());
        expect(service.updateLocation).not.toHaveBeenCalled();
    });

    it('saves surveyors and continues to review, dropping blank entries', async () => {
        const lead = buildSurveyor({ id: 'lead-1', isLead: true, name: 'Alice' });
        const s2 = buildSurveyor({ id: 's2', isLead: false, name: '' });
        const s3 = buildSurveyor({ id: 's3', isLead: false, name: '' });
        const sub = createContextSubscription(buildContext({ surveyors: [lead] }));
        const service = createMockService({
            subscribeSurveyContext: sub.subscribe,
            addSurveyor: jest
                .fn()
                .mockResolvedValueOnce(s2)
                .mockResolvedValueOnce(s3),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-lead')).toBeOnTheScreen());

        fireEvent.press(screen.getByText('Add More Surveyors'));
        sub.emit(buildContext({ surveyors: [lead, s2] }));
        await waitFor(() => expect(screen.getByTestId('name-blank')).toBeTruthy());
        // Type into the second surveyor's buffer so it is no longer blank.
        fireEvent.changeText(screen.getByTestId('name-blank'), 'Bob');
        fireEvent.press(screen.getByText('Add More Surveyors'));
        sub.emit(buildContext({ surveyors: [lead, s2, s3] }));
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
            subscribeSurveyContext: mockSubscribeContext(leadOnlyContext()),
            updateSurveyor: jest.fn().mockRejectedValue(new Error('save failed')),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-lead')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() =>
            expect(logSpy).toHaveBeenCalledWith(
                'Error saving surveyors',
                expect.any(Error),
            ),
        );
        expect(mockNavigate).not.toHaveBeenCalled();
        logSpy.mockRestore();
    });

    it('skips straight to review without saving name drafts', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(leadOnlyContext()),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-lead')).toBeOnTheScreen());
        fireEvent.changeText(screen.getByTestId('name-lead'), 'Alicia');
        fireEvent.press(screen.getByText('Skip'));
        expect(mockNavigate).toHaveBeenCalledWith('ReviewSurveyDetailsScreen', {
            surveyId: 'survey-1',
        });
        expect(service.updateSurveyor).not.toHaveBeenCalled();
        expect(service.removeSurveyor).not.toHaveBeenCalled();
    });

    it('updates and adds locations across multiple surveyors', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(
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
            getBoundaryImage: readyBoundary(),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('add-location-Bob')).toBeOnTheScreen());
        await waitFor(() => expect(service.getBoundaryImage).toHaveBeenCalled());

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
            subscribeSurveyContext: mockSubscribeContext(
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
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
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
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({
                    surveyors: [buildSurveyor({ id: 'lead-1', isLead: true, name: null })],
                    locations: [],
                }),
            ),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-lead')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Continue'));
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('in edit mode saves names and returns to survey status', async () => {
        setRouteParams({ surveyId: 'survey-1', editing: true });
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(leadOnlyContext()),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-lead')).toBeOnTheScreen());
        expect(screen.getByText('Edit Surveyors')).toBeOnTheScreen();

        fireEvent.changeText(screen.getByTestId('name-lead'), 'Alicia');
        fireEvent.press(screen.getByText('Save'));

        await waitFor(() =>
            expect(mockPopTo).toHaveBeenCalledWith('SurveyStatusScreen', { surveyId: 'survey-1' }),
        );
        expect(service.updateSurveyor).toHaveBeenCalledWith('lead-1', { name: 'Alicia' });
    });

    it('in edit mode cancels back to survey status without saving names', async () => {
        setRouteParams({ surveyId: 'survey-1', editing: true });
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(leadOnlyContext()),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-lead')).toBeOnTheScreen());

        fireEvent.changeText(screen.getByTestId('name-lead'), 'Alicia');
        fireEvent.press(screen.getByText('Cancel'));

        expect(mockPopTo).toHaveBeenCalledWith('SurveyStatusScreen', { surveyId: 'survey-1' });
        expect(service.updateSurveyor).not.toHaveBeenCalled();
    });

    it('disables continue when there is no lead surveyor', async () => {
        const service = createMockService({
            subscribeSurveyContext: mockSubscribeContext(
                buildContext({
                    surveyors: [buildSurveyor({ id: 's-bob', isLead: false, name: 'Bob' })],
                    locations: [],
                }),
            ),
        });
        renderWithActiveSurvey(<AddSurveyorScreen />, service);
        await waitFor(() => expect(screen.getByText('save-Bob')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Continue'));
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
