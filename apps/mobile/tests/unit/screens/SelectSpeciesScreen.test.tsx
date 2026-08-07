jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { SelectSpeciesPage } from '@screens/Surveyor/SelectSpeciesScreen';
import { createMockService, renderWithService } from '../../helpers/testUtils';
import { resetNavigationMock, setRouteParams } from '../../helpers/reactNavigationMock';

const addObservation = jest.fn().mockResolvedValue({});

const serviceWithObservations = () => {
    const service = createMockService();
    (service as unknown as { addObservation: jest.Mock }).addObservation =
        addObservation;
    return service;
};

beforeEach(() => {
    resetNavigationMock();
    addObservation.mockClear();
    setRouteParams({
        surveyId: 'survey-1',
        locationId: 'location-1',
        surveyorId: 'surveyor-1',
    });
});

describe('SelectSpeciesScreen', () => {
    it('records an observation for the tapped species', async () => {
        renderWithService(<SelectSpeciesPage />, serviceWithObservations());
        fireEvent.press(screen.getByLabelText('Alcathoe'));
        await waitFor(() =>
            expect(addObservation).toHaveBeenCalledWith(
                expect.objectContaining({
                    surveyId: 'survey-1',
                    locationId: 'location-1',
                    surveyorId: 'surveyor-1',
                    species: 'alcathoe',
                }),
            ),
        );
    });

    it('records an unknown species', async () => {
        renderWithService(<SelectSpeciesPage />, serviceWithObservations());
        fireEvent.press(screen.getByText('Unknown'));
        await waitFor(() =>
            expect(addObservation).toHaveBeenCalledWith(
                expect.objectContaining({ species: 'Unknown' }),
            ),
        );
    });
});
