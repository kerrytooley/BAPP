import { render, screen, fireEvent } from '@testing-library/react-native';
import { BatGrid } from '@components/BatGrid';
import { Bat } from '@components/BatItem';

const bats: Bat[] = [
    { id: 'noctule', species: 'Noctule', image: { uri: 'file://noctule.png' } },
    { id: 'serotine', species: 'Serotine', image: { uri: 'file://serotine.png' } },
];

describe('BatGrid', () => {
    it('renders one item per bat', () => {
        render(<BatGrid bats={bats} onPress={jest.fn()} />);
        expect(screen.getByText('Noctule')).toBeOnTheScreen();
        expect(screen.getByText('Serotine')).toBeOnTheScreen();
    });

    it('forwards the bat id when an item is pressed', () => {
        const onPress = jest.fn();
        render(<BatGrid bats={bats} onPress={onPress} />);
        fireEvent.press(screen.getByLabelText('Serotine'));
        expect(onPress).toHaveBeenCalledWith('serotine');
    });
});
