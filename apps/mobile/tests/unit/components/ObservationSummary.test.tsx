import { render, screen } from '@testing-library/react-native';
import { ObservationSummary } from '@components/Observation/ObservationSummary';
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
                flightPathLetters={['A', 'C']}
            />,
        );

        expect(screen.getByText('N->S')).toBeOnTheScreen();
        expect(screen.getByText('45')).toBeOnTheScreen();
        expect(screen.getByText('Notes: a nice bat')).toBeOnTheScreen();
        expect(screen.getByText('Yes')).toBeOnTheScreen();
        expect(screen.getByText('A, C')).toBeOnTheScreen();
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
                flightPathLetters={[]}
            />,
        );

        expect(screen.getByText('Notes: N/A')).toBeOnTheScreen();
        expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText('No')).toBeOnTheScreen();
        expect(screen.getByText('None')).toBeOnTheScreen();
    });
});
