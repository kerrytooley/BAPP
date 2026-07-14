import { byId, byTestId } from '../support/selectors';

export const inputCodeScreen = {
    codeInput: () => byId('survey-code-input'),
    continue: () => byId('Continue'),
};

export const codeConfirmationScreen = {
    heading: () => byId('confirmation-heading'),
    // The survey title carries a dynamic value (name - postcode), so it is
    // located by its testID rather than by an accessibility label.
    surveyTitle: () => byTestId('confirmation-survey-title'),
    continue: () => byId('Continue'),
};
