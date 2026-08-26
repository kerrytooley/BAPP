jest.mock('expo-file-system/legacy', () => ({
    EncodingType: { Base64: 'base64' },
    readAsStringAsync: jest.fn(),
}));

import * as FileSystem from 'expo-file-system/legacy';
import { ExpoMediaResolver } from '@services/export/expoMediaResolver';

const readMock = FileSystem.readAsStringAsync as jest.Mock;

describe('ExpoMediaResolver', () => {
    beforeEach(() => {
        readMock.mockReset();
    });

    it('parses a base64 data: URI directly', async () => {
        const resolver = new ExpoMediaResolver(async () => 'data:image/png;base64,TWFu');
        const result = await resolver.resolve('ref');
        expect(result).toEqual({ bytes: new Uint8Array([77, 97, 110]), mimeType: 'image/png' });
        expect(readMock).not.toHaveBeenCalled();
    });

    it('parses a URL-encoded (non-base64) data: URI', async () => {
        const resolver = new ExpoMediaResolver(async () => 'data:text/plain,Man');
        const result = await resolver.resolve('ref');
        expect(result?.mimeType).toBe('text/plain');
        expect(Array.from(result!.bytes)).toEqual([77, 97, 110]);
    });

    it('defaults the mime type when the data: URI omits it', async () => {
        const resolver = new ExpoMediaResolver(async () => 'data:;base64,TWFu');
        const result = await resolver.resolve('ref');
        expect(result?.mimeType).toBe('application/octet-stream');
    });

    it('reads a file:// URI as base64 and infers mime from the extension', async () => {
        readMock.mockResolvedValue('TWFu');
        const resolver = new ExpoMediaResolver(async () => 'file:///cache/boundary.PNG');
        const result = await resolver.resolve('ref');
        expect(readMock).toHaveBeenCalledWith('file:///cache/boundary.PNG', { encoding: 'base64' });
        expect(result).toEqual({ bytes: new Uint8Array([77, 97, 110]), mimeType: 'image/png' });
    });

    it('maps jpg/jpeg/webp/heic extensions and falls back for unknown ones', async () => {
        readMock.mockResolvedValue('TWFu');
        const mimeFor = async (uri: string) =>
            (await new ExpoMediaResolver(async () => uri).resolve('r'))?.mimeType;
        expect(await mimeFor('file:///a.jpg')).toBe('image/jpeg');
        expect(await mimeFor('file:///a.jpeg')).toBe('image/jpeg');
        expect(await mimeFor('file:///a.webp')).toBe('image/webp');
        expect(await mimeFor('file:///a.heic')).toBe('image/heic');
        expect(await mimeFor('file:///a.xyz?v=1#frag')).toBe('application/octet-stream');
        expect(await mimeFor('file:///noext')).toBe('application/octet-stream');
    });

    it('returns null when a malformed data: URI cannot be parsed', async () => {
        // Starts with "data:" but has no comma, so the parser rejects it.
        const resolver = new ExpoMediaResolver(async () => 'data:image/png');
        expect(await resolver.resolve('ref')).toBeNull();
    });

    it('returns null (does not throw) when URL resolution fails', async () => {
        const resolver = new ExpoMediaResolver(async () => {
            throw new Error('offline');
        });
        expect(await resolver.resolve('ref')).toBeNull();
    });

    it('returns null when reading the file fails', async () => {
        readMock.mockRejectedValue(new Error('missing'));
        const resolver = new ExpoMediaResolver(async () => 'file:///gone.png');
        expect(await resolver.resolve('ref')).toBeNull();
    });
});
