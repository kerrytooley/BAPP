// Bundles the workspace sources (@bapp/*, resolved via tsconfig paths) into one
// file so deploy's `npm install` only needs the firebase packages.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  sourcemap: true,
  tsconfig: 'tsconfig.json',
  external: ['firebase-admin', 'firebase-functions'],
});
