import { $, driver } from '@wdio/globals';

/**
 * Selects an element by its cross-platform accessibility id.
 *
 * In the app every interactive element sets the same value on both `testID`
 * (iOS accessibilityIdentifier / Android resource-id) and `accessibilityLabel`
 * (Android content-desc), so the Appium `~` accessibility-id selector resolves
 * it identically on iOS and Android.
 */
export const byId = (id: string) => $(`~${id}`);

/**
 * Selects an element by its React Native `testID` alone, for elements whose
 * `accessibilityLabel` carries a dynamic value (e.g. the shared survey code) or
 * is absent (e.g. the confirmation-screen titles). `testID` maps to the iOS
 * accessibilityIdentifier (matched by `~`) and to the Android `resource-id`
 * (matched by a resource-id XPath), so this resolves the same element on both
 * platforms regardless of the accessibility label.
 */
export const byTestId = (testId: string) =>
    driver.isIOS ? $(`~${testId}`) : $(`//*[@resource-id="${testId}"]`);
