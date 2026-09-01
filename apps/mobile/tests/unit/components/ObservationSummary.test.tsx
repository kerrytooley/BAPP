import { render, screen } from '@testing-library/react-native';
import { ObservationSummary } from '@components/ObservationSummary';
import { buildObservation } from '../../helpers/factories';

describe('ObservationSummary', () => {
    it('renders present/positive values (emergence, direction, frequency, flight paths, notes)', () => {
        render(
            <ObservationSummary
                {...buildObservation({
                    emergence: true,
                    direction: 'N->S',
                    frequency: '45',
                    flightPaths: [{ id: 'fp-1', surface: 'boundary', points: [{ x: 0, y: 0 }] }],
                    notes: 'a nice bat',
                })}
            />,
        );

        expect(screen.getByText('N->S')).toBeOnTheScreen();
        expect(screen.getByText('45')).toBeOnTheScreen();
        expect(screen.getByText('Notes: a nice bat')).toBeOnTheScreen();
        // emergence 'Yes' and flight paths 'Yes'
        expect(screen.getAllByText('Yes').length).toBeGreaterThanOrEqual(2);
    });

    it('renders fallbacks for missing values (No / N/A)', () => {
        render(
            <ObservationSummary
                {...buildObservation({
                    emergence: false,
                    direction: null,
                    frequency: null,
                    flightPaths: [],
                    notes: null,
                })}
            />,
        );

        expect(screen.getByText('Notes: N/A')).toBeOnTheScreen();
        // direction + frequency show 'N/A'
        expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(2);
        // emergence 'No' and flight paths 'No'
        expect(screen.getAllByText('No').length).toBeGreaterThanOrEqual(2);
    });
});
