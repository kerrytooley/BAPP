import { byId } from '../support/selectors';

export const beginScreen = {
    beginNewSurvey: () => byId('Begin a new survey'),
};

export const emailScreen = {
    emailInput: () => byId('email-input'),
    continue: () => byId('Continue'),
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
    code: () => byId('survey-code'),
    returnHome: () => byId('Return Home'),
};
