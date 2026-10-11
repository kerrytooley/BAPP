import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory stand-in for expo-file-system: path → base64/text contents.
const { files, uploads } = vi.hoisted(() => ({
  files: new Map<string, string>(),
  uploads: [] as { reference: string; finish: () => Promise<void>; fail: () => Promise<void> }[],
}));

vi.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  documentDirectory: 'file:///docs/',
  EncodingType: { Base64: 'base64' },
  makeDirectoryAsync: vi.fn(async () => undefined),
  writeAsStringAsync: vi.fn(async (path: string, contents: string) => {
    files.set(path, contents);
  }),
  readAsStringAsync: vi.fn(async (path: string) => {
    const contents = files.get(path);
    if (contents === undefined) throw new Error(`ENOENT ${path}`);
    return contents;
  }),
  getInfoAsync: vi.fn(async (path: string) => ({ exists: files.has(path), uri: path })),
  copyAsync: vi.fn(async ({ from, to }: { from: string; to: string }) => {
    const contents = files.get(from);
    if (contents === undefined) throw new Error(`ENOENT ${from}`);
    files.set(to, contents);
  }),
  deleteAsync: vi.fn(async (path: string) => {
    const dir = path.endsWith('/') ? path : `${path}/`;
    for (const key of [...files.keys()]) if (key === path || key.startsWith(dir)) files.delete(key);
  }),
  downloadAsync: vi.fn(),
}));

vi.mock('@react-native-firebase/storage', () => ({
  ref: vi.fn((_storage: unknown, reference: string) => reference),
  uploadBytesResumable: vi.fn((reference: string) => {
    let resolve!: () => void;
    let reject!: (e: Error) => void;
    const done = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const flush = () => new Promise<void>((res) => setTimeout(res, 0));
    uploads.push({
      reference,
      finish: async () => { resolve(); await flush(); },
      fail: async () => { reject(new Error('offline')); await flush(); },
    });
    return { on: vi.fn(), then: done.then.bind(done) };
  }),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn(async () => undefined),
}));

vi.mock('../../config/firebase-app', () => ({ getFirebaseStorage: vi.fn(() => ({})) }));

import { FirebaseMediaRepository } from '../firebase-media-repository';

const REF = 'locations/loc-1/front.jpg';
const CACHE_COPY = `file:///cache/bapp-media/${REF}`;
const DURABLE_COPY = `file:///docs/bapp-pending-uploads/${REF}`;
const MANIFEST = 'file:///docs/bapp-pending-uploads/manifest.json';
const LEGACY_MANIFEST = 'file:///cache/bapp-media/.pending-uploads.json';
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

const settle = () => new Promise((res) => setTimeout(res, 0));
const manifest = () => JSON.parse(files.get(MANIFEST) ?? '{}') as Record<string, unknown>;

beforeEach(() => {
  files.clear();
  uploads.length = 0;
});

describe('FirebaseMediaRepository pending uploads', () => {
  it('keeps a durable copy outside the cache until the upload reaches Storage', async () => {
    const repo = new FirebaseMediaRepository();
    await repo.upload(REF, JPEG);
    await settle();

    expect(files.has(CACHE_COPY)).toBe(true);
    expect(files.has(DURABLE_COPY)).toBe(true);
    expect(manifest()).toHaveProperty([REF]);

    await uploads[0].finish();
    await settle();

    expect(files.has(DURABLE_COPY)).toBe(false);
    expect(manifest()).not.toHaveProperty([REF]);
    expect(files.has(CACHE_COPY)).toBe(true); // display copy stays
  });

  it('survives the OS evicting the cache: resumes from the durable copy and restores the display copy', async () => {
    await new FirebaseMediaRepository().upload(REF, JPEG);
    await uploads[0].fail();
    await new FirebaseMediaRepository().clearCache(); // stands in for OS eviction of cacheDirectory
    expect(files.has(CACHE_COPY)).toBe(false);

    await new FirebaseMediaRepository().resumePendingUploads();

    expect(uploads.map((u) => u.reference)).toEqual([REF, REF]);
    expect(files.has(CACHE_COPY)).toBe(true);
    expect(manifest()).toHaveProperty([REF]);
  });

  it('prunes manifest entries whose durable copy is gone', async () => {
    files.set(MANIFEST, JSON.stringify({ [REF]: { contentType: 'image/jpeg' } }));
    await new FirebaseMediaRepository().resumePendingUploads();
    await settle();

    expect(uploads).toHaveLength(0);
    expect(manifest()).not.toHaveProperty([REF]);
  });

  it('adopts uploads queued by an older build under the cache directory', async () => {
    files.set(CACHE_COPY, 'base64bytes');
    files.set(LEGACY_MANIFEST, JSON.stringify({ [REF]: { contentType: 'image/jpeg' } }));

    await new FirebaseMediaRepository().resumePendingUploads();

    expect(files.has(LEGACY_MANIFEST)).toBe(false);
    expect(files.get(DURABLE_COPY)).toBe('base64bytes');
    expect(uploads.map((u) => u.reference)).toEqual([REF]);
  });

  it('delete removes the durable copy so the upload is not resurrected', async () => {
    const repo = new FirebaseMediaRepository();
    await repo.upload(REF, JPEG);
    await settle();

    await repo.delete(REF);

    expect(files.has(DURABLE_COPY)).toBe(false);
    expect(manifest()).not.toHaveProperty([REF]);
  });
});
