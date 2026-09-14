/**
 * Legal document versions — pure, importable by the native engine bundle
 * (legal/index.js can't be: it loads the markdown with Vite's `?raw`).
 * Bump here; index.js reads these. What gets recorded on a consent event.
 */
export const LEGAL_VERSIONS = {
  privacy: "2026-08-06",
  terms: "2026-08-05",
  security: "2026-08-05",
  "parental-consent": "2026-08-06",
};
