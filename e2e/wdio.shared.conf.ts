import type { Options } from '@wdio/types';

// Shared WebdriverIO configuration for the BAPP mobile e2e suite.
// Platform-specific configs (wdio.ios.conf.ts / wdio.android.conf.ts) extend
// this and supply the Appium capabilities for their target device.
export const shared: Omit<WebdriverIO.Config, 'capabilities'> = {
    runner: 'local',
    tsConfigPath: './tsconfig.json',

    specs: ['./features/**/*.feature'],
    maxInstances: 1,

    logLevel: (process.env.WDIO_LOG_LEVEL as Options.Testrunner['logLevel']) ?? 'warn',
    bail: 0,
    waitforTimeout: 20000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,

    // The Appium service boots a local Appium server for the duration of the run.
    services: [
        [
            'appium',
            {
                args: {
                    address: '127.0.0.1',
                    relaxedSecurity: true,
                },
            },
        ],
    ],

    framework: 'cucumber',
    reporters: ['spec'],
    cucumberOpts: {
        require: ['./src/steps/**/*.steps.ts'],
        backtrace: true,
        requireModule: [],
        failFast: false,
        tagExpression: process.env.CUCUMBER_TAGS ?? '',
        timeout: 120000,
        ignoreUndefinedDefinitions: false,
        retry: 0,
    },
};
