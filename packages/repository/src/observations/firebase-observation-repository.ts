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
  getDocFromCache,
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
  stripUndefined,
  nowTimestamp,
  queueWrite,
  getDocsCacheFirst,
} from '../config/firestore-mapping';
import { observationFromData } from '../mapping/survey-docs';

/** Observations live under `surveys/{surveyId}/observations/{id}`. */
const SUBCOLLECTION = 'observations';

/** Map a Firestore document to a domain Observation. Exported for `getSurveyContext`. */
export function fromObservationDoc(snap: FirebaseFirestoreTypes.DocumentSnapshot): Observation {
  return observationFromData(snap.id, snap.data());
}

export class FirebaseObservationRepository implements ObservationRepository {
  async create(input: CreateObservationInput): Promise<Observation> {
    const col = collection(getDb(), 'surveys', input.surveyId, SUBCOLLECTION);
    const ref = doc(col);
    const now = nowTimestamp();
    // Queue the write (awaiting server ack hangs offline) and read back from cache.
    queueWrite(
      setDoc(ref, {
        ...stripUndefined(applyObservationDefaults(input)),
        id: ref.id,
        createdAt: now,
        updatedAt: now,
      }),
      `observation.create ${ref.id}`,
    );
    return fromObservationDoc(await getDocFromCache(ref));
  }

  async findById(id: string): Promise<Observation | null> {
    const snap = await getDocsCacheFirst(query(collectionGroup(getDb(), SUBCOLLECTION), where('id', '==', id)));
    return snap.empty ? null : fromObservationDoc(snap.docs[0]);
  }

  async findBySurveyId(surveyId: string): Promise<Observation[]> {
    const snap = await getDocsCacheFirst(collection(getDb(), 'surveys', surveyId, SUBCOLLECTION));
    return snap.docs.map(fromObservationDoc);
  }

  async findByLocationId(locationId: string): Promise<Observation[]> {
    // Observations are scoped per survey, but this lookup only has a locationId,
    // so scan the collection group and filter by the stored `locationId` field.
    const snap = await getDocsCacheFirst(
      query(collectionGroup(getDb(), SUBCOLLECTION), where('locationId', '==', locationId)),
    );
    return snap.docs.map(fromObservationDoc);
  }

  async update(id: string, input: UpdateObservationInput): Promise<Observation> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Observation ${id} not found`);
    const ref = doc(getDb(), 'surveys', existing.surveyId, SUBCOLLECTION, id);
    queueWrite(
      updateDoc(ref, { ...stripUndefined(input), updatedAt: nowTimestamp() }),
      `observation.update ${id}`,
    );
    return fromObservationDoc(await getDocFromCache(ref));
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) return; // idempotent
    queueWrite(
      deleteDoc(doc(getDb(), 'surveys', existing.surveyId, SUBCOLLECTION, id)),
      `observation.delete ${id}`,
    );
  }

  subscribeByLocationId(locationId: string, callback: (observations: Observation[]) => void): Unsubscribe {
    const q = query(collectionGroup(getDb(), SUBCOLLECTION), where('locationId', '==', locationId));
    return onSnapshot(q, (snap) => callback(snap.docs.map(fromObservationDoc)));
  }

  subscribeBySurveyId(surveyId: string, callback: (observations: Observation[]) => void): Unsubscribe {
    const col = collection(getDb(), 'surveys', surveyId, SUBCOLLECTION);
    return onSnapshot(col, (snap) => callback(snap.docs.map(fromObservationDoc)));
  }
}
