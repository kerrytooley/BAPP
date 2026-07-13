import { render, screen } from '@testing-library/react-native';
import { Title } from '@components/Titles';

describe('Title', () => {
    it('renders the title', () => {
        render(<Title title="Welcome" />);
        expect(screen.getByText('Welcome')).toBeOnTheScreen();
    });

    it('renders the subtitle when provided', () => {
        render(<Title title="Welcome" subtitle="Let's begin" />);
        expect(screen.getByText("Let's begin")).toBeOnTheScreen();
    });

    it('does not render a subtitle when omitted', () => {
        render(<Title title="Welcome" />);
        expect(screen.queryByText("Let's begin")).toBeNull();
    });
});
