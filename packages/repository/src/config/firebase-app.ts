// Firebase initialization for @react-native-firebase (the NATIVE SDK).
//
// Unlike the Firebase JS SDK, the native SDK does NOT take a JS config object at
// runtime — the default app is auto-initialized by the native layer from
// `GoogleService-Info.plist` (iOS) / `google-services.json` (Android) at launch.
// So there is no `initializeApp(config)` here; `getFirestore()` etc. already work
// against the auto-initialized default app.
//
// What this module DOES own: pointing the SDK at the local Firebase Emulator
// Suite for development, and (v1) anonymous auth. See FIREBASE_ARCHITECTURE.md.
//
// ⚠️ Emulator + native SDK caveat: even for emulator-only use, the native SDK
// still needs a `GoogleService-Info.plist` / `google-services.json` present to
// initialize the default app, and that requires a dev-client / prebuild native
// build (this does NOT run in Expo Go). A "demo-" project id (see .firebaserc)
// lets the emulator run without real cloud credentials, but the native config
// file must still exist in the build. This cannot be exercised in a Node/CI
// context — see the repo's firebase/README.md for the device workflow.

import { getApp } from '@react-native-firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import {
  getStorage,
  connectStorageEmulator,
  setMaxOperationRetryTime,
  setMaxDownloadRetryTime,
  setMaxUploadRetryTime,
  type FirebaseStorageTypes,
} from '@react-native-firebase/storage';
import {
  getAuth,
  signInAnonymously,
  connectAuthEmulator,
  type FirebaseAuthTypes,
} from '@react-native-firebase/auth';

/** Where the local Firebase Emulator Suite is listening. Matches the repo-root firebase.json. */
export interface EmulatorConfig {
  host: string;
  firestorePort: number;
  authPort: number;
  storagePort: number;
}

/** Default emulator ports (see the repo-root firebase.json). iOS simulators reach the
 *  host directly; Android emulators reach it via `10.0.2.2`. */
export const DEFAULT_EMULATOR_CONFIG: EmulatorConfig = {
  // Not `localhost`: it can resolve to IPv6 ::1, but the emulators listen on IPv4 only.
  host: '127.0.0.1',
  firestorePort: 8080,
  authPort: 9099,
  storagePort: 9199,
};

export interface InitFirebaseOptions {
  /** Point the SDK at the local emulator suite. Omit for a real backend. */
  emulator?: EmulatorConfig;
  /** Sign in anonymously (v1 auth model). Defaults to true. */
  anonymousAuth?: boolean;
}

let emulatorsConnected = false;

/** Storage retry budget (ms). The RNFB default is ~2 minutes, so a download or
 *  upload attempted offline hangs for that long before rejecting. Lowered to 10s
 *  so `getDownloadUrl` and background uploads fail fast offline instead. */
const STORAGE_RETRY_MS = 10_000;

/**
 * Wire the native SDK for local development. Idempotent — the emulator
 * connection is applied at most once per process (re-connecting throws in the
 * native SDK). Call once at app startup, before any repository is used.
 */
export async function initFirebase(options: InitFirebaseOptions = {}): Promise<void> {
  const { emulator, anonymousAuth = true } = options;

  if (emulator && !emulatorsConnected) {
    connectFirestoreEmulator(getFirestore(), emulator.host, emulator.firestorePort);
    connectStorageEmulator(getStorage(), emulator.host, emulator.storagePort);
    connectAuthEmulator(getAuth(), `http://${emulator.host}:${emulator.authPort}`);
    emulatorsConnected = true;
  }

  // Fail fast offline: shrink Storage's ~2-minute retry budget to 10s so image
  // downloads/uploads reject quickly rather than hanging. These are local config
  // sets (no network), so they are safe to apply on every init, emulator or not.
  const storage = getStorage();
  await setMaxOperationRetryTime(storage, STORAGE_RETRY_MS);
  await setMaxDownloadRetryTime(storage, STORAGE_RETRY_MS);
  await setMaxUploadRetryTime(storage, STORAGE_RETRY_MS);

  if (anonymousAuth && !getAuth().currentUser) {
    // Non-blocking: a first-ever OFFLINE launch must still boot. Awaiting
    // signInAnonymously would hang with no connectivity, so fire it and swallow
    // (log) an offline failure — the native SDK completes it once online, and a
    // failed attempt is simply retried on a later launch via the same guard.
    void signInAnonymously(getAuth()).catch((error) => {
      console.error('[firebase] anonymous sign-in failed (will retry next launch):', error);
    });
  }
}

/** The default app (auto-initialized natively). Throws if the native config is missing. */
export function getFirebaseApp() {
  return getApp();
}

export function getDb(): FirebaseFirestoreTypes.Module {
  return getFirestore();
}

export function getFirebaseStorage(): FirebaseStorageTypes.Module {
  return getStorage();
}

export function getFirebaseAuth(): FirebaseAuthTypes.Module {
  return getAuth();
}
