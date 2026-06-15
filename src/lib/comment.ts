/**
 * Pure helpers for the in-app comment box (D-010). The box POSTs to a third-party
 * form service (no backend we run — constitution IV); this module just shapes +
 * validates the payload so it's unit-testable without the network.
 */

export const MAX_COMMENT_LEN = 2000;

/** Returns an error message if the comment is invalid, else null. */
export function validate(message: string): string | null {
  const m = message.trim();
  if (!m) return "Please write something first.";
  if (m.length > MAX_COMMENT_LEN) return `Keep it under ${MAX_COMMENT_LEN} characters.`;
  return null;
}

/** The JSON body sent to the form service (Formspree-compatible). */
export function buildSubmission(message: string, name: string, page: string): Record<string, string> {
  return {
    message: message.trim(),
    name: name.trim() || "anonymous",
    page,
    _subject: "Ghost Roster comment",
  };
}
