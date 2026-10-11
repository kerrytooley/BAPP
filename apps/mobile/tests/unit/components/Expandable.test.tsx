import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Expandable } from '@components/Common/Expandable';

describe('Expandable', () => {
    it('toggles its content and reports the expanded state', () => {
        render(
            <Expandable header={<Text>Header</Text>} accessibilityLabel="Section">
                <Text>Body</Text>
            </Expandable>,
        );
        expect(screen.queryByText('Body')).toBeNull();

        fireEvent.press(screen.getByLabelText('Section'));
        expect(screen.getByText('Body')).toBeOnTheScreen();
        expect(screen.getByLabelText('Section').props.accessibilityState).toEqual(expect.objectContaining({ expanded: true }));

        fireEvent.press(screen.getByLabelText('Section'));
        expect(screen.queryByText('Body')).toBeNull();
    });

    it('can start expanded', () => {
        render(
            <Expandable header={<Text>Header</Text>} accessibilityLabel="Section" initiallyExpanded>
                <Text>Body</Text>
            </Expandable>,
        );
        expect(screen.getByText('Body')).toBeOnTheScreen();
    });
});
