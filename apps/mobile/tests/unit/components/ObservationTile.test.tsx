import { render, screen, fireEvent } from '@testing-library/react-native';
import { ObservationTile } from '@components/ObservationTile';
import { buildObservation } from '../../helpers/factories';

const setup = (observationOverrides = {}) => {
    const onAddSeen = jest.fn();
    const onAddHeard = jest.fn();
    const onEdit = jest.fn();
    render(
        <ObservationTile
            observation={buildObservation(observationOverrides)}
            onAddSeen={onAddSeen}
            onAddHeard={onAddHeard}
            onEdit={onEdit}
        />,
    );
    return { onAddSeen, onAddHeard, onEdit };
};

describe('ObservationTile', () => {
    it('renders the species abbreviation, time and counts', () => {
        setup({ species: 'Noctule', seenCount: 3, heardCount: 5 });
        expect(screen.getByText('Noc')).toBeOnTheScreen();
        expect(screen.getByText('20:30')).toBeOnTheScreen();
        expect(screen.getByText('S (3)')).toBeOnTheScreen();
        expect(screen.getByText('H (5)')).toBeOnTheScreen();
    });

    it('renders a fallback time when first seen is missing', () => {
        setup({ firstSeenAt: null });
        expect(screen.getByText('Time not found')).toBeOnTheScreen();
    });

    it('fires onAddSeen when the seen plus is pressed', () => {
        const { onAddSeen } = setup();
        fireEvent.press(screen.getByLabelText('Add seen count'));
        expect(onAddSeen).toHaveBeenCalledTimes(1);
    });

    it('fires onAddHeard when the heard plus is pressed', () => {
        const { onAddHeard } = setup();
        fireEvent.press(screen.getByLabelText('Add heard count'));
        expect(onAddHeard).toHaveBeenCalledTimes(1);
    });

    it('fires onEdit when Edit is pressed', () => {
        const { onEdit } = setup();
        fireEvent.press(screen.getByText('Edit'));
        expect(onEdit).toHaveBeenCalledTimes(1);
    });
});
