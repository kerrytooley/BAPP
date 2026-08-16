import {
  applySurveyorDefaults,
  type Surveyor,
  type CreateSurveyorInput,
  type UpdateSurveyorInput,
  type SurveyorRepository,
  type Unsubscribe,
} from '@bapp/domain';
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { getDb } from '../config/firebase-app';
import { toDateRequired, stripUndefined } from '../config/firestore-mapping';

/** Surveyors live under `surveys/{surveyId}/surveyors/{id}`. */
const SUBCOLLECTION = 'surveyors';

/** Map a Firestore document to a domain Surveyor. Exported for `getSurveyContext`. */
export function fromSurveyorDoc(snap: FirebaseFirestoreTypes.DocumentSnapshot): Surveyor {
  const d = (snap.data() ?? {}) as FirebaseFirestoreTypes.DocumentData;
  return {
    id: snap.id,
    surveyId: d.surveyId,
    locationId: d.locationId ?? null,
    name: d.name ?? null,
    isLead: d.isLead ?? false,
    status: d.status ?? 'pending',
    data: d.data ?? {},
    createdAt: toDateRequired(d.createdAt),
    updatedAt: toDateRequired(d.updatedAt),
  };
}

export class FirebaseSurveyorRepository implements SurveyorRepository {
  async create(input: CreateSurveyorInput): Promise<Surveyor> {
    const col = collection(getDb(), 'surveys', input.surveyId, SUBCOLLECTION);
    const ref = doc(col);
    await setDoc(ref, {
      ...stripUndefined(applySurveyorDefaults(input)),
      id: ref.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return fromSurveyorDoc(await getDoc(ref));
  }

  async findById(id: string): Promise<Surveyor | null> {
    const snap = await getDocs(query(collectionGroup(getDb(), SUBCOLLECTION), where('id', '==', id)));
    return snap.empty ? null : fromSurveyorDoc(snap.docs[0]);
  }

  async findBySurveyId(surveyId: string): Promise<Surveyor[]> {
    const snap = await getDocs(collection(getDb(), 'surveys', surveyId, SUBCOLLECTION));
    return snap.docs.map(fromSurveyorDoc);
  }

  async update(id: string, input: UpdateSurveyorInput): Promise<Surveyor> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Surveyor ${id} not found`);
    const ref = doc(getDb(), 'surveys', existing.surveyId, SUBCOLLECTION, id);
    await updateDoc(ref, { ...stripUndefined(input), updatedAt: serverTimestamp() });
    return fromSurveyorDoc(await getDoc(ref));
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) return; // idempotent
    await deleteDoc(doc(getDb(), 'surveys', existing.surveyId, SUBCOLLECTION, id));
  }

  subscribeBySurveyId(surveyId: string, callback: (surveyors: Surveyor[]) => void): Unsubscribe {
    const col = collection(getDb(), 'surveys', surveyId, SUBCOLLECTION);
    return onSnapshot(col, (snap) => callback(snap.docs.map(fromSurveyorDoc)));
  }
}
