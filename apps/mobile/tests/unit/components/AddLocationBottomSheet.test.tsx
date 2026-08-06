import { render, screen, fireEvent } from '@testing-library/react-native';
import { Image, Pressable } from 'react-native';
import { AddLocationBottomSheet } from '@components/AddLocationBottomSheet';

jest.mock('@gorhom/bottom-sheet', () => {
    const React = require('react');
    const { View } = require('react-native');
    return {
        __esModule: true,
        BottomSheetModal: React.forwardRef((props: any, ref: any) => {
            React.useImperativeHandle(ref, () => ({ present: () => { }, dismiss: () => { } }));
            return React.createElement(
                View,
                {
                    testID: 'bottom-sheet',
                    onChange: props.onChange,
                    onDismiss: props.onDismiss,
                },
                props.backdropComponent?.({ style: {} }),
                props.children,
            );
        }),
        BottomSheetView: ({ children }: any) =>
            React.createElement(View, null, children),
        BottomSheetBackdrop: () => null,
    };
});

const measureAndTap = () => {
    const pressable = screen.UNSAFE_getByType(Pressable);
    fireEvent(pressable, 'layout', {
        nativeEvent: { layout: { width: 100, height: 100 } },
    });
    fireEvent(pressable, 'press', { nativeEvent: { locationX: 50, locationY: 50 } });
};

beforeEach(() => {
    jest
        .spyOn(Image, 'getSize')
        .mockImplementation((_uri, success) => success?.(200, 100));
});

afterEach(() => jest.restoreAllMocks());

describe('AddLocationBottomSheet', () => {
    it('shows the add title by default', () => {
        render(
            <AddLocationBottomSheet boundaryImageUri="file://b.png" onChange={jest.fn()} />,
        );
        expect(screen.getByText('Add Surveyor Location')).toBeOnTheScreen();
    });

    it('shows the edit title when editing', () => {
        render(
            <AddLocationBottomSheet
                boundaryImageUri="file://b.png"
                isEditing
                onChange={jest.fn()}
            />,
        );
        expect(screen.getByText('Edit Surveyor Location')).toBeOnTheScreen();
    });

    it('does not read image size when there is no boundary image', () => {
        render(<AddLocationBottomSheet boundaryImageUri={null} onChange={jest.fn()} />);
        expect(Image.getSize).not.toHaveBeenCalled();
        expect(screen.UNSAFE_queryByType(Pressable)).toBeNull();
    });

    it('keeps Save disabled until a pin is dropped', () => {
        const onChange = jest.fn();
        render(
            <AddLocationBottomSheet boundaryImageUri="file://b.png" onChange={onChange} />,
        );
        fireEvent.press(screen.getByText('Save Location'));
        expect(onChange).not.toHaveBeenCalled();
    });

    it('emits the dropped pin position when Save is pressed', () => {
        const onChange = jest.fn();
        render(
            <AddLocationBottomSheet boundaryImageUri="file://b.png" onChange={onChange} />,
        );
        measureAndTap();
        expect(screen.getByText('Tap again to move pin')).toBeOnTheScreen();
        fireEvent.press(screen.getByText('Save Location'));
        expect(onChange).toHaveBeenCalledWith({ x: 0.5, y: 0.5 });
    });

    it('restores the initial position when the sheet opens', () => {
        const onChange = jest.fn();
        render(
            <AddLocationBottomSheet
                boundaryImageUri="file://b.png"
                initialPosition={{ x: 0.2, y: 0.3 }}
                onChange={onChange}
            />,
        );
        fireEvent(screen.getByTestId('bottom-sheet'), 'change', 0);
        fireEvent.press(screen.getByText('Save Location'));
        expect(onChange).toHaveBeenCalledWith({ x: 0.2, y: 0.3 });
    });

    it('ignores a close index change', () => {
        const onChange = jest.fn();
        render(
            <AddLocationBottomSheet
                boundaryImageUri="file://b.png"
                initialPosition={{ x: 0.2, y: 0.3 }}
                onChange={onChange}
            />,
        );
        fireEvent(screen.getByTestId('bottom-sheet'), 'change', -1);
        fireEvent.press(screen.getByText('Save Location'));
        expect(onChange).not.toHaveBeenCalled();
    });

    it('clears the position on dismiss', () => {
        const onChange = jest.fn();
        render(
            <AddLocationBottomSheet
                boundaryImageUri="file://b.png"
                initialPosition={{ x: 0.2, y: 0.3 }}
                onChange={onChange}
            />,
        );
        fireEvent(screen.getByTestId('bottom-sheet'), 'change', 0);
        fireEvent(screen.getByTestId('bottom-sheet'), 'dismiss');
        fireEvent.press(screen.getByText('Save Location'));
        expect(onChange).not.toHaveBeenCalled();
    });
});
