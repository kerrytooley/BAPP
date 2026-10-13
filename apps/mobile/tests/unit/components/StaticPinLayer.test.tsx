jest.mock('@utils/image', () => ({
    getAspectRatio: jest.fn(() => Promise.resolve(1)),
}));

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Image, StyleSheet, View } from 'react-native';
import { StaticPinLayer } from '@components/Location/StaticPinLayer';
import { getAspectRatio } from '@utils/image';

const measure = (width = 100, height = 100) =>
    fireEvent(screen.UNSAFE_getAllByType(View)[0], 'layout', {
        nativeEvent: { layout: { width, height } },
    });

describe('StaticPinLayer', () => {
    it('renders the boundary image', () => {
        render(<StaticPinLayer imageUri="file://boundary.png" values={[]} />);
        expect(screen.UNSAFE_getByType(Image).props.source).toEqual({
            uri: 'file://boundary.png',
        });
    });

    it('renders a pin when a value is set and the layout is measured', () => {
        render(<StaticPinLayer imageUri="file://boundary.png" values={[{ x: 0.5, y: 0.5 }]} />);
        measure(100, 100);
        expect(screen.UNSAFE_queryByProps({ pointerEvents: 'none' })).not.toBeNull();
    });

    it('renders no pin when there is no value', () => {
        render(<StaticPinLayer imageUri="file://boundary.png" values={[]} />);
        measure(100, 100);
        expect(screen.UNSAFE_queryByProps({ pointerEvents: 'none' })).toBeNull();
    });

    it('labels a pin when a label is given', () => {
        render(<StaticPinLayer imageUri="file://boundary.png" values={[{ x: 0.95, y: 0.5, label: 'Ada, Ben' }, { x: 0.2, y: 0.2 }]} />);
        measure(300, 300);
        expect(screen.getByText('Ada, Ben')).toBeOnTheScreen();
    });

    it('places a label above a pin at the bottom edge so it is not clipped', () => {
        render(<StaticPinLayer imageUri="file://boundary.png" values={[{ x: 0.5, y: 0.95, label: 'Ada' }]} />);
        measure(300, 300);
        const labelBox = () => screen.getByText('Ada').parent!.parent!;
        // Unmeasured, it sits below the pin; once measured it would overflow the 300px layer.
        expect(StyleSheet.flatten(labelBox().props.style).top).toBe(285 + 6);
        fireEvent(labelBox(), 'layout', { nativeEvent: { layout: { width: 140, height: 30 } } });
        expect(StyleSheet.flatten(labelBox().props.style).top).toBe(285 - 24 - 6 - 30);
    });

    it('keeps a label below a pin when it fits', () => {
        render(<StaticPinLayer imageUri="file://boundary.png" values={[{ x: 0.5, y: 0.5, label: 'Ada' }]} />);
        measure(300, 300);
        const labelBox = () => screen.getByText('Ada').parent!.parent!;
        fireEvent(labelBox(), 'layout', { nativeEvent: { layout: { width: 140, height: 30 } } });
        expect(StyleSheet.flatten(labelBox().props.style).top).toBe(150 + 6);
    });

    it('logs an error when the aspect ratio cannot be resolved', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        (getAspectRatio as jest.Mock).mockRejectedValueOnce(new Error('size failed'));
        render(<StaticPinLayer imageUri="file://boundary.png" values={[]} />);
        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'Error getting image aspect ratio',
                expect.any(Error),
            ),
        );
    });

    it('does not resolve the aspect ratio without an image uri', () => {
        (getAspectRatio as jest.Mock).mockClear();
        render(<StaticPinLayer imageUri="" values={[]} />);
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
            <StaticPinLayer imageUri="file://boundary.png" values={[]} />,
        );
        unmount();
        await act(async () => {
            resolve(2);
        });
    });
});
