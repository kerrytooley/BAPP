import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Card } from '@components/Card';

describe('Card', () => {
    it('renders the card label', () => {
        render(<Card cardLabel="Surveyor" />);
        expect(screen.getByText('Surveyor')).toBeOnTheScreen();
    });

    it('renders its children', () => {
        render(
            <Card cardLabel="Surveyor">
                <Text>Child content</Text>
            </Card>,
        );
        expect(screen.getByText('Child content')).toBeOnTheScreen();
    });

    it('does not render a close control when not removable', () => {
        const onClose = jest.fn();
        render(<Card cardLabel="Surveyor" onClose={onClose} />);
        expect(screen.queryByLabelText('Remove Surveyor')).toBeNull();
    });

    it('renders a close control and calls onClose when removable', () => {
        const onClose = jest.fn();
        render(<Card cardLabel="Surveyor" removable onClose={onClose} />);
        fireEvent.press(screen.getByLabelText('Remove Surveyor'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
