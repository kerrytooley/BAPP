// Generates store assets (app icon, adaptive icon, splash, favicon) from the
// app logo SVG (assets/illustrations/logo.svg).
//
// Usage: node scripts/generate-app-assets.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const assetsDir = resolve(root, 'assets');
mkdirSync(assetsDir, { recursive: true });

const BG = '#000000';
const logoSvg = readFileSync(resolve(assetsDir, 'illustrations/logo.svg')).toString();

// Render the logo SVG to fit within a square box, preserving aspect ratio.
async function renderLogo(boxPx) {
    return sharp(Buffer.from(logoSvg), { density: 384 })
        .resize({ width: boxPx, height: boxPx, fit: 'inside' })
        .png()
        .toBuffer();
}

// Composite the logo centered on a solid square background.
async function iconOnBackground({ size, logoScale, background, out }) {
    const box = Math.round(size * logoScale);
    const logo = await renderLogo(box);
    const base = background
        ? { create: { width: size, height: size, channels: 4, background } }
        : { create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } };
    await sharp(base)
        .composite([{ input: logo, gravity: 'centre' }])
        .png()
        .toFile(resolve(assetsDir, out));
    console.log('wrote', out);
}

await Promise.all([
    // iOS / general app icon: opaque black background, logo ~85% of the square.
    iconOnBackground({ size: 1024, logoScale: 0.85, background: BG, out: 'icon.png' }),
    // Android adaptive icon foreground: transparent, logo within safe zone (~66%).
    iconOnBackground({ size: 1024, logoScale: 0.66, background: null, out: 'adaptive-icon.png' }),
    // Splash logo used by expo-splash-screen: transparent, small-ish logo.
    iconOnBackground({ size: 1024, logoScale: 0.45, background: null, out: 'splash-icon.png' }),
    // Web favicon.
    iconOnBackground({ size: 48, logoScale: 0.9, background: BG, out: 'favicon.png' }),
]);

console.log('Done. App assets generated in assets/.');
