import { describe, it, expect } from 'vitest';
import { isPdf, isHeic, needsNormalization, derivedImagePath } from '../boundary-media';

// %PDF magic
const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
// ISO-BMFF ftyp box (offset 4) + 'heic' brand (offset 8)
const HEIC_BYTES = new Uint8Array([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]);
// ftyp box + non-HEIF brand 'mp42'
const MP4_BYTES = new Uint8Array([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);

describe('isPdf', () => {
  it('detects by .pdf extension', () => {
    expect(isPdf('surveys/1/boundary.pdf')).toBe(true);
  });
  it('detects by %PDF magic number when the extension is absent/wrong', () => {
    expect(isPdf('surveys/1/boundary.bin', PDF_BYTES)).toBe(true);
  });
  it('is false for a plain PNG', () => {
    expect(isPdf('x.png', new Uint8Array([1, 2, 3]))).toBe(false);
  });
});

describe('isHeic', () => {
  it('detects by .heic / .heif extension', () => {
    expect(isHeic('locations/1/front.heic')).toBe(true);
    expect(isHeic('locations/1/front.HEIF')).toBe(true);
  });
  it('detects by ftyp box + HEIF brand when the extension lies', () => {
    expect(isHeic('locations/1/front.jpg', HEIC_BYTES)).toBe(true);
  });
  it('is false for an ftyp box with a non-HEIF brand (e.g. mp4)', () => {
    expect(isHeic('clip.bin', MP4_BYTES)).toBe(false);
  });
  it('is false for a plain PNG', () => {
    expect(isHeic('x.png', new Uint8Array([1, 2, 3]))).toBe(false);
  });
});

describe('needsNormalization', () => {
  it('is true for PDF and HEIC sources', () => {
    expect(needsNormalization('boundary.pdf')).toBe(true);
    expect(needsNormalization('front.heic')).toBe(true);
    expect(needsNormalization('x.bin', HEIC_BYTES)).toBe(true);
  });
  it('is false for directly-renderable rasters', () => {
    expect(needsNormalization('x.png')).toBe(false);
    expect(needsNormalization('x.jpg')).toBe(false);
    expect(needsNormalization('x.webp')).toBe(false);
  });
});

describe('derivedImagePath', () => {
  it('maps any source to a canonical .png render path', () => {
    expect(derivedImagePath('surveys/1/boundary.pdf')).toBe('surveys/1/boundary.png');
    expect(derivedImagePath('locations/1/front.heic')).toBe('locations/1/front.png');
  });
});
