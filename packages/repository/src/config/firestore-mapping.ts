// Shared Firestore read/write mapping helpers used by every Firebase repository.
//
// Three concerns the domain must not see:
//  - Date ↔ Firestore Timestamp conversion. We write JS Dates directly (the SDK
//    stores them as Timestamps); reads convert back in mapping/survey-docs.ts.
//  - `undefined` is not a valid Firestore value; strip it before writing.
//  - Offline-first writes: native Firestore write promises only resolve after a
//    server round-trip, so awaiting them hangs indefinitely while offline. The
//    mutation is applied to the local SQLite cache synchronously regardless, so
//    repositories fire the write (see `queueWrite`) and read the result back
//    from cache. See FIREBASE_ARCHITECTURE.md §Offline persistence.

import {
  getDocFromCache,
  getDocFromServer,
  getDocsFromCache,
  getDocsFromServer,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

/**
 * The timestamp value to write for createdAt/updatedAt.
 *
 * Deliberately a client-side `Date`, NOT `serverTimestamp()`. This app is
 * offline-first: surveys are recorded in the field with no connectivity, and the
 * write may not reach the server for hours. A server timestamp would (a) read
 * back as null → 1970 from the local cache until acknowledged, corrupting
 * ordering and UI during normal offline use, and (b) record the far-later sync
 * time rather than when the surveyor actually made the entry. The client clock is
 * the correct authority here, and this matches the in-memory reference repository.
 */
export function nowTimestamp(): Date {
  return new Date();
}

/**
 * Fire a Firestore write without blocking the domain result on server
 * acknowledgement. The native SDK applies the mutation to the local cache
 * synchronously and queues it for sync, but the returned promise does not resolve
 * until the server acknowledges — which never happens while offline. Callers must
 * therefore read their result back from cache rather than awaiting this promise.
 *
 * We retain the promise only to surface eventual sync failures (a rejection means
 * the server ultimately refused the write, e.g. rules), logged for diagnosis. We
 * never make the domain operation wait on it.
 */
export function queueWrite(write: Promise<unknown>, context: string): void {
  void write.catch((error) => {
    console.error(`[firebase] queued write failed to sync (${context}):`, error);
  });
}

/**
 * Cache-first single-doc read: return the locally-cached doc (instant,
 * offline-safe, reflects pending writes); on a cache miss fall back to the
 * server (resolves online, rejects fast offline).
 *
 * Default-source reads (`getDoc`) try the network first while offline, which is
 * slow and can fail — this flips that ordering so a read-your-own-write is
 * served straight from the local cache.
 */
export async function getDocCacheFirst(
  ref: FirebaseFirestoreTypes.DocumentReference,
): Promise<FirebaseFirestoreTypes.DocumentSnapshot> {
  try {
    return await getDocFromCache(ref);
  } catch {
    return getDocFromServer(ref);
  }
}

/**
 * Cache-first query read: return cached matches if any; otherwise try the server
 * for freshness (online), falling back to the (empty) cache result offline rather
 * than hanging or throwing.
 */
export async function getDocsCacheFirst(
  query: FirebaseFirestoreTypes.Query,
): Promise<FirebaseFirestoreTypes.QuerySnapshot> {
  const cached = await getDocsFromCache(query).catch(() => null);
  if (cached && !cached.empty) return cached;
  try {
    return await getDocsFromServer(query);
  } catch {
    return cached ?? (await getDocsFromCache(query));
  }
}

/** Recursively drop `undefined` values (invalid in Firestore) while preserving
 *  nulls. Undefined array elements are filtered out entirely — Firestore rejects
 *  a write containing `undefined` anywhere, including inside arrays. */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((v) => v !== undefined)
      .map((v) => stripUndefined(v)) as unknown as T;
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}
