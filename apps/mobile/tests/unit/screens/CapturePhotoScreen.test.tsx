jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

jest.mock('@utils/image', () => ({
    getAspectRatio: jest.fn(() => Promise.resolve(1.5)),
    createImageBody: jest.fn(() =>
        Promise.resolve({ fileName: 'photo.jpg', bytes: new Uint8Array([1, 2, 3]) }),
    ),
}));

jest.mock('expo-image-picker', () => ({
    requestCameraPermissionsAsync: jest.fn(),
    launchCameraAsync: jest.fn(),
    requestMediaLibraryPermissionsAsync: jest.fn(),
    launchImageLibraryAsync: jest.fn(),
}));

import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { CapturePhotoScreen } from '@screens/Surveyor/CapturePhotoScreen';
import { createImageBody } from '@utils/image';
import { createMockService, renderWithService } from '../../helpers/testUtils';
import { buildContext, buildLocation, buildSurveyor } from '../../helpers/factories';
import {
    mockNavigate,
    mockPush,
    resetNavigationMock,
    setRouteParams,
} from '../../helpers/reactNavigationMock';

const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const mockCreateImageBody = createImageBody as jest.MockedFunction<
    typeof createImageBody
>;

const baseParams = {
    surveyId: 'survey-1',
    surveyorId: 'surveyor-1',
    locationId: 'location-1',
    photoType: 'frontView' as const,
};

beforeEach(() => {
    jest.clearAllMocks();
    resetNavigationMock();
    setRouteParams({ ...baseParams });
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });

    picker.requestCameraPermissionsAsync.mockResolvedValue({
        granted: true,
    } as ImagePicker.CameraPermissionResponse);
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        granted: true,
    } as ImagePicker.MediaLibraryPermissionResponse);
    picker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://camera.jpg' }],
    } as ImagePicker.ImagePickerResult);
    picker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://library.jpg' }],
    } as ImagePicker.ImagePickerResult);
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('CapturePhotoScreen', () => {
    it('renders the front-view prompt and only the take-photo action initially', () => {
        const service = createMockService();
        renderWithService(<CapturePhotoScreen />, service);

        expect(screen.getByText('Front View of Property')).toBeOnTheScreen();
        expect(screen.getByText('Take Photo')).toBeOnTheScreen();
        expect(screen.queryByText('Save photo and continue')).toBeNull();
    });

    it('renders the equipment prompt when the photo type is EQUIPMENT', () => {
        setRouteParams({ ...baseParams, photoType: 'equipment' });
        const service = createMockService();
        renderWithService(<CapturePhotoScreen />, service);

        expect(screen.getByText('Equipment Setup')).toBeOnTheScreen();
    });

    it('captures a photo then saves and pushes the equipment step for a front view', async () => {
        const service = createMockService();
        renderWithService(<CapturePhotoScreen />, service);

        fireEvent.press(screen.getByText('Take Photo'));

        await waitFor(() =>
            expect(screen.getByText('Save photo and continue')).toBeOnTheScreen(),
        );
        expect(screen.getByText('Retake photo')).toBeOnTheScreen();
        expect(screen.queryByText('Take Photo')).toBeNull();

        fireEvent.press(screen.getByText('Save photo and continue'));

        await waitFor(() =>
            expect(service.setLocationImage).toHaveBeenCalledWith(
                'location-1',
                'photo.jpg',
                expect.any(Uint8Array),
                'frontView',
            ),
        );
        expect(mockCreateImageBody).toHaveBeenCalledWith('file://camera.jpg');
        expect(mockPush).toHaveBeenCalledWith('CapturePhotoScreen', {
            surveyId: 'survey-1',
            locationId: 'location-1',
            surveyorId: 'surveyor-1',
            photoType: 'equipment',
        });
    });

    it('navigates to equipment details after saving the equipment photo', async () => {
        setRouteParams({ ...baseParams, photoType: 'equipment' });
        const service = createMockService();
        renderWithService(<CapturePhotoScreen />, service);

        fireEvent.press(screen.getByText('Take Photo'));
        await waitFor(() =>
            expect(screen.getByText('Save photo and continue')).toBeOnTheScreen(),
        );

        fireEvent.press(screen.getByText('Save photo and continue'));

        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('EquipmentDetailsScreen', {
                surveyId: 'survey-1',
                locationId: 'location-1',
                surveyorId: 'surveyor-1',
            }),
        );
    });

    it('skips the front-view photo to the equipment photo without saving', () => {
        const service = createMockService();
        renderWithService(<CapturePhotoScreen />, service);

        fireEvent.press(screen.getByText('Skip'));

        expect(mockPush).toHaveBeenCalledWith('CapturePhotoScreen', {
            surveyId: 'survey-1',
            locationId: 'location-1',
            surveyorId: 'surveyor-1',
            photoType: 'equipment',
        });
        expect(service.setLocationImage).not.toHaveBeenCalled();
    });

    it('skips to the next unfinished step when resuming setup', async () => {
        setRouteParams({ ...baseParams, mode: 'resume' });
        const service = createMockService({
            getSurveyContext: jest.fn().mockResolvedValue(buildContext({
                surveyors: [buildSurveyor({ id: 'surveyor-1', isLead: false, locationId: 'location-1' })],
                locations: [buildLocation({
                    id: 'location-1',
                    equipmentImage: { sourceRef: 'a', renderRef: 'a', status: 'ready', error: null },
                })],
            })),
        });
        renderWithService(<CapturePhotoScreen />, service);

        fireEvent.press(screen.getByText('Skip'));

        // The equipment photo is already done, so it goes straight to equipment details.
        await waitFor(() => expect(mockPush).toHaveBeenCalledWith('EquipmentDetailsScreen', {
            surveyId: 'survey-1', locationId: 'location-1', surveyorId: 'surveyor-1', mode: 'resume',
        }));
    });

    it('skips the equipment photo to equipment details without saving', () => {
        setRouteParams({ ...baseParams, photoType: 'equipment' });
        const service = createMockService();
        renderWithService(<CapturePhotoScreen />, service);

        fireEvent.press(screen.getByText('Skip'));

        expect(mockNavigate).toHaveBeenCalledWith('EquipmentDetailsScreen', {
            surveyId: 'survey-1',
            locationId: 'location-1',
            surveyorId: 'surveyor-1',
        });
        expect(service.setLocationImage).not.toHaveBeenCalled();
    });

    it('re-launches the camera when retaking a photo', async () => {
        const service = createMockService();
        renderWithService(<CapturePhotoScreen />, service);

        fireEvent.press(screen.getByText('Take Photo'));
        await waitFor(() =>
            expect(screen.getByText('Retake photo')).toBeOnTheScreen(),
        );
        expect(picker.launchCameraAsync).toHaveBeenCalledTimes(1);

        fireEvent.press(screen.getByText('Retake photo'));

        await waitFor(() =>
            expect(picker.launchCameraAsync).toHaveBeenCalledTimes(2),
        );
    });

    it('does nothing when the camera permission is denied', async () => {
        picker.requestCameraPermissionsAsync.mockResolvedValue({
            granted: false,
        } as ImagePicker.CameraPermissionResponse);
        const service = createMockService();
        renderWithService(<CapturePhotoScreen />, service);

        fireEvent.press(screen.getByText('Take Photo'));

        await waitFor(() =>
            expect(picker.requestCameraPermissionsAsync).toHaveBeenCalled(),
        );
        expect(picker.launchCameraAsync).not.toHaveBeenCalled();
        expect(screen.queryByText('Save photo and continue')).toBeNull();
    });

    it('keeps the take-photo action when the camera is cancelled', async () => {
        picker.launchCameraAsync.mockResolvedValue({
            canceled: true,
            assets: null,
        } as ImagePicker.ImagePickerResult);
        const service = createMockService();
        renderWithService(<CapturePhotoScreen />, service);

        fireEvent.press(screen.getByText('Take Photo'));

        await waitFor(() => expect(picker.launchCameraAsync).toHaveBeenCalled());
        expect(screen.getByText('Take Photo')).toBeOnTheScreen();
        expect(screen.queryByText('Save photo and continue')).toBeNull();
    });

    it('falls back to the photo library when the camera is unavailable', async () => {
        picker.launchCameraAsync.mockRejectedValue(
            new Error('Camera not available on simulator'),
        );
        const service = createMockService();
        renderWithService(<CapturePhotoScreen />, service);

        fireEvent.press(screen.getByText('Take Photo'));

        await waitFor(() =>
            expect(picker.launchImageLibraryAsync).toHaveBeenCalled(),
        );
        await waitFor(() =>
            expect(screen.getByText('Save photo and continue')).toBeOnTheScreen(),
        );
    });

    it('does nothing when the library permission is denied on fallback', async () => {
        picker.launchCameraAsync.mockRejectedValue(new Error('no camera'));
        picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
            granted: false,
        } as ImagePicker.MediaLibraryPermissionResponse);
        const service = createMockService();
        renderWithService(<CapturePhotoScreen />, service);

        fireEvent.press(screen.getByText('Take Photo'));

        await waitFor(() =>
            expect(picker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled(),
        );
        expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
        expect(screen.queryByText('Save photo and continue')).toBeNull();
    });

    it('keeps the take-photo action when the library fallback is cancelled', async () => {
        picker.launchCameraAsync.mockRejectedValue(new Error('no camera'));
        picker.launchImageLibraryAsync.mockResolvedValue({
            canceled: true,
            assets: null,
        } as ImagePicker.ImagePickerResult);
        const service = createMockService();
        renderWithService(<CapturePhotoScreen />, service);

        fireEvent.press(screen.getByText('Take Photo'));

        await waitFor(() =>
            expect(picker.launchImageLibraryAsync).toHaveBeenCalled(),
        );
        expect(screen.getByText('Take Photo')).toBeOnTheScreen();
        expect(screen.queryByText('Save photo and continue')).toBeNull();
    });

    it('logs an error and does not navigate when saving fails', async () => {
        const errorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => { });
        mockCreateImageBody.mockRejectedValueOnce(new Error('read failed'));
        const service = createMockService();
        renderWithService(<CapturePhotoScreen />, service);

        fireEvent.press(screen.getByText('Take Photo'));
        await waitFor(() =>
            expect(screen.getByText('Save photo and continue')).toBeOnTheScreen(),
        );

        fireEvent.press(screen.getByText('Save photo and continue'));

        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'saveImage failed:',
                expect.any(Error),
            ),
        );
        expect(service.setLocationImage).not.toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
