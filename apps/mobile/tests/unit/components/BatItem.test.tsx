import { render, screen, fireEvent } from '@testing-library/react-native';
import { BatItem, Bat } from '@components/BatItem';

const bat: Bat = {
    id: 'noctule',
    species: 'Noctule',
    image: { uri: 'file://noctule.png' },
};

describe('BatItem', () => {
    it('renders the species with an accessible button label', () => {
        render(<BatItem bat={bat} onPress={jest.fn()} />);
        expect(screen.getByText('Noctule')).toBeOnTheScreen();
        expect(screen.getByLabelText('Noctule')).toBeOnTheScreen();
    });

    it('exposes the species as a cross-platform testID for e2e selection', () => {
        render(<BatItem bat={bat} onPress={jest.fn()} />);
        expect(screen.getByTestId('Noctule')).toBeOnTheScreen();
    });

    it('calls onPress when pressed', () => {
        const onPress = jest.fn();
        render(<BatItem bat={bat} onPress={onPress} />);
        fireEvent.press(screen.getByLabelText('Noctule'));
        expect(onPress).toHaveBeenCalledTimes(1);
    });
});
