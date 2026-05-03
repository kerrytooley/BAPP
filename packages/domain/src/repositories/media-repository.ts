export interface MediaRepository {
  upload(path: string, data: ArrayBuffer | Uint8Array): Promise<string>;
  getDownloadUrl(reference: string): Promise<string>;
  delete(reference: string): Promise<void>;
}
