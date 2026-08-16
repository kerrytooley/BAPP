/**
 * Join-code generation. Codes are how admins resume a survey and surveyors join
 * one, so their format and casing are domain policy — owned here, never invented
 * by a repository backend.
 *
 * Format: fixed-length lowercase alphanumeric. Lookups normalize input to
 * lowercase (and trim), so generating lowercase keeps stored and queried codes
 * consistent across backends. Uniqueness is enforced by the caller (the service)
 * against the repository, since a pure generator can't see existing codes.
 */

const CODE_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 6;

/** Generate a random 6-character lowercase alphanumeric join code. */
export function generateSurveyCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Normalize a code entered by a user for comparison against a stored code. */
export function normalizeSurveyCode(code: string): string {
  return code.trim().toLowerCase();
}
