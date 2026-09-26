/**
 * What the confirm-consent page shows for the function's answer. Pure, so it
 * is pinned by a unit test: only a token the SERVER says is invalid or
 * expired sends a parent back to "add your child again". Everything else —
 * a 401 from a deploy that forgot --no-verify-jwt, a 5xx, no network — is a
 * retry, because the link is probably fine. (The catch-all used to read
 * "Link expired" and looped two families through re-adding their child.)
 *
 * `result` = { status, ok, reason?, kidFirstName? } from postToken, or
 * { status: 0 } when the request itself failed.
 */
export function confirmOutcome(result) {
  if (!result || result.status === 0) return { state: "unavailable", reason: "network" };
  if (result.ok) return { state: "done", kidFirstName: result.kidFirstName || "your child" };
  if (result.reason === "request_not_pending") return { state: "already" };
  if (result.reason === "request_superseded") return { state: "superseded" };
  if (result.status === 400 && result.reason === "invalid_or_expired") return { state: "expired" };
  return { state: "unavailable", reason: result.status === 401 ? "unauthorized" : "server" };
}
