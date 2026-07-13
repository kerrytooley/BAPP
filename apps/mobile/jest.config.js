const path = require('path');

/** Shared module name mapping so Jest understands the app's tsconfig path aliases. */
const moduleNameMapper = {
    // SVG imports (react-native-svg-transformer) -> lightweight mock component.
    // Must come before the @assets alias so `*.svg` requests are intercepted.
    '\.svg$': '<rootDir>/tests/jest/svgMock.tsx',
    // Firebase is only initialized at runtime; unit tests use in-memory repos or
    // mocked services, so stub the Firebase SDK to avoid loading its ESM build.
    '^firebase/(app|firestore|auth|storage)$': '<rootDir>/tests/jest/firebaseMock.ts',
    '^@bapp/domain$': '<rootDir>/../../packages/domain/src/index.ts',
    '^@bapp/repository$': '<rootDir>/../../packages/repository/src/index.ts',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@assets/(.*)$': '<rootDir>/assets/$1',
    '^@theme/(.*)$': '<rootDir>/src/theme/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@navigators/(.*)$': '<rootDir>/src/navigation/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
};

// Allow RN/Expo ESM + Flow-typed deps through Babel. This must be pnpm-aware:
// pnpm nests packages under `node_modules/.pnpm/<pkg>@<version>/node_modules/...`,
// so the negative lookahead is anchored after `.pnpm/`.
const transformIgnorePatterns = [
    'node_modules/.pnpm/(?!((jest-)?react-native|@react-native|@react-native-community|@react-navigation|expo|@expo|@expo-google-fonts|@unimodules|unimodules|sentry-expo|native-base|@gorhom|jest-cucumber|@cucumber|uuid))',
];

const baseProject = {
    preset: 'jest-expo',
    moduleNameMapper,
    transformIgnorePatterns,
    setupFilesAfterEnv: ['<rootDir>/tests/jest/setup.ts'],
};

module.exports = {
    projects: [
        {
            ...baseProject,
            displayName: 'unit',
            testMatch: [
                '<rootDir>/tests/unit/**/*.test.ts',
                '<rootDir>/tests/unit/**/*.test.tsx',
            ],
        },
        {
            ...baseProject,
            displayName: 'integration',
            testMatch: ['<rootDir>/tests/features/integration/**/*.steps.tsx'],
        },
        {
            ...baseProject,
            displayName: 'e2e',
            testMatch: ['<rootDir>/tests/features/e2e/**/*.steps.tsx'],
        },
    ],

    // Coverage is measured from the unit suite, which must exercise the whole
    // front-end surface. Thresholds enforce the "100% unit coverage" requirement.
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.test.{ts,tsx}',
        '!src/types/**',
        '!src/**/*.d.ts',
    ],
    coverageDirectory: path.join(__dirname, 'tests/coverage'),
    coverageReporters: ['text', 'text-summary', 'lcov'],
    coverageThreshold: {
        global: {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100,
        },
    },
};
