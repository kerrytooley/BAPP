// Boundary-media conventions for repository adapters. Keeps PDF/rasterization
// knowledge out of the domain so each backend can fulfil it differently.

// Detects a PDF by extension or the `%PDF` magic number.
export function isPdf(pathOrName: string, bytes?: Uint8Array): boolean {
    if (/\.pdf$/i.test(pathOrName)) return true;
    if (!bytes) return false;
    return (
        bytes.length >= 4 &&
        bytes[0] === 0x25 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x44 &&
        bytes[3] === 0x46
    );
}

// Path a boundary PDF is rasterized to: same path with a `.png` extension.
export function derivedImagePath(path: string): string {
    return path.replace(/\.[^.]*$/, '') + '.png';
}
