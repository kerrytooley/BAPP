import { render, screen, fireEvent } from '@testing-library/react-native';
import { LocationInfoModal } from '@components/Modals/AddLocationInfoModal';

describe('LocationInfoModal', () => {
    it('disables saving a blank note', () => {
        render(<LocationInfoModal isFullScreen setIsFullScreen={jest.fn()} saveNote={jest.fn()} />);
        expect(screen.getByLabelText('Save note')).toBeDisabled();

        fireEvent.changeText(screen.getByPlaceholderText('e.g. Streetlights turned on at 21:52'), '   ');
        expect(screen.getByLabelText('Save note')).toBeDisabled();
    });

    it('saves the trimmed note and closes', () => {
        const saveNote = jest.fn();
        const setIsFullScreen = jest.fn();
        render(<LocationInfoModal isFullScreen setIsFullScreen={setIsFullScreen} saveNote={saveNote} />);

        fireEvent.changeText(screen.getByPlaceholderText('e.g. Streetlights turned on at 21:52'), '  Lights on ');
        fireEvent.press(screen.getByText('Save note'));

        expect(saveNote).toHaveBeenCalledWith({ text: 'Lights on', time: expect.any(Date) });
        expect(setIsFullScreen).toHaveBeenCalledWith(false);
    });
});
