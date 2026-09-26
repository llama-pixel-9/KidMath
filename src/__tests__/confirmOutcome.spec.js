import { describe, expect, it } from "vitest";
import { confirmOutcome } from "../consent/confirmOutcome.js";

// The consent link's page must only say "expired" when the SERVER says the
// token is bad. On 2026-09-26 consent-confirm was deployed with JWT
// verification on; every parent got a 401 and the page called it "Link
// expired" → "Add your child again" → a new email → 401 again.

describe("what the confirm-consent page shows", () => {
  it("a 401 (a deploy without --no-verify-jwt) is a retry, never 'expired'", () => {
    expect(confirmOutcome({ status: 401, code: "UNAUTHORIZED_NO_AUTH_HEADER" })).toEqual({ state: "unavailable", reason: "unauthorized" });
  });

  it("5xx and no network are retries too", () => {
    expect(confirmOutcome({ status: 500, ok: false, reason: "unavailable" }).state).toBe("unavailable");
    expect(confirmOutcome({ status: 0 }).state).toBe("unavailable");
    expect(confirmOutcome(null).state).toBe("unavailable");
  });

  it("only the server's own verdict sends a parent back to add the child again", () => {
    expect(confirmOutcome({ status: 400, ok: false, reason: "invalid_or_expired" })).toEqual({ state: "expired" });
  });

  it("the soft cases keep their own words", () => {
    expect(confirmOutcome({ status: 400, ok: false, reason: "request_superseded" })).toEqual({ state: "superseded" });
    expect(confirmOutcome({ status: 400, ok: false, reason: "request_not_pending" })).toEqual({ state: "already" });
  });

  it("success names the child", () => {
    expect(confirmOutcome({ status: 200, ok: true, kidFirstName: "Aaru" })).toEqual({ state: "done", kidFirstName: "Aaru" });
    expect(confirmOutcome({ status: 200, ok: true }).kidFirstName).toBe("your child");
  });
});
