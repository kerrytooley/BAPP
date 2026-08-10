import path from 'node:path';
import { shared } from './wdio.shared.conf';

// Path to the built debug/release .apk. Override with ANDROID_APP_PATH.
// Build it first, e.g. from apps/mobile:
//   npx expo run:android --variant release --no-bundler
// then point ANDROID_APP_PATH at the produced apk under
// android/app/build/outputs/apk/...
const app =
    process.env.ANDROID_APP_PATH ??
    path.resolve(__dirname, './apps/BAPP.apk');

export const config: WebdriverIO.Config = {
    ...shared,
    port: 4723,
    capabilities: [
        {
            platformName: 'Android',
            'appium:automationName': 'UiAutomator2',
            'appium:deviceName': process.env.ANDROID_DEVICE ?? 'Android Emulator',
            ...(process.env.ANDROID_AVD ? { 'appium:avd': process.env.ANDROID_AVD } : {}),
            'appium:app': app,
            'appium:appPackage': 'com.bapp.mobile',
            'appium:autoGrantPermissions': true,
            'appium:newCommandTimeout': 240,
            'appium:uiautomator2ServerLaunchTimeout': 120000,
        },
    ],
};
