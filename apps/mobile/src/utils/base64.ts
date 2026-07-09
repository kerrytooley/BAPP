const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Decodes a base64 string to bytes without relying on `atob` or `Buffer`,
// neither of which is guaranteed to exist in Hermes (React Native's engine).
export function base64ToBytes(base64: string): Uint8Array {
    const lookup = new Uint8Array(256);
    for (let i = 0; i < BASE64_CHARS.length; i++) {
        lookup[BASE64_CHARS.charCodeAt(i)] = i;
    }
    const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
    const outLength = Math.floor((clean.length * 3) / 4);
    const out = new Uint8Array(outLength);
    let p = 0;
    for (let i = 0; i < clean.length; i += 4) {
        const c0 = lookup[clean.charCodeAt(i)];
        const c1 = lookup[clean.charCodeAt(i + 1)];
        const c2 = i + 2 < clean.length ? lookup[clean.charCodeAt(i + 2)] : 0;
        const c3 = i + 3 < clean.length ? lookup[clean.charCodeAt(i + 3)] : 0;
        out[p++] = (c0 << 2) | (c1 >> 4);
        if (p < outLength) out[p++] = ((c1 & 0x0f) << 4) | (c2 >> 2);
        if (p < outLength) out[p++] = ((c2 & 0x03) << 6) | c3;
    }
    return out;
}
