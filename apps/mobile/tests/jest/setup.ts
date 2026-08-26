/* eslint-disable @typescript-eslint/no-var-requires */
// RNTL v13 registers its Jest matchers automatically on import; the former
// '@testing-library/react-native/extend-expect' entry point was removed.

// Silence the reanimated warning and provide a functional mock.
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  // The mock omits `call`, which some versions of the library reference.
  Reanimated.default.call = () => undefined;
  return Reanimated;
});

// Gesture handler ships an official Jest setup that stubs the native module.
require('react-native-gesture-handler/jestSetup');

// @gorhom/bottom-sheet renders through reanimated/gesture-handler; use the
// library-provided mock so its children render synchronously in tests.
jest.mock('@gorhom/bottom-sheet', () => require('@gorhom/bottom-sheet/mock'));

// Provide stable safe-area insets without needing a SafeAreaProvider wrapper.
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// Quieten noisy act(...) / animation warnings that are irrelevant to assertions.
const originalWarn = console.warn;
const originalError = console.error;
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => { });
  jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? '');
    if (message.includes('useNativeDriver') || message.includes('componentWillReceiveProps')) {
      return;
    }
    originalWarn(...(args as []));
  });
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? '');
    // TouchableOpacity's press opacity animation schedules a post-test state
    // update that React flags as outside act(); it is a known false positive.
    if (message.includes('not wrapped in act')) {
      return;
    }
    originalError(...(args as []));
  });
});
