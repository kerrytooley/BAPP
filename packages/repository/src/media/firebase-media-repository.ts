import type { MediaRepository, UploadOptions, UploadResult } from '@bapp/domain';

export class FirebaseMediaRepository implements MediaRepository {
  async upload(
    _path: string,
    _data: ArrayBuffer | Uint8Array,
    _options?: UploadOptions,
  ): Promise<UploadResult> {
    // Real implementation: uploadBytesResumable (report progress via
    // _options.onProgress), set contentType, and store the source. Rasterization
    // of PDFs/HEIC runs async in a Cloud Function, so return
    // `{ sourceRef, renderRef: null, status: 'processing' }` and let the function
    // write back `renderRef` + `status: 'ready'` onto the parent document.
    throw new Error('Not implemented');
  }

  async getDownloadUrl(_reference: string): Promise<string> {
    // Real implementation: check the local filesystem cache first; on miss,
    // getDownloadURL + download to the cache dir; return the local file:// URI.
    throw new Error('Not implemented');
  }

  async delete(_reference: string): Promise<void> {
    // Real implementation: deleteObject for the reference and its derived/source
    // pair, plus any local cache entry. Idempotent.
    throw new Error('Not implemented');
  }

  async clearCache(_surveyId?: string): Promise<void> {
    // Real implementation: delete cached files under the survey's cache dir
    // (or the whole cache when no surveyId is given) via expo-file-system.
    throw new Error('Not implemented');
  }
}
