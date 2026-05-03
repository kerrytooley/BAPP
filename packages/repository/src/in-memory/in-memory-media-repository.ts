import type { MediaRepository } from '@bapp/domain';

export class InMemoryMediaRepository implements MediaRepository {
  private store = new Map<string, ArrayBuffer>();

  async upload(path: string, data: ArrayBuffer | Uint8Array): Promise<string> {
    const buffer = data instanceof Uint8Array ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : data;
    this.store.set(path, buffer);
    return path;
  }

  async getDownloadUrl(reference: string): Promise<string> {
    if (!this.store.has(reference)) throw new Error(`Media ${reference} not found`);
    return `inmemory://${reference}`;
  }

  async delete(reference: string): Promise<void> {
    this.store.delete(reference);
  }
}
