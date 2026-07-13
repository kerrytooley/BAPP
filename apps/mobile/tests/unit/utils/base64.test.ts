import { base64ToBytes } from '@utils/base64';

describe('base64ToBytes', () => {
    it('decodes a simple base64 string to the correct bytes', () => {
        expect(Array.from(base64ToBytes('TWFu'))).toEqual([77, 97, 110]);
    });

    it('decodes ASCII text round-tripped through Node Buffer', () => {
        const original = 'Hello, BAPP!';
        const encoded = Buffer.from(original, 'utf-8').toString('base64');
        const bytes = base64ToBytes(encoded);
        expect(Buffer.from(bytes).toString('utf-8')).toBe(original);
    });

    it('decodes binary bytes covering the full byte range', () => {
        const source = new Uint8Array([0, 1, 2, 254, 255, 128, 64, 32, 16, 8]);
        const encoded = Buffer.from(source).toString('base64');
        expect(Array.from(base64ToBytes(encoded))).toEqual(Array.from(source));
    });

    it('handles single "=" padding (2 remainder bytes)', () => {
        expect(Array.from(base64ToBytes('TWE='))).toEqual([77, 97]);
    });

    it('handles double "==" padding (1 remainder byte)', () => {
        expect(Array.from(base64ToBytes('TQ=='))).toEqual([77]);
    });

    it('strips whitespace and newlines before decoding', () => {
        expect(Array.from(base64ToBytes('TW\nFu\t '))).toEqual([77, 97, 110]);
    });

    it('strips characters outside the base64 alphabet', () => {
        expect(Array.from(base64ToBytes('T*W&F(u)'))).toEqual([77, 97, 110]);
    });

    it('returns an empty array for an empty string', () => {
        expect(Array.from(base64ToBytes(''))).toEqual([]);
    });

    it('returns an empty array when the input is only ignored characters', () => {
        expect(Array.from(base64ToBytes('====\n  '))).toEqual([]);
    });
});
