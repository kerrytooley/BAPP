import type { SurveyExport, SurveyExportRepository, Unsubscribe } from '@bapp/domain';
import {
  collection,
  doc,
  getDocFromServer,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from '@react-native-firebase/firestore';
import { getDb, getFirebaseAuth } from '../config/firebase-app';
import { nowTimestamp } from '../config/firestore-mapping';
import {
  EXPORTS_SUBCOLLECTION,
  EXPORT_REQUESTS_SUBCOLLECTION,
  EXPORT_THROTTLES_COLLECTION,
  LATEST_EXPORT_DOC,
  surveyExportFromData,
} from '../mapping/survey-docs';

/** Reads exports built by the `functions/` Cloud Functions; clients only create requests. */
export class FirebaseSurveyExportRepository implements SurveyExportRepository {
  async getLatest(surveyId: string): Promise<SurveyExport | null> {
    const snap = await getDocFromServer(latestRef(surveyId));
    return snap.exists() ? surveyExportFromData(snap.data()) : null;
  }

  subscribeLatest(surveyId: string, callback: (value: SurveyExport | null) => void): Unsubscribe {
    return onSnapshot(latestRef(surveyId), (snap) =>
      callback(snap.exists() ? surveyExportFromData(snap.data()) : null),
    );
  }

  /**
   * Awaits the server (unlike other writes): callers have just reached it, and a
   * request refused by the per-caller rate limit (firestore.rules) must fail now
   * rather than leave the caller waiting for an answer that never comes.
   */
  async requestExport(surveyId: string): Promise<string> {
    const uid = getFirebaseAuth().currentUser?.uid;
    if (!uid) throw new Error('Not signed in');
    const db = getDb();
    const ref = doc(collection(db, 'surveys', surveyId, EXPORT_REQUESTS_SUBCOLLECTION));
    const batch = writeBatch(db);
    batch.set(ref, { requestedAt: nowTimestamp() });
    batch.set(doc(db, EXPORT_THROTTLES_COLLECTION, uid), { lastRequestAt: serverTimestamp() });
    await batch.commit();
    return ref.id;
  }
}

function latestRef(surveyId: string) {
  return doc(getDb(), 'surveys', surveyId, EXPORTS_SUBCOLLECTION, LATEST_EXPORT_DOC);
}
