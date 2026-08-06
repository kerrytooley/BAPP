jest.mock('@utils/image', () => ({
    getAspectRatio: jest.fn(() => Promise.resolve(1)),
}));

import { render, screen } from '@testing-library/react-native';
import { Image } from 'react-native';
import { ImageCard } from '@components/ImageCard';

describe('ImageCard', () => {
    it('renders the image for the given uri', () => {
        render(<ImageCard imageUri="file://card.png" />);
        expect(screen.UNSAFE_getByType(Image).props.source).toEqual({
            uri: 'file://card.png',
        });
    });
});
