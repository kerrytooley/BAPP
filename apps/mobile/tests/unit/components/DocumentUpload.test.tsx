import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Image, TouchableOpacity } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { getAspectRatio } from '@utils/image';
import { DocumentUpload } from '@components/Interactive/DocumentUpload';

const mockShowActionSheet = jest.fn();

jest.mock('@expo/react-native-action-sheet', () => ({
    useActionSheet: () => ({ showActionSheetWithOptions: mockShowActionSheet }),
}));

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-image-picker', () => ({
    requestMediaLibraryPermissionsAsync: jest.fn(),
    launchImageLibraryAsync: jest.fn(),
    UIImagePickerPreferredAssetRepresentationMode: { Compatible: 'compatible' },
}));
jest.mock('@utils/image', () => ({
    getAspectRatio: jest.fn(() => Promise.resolve(1.5)),
}));

const getDocumentAsync = DocumentPicker.getDocumentAsync as jest.Mock;
const requestPerms = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const launchLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;

const triggerSheet = (index: number) => {
    const callback = mockShowActionSheet.mock.calls[0][1];
    callback(index);
};

beforeEach(() => jest.clearAllMocks());

describe('DocumentUpload', () => {
    it('renders the upload placeholder when there is no value', () => {
        render(<DocumentUpload onChange={jest.fn()} />);
        expect(screen.getByText('Tap to upload')).toBeOnTheScreen();
    });

    it('renders a preview and re-choose hint when a value is set', () => {
        render(<DocumentUpload onChange={jest.fn()} value="file://img.png" />);
        expect(screen.getByText('Tap to choose again')).toBeOnTheScreen();
        expect(screen.UNSAFE_getByType(Image).props.source).toEqual({
            uri: 'file://img.png',
        });
    });

    it('opens the action sheet with the expected options when pressed', () => {
        render(<DocumentUpload onChange={jest.fn()} />);
        fireEvent.press(screen.UNSAFE_getByType(TouchableOpacity));
        expect(mockShowActionSheet).toHaveBeenCalledWith(
            { options: ['Photo Library', 'Files', 'Cancel'], cancelButtonIndex: 2 },
            expect.any(Function),
        );
    });

    it('picks an image from the library and emits its uri', async () => {
        requestPerms.mockResolvedValue({ granted: true });
        launchLibrary.mockResolvedValue({
            canceled: false,
            assets: [{ uri: 'file://picked.png' }],
        });
        const onChange = jest.fn();
        render(<DocumentUpload onChange={onChange} />);
        fireEvent.press(screen.UNSAFE_getByType(TouchableOpacity));
        triggerSheet(0);
        await waitFor(() =>
            expect(onChange).toHaveBeenCalledWith('file://picked.png'),
        );
        // HEIC from the iOS library would never become displayable.
        expect(launchLibrary).toHaveBeenCalledWith(
            expect.objectContaining({ preferredAssetRepresentationMode: 'compatible' }),
        );
    });

    it('does nothing when media library permission is denied', async () => {
        requestPerms.mockResolvedValue({ granted: false });
        const onChange = jest.fn();
        render(<DocumentUpload onChange={onChange} />);
        fireEvent.press(screen.UNSAFE_getByType(TouchableOpacity));
        triggerSheet(0);
        await waitFor(() => expect(requestPerms).toHaveBeenCalled());
        expect(launchLibrary).not.toHaveBeenCalled();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('does not emit when image selection is cancelled', async () => {
        requestPerms.mockResolvedValue({ granted: true });
        launchLibrary.mockResolvedValue({ canceled: true });
        const onChange = jest.fn();
        render(<DocumentUpload onChange={onChange} />);
        fireEvent.press(screen.UNSAFE_getByType(TouchableOpacity));
        triggerSheet(0);
        await waitFor(() => expect(launchLibrary).toHaveBeenCalled());
        expect(onChange).not.toHaveBeenCalled();
    });

    it('picks a document from files and emits its uri', async () => {
        getDocumentAsync.mockResolvedValue({
            canceled: false,
            assets: [{ uri: 'file://doc.pdf' }],
        });
        const onChange = jest.fn();
        render(<DocumentUpload onChange={onChange} />);
        fireEvent.press(screen.UNSAFE_getByType(TouchableOpacity));
        triggerSheet(1);
        await waitFor(() => expect(onChange).toHaveBeenCalledWith('file://doc.pdf'));
    });

    it('does not emit when document selection is cancelled', async () => {
        getDocumentAsync.mockResolvedValue({ canceled: true });
        const onChange = jest.fn();
        render(<DocumentUpload onChange={onChange} />);
        fireEvent.press(screen.UNSAFE_getByType(TouchableOpacity));
        triggerSheet(1);
        await waitFor(() => expect(getDocumentAsync).toHaveBeenCalled());
        expect(onChange).not.toHaveBeenCalled();
    });

    it('does nothing when the sheet is cancelled', () => {
        const onChange = jest.fn();
        render(<DocumentUpload onChange={onChange} />);
        fireEvent.press(screen.UNSAFE_getByType(TouchableOpacity));
        triggerSheet(2);
        expect(requestPerms).not.toHaveBeenCalled();
        expect(getDocumentAsync).not.toHaveBeenCalled();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('logs an error when the preview aspect ratio cannot be read', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        (getAspectRatio as jest.Mock).mockRejectedValueOnce(new Error('no size'));
        render(<DocumentUpload onChange={jest.fn()} value="file://img.png" />);
        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'Error getting preview aspect ratio',
                expect.any(Error),
            ),
        );
        errorSpy.mockRestore();
    });

    it('ignores a late aspect ratio result after unmount', async () => {
        let resolveRatio: (ratio: number) => void = () => { };
        (getAspectRatio as jest.Mock).mockImplementationOnce(
            () => new Promise<number>((resolve) => { resolveRatio = resolve; }),
        );
        const { unmount } = render(<DocumentUpload onChange={jest.fn()} value="file://img.png" />);
        unmount();
        resolveRatio(2);
        await Promise.resolve();
    });
});
