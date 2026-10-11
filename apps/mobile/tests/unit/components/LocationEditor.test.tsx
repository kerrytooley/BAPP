jest.mock('@utils/image', () => ({
    getAspectRatio: jest.fn(() => Promise.resolve(1)),
}));

import { render, screen } from '@testing-library/react-native';
import { LocationEditor } from '@components/Location/LocationEditor';
import { PressableType } from '../../helpers/rnComponents';

describe('LocationEditor', () => {
    it('renders the pin layer when a boundary image is provided', () => {
        render(
            <LocationEditor boundaryImageUri="file://b.png" position={null} setPosition={jest.fn()} />,
        );
        expect(screen.UNSAFE_queryByType(PressableType)).not.toBeNull();
    });

    it('renders nothing to tap when there is no boundary image', () => {
        render(
            <LocationEditor boundaryImageUri={null} position={null} setPosition={jest.fn()} />,
        );
        expect(screen.UNSAFE_queryByType(PressableType)).toBeNull();
    });

    it('prompts to move the pin once a position is set', () => {
        render(
            <LocationEditor
                boundaryImageUri="file://b.png"
                position={{ x: 0.2, y: 0.3 }}
                setPosition={jest.fn()}
            />,
        );
        expect(screen.getByText('Tap again to move pin')).toBeVisible();
    });

    it('does not prompt to move the pin before a position is set', () => {
        render(
            <LocationEditor boundaryImageUri="file://b.png" position={null} setPosition={jest.fn()} />,
        );
        expect(screen.getByText('Tap again to move pin', { includeHiddenElements: true })).not.toBeVisible();
    });
});
