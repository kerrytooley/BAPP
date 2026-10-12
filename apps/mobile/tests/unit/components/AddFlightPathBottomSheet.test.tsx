jest.mock('@gorhom/bottom-sheet', () => {
    const React = require('react');
    const { View, TouchableOpacity } = require('react-native');
    const BottomSheetModal = React.forwardRef(
        (props: Record<string, any>, _ref: unknown) => (
            <View>
                <TouchableOpacity
                    accessibilityLabel="sheet-open"
                    onPress={() => props.onChange?.(0)}
                />
                <TouchableOpacity
                    accessibilityLabel="sheet-close-index"
                    onPress={() => props.onChange?.(-1)}
                />
                <TouchableOpacity
                    accessibilityLabel="sheet-dismiss"
                    onPress={() => props.onDismiss?.()}
                />
                {props.backdropComponent?.({})}
                {props.children}
            </View>
        ),
    );
    return {
        __esModule: true,
        BottomSheetModal,
        BottomSheetView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        BottomSheetBackdrop: () => null,
    };
});

jest.mock('@components/Interactive/FlightPathCanvas', () => {
    const { TouchableOpacity, Text } = require('react-native');
    return {
        FlightPathCanvas: (props: { surface: string; onCommitPath: (p: unknown[]) => void }) => (
            <TouchableOpacity
                accessibilityLabel="canvas-commit"
                onPress={() => props.onCommitPath([{ surface: props.surface, points: [{ x: 1, y: 1 }] }])}
            >
                <Text>canvas</Text>
            </TouchableOpacity>
        ),
    };
});

import { render, screen, fireEvent } from '@testing-library/react-native';
import { AddFlightPathBottomSheet } from '@components/BottomSheets/AddFlightPathBottomSheet';
import type { FlightPath } from '@bapp/domain';

const initialPaths = [
    { surface: 'boundary', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] } as unknown as FlightPath,
];

const setup = (props: Partial<React.ComponentProps<typeof AddFlightPathBottomSheet>> = {}) => {
    const onCommitPath = jest.fn();
    render(
        <AddFlightPathBottomSheet
            imageUri="image.jpg"
            surface="boundary"
            initialPaths={initialPaths}
            onCommitPath={onCommitPath}
            {...props}
        />,
    );
    return { onCommitPath };
};

describe('AddFlightPathBottomSheet', () => {
    it('shows the add title by default', () => {
        setup();
        expect(screen.getByText('Add Flight Path')).toBeOnTheScreen();
    });

    it('shows the edit title when editing', () => {
        setup({ isEditing: true });
        expect(screen.getByText('Edit Flight Path')).toBeOnTheScreen();
    });

    it('defaults to an empty path list when none are provided', () => {
        const onCommitPath = jest.fn();
        render(
            <AddFlightPathBottomSheet
                imageUri="image.jpg"
                surface="boundary"
                onCommitPath={onCommitPath}
            />,
        );
        // Opening the sheet loads the (empty) default initial paths.
        fireEvent.press(screen.getByLabelText('sheet-open'));
        expect(screen.getByLabelText('Save Flight Path').props.accessibilityState.disabled).toBe(true);
    });

    it('disables save until a path exists', () => {
        setup();
        expect(screen.getByLabelText('Save Flight Path').props.accessibilityState.disabled).toBe(true);
    });

    it('loads the initial paths when the sheet opens', () => {
        setup();
        fireEvent.press(screen.getByLabelText('sheet-open'));
        expect(screen.getByLabelText('Save Flight Path').props.accessibilityState.disabled).toBe(false);
    });

    it('ignores negative sheet indices', () => {
        setup();
        fireEvent.press(screen.getByLabelText('sheet-close-index'));
        expect(screen.getByLabelText('Save Flight Path').props.accessibilityState.disabled).toBe(true);
    });

    it('clears the paths when dismissed', () => {
        setup();
        fireEvent.press(screen.getByLabelText('sheet-open'));
        fireEvent.press(screen.getByLabelText('sheet-dismiss'));
        expect(screen.getByLabelText('Save Flight Path').props.accessibilityState.disabled).toBe(true);
    });

    it('commits paths drawn on the canvas', () => {
        const { onCommitPath } = setup();
        fireEvent.press(screen.getByLabelText('canvas-commit'));
        fireEvent.press(screen.getByLabelText('Save Flight Path'));
        expect(onCommitPath).toHaveBeenCalledWith([
            { surface: 'boundary', points: [{ x: 1, y: 1 }] },
        ]);
    });
});
