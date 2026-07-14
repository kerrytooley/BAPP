import { Given, When, Then } from '@wdio/cucumber-framework';
import { expect } from '@wdio/globals';

import { welcomeScreen } from '../screens/welcome.screen';
import {
    beginScreen,
    emailScreen,
    createSurveyScreen,
    uploadBoundaryScreen,
    addSurveyorScreen,
    reviewScreen,
    shareCodeScreen,
} from '../screens/admin.screen';
import { inputCodeScreen, codeConfirmationScreen } from '../screens/surveyor.screen';
import { tap, enterText, readText } from '../support/actions';
import { state } from '../support/world';

Given('the app is open on the welcome screen', async () => {
    await expect(welcomeScreen.joinAsAdmin()).toBeDisplayed();
});

When('the admin chooses to join as a survey admin', async () => {
    await tap(welcomeScreen.joinAsAdmin());
});

When('begins a new survey', async () => {
    await tap(beginScreen.beginNewSurvey());
});

When(/^provides the admin email "(.*)"$/, async (email: string) => {
    await enterText(emailScreen.emailInput(), email);
    await tap(emailScreen.continue());
});

When(
    /^enters the survey name "(.*)" and postcode "(.*)"$/,
    async (name: string, postcode: string) => {
        await enterText(createSurveyScreen.nameInput(), name);
        await enterText(createSurveyScreen.postcodeInput(), postcode);
        await tap(createSurveyScreen.continue());
    },
);

When('skips the red line boundary upload', async () => {
    await tap(uploadBoundaryScreen.skip());
});

When(/^names the lead surveyor "(.*)"$/, async (name: string) => {
    await enterText(addSurveyorScreen.leadNameInput(), name);
});

When('completes the survey setup', async () => {
    await tap(addSurveyorScreen.continue());
    await tap(reviewScreen.completeSetup());
});

Then('a shareable survey code is displayed', async () => {
    const code = await readText(shareCodeScreen.code());
    expect(code).toMatch(/^[a-z0-9]{6}$/);
    state.surveyCode = code;
});

When('the admin returns home', async () => {
    await tap(shareCodeScreen.returnHome());
});

When('the surveyor chooses to join as a surveyor', async () => {
    await tap(welcomeScreen.joinAsSurveyor());
});

When('enters the shared survey code', async () => {
    if (!state.surveyCode) {
        throw new Error('No survey code was captured from the admin flow');
    }
    await enterText(inputCodeScreen.codeInput(), state.surveyCode);
    await tap(inputCodeScreen.continue());
});

Then(
    /^the survey details "(.*)" are shown for confirmation$/,
    async (expectedTitle: string) => {
        await expect(codeConfirmationScreen.heading()).toBeDisplayed();
        const title = await readText(codeConfirmationScreen.surveyTitle());
        expect(title).toEqual(expectedTitle);
    },
);
