import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryMediaRepository } from '../in-memory-media-repository';

describe('InMemoryMediaRepository', () => {
  let repo: InMemoryMediaRepository;

  beforeEach(() => {
    repo = new InMemoryMediaRepository();
  });

  describe('upload', () => {
    it('returns a ready result with source and render at the sanitized path', async () => {
      const data = new Uint8Array([1, 2, 3]);
      const result = await repo.upload('surveys/1/boundary.png', data);
      expect(result).toEqual({
        sourceRef: 'surveys/1/boundary.png',
        renderRef: 'surveys/1/boundary.png',
        status: 'ready',
      });
    });

    it('sanitizes unsafe characters in the file name', async () => {
      const data = new Uint8Array([1, 2, 3]);
      const result = await repo.upload('surveys/1/my boundary!.png', data);
      expect(result.sourceRef).toBe('surveys/1/my_boundary_.png');
    });

    it('normalizes a PDF to a derived .png render ref', async () => {
      const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2]); // %PDF...
      const result = await repo.upload('surveys/1/boundary.pdf', pdf);
      expect(result.sourceRef).toBe('surveys/1/boundary.pdf');
      expect(result.renderRef).toBe('surveys/1/boundary.png');
      expect(result.status).toBe('ready');
    });

    it('reports progress completion for progress-aware callers', async () => {
      const fractions: number[] = [];
      await repo.upload('t.png', new Uint8Array([1]), { onProgress: (f) => fractions.push(f) });
      expect(fractions).toEqual([1]);
    });
  });

  describe('getDownloadUrl', () => {
    it('returns a base64 data URL for uploaded media', async () => {
      const data = new Uint8Array([1, 2, 3]);
      const { sourceRef } = await repo.upload('test.png', data);
      const url = await repo.getDownloadUrl(sourceRef);
      expect(url).toBe('data:image/png;base64,AQID');
    });

    it('infers the mime type from the file extension', async () => {
      const data = new Uint8Array([1, 2, 3]);
      const { sourceRef } = await repo.upload('test.jpg', data);
      const url = await repo.getDownloadUrl(sourceRef);
      expect(url).toBe('data:image/jpeg;base64,AQID');
    });

    it('resolves the derived PNG render for a PDF upload', async () => {
      const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2]);
      const { renderRef } = await repo.upload('surveys/1/boundary.pdf', pdf);
      const url = await repo.getDownloadUrl(renderRef!);
      expect(url).toMatch(/^data:image\/png;base64,/);
    });

    it('throws for unknown reference', async () => {
      await expect(repo.getDownloadUrl('nonexistent')).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('removes the media', async () => {
      const data = new Uint8Array([1, 2, 3]);
      const { sourceRef } = await repo.upload('test.png', data);
      await repo.delete(sourceRef);
      await expect(repo.getDownloadUrl(sourceRef)).rejects.toThrow();
    });

    it('removes the whole group: PDF source and its derived render', async () => {
      const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2]);
      const { sourceRef, renderRef } = await repo.upload('surveys/1/boundary.pdf', pdf);

      await repo.delete(sourceRef);

      await expect(repo.getDownloadUrl(sourceRef)).rejects.toThrow();
      await expect(repo.getDownloadUrl(renderRef!)).rejects.toThrow();
    });

    it('is idempotent on an already-deleted reference', async () => {
      await expect(repo.delete('never-existed')).resolves.toBeUndefined();
    });
  });

  describe('clearCache', () => {
    it('is a no-op that resolves', async () => {
      await expect(repo.clearCache()).resolves.toBeUndefined();
      await expect(repo.clearCache('survey-1')).resolves.toBeUndefined();
    });
  });
});
