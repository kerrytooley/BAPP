// Shared Firestore read/write mapping helpers used by every Firebase repository.
//
// Two concerns the domain must not see:
//  - Date ↔ Firestore Timestamp conversion. We write JS Dates directly (the SDK
//    stores them as Timestamps) and convert Timestamps back to Dates on read.
//  - `undefined` is not a valid Firestore value; strip it before writing.

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
 * Convert a required timestamp field (createdAt/updatedAt). These are written
 * with serverTimestamp(), so a document read immediately after a local write —
 * before the server resolves it — could momentarily be null; callers re-read
 * after create so this should always be populated, but fall back to epoch to
 * keep the return type non-null rather than throw.
 */
export function toDateRequired(value: unknown): Date {
  return toDateOrNull(value) ?? new Date(0);
}

/** Recursively drop `undefined` values (invalid in Firestore) while preserving nulls. */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as unknown as T;
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
