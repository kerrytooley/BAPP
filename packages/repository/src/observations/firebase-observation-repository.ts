import {
  applyObservationDefaults,
  type Observation,
  type CreateObservationInput,
  type UpdateObservationInput,
  type ObservationRepository,
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
import { toDateOrNull, toDateRequired, stripUndefined } from '../config/firestore-mapping';

/** Observations live under `surveys/{surveyId}/observations/{id}`. */
const SUBCOLLECTION = 'observations';

/** Map a Firestore document to a domain Observation. Exported for `getSurveyContext`. */
export function fromObservationDoc(snap: FirebaseFirestoreTypes.DocumentSnapshot): Observation {
  const d = (snap.data() ?? {}) as FirebaseFirestoreTypes.DocumentData;
  return {
    id: snap.id,
    surveyId: d.surveyId,
    locationId: d.locationId,
    surveyorId: d.surveyorId,
    species: d.species ?? null,
    firstSeenAt: toDateOrNull(d.firstSeenAt),
    lastSeenAt: toDateOrNull(d.lastSeenAt),
    seenCount: d.seenCount ?? 0,
    heardCount: d.heardCount ?? 0,
    notes: d.notes ?? null,
    flightPaths: d.flightPaths ?? [],
    data: d.data ?? {},
    createdAt: toDateRequired(d.createdAt),
    updatedAt: toDateRequired(d.updatedAt),
  };
}

export class FirebaseObservationRepository implements ObservationRepository {
  async create(input: CreateObservationInput): Promise<Observation> {
    const col = collection(getDb(), 'surveys', input.surveyId, SUBCOLLECTION);
    const ref = doc(col);
    await setDoc(ref, {
      ...stripUndefined(applyObservationDefaults(input)),
      id: ref.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return fromObservationDoc(await getDoc(ref));
  }

  async findById(id: string): Promise<Observation | null> {
    const snap = await getDocs(query(collectionGroup(getDb(), SUBCOLLECTION), where('id', '==', id)));
    return snap.empty ? null : fromObservationDoc(snap.docs[0]);
  }

  async findBySurveyId(surveyId: string): Promise<Observation[]> {
    const snap = await getDocs(collection(getDb(), 'surveys', surveyId, SUBCOLLECTION));
    return snap.docs.map(fromObservationDoc);
  }

  async findByLocationId(locationId: string): Promise<Observation[]> {
    // Observations are scoped per survey, but this lookup only has a locationId,
    // so scan the collection group and filter by the stored `locationId` field.
    const snap = await getDocs(
      query(collectionGroup(getDb(), SUBCOLLECTION), where('locationId', '==', locationId)),
    );
    return snap.docs.map(fromObservationDoc);
  }

  async update(id: string, input: UpdateObservationInput): Promise<Observation> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Observation ${id} not found`);
    const ref = doc(getDb(), 'surveys', existing.surveyId, SUBCOLLECTION, id);
    await updateDoc(ref, { ...stripUndefined(input), updatedAt: serverTimestamp() });
    return fromObservationDoc(await getDoc(ref));
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) return; // idempotent
    await deleteDoc(doc(getDb(), 'surveys', existing.surveyId, SUBCOLLECTION, id));
  }

  subscribeByLocationId(locationId: string, callback: (observations: Observation[]) => void): Unsubscribe {
    const q = query(collectionGroup(getDb(), SUBCOLLECTION), where('locationId', '==', locationId));
    return onSnapshot(q, (snap) => callback(snap.docs.map(fromObservationDoc)));
  }
}
