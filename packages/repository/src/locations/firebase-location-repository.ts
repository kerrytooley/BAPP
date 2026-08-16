import {
  applyLocationDefaults,
  type Location,
  type CreateLocationInput,
  type UpdateLocationInput,
  type LocationRepository,
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

/** Locations live under `surveys/{surveyId}/locations/{id}` (see FIREBASE_ARCHITECTURE.md). */
const SUBCOLLECTION = 'locations';

/** Map a Firestore document to a domain Location. Exported so the survey repo
 *  can build `getSurveyContext` without re-implementing the mapping. */
export function fromLocationDoc(snap: FirebaseFirestoreTypes.DocumentSnapshot): Location {
  const d = (snap.data() ?? {}) as FirebaseFirestoreTypes.DocumentData;
  return {
    id: snap.id,
    surveyId: d.surveyId,
    name: d.name ?? null,
    boundaryPosition: d.boundaryPosition ?? null,
    frontViewImage: d.frontViewImage ?? null,
    equipmentImage: d.equipmentImage ?? null,
    data: d.data ?? {},
    createdAt: toDateRequired(d.createdAt),
    updatedAt: toDateRequired(d.updatedAt),
  };
}

export class FirebaseLocationRepository implements LocationRepository {
  async create(input: CreateLocationInput): Promise<Location> {
    const col = collection(getDb(), 'surveys', input.surveyId, SUBCOLLECTION);
    // Pre-generate the id so we can store it as a field (needed for the
    // collection-group lookups below) and know it before the write resolves.
    const ref = doc(col);
    await setDoc(ref, {
      // Business defaults come from the shared domain normalizer — never
      // re-implemented here. This backend owns only id + timestamps.
      ...stripUndefined(applyLocationDefaults(input)),
      id: ref.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return fromLocationDoc(await getDoc(ref));
  }

  async findById(id: string): Promise<Location | null> {
    // findById carries no surveyId, so scan the `locations` collection group by
    // the stored `id` field to locate the doc regardless of its parent survey.
    const snap = await getDocs(query(collectionGroup(getDb(), SUBCOLLECTION), where('id', '==', id)));
    return snap.empty ? null : fromLocationDoc(snap.docs[0]);
  }

  async findBySurveyId(surveyId: string): Promise<Location[]> {
    const snap = await getDocs(collection(getDb(), 'surveys', surveyId, SUBCOLLECTION));
    return snap.docs.map(fromLocationDoc);
  }

  async update(id: string, input: UpdateLocationInput): Promise<Location> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Location ${id} not found`);
    const ref = doc(getDb(), 'surveys', existing.surveyId, SUBCOLLECTION, id);
    await updateDoc(ref, { ...stripUndefined(input), updatedAt: serverTimestamp() });
    return fromLocationDoc(await getDoc(ref));
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) return; // idempotent
    await deleteDoc(doc(getDb(), 'surveys', existing.surveyId, SUBCOLLECTION, id));
  }

  subscribeBySurveyId(surveyId: string, callback: (locations: Location[]) => void): Unsubscribe {
    const col = collection(getDb(), 'surveys', surveyId, SUBCOLLECTION);
    return onSnapshot(col, (snap) => callback(snap.docs.map(fromLocationDoc)));
  }
}
