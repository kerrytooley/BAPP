// Default entry point: the in-memory backend — the Node-runnable test double and
// the app's current wiring.
//
// This does NOT export the Firebase (@react-native-firebase) backend, which is a
// NATIVE module that cannot load under Node/vitest/jest. Firebase lives behind
// the '@bapp/repository/firebase' subpath so that importing '@bapp/repository'
// from the domain tests or the mobile suites never pulls in the native SDK.
export * from './in-memory';
