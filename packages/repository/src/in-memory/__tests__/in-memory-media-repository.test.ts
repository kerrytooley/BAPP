import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryMediaRepository } from '../in-memory-media-repository';

describe('InMemoryMediaRepository', () => {
  let repo: InMemoryMediaRepository;

  beforeEach(() => {
    repo = new InMemoryMediaRepository();
  });

  describe('upload', () => {
    it('returns the path as reference', async () => {
      const data = new Uint8Array([1, 2, 3]);
      const ref = await repo.upload('surveys/1/boundary.png', data);
      expect(ref).toBe('surveys/1/boundary.png');
    });
  });

  describe('getDownloadUrl', () => {
    it('returns a base64 data URL for uploaded media', async () => {
      const data = new Uint8Array([1, 2, 3]);
      const ref = await repo.upload('test.png', data);
      const url = await repo.getDownloadUrl(ref);
      expect(url).toBe('data:image/png;base64,AQID');
    });

    it('infers the mime type from the file extension', async () => {
      const data = new Uint8Array([1, 2, 3]);
      const ref = await repo.upload('test.jpg', data);
      const url = await repo.getDownloadUrl(ref);
      expect(url).toBe('data:image/jpeg;base64,AQID');
    });

    it('throws for unknown reference', async () => {
      await expect(repo.getDownloadUrl('nonexistent')).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('removes the media', async () => {
      const data = new Uint8Array([1, 2, 3]);
      const ref = await repo.upload('test.png', data);
      await repo.delete(ref);
      await expect(repo.getDownloadUrl(ref)).rejects.toThrow();
    });
  });
});
