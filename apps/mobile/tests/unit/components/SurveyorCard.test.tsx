import { render, screen, fireEvent } from '@testing-library/react-native';
import { SurveyorCard } from '@components/SurveyorCard';

const noop = () => { };

describe('SurveyorCard', () => {
    it('renders the lead label and no close control when isLead', () => {
        render(
            <SurveyorCard
                isLead
                name="Ada"
                onChangeName={noop}
                onEndEditingName={noop}
                onClose={jest.fn()}
            />,
        );
        expect(screen.getByText('Add Lead Surveyor')).toBeOnTheScreen();
        expect(screen.queryByLabelText('Remove Add Lead Surveyor')).toBeNull();
    });

    it('renders the surveyor label and calls onClose when removed', () => {
        const onClose = jest.fn();
        render(
            <SurveyorCard
                name="Ada"
                onChangeName={noop}
                onEndEditingName={noop}
                onClose={onClose}
            />,
        );
        expect(screen.getByText('Add Surveyor')).toBeOnTheScreen();
        fireEvent.press(screen.getByLabelText('Remove Add Surveyor'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows the surveyor name', () => {
        render(
            <SurveyorCard
                name="Grace"
                onChangeName={noop}
                onEndEditingName={noop}
                onClose={noop}
            />,
        );
        expect(screen.getByDisplayValue('Grace')).toBeOnTheScreen();
    });

    it('calls onChangeName and onEndEditingName from the input', () => {
        const onChangeName = jest.fn();
        const onEndEditingName = jest.fn();
        render(
            <SurveyorCard
                name=""
                onChangeName={onChangeName}
                onEndEditingName={onEndEditingName}
                onClose={noop}
            />,
        );
        const input = screen.getByPlaceholderText('Input Surveyor Name');
        fireEvent.changeText(input, 'Grace');
        fireEvent(input, 'endEditing');
        expect(onChangeName).toHaveBeenCalledWith('Grace');
        expect(onEndEditingName).toHaveBeenCalledTimes(1);
    });

    it('labels the location button "Add" when there is no location', () => {
        const onAddLocation = jest.fn();
        render(
            <SurveyorCard
                name="Ada"
                onChangeName={noop}
                onEndEditingName={noop}
                onAddLocation={onAddLocation}
                onClose={noop}
            />,
        );
        fireEvent.press(screen.getByText('Add Surveyor Location'));
        expect(onAddLocation).toHaveBeenCalledTimes(1);
    });

    it('labels the location button "Edit" when a location exists', () => {
        render(
            <SurveyorCard
                name="Ada"
                hasLocation
                onChangeName={noop}
                onEndEditingName={noop}
                onClose={noop}
            />,
        );
        expect(screen.getByText('Edit Surveyor Location')).toBeOnTheScreen();
    });

    it('reports an unavailable location instead of opening it', () => {
        const onAddLocation = jest.fn();
        const onLocationUnavailable = jest.fn();
        render(
            <SurveyorCard
                name="Ada"
                onChangeName={noop}
                onAddLocation={onAddLocation}
                canAddLocation={false}
                onLocationUnavailable={onLocationUnavailable}
                onClose={noop}
            />,
        );
        fireEvent.press(screen.getByText('Add Surveyor Location'));
        expect(onLocationUnavailable).toHaveBeenCalledTimes(1);
        expect(onAddLocation).not.toHaveBeenCalled();
    });
});
