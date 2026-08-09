// world-award — the ONE write path for the open-world economy and mastery
// (docs/larkit-open-world-implementation-plan.md, Part 3).
//
// A NEW function, not a change to any existing one (plan Part 4). The client
// claims completed work; this function validates the claim, awards stars,
// updates per-skill mastery (Leitner boxes + spaced repetition), and appends
// the audit row. The client never mints currency.
//
// POST body:
//   {
//     kidId:  "<kid_profiles.id>",
//     zoneId: "archipelago",            // where the work happened
//     questId?: "bridge-planks",        // absent for arcade/practice-spot play
//     attempts: [
//       { itemId: "...", skillId: "add.within20", correct: true, elapsedMs: 4200 },
//       ...
//     ]
//   }
//
// Response: { starsAwarded, starsBalance, mastery: [{skillId, box, streak, dueAt}] }
//
// Phase-0 skeleton status: auth, kid-ownership check, payload validation,
// timing sanity checks, Leitner update, star award, audit log — all in.
// TODO(phase 1): validate itemId + answer against the item bank rows instead
// of trusting `correct`; replay protection beyond the per-call rate cap.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sanity rails, tuned loose — they exist to stop scripts, not kids.
const MAX_ATTEMPTS_PER_CALL = 40;
const MIN_MS_PER_ATTEMPT = 700;      // sub-700ms answers are not a K-3 human
const MAX_CALLS_PER_HOUR = 30;
const STARS_PER_CORRECT = 1;

// Leitner spacing: box 1 = relearn now, box 5 = mastered, see again in ~2 weeks.
const BOX_INTERVAL_HOURS = [0, 4, 24, 72, 168, 336]; // index by box (1..5)

type Attempt = { itemId: string; skillId: string; correct: boolean; elapsedMs: number };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validAttempt(a: unknown): a is Attempt {
  if (typeof a !== "object" || a === null) return false;
  const x = a as Record<string, unknown>;
  return (
    typeof x.itemId === "string" && x.itemId.length > 0 && x.itemId.length < 200 &&
    typeof x.skillId === "string" && x.skillId.length > 0 && x.skillId.length < 100 &&
    typeof x.correct === "boolean" &&
    typeof x.elapsedMs === "number" && Number.isFinite(x.elapsedMs) && x.elapsedMs >= 0
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json({ error: "POST only" }, 405);
  }

  try {
    // Caller identity via their own JWT.
    const asCaller = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await asCaller.auth.getUser();
    if (!user) return json({ error: "Sign in first" }, 401);

    const body = await request.json().catch(() => null);
    const kidId = body?.kidId;
    const zoneId = body?.zoneId;
    const questId = body?.questId ?? null;
    const attempts = body?.attempts;

    if (typeof kidId !== "string" || typeof zoneId !== "string" || !Array.isArray(attempts)) {
      return json({ error: "Bad payload" }, 400);
    }
    if (attempts.length === 0 || attempts.length > MAX_ATTEMPTS_PER_CALL) {
      return json({ error: "Bad attempt count" }, 400);
    }
    if (!attempts.every(validAttempt)) {
      return json({ error: "Bad attempt" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // The kid must belong to the calling parent account.
    const { data: kid } = await admin
      .from("kid_profiles")
      .select("id")
      .eq("id", kidId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!kid) return json({ error: "Unknown kid" }, 403);

    // Timing sanity: reject claims a K-3 kid can't physically produce.
    // Wrong answers stay unpunished (plan principle 3) — they just earn 0.
    const tooFast = attempts.filter((a: Attempt) => a.correct && a.elapsedMs < MIN_MS_PER_ATTEMPT);
    if (tooFast.length > attempts.length / 2) {
      return json({ error: "Timing check failed" }, 422);
    }

    // Rate cap — the blunt replay guard until per-item receipts (phase 1).
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count: recentCalls } = await admin
      .from("world_award_log")
      .select("id", { count: "exact", head: true })
      .eq("kid_id", kidId)
      .gte("created_at", hourAgo);
    if ((recentCalls ?? 0) >= MAX_CALLS_PER_HOUR) {
      return json({ error: "Too many award calls" }, 429);
    }

    // ---- Mastery: Leitner box per skill -------------------------------
    const now = new Date();
    const bySkill = new Map<string, Attempt[]>();
    for (const a of attempts as Attempt[]) {
      const list = bySkill.get(a.skillId) ?? [];
      list.push(a);
      bySkill.set(a.skillId, list);
    }

    const skillIds = [...bySkill.keys()];
    const { data: existingRows } = await admin
      .from("skill_mastery")
      .select("skill_id, box, streak, attempts, correct")
      .eq("kid_id", kidId)
      .in("skill_id", skillIds);
    const existing = new Map((existingRows ?? []).map((r) => [r.skill_id, r]));

    const masteryUpserts = skillIds.map((skillId) => {
      const prior = existing.get(skillId) ?? { box: 1, streak: 0, attempts: 0, correct: 0 };
      let box = prior.box;
      let streak = prior.streak;
      for (const a of bySkill.get(skillId)!) {
        if (a.correct) {
          streak += 1;
          // Promote on every 2 consecutive correct — quick early progress,
          // slower at the top because intervals stretch.
          if (streak % 2 === 0) box = Math.min(5, box + 1);
        } else {
          // A miss drops one box, never to the floor — wrong answers cost
          // time, not progress (plan principle 3).
          streak = 0;
          box = Math.max(1, box - 1);
        }
      }
      const attemptList = bySkill.get(skillId)!;
      const dueAt = new Date(now.getTime() + BOX_INTERVAL_HOURS[box] * 3600_000);
      return {
        kid_id: kidId,
        user_id: user.id,
        skill_id: skillId,
        box,
        streak,
        attempts: prior.attempts + attemptList.length,
        correct: prior.correct + attemptList.filter((a) => a.correct).length,
        last_seen_at: now.toISOString(),
        due_at: dueAt.toISOString(),
      };
    });

    const { error: masteryError } = await admin
      .from("skill_mastery")
      .upsert(masteryUpserts, { onConflict: "kid_id,skill_id" });
    if (masteryError) throw masteryError;

    // ---- Stars: earned by any practice, correct answers only ----------
    const starsAwarded = (attempts as Attempt[]).filter((a) => a.correct).length * STARS_PER_CORRECT;

    const { data: inv } = await admin
      .from("world_inventory")
      .select("stars")
      .eq("kid_id", kidId)
      .maybeSingle();
    const starsBalance = (inv?.stars ?? 0) + starsAwarded;
    const { error: invError } = await admin
      .from("world_inventory")
      .upsert(
        { kid_id: kidId, user_id: user.id, stars: starsBalance },
        { onConflict: "kid_id" },
      );
    if (invError) throw invError;

    // ---- Audit row (plan Part 6: economy audit) -----------------------
    const { error: logError } = await admin.from("world_award_log").insert({
      kid_id: kidId,
      user_id: user.id,
      zone_id: zoneId,
      quest_id: questId,
      payload: { attempts },
      stars_awarded: starsAwarded,
    });
    if (logError) throw logError;

    return json({
      starsAwarded,
      starsBalance,
      mastery: masteryUpserts.map((m) => ({
        skillId: m.skill_id,
        box: m.box,
        streak: m.streak,
        dueAt: m.due_at,
      })),
    });
  } catch (err) {
    console.error("world-award error", err);
    return json({ error: "Internal error" }, 500);
  }
});
