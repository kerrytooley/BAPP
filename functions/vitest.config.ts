import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const pkg = (path: string) => fileURLToPath(new URL(`../packages/${path}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@bapp\/domain$/, replacement: pkg('domain/src/index.ts') },
      { find: /^@bapp\/export$/, replacement: pkg('export/src/index.ts') },
      { find: /^@bapp\/repository\/mapping$/, replacement: pkg('repository/src/mapping/survey-docs.ts') },
    ],
  },
});
