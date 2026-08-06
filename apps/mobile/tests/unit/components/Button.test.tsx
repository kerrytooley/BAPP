import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button, ButtonGroup, BackButton, InlineButton } from '@components/Button';

describe('Button', () => {
    it('renders the label', () => {
        render(<Button label="Continue" />);
        expect(screen.getByText('Continue')).toBeOnTheScreen();
    });

    it('calls onPress when pressed', () => {
        const onPress = jest.fn();
        render(<Button label="Continue" onPress={onPress} />);
        fireEvent.press(screen.getByRole('button'));
        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('renders the add icon for the "add" action', () => {
        render(<Button label="Add" action="add" />);
        expect(screen.getByText('Add')).toBeOnTheScreen();
    });

    it('renders the right arrow icon for the "right arrow" action', () => {
        render(<Button label="Next" action="right arrow" />);
        expect(screen.getByText('Next')).toBeOnTheScreen();
    });

    it('renders the location icon for the "location" action', () => {
        render(<Button label="Locate" action="location" />);
        expect(screen.getByText('Locate')).toBeOnTheScreen();
    });

    it('renders no action icon when action is undefined', () => {
        render(<Button label="Plain" />);
        expect(screen.getByText('Plain')).toBeOnTheScreen();
    });

    it('does not call onPress when disabled', () => {
        const onPress = jest.fn();
        render(<Button label="Continue" disabled onPress={onPress} />);
        fireEvent.press(screen.getByRole('button'));
        expect(onPress).not.toHaveBeenCalled();
    });

    it('reflects the disabled state via accessibility', () => {
        render(<Button label="Continue" disabled />);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('renders the light variant', () => {
        render(<Button label="Light" variant="light" />);
        expect(screen.getByText('Light')).toBeOnTheScreen();
    });

    it('renders the medium size', () => {
        render(<Button label="Medium" size="medium" />);
        expect(screen.getByText('Medium')).toBeOnTheScreen();
    });
});

describe('ButtonGroup', () => {
    it('renders one button per label and wires each onPress', () => {
        const first = jest.fn();
        const second = jest.fn();
        render(
            <ButtonGroup labels={['First', 'Second']} onPress={[first, second]} />,
        );
        fireEvent.press(screen.getByText('First'));
        fireEvent.press(screen.getByText('Second'));
        expect(first).toHaveBeenCalledTimes(1);
        expect(second).toHaveBeenCalledTimes(1);
    });

    it('applies mixed variant to the group', () => {
        render(
            <ButtonGroup
                variant="mixed"
                labels={['One', 'Two']}
                onPress={[jest.fn(), jest.fn()]}
            />,
        );
        expect(screen.getByText('One')).toBeOnTheScreen();
        expect(screen.getByText('Two')).toBeOnTheScreen();
    });

    it('applies light variant to all buttons', () => {
        render(
            <ButtonGroup variant="light" labels={['One']} onPress={[jest.fn()]} />,
        );
        expect(screen.getByText('One')).toBeOnTheScreen();
    });

    it('applies dark variant to all buttons by default', () => {
        render(<ButtonGroup labels={['One']} onPress={[jest.fn()]} />);
        expect(screen.getByText('One')).toBeOnTheScreen();
    });

    it('passes actions and disabled flags through to buttons', () => {
        const onPress = jest.fn();
        render(
            <ButtonGroup
                labels={['One']}
                actions={['add']}
                disabled={[true]}
                onPress={[onPress]}
            />,
        );
        fireEvent.press(screen.getByRole('button'));
        expect(onPress).not.toHaveBeenCalled();
    });

    it('applies a single action to every button', () => {
        render(
            <ButtonGroup
                labels={['One', 'Two']}
                actions="right arrow"
                onPress={[jest.fn(), jest.fn()]}
            />,
        );
        expect(screen.getByText('One')).toBeOnTheScreen();
        expect(screen.getByText('Two')).toBeOnTheScreen();
    });
});

describe('BackButton', () => {
    it('calls navigation.goBack when pressed', () => {
        const goBack = jest.fn();
        render(<BackButton navigation={{ goBack }} />);
        fireEvent.press(screen.getByLabelText('Go back'));
        expect(goBack).toHaveBeenCalledTimes(1);
    });
});

describe('InlineButton', () => {
    it('renders its label and calls onPress', () => {
        const onPress = jest.fn();
        render(<InlineButton label="Doesn't look right?" onPress={onPress} />);
        fireEvent.press(screen.getByText("Doesn't look right?"));
        expect(onPress).toHaveBeenCalledTimes(1);
    });
});
