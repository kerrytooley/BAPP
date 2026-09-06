import {
  applySurveyDefaults,
  type Survey,
  type CreateSurveyInput,
  type UpdateSurveyInput,
  type SurveyRepository,
  type SurveyContext,
  type Unsubscribe,
} from '@bapp/domain';
import {
  collection,
  doc,
  getDoc,
  getDocFromCache,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { getDb } from '../config/firebase-app';
import {
  toDateOrNull,
  toDateRequired,
  stripUndefined,
  nowTimestamp,
  queueWrite,
} from '../config/firestore-mapping';
import { fromLocationDoc } from '../locations/firebase-location-repository';
import { fromSurveyorDoc } from '../surveyors/firebase-surveyor-repository';
import { fromObservationDoc } from '../observations/firebase-observation-repository';

const COLLECTION = 'surveys';
/** Child subcollections that must be deleted with their parent survey (no
 *  Firestore cascade). Names match the other repositories' SUBCOLLECTION. */
const SUBCOLLECTIONS = ['locations', 'surveyors', 'observations'] as const;

function fromSurveyDoc(snap: FirebaseFirestoreTypes.DocumentSnapshot): Survey {
  const d = (snap.data() ?? {}) as FirebaseFirestoreTypes.DocumentData;
  return {
    id: snap.id,
    adminCode: d.adminCode,
    surveyorCode: d.surveyorCode,
    name: d.name ?? null,
    postcode: d.postcode ?? null,
    date: toDateOrNull(d.date),
    sunsetTime: toDateOrNull(d.sunsetTime),
    startTime: toDateOrNull(d.startTime),
    endTime: toDateOrNull(d.endTime),
    boundary: d.boundary ?? null,
    status: d.status ?? 'draft',
    weather: d.weather ?? {},
    data: d.data ?? {},
    createdAt: toDateRequired(d.createdAt),
    updatedAt: toDateRequired(d.updatedAt),
  };
}

export class FirebaseSurveyRepository implements SurveyRepository {
  async create(input: CreateSurveyInput): Promise<Survey> {
    // Join codes are supplied by the domain service (generated + made unique
    // there), not invented here. Business defaults come from the shared
    // normalizer; this backend owns only id + timestamps.
    //
    // Pre-generate the id with `doc()` (instead of `addDoc`, whose promise only
    // resolves on server ack) so we know the ref synchronously and can read the
    // result back from cache while offline. The write is queued, not awaited.
    const now = nowTimestamp();
    const ref = doc(collection(getDb(), COLLECTION));
    queueWrite(
      setDoc(ref, {
        ...stripUndefined(applySurveyDefaults(input)),
        createdAt: now,
        updatedAt: now,
      }),
      `survey.create ${ref.id}`,
    );
    return fromSurveyDoc(await getDocFromCache(ref));
  }

  async findById(id: string): Promise<Survey | null> {
    const snap = await getDoc(doc(getDb(), COLLECTION, id));
    return snap.exists() ? fromSurveyDoc(snap) : null;
  }

  async findByAdminCode(adminCode: string): Promise<Survey | null> {
    return this.findByField('adminCode', adminCode);
  }

  async findBySurveyorCode(surveyorCode: string): Promise<Survey | null> {
    return this.findByField('surveyorCode', surveyorCode);
  }

  async update(id: string, input: UpdateSurveyInput): Promise<Survey> {
    const ref = doc(getDb(), COLLECTION, id);
    queueWrite(
      updateDoc(ref, { ...stripUndefined(input), updatedAt: nowTimestamp() }),
      `survey.update ${id}`,
    );
    return fromSurveyDoc(await getDocFromCache(ref));
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    // Firestore does NOT cascade: deleting the survey doc alone would orphan its
    // locations/surveyors/observations, which remain reachable via collection-group
    // queries. Delete every child first, then the parent. Reads come from cache
    // offline; all deletes are queued (not awaited on server ack) and flush on
    // reconnect, so this stays offline-safe.
    for (const sub of SUBCOLLECTIONS) {
      const children = await getDocs(collection(db, COLLECTION, id, sub));
      for (const child of children.docs) {
        queueWrite(deleteDoc(child.ref), `survey.delete ${id}/${sub}/${child.id}`);
      }
    }
    // Queued, not awaited: the deletion is applied to the local cache
    // immediately and flushed on reconnect. Awaiting would hang while offline.
    queueWrite(deleteDoc(doc(db, COLLECTION, id)), `survey.delete ${id}`);
  }

  subscribeById(id: string, callback: (survey: Survey | null) => void): Unsubscribe {
    return onSnapshot(doc(getDb(), COLLECTION, id), (snap) =>
      callback(snap.exists() ? fromSurveyDoc(snap) : null),
    );
  }

  /**
   * One survey-doc read + three subcollection reads, in parallel — the composed
   * read the port promises. Kept on the repository (decision C) so a backend can
   * own its read strategy; here that's a parallel fan-out over subcollections.
   */
  async getSurveyContext(surveyId: string): Promise<SurveyContext> {
    const db = getDb();
    const [surveySnap, locationsSnap, surveyorsSnap, observationsSnap] = await Promise.all([
      getDoc(doc(db, COLLECTION, surveyId)),
      getDocs(collection(db, COLLECTION, surveyId, 'locations')),
      getDocs(collection(db, COLLECTION, surveyId, 'surveyors')),
      getDocs(collection(db, COLLECTION, surveyId, 'observations')),
    ]);
    if (!surveySnap.exists()) throw new Error(`Survey ${surveyId} not found`);
    return {
      survey: fromSurveyDoc(surveySnap),
      locations: locationsSnap.docs.map(fromLocationDoc),
      surveyors: surveyorsSnap.docs.map(fromSurveyorDoc),
      observations: observationsSnap.docs.map(fromObservationDoc),
    };
  }

  private async findByField(field: 'adminCode' | 'surveyorCode', value: string): Promise<Survey | null> {
    const snap = await getDocs(query(collection(getDb(), COLLECTION), where(field, '==', value)));
    return snap.empty ? null : fromSurveyDoc(snap.docs[0]);
  }
}
