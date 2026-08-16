// Stub for @react-native-firebase/{app,firestore,auth,storage}. The native SDK
// can't load under Jest; the suites never exercise the Firebase repos (they use
// in-memory repos or mocked services), so this just satisfies the imports if any
// module under '@bapp/repository/firebase' is ever pulled into a test's graph.

// App
export const getApp = jest.fn();
export const getApps = jest.fn(() => []);
export const initializeApp = jest.fn();

// Firestore (modular)
export const getFirestore = jest.fn();
export const connectFirestoreEmulator = jest.fn();
export const collection = jest.fn();
export const collectionGroup = jest.fn();
export const doc = jest.fn(() => ({ id: 'mock-id' }));
export const addDoc = jest.fn(() => Promise.resolve({ id: 'mock-id' }));
export const getDoc = jest.fn();
export const getDocs = jest.fn();
export const setDoc = jest.fn();
export const updateDoc = jest.fn();
export const deleteDoc = jest.fn();
export const query = jest.fn();
export const where = jest.fn();
export const orderBy = jest.fn();
export const onSnapshot = jest.fn(() => () => undefined);
export const serverTimestamp = jest.fn();
export class Timestamp {
  constructor(public seconds = 0, public nanoseconds = 0) {}
  static fromDate(date: Date) {
    return new Timestamp(Math.floor(date.getTime() / 1000), 0);
  }
  toDate() {
    return new Date(this.seconds * 1000);
  }
}

// Storage (modular)
export const getStorage = jest.fn();
export const connectStorageEmulator = jest.fn();
export const ref = jest.fn();
export const uploadBytesResumable = jest.fn();
export const getDownloadURL = jest.fn();
export const deleteObject = jest.fn();

// Auth (modular)
export const getAuth = jest.fn(() => ({ currentUser: null }));
export const signInAnonymously = jest.fn(() => Promise.resolve());
export const connectAuthEmulator = jest.fn();
