jest.mock('@utils/image', () => ({
    getAspectRatio: jest.fn(() => Promise.resolve(1)),
}));

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Image, Pressable } from 'react-native';
import { PressablePinLayer } from '@components/PressablePinLayer';
import { getAspectRatio } from '@utils/image';

const measure = (width = 100, height = 100) =>
    fireEvent(screen.UNSAFE_getByType(Pressable), 'layout', {
        nativeEvent: { layout: { width, height } },
    });

const tap = (locationX: number, locationY: number) =>
    fireEvent(screen.UNSAFE_getByType(Pressable), 'press', {
        nativeEvent: { locationX, locationY },
    });

describe('PressablePinLayer', () => {
    it('renders the boundary image', async () => {
        render(
            <PressablePinLayer imageUri="file://boundary.png" value={null} onChange={jest.fn()} />,
        );
        expect(screen.UNSAFE_getByType(Image).props.source).toEqual({
            uri: 'file://boundary.png',
        });
        await act(async () => { });
    });

    it('does not emit before the layout has been measured', async () => {
        const onChange = jest.fn();
        render(
            <PressablePinLayer imageUri="file://boundary.png" value={null} onChange={onChange} />,
        );
        tap(50, 50);
        expect(onChange).not.toHaveBeenCalled();
        await act(async () => { });
    });

    it('emits normalised coordinates for a tap', async () => {
        const onChange = jest.fn();
        render(
            <PressablePinLayer imageUri="file://boundary.png" value={null} onChange={onChange} />,
        );
        measure(200, 100);
        tap(50, 25);
        expect(onChange).toHaveBeenCalledWith({ x: 0.25, y: 0.25 });
        await act(async () => { });
    });

    it('clamps coordinates to the 0..1 range', async () => {
        const onChange = jest.fn();
        render(
            <PressablePinLayer imageUri="file://boundary.png" value={null} onChange={onChange} />,
        );
        measure(100, 100);
        tap(500, -50);
        expect(onChange).toHaveBeenCalledWith({ x: 1, y: 0 });
        await act(async () => { });
    });

    it('renders a pin when a value is set and the layout is measured', async () => {
        render(
            <PressablePinLayer
                imageUri="file://boundary.png"
                value={{ x: 0.5, y: 0.5 }}
                onChange={jest.fn()}
            />,
        );
        measure(100, 100);
        expect(screen.UNSAFE_queryByProps({ pointerEvents: 'none' })).not.toBeNull();
        await act(async () => { });
    });

    it('renders no pin when there is no value', async () => {
        render(
            <PressablePinLayer imageUri="file://boundary.png" value={null} onChange={jest.fn()} />,
        );
        measure(100, 100);
        expect(screen.UNSAFE_queryByProps({ pointerEvents: 'none' })).toBeNull();
        await act(async () => { });
    });

    it('logs an error when the aspect ratio cannot be resolved', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        (getAspectRatio as jest.Mock).mockRejectedValueOnce(new Error('size failed'));
        render(
            <PressablePinLayer imageUri="file://boundary.png" value={null} onChange={jest.fn()} />,
        );
        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'Error getting image aspect ratio',
                expect.any(Error),
            ),
        );
    });

    it('does not resolve the aspect ratio without an image uri', () => {
        (getAspectRatio as jest.Mock).mockClear();
        render(
            <PressablePinLayer imageUri="" value={null} onChange={jest.fn()} />,
        );
        expect(getAspectRatio).not.toHaveBeenCalled();
    });

    it('ignores a resolved aspect ratio after unmount', async () => {
        let resolve: (ratio: number) => void = () => { };
        (getAspectRatio as jest.Mock).mockReturnValueOnce(
            new Promise<number>((r) => {
                resolve = r;
            }),
        );
        const { unmount } = render(
            <PressablePinLayer imageUri="file://boundary.png" value={null} onChange={jest.fn()} />,
        );
        unmount();
        await act(async () => {
            resolve(2);
        });
    });
});
