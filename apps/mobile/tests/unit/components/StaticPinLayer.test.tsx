jest.mock('@utils/image', () => ({
    getAspectRatio: jest.fn(() => Promise.resolve(1)),
}));

import { render, screen, fireEvent } from '@testing-library/react-native';
import { Image, View } from 'react-native';
import { StaticPinLayer } from '@components/StaticPinLayer';

const measure = (width = 100, height = 100) =>
    fireEvent(screen.UNSAFE_getAllByType(View)[0], 'layout', {
        nativeEvent: { layout: { width, height } },
    });

describe('StaticPinLayer', () => {
    it('renders the boundary image', () => {
        render(<StaticPinLayer imageUri="file://boundary.png" value={null} />);
        expect(screen.UNSAFE_getByType(Image).props.source).toEqual({
            uri: 'file://boundary.png',
        });
    });

    it('renders a pin when a value is set and the layout is measured', () => {
        render(<StaticPinLayer imageUri="file://boundary.png" value={{ x: 0.5, y: 0.5 }} />);
        measure(100, 100);
        expect(screen.UNSAFE_queryByProps({ pointerEvents: 'none' })).not.toBeNull();
    });

    it('renders no pin when there is no value', () => {
        render(<StaticPinLayer imageUri="file://boundary.png" value={null} />);
        measure(100, 100);
        expect(screen.UNSAFE_queryByProps({ pointerEvents: 'none' })).toBeNull();
    });
});
