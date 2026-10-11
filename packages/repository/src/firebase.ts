// Firebase (native, @react-native-firebase) backend entry point.
// Import via '@bapp/repository/firebase'.
//
// Kept OUT of the main barrel ('@bapp/repository') on purpose: these modules
// import @react-native-firebase, which only loads in a React Native runtime
// (device / simulator), never under Node. Node test suites import the main
// barrel and get the in-memory backend instead. See FIREBASE_ARCHITECTURE.md.
export * from './config/firebase-app';
export * from './surveys/firebase-survey-repository';
export * from './locations/firebase-location-repository';
export * from './surveyors/firebase-surveyor-repository';
export * from './observations/firebase-observation-repository';
export * from './media/firebase-media-repository';
export * from './exports/firebase-survey-export-repository';
