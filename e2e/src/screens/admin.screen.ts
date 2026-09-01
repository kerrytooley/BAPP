import { byId, byTestId } from '../support/selectors';

export const beginScreen = {
    beginNewSurvey: () => byId('Begin a new survey'),
};

export const createSurveyScreen = {
    nameInput: () => byId('survey-name-input'),
    postcodeInput: () => byId('survey-postcode-input'),
    continue: () => byId('Continue'),
};

export const uploadBoundaryScreen = {
    skip: () => byId('Skip'),
};

export const addSurveyorScreen = {
    leadNameInput: () => byId('lead-surveyor-name-input'),
    continue: () => byId('Continue'),
};

export const reviewScreen = {
    completeSetup: () => byId('Complete Survey Setup'),
};

export const shareCodeScreen = {
    // The code Text sets accessibilityLabel to the code value itself, so it is
    // located by testID rather than by a fixed accessibility label.
    code: () => byTestId('survey-code'),
    returnHome: () => byId('Return Home'),
};
