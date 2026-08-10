import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Image } from 'react-native';
import { AddLocationBottomSheet } from '@components/AddLocationBottomSheet';
import { PressableType } from '../../helpers/rnComponents';

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
    const pressable = screen.UNSAFE_getByType(PressableType);
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

const flush = () => act(async () => { });

describe('AddLocationBottomSheet', () => {
    it('shows the add title by default', async () => {
        render(
            <AddLocationBottomSheet boundaryImageUri="file://b.png" onChange={jest.fn()} />,
        );
        expect(screen.getByText('Add Surveyor Location')).toBeOnTheScreen();
        await flush();
    });

    it('shows the edit title when editing', async () => {
        render(
            <AddLocationBottomSheet
                boundaryImageUri="file://b.png"
                isEditing
                onChange={jest.fn()}
            />,
        );
        expect(screen.getByText('Edit Surveyor Location')).toBeOnTheScreen();
        await flush();
    });

    it('does not read image size when there is no boundary image', async () => {
        render(<AddLocationBottomSheet boundaryImageUri={null} onChange={jest.fn()} />);
        expect(Image.getSize).not.toHaveBeenCalled();
        expect(screen.UNSAFE_queryByType(PressableType)).toBeNull();
        await flush();
    });

    it('keeps Save disabled until a pin is dropped', async () => {
        const onChange = jest.fn();
        render(
            <AddLocationBottomSheet boundaryImageUri="file://b.png" onChange={onChange} />,
        );
        fireEvent.press(screen.getByText('Save Location'));
        expect(onChange).not.toHaveBeenCalled();
        await flush();
    });

    it('emits the dropped pin position when Save is pressed', async () => {
        const onChange = jest.fn();
        render(
            <AddLocationBottomSheet boundaryImageUri="file://b.png" onChange={onChange} />,
        );
        measureAndTap();
        expect(screen.getByText('Tap again to move pin')).toBeOnTheScreen();
        fireEvent.press(screen.getByText('Save Location'));
        expect(onChange).toHaveBeenCalledWith({ x: 0.5, y: 0.5 });
        await flush();
    });

    it('restores the initial position when the sheet opens', async () => {
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
        await flush();
    });

    it('ignores a close index change', async () => {
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
        await flush();
    });

    it('clears the position on dismiss', async () => {
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
        await flush();
    });
});
