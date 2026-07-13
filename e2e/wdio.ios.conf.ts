import path from 'node:path';
import { shared } from './wdio.shared.conf';

// Path to the built .app (simulator build). Override with IOS_APP_PATH.
// Build it first, e.g. from apps/mobile:
//   npx expo run:ios --configuration Release --no-bundler
// then point IOS_APP_PATH at the produced `BAPP.app` in DerivedData / ios/build.
const app =
    process.env.IOS_APP_PATH ??
    path.resolve(__dirname, './apps/BAPP.app');

export const config: WebdriverIO.Config = {
    ...shared,
    port: 4723,
    capabilities: [
        {
            platformName: 'iOS',
            'appium:automationName': 'XCUITest',
            'appium:deviceName': process.env.IOS_DEVICE ?? 'iPhone 15',
            ...(process.env.IOS_VERSION
                ? { 'appium:platformVersion': process.env.IOS_VERSION }
                : {}),
            'appium:app': app,
            'appium:autoAcceptAlerts': true,
            'appium:newCommandTimeout': 240,
            'appium:wdaLaunchTimeout': 120000,
            'appium:wdaConnectionTimeout': 120000,
        },
    ],
};
