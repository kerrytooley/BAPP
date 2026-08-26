import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderRuntime, renderRuntimeFromSource } from '../runtime';
import { RUNTIME_IIFE } from '../runtime-source.generated';

const GENERATED_PATH = fileURLToPath(
  new URL('../runtime-source.generated.ts', import.meta.url),
);

const HEADER = `/**
 * AUTO-GENERATED — DO NOT EDIT BY HAND.
 *
 * The browser runtime for \`report.html\`, baked to a plain string so it can be
 * shipped verbatim by Metro (Hermes cannot stringify functions — see
 * {@link renderRuntime}). Regenerate with:
 *
 *   UPDATE_RUNTIME=1 pnpm --filter @bapp/export test runtime-source
 */
`;

/**
 * Guards the pre-baked runtime string against drift from the authored
 * `runtime()` function. On-device the report ships {@link RUNTIME_IIFE} (a plain
 * string) because Hermes' `Function.prototype.toString()` returns a `[bytecode]`
 * stub. Run with `UPDATE_RUNTIME=1` to regenerate after editing `runtime()`.
 */
describe('runtime-source.generated', () => {
  it('matches the authored runtime() function (regenerate with UPDATE_RUNTIME=1)', () => {
    const expected = renderRuntimeFromSource();

    if (process.env.UPDATE_RUNTIME) {
      const file = `${HEADER}export const RUNTIME_IIFE = ${JSON.stringify(expected)};\n`;
      writeFileSync(GENERATED_PATH, file);
      return;
    }

    expect(RUNTIME_IIFE).toBe(expected);
  });

  it('renderRuntime returns the baked string, never a bytecode stub', () => {
    const out = renderRuntime();
    expect(out).toBe(RUNTIME_IIFE);
    expect(out).not.toContain('[bytecode]');
    expect(out).toContain('applyDeepLink');
  });
});
