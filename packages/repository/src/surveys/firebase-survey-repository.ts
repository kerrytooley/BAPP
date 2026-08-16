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
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { getDb } from '../config/firebase-app';
import { toDateOrNull, toDateRequired, stripUndefined } from '../config/firestore-mapping';
import { fromLocationDoc } from '../locations/firebase-location-repository';
import { fromSurveyorDoc } from '../surveyors/firebase-surveyor-repository';
import { fromObservationDoc } from '../observations/firebase-observation-repository';

const COLLECTION = 'surveys';

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
    // normalizer; Firestore owns the id (addDoc) and timestamps.
    const ref = await addDoc(collection(getDb(), COLLECTION), {
      ...stripUndefined(applySurveyDefaults(input)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return fromSurveyDoc(await getDoc(ref));
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
    await updateDoc(ref, { ...stripUndefined(input), updatedAt: serverTimestamp() });
    return fromSurveyDoc(await getDoc(ref));
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(getDb(), COLLECTION, id));
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
