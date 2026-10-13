import { initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { EXPORT_REQUESTS_SUBCOLLECTION } from '@bapp/repository/mapping';
import { adminDeps, deleteSurveyExports } from './admin';
import { generateSurveyExport } from './generate';

initializeApp();
// maxInstances caps concurrent 1 GiB builds: v1 rules let any signed-in caller
// create export requests, so this bounds the compute they can trigger.
setGlobalOptions({ memory: '1GiB', timeoutSeconds: 300, maxInstances: 5 });

const logError = (message: string, error: unknown) => logger.error(message, error);

/** Pre-build the export as soon as the last surveyor completes the survey. */
export const buildExportOnCompletion = onDocumentUpdated('surveys/{surveyId}', async (event) => {
  const before = event.data?.before.get('status');
  const after = event.data?.after.get('status');
  if (before === 'completed' || after !== 'completed') return;
  await generateSurveyExport(event.params.surveyId, adminDeps(logError));
});

/** Answer an admin's export request (reuses the latest archive when still current). */
export const buildExportOnRequest = onDocumentCreated(
  `surveys/{surveyId}/${EXPORT_REQUESTS_SUBCOLLECTION}/{requestId}`,
  async (event) => {
    await generateSurveyExport(event.params.surveyId, adminDeps(logError), event.params.requestId);
    await event.data?.ref.delete();
  },
);

export const deleteExportsOnSurveyDelete = onDocumentDeleted('surveys/{surveyId}', async (event) => {
  await deleteSurveyExports(event.params.surveyId);
});
