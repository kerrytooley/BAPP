import { render, screen } from '@testing-library/react-native';
import { SummaryRow, SummaryGroup } from '@components/SummaryRow';

describe('SummaryRow', () => {
    it('renders a string value verbatim', () => {
        render(<SummaryRow label="Postcode" value="SW1A 1AA" />);
        expect(screen.getByText('Postcode')).toBeOnTheScreen();
        expect(screen.getByText('SW1A 1AA')).toBeOnTheScreen();
    });

    it('formats a Date value as DD/MM/YYYY', () => {
        render(<SummaryRow label="Date" value={new Date(2026, 6, 13)} />);
        expect(screen.getByText('13/07/2026')).toBeOnTheScreen();
    });
});

describe('SummaryGroup', () => {
    it('renders the group title and each row', () => {
        render(
            <SummaryGroup
                groupTitle="Survey"
                summaryRows={[
                    { label: 'Name', value: 'Dusk count' },
                    { label: 'Date', value: new Date(2026, 6, 13) },
                ]}
            />,
        );
        expect(screen.getByText('Survey')).toBeOnTheScreen();
        expect(screen.getByText('Name')).toBeOnTheScreen();
        expect(screen.getByText('Dusk count')).toBeOnTheScreen();
        expect(screen.getByText('Date')).toBeOnTheScreen();
        expect(screen.getByText('13/07/2026')).toBeOnTheScreen();
    });

    it('renders no rows for an empty group', () => {
        render(<SummaryGroup groupTitle="Empty" summaryRows={[]} />);
        expect(screen.getByText('Empty')).toBeOnTheScreen();
    });
});
