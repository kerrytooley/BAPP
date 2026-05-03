// TODO: Initialize Firebase app with environment-specific config.
// Config values should be injected at runtime (e.g., from environment variables or Expo constants).

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;

/** Call once at app startup with your environment-specific Firebase config. */
export function initFirebase(config: FirebaseConfig): void {
  app = initializeApp(config);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
}

export function getApp(): FirebaseApp {
  if (!app) throw new Error('Firebase has not been initialized. Call initFirebase() first.');
  return app;
}

export function getDb(): Firestore {
  if (!db) throw new Error('Firebase has not been initialized. Call initFirebase() first.');
  return db;
}

export function getFirebaseAuth(): Auth {
  if (!auth) throw new Error('Firebase has not been initialized. Call initFirebase() first.');
  return auth;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) throw new Error('Firebase has not been initialized. Call initFirebase() first.');
  return storage;
}
