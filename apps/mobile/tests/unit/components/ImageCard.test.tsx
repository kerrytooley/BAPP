jest.mock('@utils/image', () => ({
    getAspectRatio: jest.fn(() => Promise.resolve(1)),
}));

import { render, screen, waitFor, act } from '@testing-library/react-native';
import { Image } from 'react-native';
import { ImageCard } from '@components/ImageCard';
import { getAspectRatio } from '@utils/image';

describe('ImageCard', () => {
    it('renders the image for the given uri', () => {
        render(<ImageCard imageUri="file://card.png" />);
        expect(screen.UNSAFE_getByType(Image).props.source).toEqual({
            uri: 'file://card.png',
        });
    });

    it('logs an error when the aspect ratio cannot be resolved', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        (getAspectRatio as jest.Mock).mockRejectedValueOnce(new Error('size failed'));
        render(<ImageCard imageUri="file://card.png" />);
        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith(
                'Error getting image aspect ratio',
                expect.any(Error),
            ),
        );
    });

    it('does not resolve the aspect ratio without an image uri', () => {
        (getAspectRatio as jest.Mock).mockClear();
        render(<ImageCard imageUri="" />);
        expect(getAspectRatio).not.toHaveBeenCalled();
    });

    it('ignores a resolved aspect ratio after unmount', async () => {
        let resolve: (ratio: number) => void = () => { };
        (getAspectRatio as jest.Mock).mockReturnValueOnce(
            new Promise<number>((r) => {
                resolve = r;
            }),
        );
        const { unmount } = render(<ImageCard imageUri="file://card.png" />);
        unmount();
        await act(async () => {
            resolve(2);
        });
    });
});
