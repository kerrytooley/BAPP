import { $ } from '@wdio/globals';

/**
 * Selects an element by its cross-platform accessibility id.
 *
 * In the app every interactive element sets the same value on both `testID`
 * (iOS accessibilityIdentifier / Android resource-id) and `accessibilityLabel`
 * (Android content-desc), so the Appium `~` accessibility-id selector resolves
 * it identically on iOS and Android.
 */
export const byId = (id: string) => $(`~${id}`);
