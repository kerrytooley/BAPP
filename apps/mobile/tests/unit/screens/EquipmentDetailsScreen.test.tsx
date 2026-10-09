jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { EquipmentDetailsScreen } from '@screens/Surveyor/EquipmentDetailsScreen';
import { createMockService, renderWithService } from '../../helpers/testUtils';
import {
    mockNavigate,
    resetNavigationMock,
    setRouteParams,
} from '../../helpers/reactNavigationMock';

const params = { surveyId: 'survey-1', surveyorId: 'surveyor-1', locationId: 'location-1' };

beforeEach(() => {
    resetNavigationMock();
    setRouteParams(params);
});

describe('EquipmentDetailsScreen', () => {
    it('disables continue until a field has text', () => {
        renderWithService(<EquipmentDetailsScreen />, createMockService());
        expect(screen.getByLabelText('Continue')).toBeDisabled();

        fireEvent.changeText(screen.getByPlaceholderText('Input audio equipment label'), '   ');
        expect(screen.getByLabelText('Continue')).toBeDisabled();

        fireEvent.changeText(screen.getByPlaceholderText('Input audio equipment label'), 'A1');
        expect(screen.getByLabelText('Continue')).toBeEnabled();
    });

    it('saves trimmed equipment details and continues', async () => {
        const service = createMockService();
        renderWithService(<EquipmentDetailsScreen />, service);

        fireEvent.changeText(screen.getByPlaceholderText('Input audio equipment label'), ' A1 ');
        fireEvent.changeText(screen.getByPlaceholderText('Input video equipment label'), 'V2');
        fireEvent.press(screen.getByText('Continue'));

        await waitFor(() =>
            expect(service.updateLocation).toHaveBeenCalledWith('location-1', {
                equipmentInformation: { audioLabel: 'A1', videoLabel: 'V2', otherInfo: '' },
            }),
        );
        expect(mockNavigate).toHaveBeenCalledWith('SetupCompleteScreen', params);
    });

    it('skips without saving anything', () => {
        const service = createMockService();
        renderWithService(<EquipmentDetailsScreen />, service);

        fireEvent.changeText(screen.getByPlaceholderText('Input audio equipment label'), 'A1');
        fireEvent.press(screen.getByText('Skip'));

        expect(service.updateLocation).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('SetupCompleteScreen', params);
    });

    it('logs an error and does not navigate when saving fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = createMockService({
            updateLocation: jest.fn().mockRejectedValue(new Error('save failed')),
        });
        renderWithService(<EquipmentDetailsScreen />, service);

        fireEvent.changeText(screen.getByPlaceholderText('Input audio equipment label'), 'A1');
        fireEvent.press(screen.getByText('Continue'));

        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith('Failed to save equipment information', expect.any(Error)),
        );
        expect(mockNavigate).not.toHaveBeenCalled();
        errorSpy.mockRestore();
    });
});
