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
  getDocCacheFirst,
  getDocsCacheFirst,
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
    startWeather: d.startWeather ?? null,
    endWeather: d.endWeather ?? null,
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
    const snap = await getDocCacheFirst(doc(getDb(), COLLECTION, id));
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
      getDocCacheFirst(doc(db, COLLECTION, surveyId)),
      getDocsCacheFirst(collection(db, COLLECTION, surveyId, 'locations')),
      getDocsCacheFirst(collection(db, COLLECTION, surveyId, 'surveyors')),
      getDocsCacheFirst(collection(db, COLLECTION, surveyId, 'observations')),
    ]);
    if (!surveySnap.exists()) throw new Error(`Survey ${surveyId} not found`);
    return {
      survey: fromSurveyDoc(surveySnap),
      locations: locationsSnap.docs.map(fromLocationDoc),
      surveyors: surveyorsSnap.docs.map(fromSurveyorDoc),
      observations: observationsSnap.docs.map(fromObservationDoc),
    };
  }

  /**
   * Live counterpart to `getSurveyContext`: four `onSnapshot` listeners (the
   * survey doc + its three subcollections) merged into one `SurveyContext` stream.
   * `includeMetadataChanges` is on so a locally-applied write surfaces immediately
   * from cache (fromCache/pending metadata) rather than waiting on server ack —
   * the read-your-writes offline experience the rest of this repo is built around.
   *
   * We hold the latest snapshot of each part in a local variable and re-emit the
   * merged context on any change, but only once the survey doc itself has loaded
   * (exists) — mirroring `getSurveyContext`'s "no survey ⇒ no context" contract.
   */
  subscribeSurveyContext(surveyId: string, callback: (context: SurveyContext) => void): Unsubscribe {
    const db = getDb();
    const options = { includeMetadataChanges: true };
    let survey: Survey | null = null;
    let locations: SurveyContext['locations'] = [];
    let surveyors: SurveyContext['surveyors'] = [];
    let observations: SurveyContext['observations'] = [];

    const emit = () => {
      if (!survey) return; // wait for the survey doc before emitting a context
      callback({ survey, locations, surveyors, observations });
    };

    const unsubscribes = [
      onSnapshot(doc(db, COLLECTION, surveyId), options, (snap) => {
        survey = snap.exists() ? fromSurveyDoc(snap) : null;
        emit();
      }),
      onSnapshot(collection(db, COLLECTION, surveyId, 'locations'), options, (snap) => {
        locations = snap.docs.map(fromLocationDoc);
        emit();
      }),
      onSnapshot(collection(db, COLLECTION, surveyId, 'surveyors'), options, (snap) => {
        surveyors = snap.docs.map(fromSurveyorDoc);
        emit();
      }),
      onSnapshot(collection(db, COLLECTION, surveyId, 'observations'), options, (snap) => {
        observations = snap.docs.map(fromObservationDoc);
        emit();
      }),
    ];

    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
  }

  private async findByField(field: 'adminCode' | 'surveyorCode', value: string): Promise<Survey | null> {
    const snap = await getDocsCacheFirst(query(collection(getDb(), COLLECTION), where(field, '==', value)));
    return snap.empty ? null : fromSurveyDoc(snap.docs[0]);
  }
}
