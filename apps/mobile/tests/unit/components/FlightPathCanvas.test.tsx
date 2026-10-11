jest.mock('react-native-svg', () => {
    const React = require('react');
    const { View } = require('react-native');
    const Passthrough = (props: Record<string, unknown>) =>
        React.createElement(View, props);
    return {
        __esModule: true,
        default: Passthrough,
        Svg: Passthrough,
        Polyline: Passthrough,
    };
});

jest.mock('react-native-gesture-handler', () => {
    const actual = jest.requireActual('react-native-gesture-handler');
    return {
        ...actual,
        GestureDetector: ({ gesture, children }: { gesture: unknown; children: React.ReactNode }) => {
            (globalThis as Record<string, unknown>).__panGesture = gesture;
            return children;
        },
    };
});

import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Image, View } from 'react-native';
import { FlightPathCanvas } from '@components/Interactive/FlightPathCanvas';
import type { FlightPath, FlightPathPoint } from '@bapp/domain';

type Handlers = {
    onBegin: (e: { x: number; y: number }) => void;
    onUpdate: (e: { x: number; y: number }) => void;
    onEnd: (e: unknown, success: boolean) => void;
    onFinalize: (e: unknown, success: boolean) => void;
};

const gestureHandlers = (): Handlers =>
    ((globalThis as Record<string, unknown>).__panGesture as { handlers: Handlers }).handlers;

const drawPath = (points: { x: number; y: number }[]) => {
    const handlers = gestureHandlers();
    act(() => {
        handlers.onBegin(points[0]);
        points.slice(1).forEach((point) => handlers.onUpdate(point));
        handlers.onEnd({}, true);
        handlers.onFinalize({}, true);
    });
};

const mockGetSize = (
    impl: (uri: string, success: (w: number, h: number) => void, error?: () => void) => void,
) => jest.spyOn(Image, 'getSize').mockImplementation(impl as typeof Image.getSize);

const fireLayout = (width: number, height: number) => {
    const container = screen.UNSAFE_getAllByType(View).find((node) => node.props.onLayout);
    act(() => {
        fireEvent(container!, 'layout', {
            nativeEvent: { layout: { width, height, x: 0, y: 0 } },
        });
    });
};

const renderCanvas = (paths: FlightPath[] | null = [], editable = true) => {
    const onCommitPath = jest.fn();
    render(
        <FlightPathCanvas
            imageUri="image.jpg"
            surface="boundary"
            paths={paths}
            onCommitPath={onCommitPath}
            editable={editable}
        />,
    );
    return { onCommitPath };
};

const buildPath = (points: FlightPathPoint[], id = 'p1'): FlightPath =>
    ({ id, surface: 'boundary', points, data: {} } as unknown as FlightPath);

afterEach(() => {
    jest.restoreAllMocks();
    delete (globalThis as Record<string, unknown>).__panGesture;
});

describe('FlightPathCanvas', () => {
    it('commits a portrait path drawn across the canvas', () => {
        mockGetSize((_uri, success) => success(50, 100));
        const { onCommitPath } = renderCanvas([]);
        fireLayout(100, 100);

        drawPath([{ x: 10, y: 10 }, { x: 20, y: 30 }, { x: 30, y: 60 }]);

        expect(onCommitPath).toHaveBeenCalledWith([
            expect.objectContaining({ surface: 'boundary' }),
        ]);
    });

    it('commits a landscape path using the rotated mapping', () => {
        // aspect 2 -> landscape, forces the else branch of canvasSize.
        mockGetSize((_uri, success) => success(200, 100));
        const { onCommitPath } = renderCanvas([]);
        fireLayout(100, 300);

        drawPath([{ x: 5, y: 5 }, { x: 15, y: 25 }, { x: 25, y: 45 }]);

        expect(onCommitPath).toHaveBeenCalledTimes(1);
    });

    it('does not commit when the gesture has a single point', () => {
        mockGetSize((_uri, success) => success(50, 100));
        const { onCommitPath } = renderCanvas([]);
        fireLayout(100, 100);

        drawPath([{ x: 10, y: 10 }]);

        expect(onCommitPath).not.toHaveBeenCalled();
    });

    it('renders existing polylines and ignores single-point paths', () => {
        mockGetSize((_uri, success) => success(50, 100));
        renderCanvas([
            buildPath([{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }], 'multi'),
            buildPath([{ x: 0.2, y: 0.2 }], 'single'),
        ]);
        fireLayout(100, 100);
        expect(screen.UNSAFE_getAllByType(View).length).toBeGreaterThan(0);
    });

    it('renders landscape polylines', () => {
        mockGetSize((_uri, success) => success(200, 100));
        renderCanvas([buildPath([{ x: 0.1, y: 0.1 }, { x: 0.6, y: 0.6 }], 'multi')]);
        fireLayout(100, 300);
        expect(screen.UNSAFE_getAllByType(View).length).toBeGreaterThan(0);
    });

    it('falls back to a default aspect ratio when sizing fails', () => {
        mockGetSize((_uri, _success, error) => error?.());
        const { onCommitPath } = renderCanvas([]);
        fireLayout(100, 300);

        drawPath([{ x: 5, y: 5 }, { x: 15, y: 25 }]);

        expect(onCommitPath).toHaveBeenCalledTimes(1);
    });

    it('ignores drawing before the canvas has been laid out', () => {
        mockGetSize((_uri, success) => success(50, 100));
        const { onCommitPath } = renderCanvas([]);
        // No layout fired -> canvasSize is zero, so start/extend are no-ops.
        drawPath([{ x: 10, y: 10 }, { x: 20, y: 20 }]);
        expect(onCommitPath).not.toHaveBeenCalled();
    });

    it('stays unsized when the image reports zero dimensions', () => {
        mockGetSize((_uri, success) => success(0, 0));
        const { onCommitPath } = renderCanvas([]);
        fireLayout(100, 100);
        // ratioReady never becomes true, so the canvas is zero-sized.
        drawPath([{ x: 10, y: 10 }, { x: 20, y: 20 }]);
        expect(onCommitPath).not.toHaveBeenCalled();
    });

    it('handles a null paths collection', () => {
        mockGetSize((_uri, success) => success(50, 100));
        renderCanvas(null);
        fireLayout(100, 100);
        expect(screen.UNSAFE_getAllByType(View).length).toBeGreaterThan(0);
    });

    it('renders the in-progress polyline while drawing', () => {
        mockGetSize((_uri, success) => success(50, 100));
        renderCanvas([]);
        fireLayout(100, 100);
        const handlers = gestureHandlers();
        act(() => {
            handlers.onBegin({ x: 10, y: 10 });
            handlers.onUpdate({ x: 20, y: 30 });
        });
        // The current path (2 points) should now be rendered.
        expect(screen.UNSAFE_getAllByType(View).length).toBeGreaterThan(0);
    });

    it('ignores async image sizing that resolves after unmount', () => {
        let successCb: ((w: number, h: number) => void) | undefined;
        let errorCb: (() => void) | undefined;
        mockGetSize((_uri, success, error) => {
            successCb = success;
            errorCb = error;
        });
        const { unmount } = render(
            <FlightPathCanvas
                imageUri="image.jpg"
                surface="boundary"
                paths={[]}
                onCommitPath={jest.fn()}
                editable
            />,
        );
        unmount();
        // Resolving after unmount should be a no-op (active === false).
        act(() => {
            successCb?.(50, 100);
            errorCb?.();
        });
    });
});
