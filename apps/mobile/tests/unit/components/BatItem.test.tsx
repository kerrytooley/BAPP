import { render, screen, fireEvent } from '@testing-library/react-native';
import { Modal } from 'react-native';
import { BatItem, Bat } from '@components/Display/BatItem';

const bat: Bat = {
    id: 'noctule',
    species: 'Noctule',
    abr: 'Noc',
    group: 'Nyctalus',
    frequencyRange: '20-45 kHz',
    info: 'A large, fast-flying bat.',
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

    it('opens and closes bat info without selecting the bat', () => {
        const onPress = jest.fn();
        render(<BatItem bat={bat} onPress={onPress} />);

        fireEvent.press(screen.getByLabelText('Bat Info'));
        expect(screen.getAllByText('20-45 kHz')).toHaveLength(2);
        expect(screen.getByText('A large, fast-flying bat.')).toBeOnTheScreen();
        expect(onPress).not.toHaveBeenCalled();

        fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');
        expect(screen.queryByText('A large, fast-flying bat.')).not.toBeOnTheScreen();

        fireEvent.press(screen.getByLabelText('Bat Info'));
        fireEvent.press(screen.getByTestId('bat-info-backdrop'));
        expect(screen.queryByText('A large, fast-flying bat.')).not.toBeOnTheScreen();
    });
});
