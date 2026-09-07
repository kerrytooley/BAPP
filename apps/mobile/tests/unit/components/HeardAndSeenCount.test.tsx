import { render, screen, fireEvent } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import { HeardAndSeenCount } from '@components/Observation/HeardAndSeenCount';

const setup = (heardCount = 1, seenCount = 2) => {
    const onChangeHeard = jest.fn();
    const onChangeSeen = jest.fn();
    render(
        <HeardAndSeenCount
            heardCount={heardCount}
            seenCount={seenCount}
            onChangeHeard={onChangeHeard}
            onChangeSeen={onChangeSeen}
        />,
    );
    // Order: [heard-minus, heard-plus, seen-minus, seen-plus]
    const buttons = screen.UNSAFE_getAllByType(TouchableOpacity);
    return { onChangeHeard, onChangeSeen, buttons };
};

describe('HeardAndSeenCount', () => {
    it('renders the current heard and seen counts', () => {
        setup(4, 7);
        expect(screen.getByText('4')).toBeOnTheScreen();
        expect(screen.getByText('7')).toBeOnTheScreen();
    });

    it('increments the heard count', () => {
        const { onChangeHeard, buttons } = setup(1);
        fireEvent.press(buttons[1]);
        expect(onChangeHeard).toHaveBeenCalledWith(2);
    });

    it('decrements the heard count', () => {
        const { onChangeHeard, buttons } = setup(3);
        fireEvent.press(buttons[0]);
        expect(onChangeHeard).toHaveBeenCalledWith(2);
    });

    it('increments the seen count', () => {
        const { onChangeSeen, buttons } = setup(1, 5);
        fireEvent.press(buttons[3]);
        expect(onChangeSeen).toHaveBeenCalledWith(6);
    });

    it('decrements the seen count', () => {
        const { onChangeSeen, buttons } = setup(1, 5);
        fireEvent.press(buttons[2]);
        expect(onChangeSeen).toHaveBeenCalledWith(4);
    });
});
