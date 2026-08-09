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

export const selectSurveyorScreen = {
    // Each surveyor renders as a Button whose label (and thus testID /
    // accessibility-id) is "Lead Surveyor: <name>" for the lead, or the plain
    // name otherwise.
    lead: (name: string) => byId(`Lead Surveyor: ${name}`),
    surveyor: (name: string) => byId(name),
};

export const confirmSurveyorDetailsScreen = {
    continue: () => byId('Continue'),
};

export const weatherConditionsScreen = {
    temperatureInput: () => byId('weather-temperature-input'),
    rain: (option: 'Wet' | 'Dry') => byId(option),
    continue: () => byId('Continue'),
};

export const confirmLocationScreen = {
    continue: () => byId('Continue'),
};

export const selectSpeciesScreen = {
    // Each bat tile sets its species as testID / accessibility-id.
    species: (species: string) => byId(species),
    unknown: () => byId('Unknown'),
};
