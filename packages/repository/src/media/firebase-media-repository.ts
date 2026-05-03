import type { MediaRepository } from '@bapp/domain';

export class FirebaseMediaRepository implements MediaRepository {
  async upload(_path: string, _data: ArrayBuffer | Uint8Array): Promise<string> {
    throw new Error('Not implemented');
  }

  async getDownloadUrl(_reference: string): Promise<string> {
    throw new Error('Not implemented');
  }

  async delete(_reference: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
