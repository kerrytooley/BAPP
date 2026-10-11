import { randomUUID } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { SurveyExport } from '@bapp/domain';
import type { MediaResolver, ResolvedMedia } from '@bapp/export';
import {
  EXPORTS_SUBCOLLECTION,
  EXPORT_REQUESTS_SUBCOLLECTION,
  LATEST_EXPORT_DOC,
  buildSurveyContext,
  reportsStoragePrefix,
  surveyExportFromData,
} from '@bapp/repository/mapping';
import type { GenerateDeps } from './generate';

const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  heic: 'image/heic',
};

const surveyRef = (surveyId: string) => getFirestore().collection('surveys').doc(surveyId);
const latestRef = (surveyId: string) =>
  surveyRef(surveyId).collection(EXPORTS_SUBCOLLECTION).doc(LATEST_EXPORT_DOC);

export class StorageMediaResolver implements MediaResolver {
  async resolve(imageRef: string): Promise<ResolvedMedia | null> {
    try {
      const [buffer] = await getStorage().bucket().file(imageRef).download();
      const ext = imageRef.split('.').pop()?.toLowerCase() ?? '';
      return {
        bytes: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
        base64: buffer.toString('base64'),
        mimeType: MIME_BY_EXTENSION[ext] ?? 'application/octet-stream',
      };
    } catch (error) {
      // Not uploaded yet (or deleted): build without it and record it as missing.
      if ((error as { code?: number }).code === 404) return null;
      throw error;
    }
  }
}

export function adminDeps(logError: GenerateDeps['logError']): GenerateDeps {
  const bucket = getStorage().bucket();
  return {
    async loadContext(surveyId) {
      const ref = surveyRef(surveyId);
      const [survey, locations, surveyors, observations] = await Promise.all([
        ref.get(),
        ref.collection('locations').get(),
        ref.collection('surveyors').get(),
        ref.collection('observations').get(),
      ]);
      if (!survey.exists) throw new Error(`Survey ${surveyId} not found`);
      const raw = (snap: FirebaseFirestore.DocumentSnapshot) => ({ id: snap.id, data: snap.data() });
      return buildSurveyContext({
        survey: raw(survey),
        locations: locations.docs.map(raw),
        surveyors: surveyors.docs.map(raw),
        observations: observations.docs.map(raw),
      });
    },
    mediaResolver: new StorageMediaResolver(),
    async uploadZip(path, zip, fileName) {
      await bucket.file(path).save(Buffer.from(zip.buffer, zip.byteOffset, zip.byteLength), {
        resumable: false,
        contentType: 'application/zip',
        metadata: { contentDisposition: `attachment; filename="${fileName}"` },
      });
    },
    async deleteZip(path) {
      await bucket.file(path).delete({ ignoreNotFound: true });
    },
    store: {
      async readLatest(surveyId) {
        const snap = await latestRef(surveyId).get();
        return snap.exists ? surveyExportFromData(snap.data()) : null;
      },
      async writeLatest(surveyId, value: SurveyExport) {
        const ref = latestRef(surveyId);
        return getFirestore().runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          tx.set(ref, value);
          return snap.exists ? ((snap.get('storagePath') as string | undefined) ?? null) : null;
        });
      },
    },
    newRunId: () => randomUUID(),
    now: () => new Date(),
    logError,
  };
}

/** Remove a deleted survey's export records and archives (Firestore doesn't cascade). */
export async function deleteSurveyExports(surveyId: string): Promise<void> {
  const db = getFirestore();
  const ref = surveyRef(surveyId);
  await Promise.all([
    db.recursiveDelete(ref.collection(EXPORTS_SUBCOLLECTION)),
    db.recursiveDelete(ref.collection(EXPORT_REQUESTS_SUBCOLLECTION)),
    getStorage().bucket().deleteFiles({ prefix: reportsStoragePrefix(surveyId) }),
  ]);
}
