import { render, screen, fireEvent } from '@testing-library/react-native';
import { Image, Pressable } from 'react-native';
import { BoundaryPinLayer } from '@components/BoundaryPinLayer';

const measure = (width = 100, height = 100) =>
    fireEvent(screen.UNSAFE_getByType(Pressable), 'layout', {
        nativeEvent: { layout: { width, height } },
    });

const tap = (locationX: number, locationY: number) =>
    fireEvent(screen.UNSAFE_getByType(Pressable), 'press', {
        nativeEvent: { locationX, locationY },
    });

describe('BoundaryPinLayer', () => {
    it('renders the boundary image', () => {
        render(
            <BoundaryPinLayer
                imageUri="file://boundary.png"
                value={null}
                onChange={jest.fn()}
                aspectRatio={1}
            />,
        );
        expect(screen.UNSAFE_getByType(Image).props.source).toEqual({
            uri: 'file://boundary.png',
        });
    });

    it('does not emit before the layout has been measured', () => {
        const onChange = jest.fn();
        render(
            <BoundaryPinLayer
                imageUri="file://boundary.png"
                value={null}
                onChange={onChange}
                aspectRatio={1}
            />,
        );
        tap(50, 50);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('emits normalised coordinates for a tap', () => {
        const onChange = jest.fn();
        render(
            <BoundaryPinLayer
                imageUri="file://boundary.png"
                value={null}
                onChange={onChange}
                aspectRatio={1}
            />,
        );
        measure(200, 100);
        tap(50, 25);
        expect(onChange).toHaveBeenCalledWith({ x: 0.25, y: 0.25 });
    });

    it('clamps coordinates to the 0..1 range', () => {
        const onChange = jest.fn();
        render(
            <BoundaryPinLayer
                imageUri="file://boundary.png"
                value={null}
                onChange={onChange}
                aspectRatio={1}
            />,
        );
        measure(100, 100);
        tap(500, -50);
        expect(onChange).toHaveBeenCalledWith({ x: 1, y: 0 });
    });

    it('renders a pin when a value is set and the layout is measured', () => {
        render(
            <BoundaryPinLayer
                imageUri="file://boundary.png"
                value={{ x: 0.5, y: 0.5 }}
                onChange={jest.fn()}
                aspectRatio={1}
            />,
        );
        measure(100, 100);
        expect(screen.UNSAFE_queryByProps({ pointerEvents: 'none' })).not.toBeNull();
    });

    it('renders no pin when there is no value', () => {
        render(
            <BoundaryPinLayer
                imageUri="file://boundary.png"
                value={null}
                onChange={jest.fn()}
                aspectRatio={1}
            />,
        );
        measure(100, 100);
        expect(screen.UNSAFE_queryByProps({ pointerEvents: 'none' })).toBeNull();
    });
});
