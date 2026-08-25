import { render, screen, fireEvent } from '@testing-library/react-native';
import { Image, Modal, TouchableOpacity } from 'react-native';
import { DocumentPreview } from '@components/DocumentPreview';
import { PressableType } from '../../helpers/rnComponents';

describe('DocumentPreview', () => {
    it('renders nothing when value is null', () => {
        render(<DocumentPreview imageUri={null} />);
        expect(screen.UNSAFE_queryByType(Image)).toBeNull();
    });

    it('renders nothing when value is undefined', () => {
        render(<DocumentPreview imageUri={undefined} />);
        expect(screen.UNSAFE_queryByType(Image)).toBeNull();
    });

    it('renders the preview image when a value is provided', () => {
        render(<DocumentPreview imageUri="file://boundary.png" />);
        expect(screen.UNSAFE_getAllByType(Image)[0].props.source).toEqual({
            uri: 'file://boundary.png',
        });
    });

    it('is not full screen initially', () => {
        render(<DocumentPreview imageUri="file://boundary.png" />);
        expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);
    });

    it('opens the full screen modal when the preview is pressed', () => {
        render(<DocumentPreview imageUri="file://boundary.png" />);
        fireEvent.press(screen.UNSAFE_getByType(TouchableOpacity));
        expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(true);
    });

    it('closes the modal when the backdrop is pressed', () => {
        render(<DocumentPreview imageUri="file://boundary.png" />);
        fireEvent.press(screen.UNSAFE_getByType(TouchableOpacity));
        fireEvent.press(screen.UNSAFE_getByType(PressableType));
        expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);
    });

    it('closes the modal on request close', () => {
        render(<DocumentPreview imageUri="file://boundary.png" />);
        fireEvent.press(screen.UNSAFE_getByType(TouchableOpacity));
        fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');
        expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);
    });
});
