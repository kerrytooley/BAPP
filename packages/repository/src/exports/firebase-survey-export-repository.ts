import type { SurveyExport, SurveyExportRepository, Unsubscribe } from '@bapp/domain';
import {
  collection,
  doc,
  getDocFromServer,
  onSnapshot,
  setDoc,
} from '@react-native-firebase/firestore';
import { getDb } from '../config/firebase-app';
import { nowTimestamp, queueWrite } from '../config/firestore-mapping';
import {
  EXPORTS_SUBCOLLECTION,
  EXPORT_REQUESTS_SUBCOLLECTION,
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

  async requestExport(surveyId: string): Promise<string> {
    const ref = doc(collection(getDb(), 'surveys', surveyId, EXPORT_REQUESTS_SUBCOLLECTION));
    queueWrite(setDoc(ref, { requestedAt: nowTimestamp() }), `export.request ${surveyId}/${ref.id}`);
    return ref.id;
  }
}

function latestRef(surveyId: string) {
  return doc(getDb(), 'surveys', surveyId, EXPORTS_SUBCOLLECTION, LATEST_EXPORT_DOC);
}
