// Shared Firestore read/write mapping helpers used by every Firebase repository.
//
// Three concerns the domain must not see:
//  - Date ↔ Firestore Timestamp conversion. We write JS Dates directly (the SDK
//    stores them as Timestamps) and convert Timestamps back to Dates on read.
//  - `undefined` is not a valid Firestore value; strip it before writing.
//  - Offline-first writes: native Firestore write promises only resolve after a
//    server round-trip, so awaiting them hangs indefinitely while offline. The
//    mutation is applied to the local SQLite cache synchronously regardless, so
//    repositories fire the write (see `queueWrite`) and read the result back
//    from cache. See FIREBASE_ARCHITECTURE.md §Offline persistence.

import { Timestamp } from '@react-native-firebase/firestore';

/** Convert a Firestore Timestamp (or Date/null) read back from a document to a Date | null. */
export function toDateOrNull(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  // Be defensive: RNFB hands back Timestamp instances, but duck-type just in case.
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

/**
 * Convert a required timestamp field (createdAt/updatedAt). We write these as
 * client-side `Date`s (see `nowTimestamp`) rather than `serverTimestamp()`, so a
 * document read back from cache immediately after a local write already carries a
 * real value — never the null-until-server-ack that would surface as 1970. The
 * epoch fallback is kept only as a defensive last resort for malformed documents.
 */
export function toDateRequired(value: unknown): Date {
  return toDateOrNull(value) ?? new Date(0);
}

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
