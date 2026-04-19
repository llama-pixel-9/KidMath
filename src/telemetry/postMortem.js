// Tier 3: classify whether the previous session ended uncleanly. We persist a
// "fingerprint" to localStorage on every heartbeat and clear it on graceful
// shutdown (visibilitychange:hidden + final flush). On the next page load, an
// existing fingerprint indicates the previous session ended without a clean
// shutdown — a strong signal of a freeze, OOM kill, or browser termination.

const FINGERPRINT_KEY = "kidmath_telemetry_fingerprint";

export function readPreviousFingerprint() {
  try {
    const raw = localStorage.getItem(FINGERPRINT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeFingerprint(fingerprint) {
  try {
    localStorage.setItem(FINGERPRINT_KEY, JSON.stringify(fingerprint));
  } catch {
    /* localStorage full or unavailable */
  }
}

export function clearFingerprint() {
  try {
    localStorage.removeItem(FINGERPRINT_KEY);
  } catch {
    /* noop */
  }
}

export function classifyPreviousSession(fingerprint) {
  if (!fingerprint) return null;

  const now = Date.now();
  const sinceLastHeartbeat = now - (fingerprint.lastHeartbeatAt || fingerprint.startedAt || now);
  const sessionDurationMs = (fingerprint.lastHeartbeatAt || fingerprint.startedAt || now) - (fingerprint.startedAt || now);

  let classification = "unknown_unclean_exit";
  if (fingerprint.maxBlockMs && fingerprint.maxBlockMs >= 5000) {
    classification = "freeze_observed";
  } else if (fingerprint.lastVisibility === "hidden" && sinceLastHeartbeat > 60_000) {
    classification = "tab_killed_in_background";
  } else if (sinceLastHeartbeat < 30_000) {
    classification = "abrupt_unload";
  }

  return {
    previousSessionId: fingerprint.sessionId,
    classification,
    sessionDurationMs,
    sinceLastHeartbeatMs: sinceLastHeartbeat,
    maxBlockMs: fingerprint.maxBlockMs || 0,
    lastEvents: Array.isArray(fingerprint.lastEvents) ? fingerprint.lastEvents : [],
    lastVisibility: fingerprint.lastVisibility,
    userAgent: fingerprint.userAgent,
  };
}
