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
        FlightPathCanvas: (props: {
            surface: string;
            editable: boolean;
            paths: { id?: string }[] | null;
            onCommitPath: (p: unknown[]) => void;
        }) => (
            <TouchableOpacity
                accessibilityLabel="canvas-commit"
                disabled={!props.editable}
                onPress={() => props.onCommitPath([{ surface: props.surface, points: [{ x: 1, y: 1 }] }])}
            >
                <Text>{`canvas ${props.editable ? 'editable' : 'locked'} paths:${(props.paths ?? []).map((p) => p.id ?? '?').join(',')}`}</Text>
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

const options = [
    { letter: 'A', sourceObservationId: 'obs-a', paths: [{ id: 'fp-a', surface: 'boundary', points: [] } as FlightPath] },
    { letter: 'B', sourceObservationId: 'obs-b', paths: [{ id: 'fp-b', surface: 'boundary', points: [] } as FlightPath] },
];

const setup = (props: Partial<React.ComponentProps<typeof AddFlightPathBottomSheet>> = {}) => {
    const onCommit = jest.fn();
    render(
        <AddFlightPathBottomSheet
            imageUri="image.jpg"
            surface="boundary"
            initialPaths={initialPaths}
            onCommit={onCommit}
            {...props}
        />,
    );
    return { onCommit };
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
        const onCommit = jest.fn();
        render(
            <AddFlightPathBottomSheet
                imageUri="image.jpg"
                surface="boundary"
                onCommit={onCommit}
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
        const { onCommit } = setup();
        fireEvent.press(screen.getByLabelText('canvas-commit'));
        fireEvent.press(screen.getByLabelText('Save Flight Path'));
        expect(onCommit).toHaveBeenCalledWith({
            paths: [{ surface: 'boundary', points: [{ x: 1, y: 1 }] }],
        });
    });

    it('hides the existing path options when there are none', () => {
        setup();
        expect(screen.queryByLabelText('Draw new')).toBeNull();
    });

    it('previews a chosen existing path and blocks drawing over it', () => {
        setup({ options });
        expect(screen.getByLabelText('Draw new').props.accessibilityState.selected).toBe(true);

        fireEvent.press(screen.getByLabelText('Flight path B'));

        expect(screen.getByLabelText('Flight path B').props.accessibilityState.selected).toBe(true);
        expect(screen.getByText('canvas locked paths:fp-b')).toBeOnTheScreen();
        expect(screen.getByLabelText('Save Flight Path').props.accessibilityState.disabled).toBe(false);
    });

    it('links the observation to the chosen path on save', () => {
        const { onCommit } = setup({ options });
        fireEvent.press(screen.getByLabelText('Flight path A'));
        fireEvent.press(screen.getByLabelText('Save Flight Path'));
        expect(onCommit).toHaveBeenCalledWith({
            link: { surface: 'boundary', observationId: 'obs-a' },
        });
    });

    it('restores the drawn paths when the selection is cancelled', () => {
        const { onCommit } = setup({ options });
        fireEvent.press(screen.getByLabelText('canvas-commit'));
        fireEvent.press(screen.getByLabelText('Flight path A'));
        fireEvent.press(screen.getByLabelText('Draw new'));

        expect(screen.getByText('canvas editable paths:?')).toBeOnTheScreen();
        fireEvent.press(screen.getByLabelText('Save Flight Path'));
        expect(onCommit).toHaveBeenCalledWith({
            paths: [{ surface: 'boundary', points: [{ x: 1, y: 1 }] }],
        });
    });

    it('preselects the linked path when the sheet opens and clears it on dismiss', () => {
        setup({ options, initialLinkId: 'obs-b' });
        fireEvent.press(screen.getByLabelText('sheet-open'));
        expect(screen.getByLabelText('Flight path B').props.accessibilityState.selected).toBe(true);

        fireEvent.press(screen.getByLabelText('sheet-dismiss'));
        expect(screen.getByLabelText('Draw new').props.accessibilityState.selected).toBe(true);
    });
});
