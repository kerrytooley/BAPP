import { render, screen, fireEvent } from '@testing-library/react-native';
import { PreviousEntriesSection } from '@components/Observation/PreviousEntriesSection';
import { buildObservation } from '../../helpers/factories';

const setup = (observations = [buildObservation()]) => {
    const onAddHeard = jest.fn();
    const onAddSeen = jest.fn();
    const onEdit = jest.fn();
    render(
        <PreviousEntriesSection
            observations={observations}
            onAddHeard={onAddHeard}
            onAddSeen={onAddSeen}
            onEdit={onEdit}
        />,
    );
    return { onAddHeard, onAddSeen, onEdit };
};

describe('PreviousEntriesSection', () => {
    it('shows a placeholder when there are no observations', () => {
        setup([]);
        expect(screen.getByText('Add a bat entry to see it here')).toBeOnTheScreen();
    });

    it('renders a tile per observation, most recent first', () => {
        setup([
            buildObservation({ id: 'a', species: 'Noctule' }),
            buildObservation({ id: 'b', species: 'Serotine' }),
        ]);
        expect(screen.getByText('Noc')).toBeOnTheScreen();
        expect(screen.getByText('Ser')).toBeOnTheScreen();
    });

    it('forwards the observation when edit is pressed', () => {
        const { onEdit } = setup([buildObservation({ id: 'obs-9' })]);
        fireEvent.press(screen.getByText('Edit'));
        expect(onEdit).toHaveBeenCalledWith('obs-9');
    });
});
