import { render, screen, fireEvent } from '@testing-library/react-native';
import { BatGrid } from '@components/Display/BatGrid';
import { Bat } from '@components/Display/BatItem';

const bats: Bat[] = [
    { id: 'noctule', species: 'Noctule', abr: 'Noc', group: 'Nyctalus', frequencyRange: '20-45 kHz', info: 'A large, fast-flying bat.' },
    { id: 'common-pip', species: 'Common Pipistrelle', abr: 'CP', group: 'Pipistrelle', frequencyRange: '45-70 kHz', info: 'A small, common bat.' },
];

describe('BatGrid', () => {
    it('renders one item per bat', () => {
        render(<BatGrid bats={bats} isLoading={false} onPress={jest.fn()} />);
        expect(screen.getByText('Noctule')).toBeOnTheScreen();
        expect(screen.getByText('Common Pipistrelle')).toBeOnTheScreen();
    });

    it('forwards the bat species when an item is pressed', () => {
        const onPress = jest.fn();
        render(<BatGrid bats={bats} isLoading={false} onPress={onPress} />);
        fireEvent.press(screen.getByLabelText('Common Pipistrelle'));
        expect(onPress).toHaveBeenCalledWith('Common Pipistrelle');
    });

    it('forwards the group name when a group button is pressed', () => {
        const onPress = jest.fn();
        render(<BatGrid bats={bats} isLoading={false} onPress={onPress} />);
        fireEvent.press(screen.getByText('Pipistrelle'));
        expect(onPress).toHaveBeenCalledWith('Pipistrelle');
    });
});
