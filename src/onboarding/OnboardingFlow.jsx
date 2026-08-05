import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../useAuth";
import { usePremium } from "../PremiumContext";
import { paywallEnabled, startCheckout } from "../premium";
import { logConsent } from "../legal";
import {
  buildAutoRenewalDisclosure,
  planButtonsDisabled,
  AUTORENEW_ACK_DEFAULT,
  ACCOUNT_CONSENT_TEXT,
} from "../legal/disclosures";
import { supabase } from "../supabaseClient";
import {
  MAX_KIDS,
  KID_AGES,
  KID_GRADES,
  fetchKids,
  addKid,
  setActiveKid,
} from "../kidProfiles";

/**
 * §20 screens 03–04 — add a kid, then the soft paywall. Account flow voice is
 * plain English; the paywall is soft — free is a real plan and "Stay on the
 * free plan" is a full-weight button. While the launch switch keeps the
 * paywall off, the plan step is skipped entirely.
 */

const SEGMENT = "h-12 rounded-[12px] border-[1.5px] font-bold text-base cursor-pointer transition-colors";
const SEGMENT_IDLE = "bg-white border-ink/10 text-ink hover:border-ink/25";
const SEGMENT_ACTIVE = "bg-seafoam border-teal text-ink";

function WizardRail({ step, onBack }) {
  // Three segments: account (done by now), kid, plan.
  return (
    <div className="flex items-center gap-3 max-w-3xl mx-auto w-full px-4 pt-4">
      <button
        type="button"
        className="text-sm font-bold text-ink/60 cursor-pointer bg-transparent border-none p-0 hover:text-ink"
        onClick={onBack}
      >
        Back
      </button>
      <div className="flex-1 flex gap-2">
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className={`h-[5px] flex-1 rounded-full ${s <= step ? "bg-teal" : "bg-teal/15"}`}
          />
        ))}
      </div>
      <span className="text-sm font-bold text-ink/60">{step} / 3</span>
    </div>
  );
}

function KidStep({ onDone, kidCount }) {
  const [firstName, setFirstName] = useState("");
  const [age, setAge] = useState(null);
  const [grade, setGrade] = useState(null);
  const [added, setAdded] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();

  const complete = firstName.trim().length > 0 && age && grade;
  const room = kidCount + added.length < MAX_KIDS;

  const save = async () => {
    const kid = await addKid(user.id, { firstName, age, grade });
    setAdded((k) => [...k, kid]);
    setFirstName("");
    setAge(null);
    setGrade(null);
    return kid;
  };

  const handleContinue = async () => {
    setError("");
    setBusy(true);
    try {
      let kids = added;
      if (complete) kids = [...added, await save()];
      if (!kids.length) {
        setError("Add a first name, age and grade to continue.");
        return;
      }
      onDone(kids);
    } catch (e) {
      setError(e.message || "Could not save — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
      <h1 className="font-display font-semibold text-4xl text-ink m-0">Who's learning?</h1>
      <p className="mt-2 text-base font-semibold text-ink/60">
        First name only — that's all we store about your child.{" "}
        {/* §312.4(d): the add-a-child screen collects a child's personal
            information, so the privacy link must be right here. */}
        <Link to="/privacy" className="underline underline-offset-2 text-teal">
          Privacy Policy
        </Link>
      </p>

      {added.length > 0 && (
        <p className="mt-4 text-sm font-bold text-teal">
          Added: {added.map((k) => k.first_name).join(", ")}
        </p>
      )}

      <label className="block mt-8 text-sm font-bold text-ink" htmlFor="kid-first-name">
        First name
      </label>
      <input
        id="kid-first-name"
        type="text"
        value={firstName}
        maxLength={40}
        onChange={(e) => setFirstName(e.target.value)}
        className="mt-2 w-full h-14 rounded-[14px] border-[1.5px] border-ink/15 focus:border-teal focus:outline-none bg-white px-4 text-lg font-semibold text-ink"
      />

      <p className="mt-6 mb-2 text-sm font-bold text-ink">Age</p>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {KID_AGES.map((a) => (
          <button
            key={a}
            type="button"
            className={`${SEGMENT} ${a === age ? SEGMENT_ACTIVE : SEGMENT_IDLE}`}
            onClick={() => setAge(a)}
          >
            {a}
          </button>
        ))}
      </div>

      <p className="mt-6 mb-2 text-sm font-bold text-ink">Grade</p>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {KID_GRADES.map((g) => (
          <button
            key={g}
            type="button"
            className={`${SEGMENT} ${g === grade ? SEGMENT_ACTIVE : SEGMENT_IDLE}`}
            onClick={() => setGrade(g)}
          >
            {g}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm font-bold text-ember">{error}</p>}

      <div className="mt-10 flex items-center justify-between gap-4">
        {room && complete ? (
          <button
            type="button"
            className="text-teal font-bold text-base cursor-pointer bg-transparent border-none p-0"
            disabled={busy}
            onClick={() => save().catch((e) => setError(e.message))}
          >
            + Add another kid
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          disabled={busy || (!complete && !added.length)}
          className="px-8 h-14 bg-teal text-cream font-display font-semibold text-xl rounded-[18px] shadow-[0_5px_0_#064A41] btn-press cursor-pointer disabled:opacity-40"
          onClick={handleContinue}
        >
          Continue
        </button>
      </div>
    </main>
  );
}

function PlanStep({ kidName, onFree }) {
  const { user } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoRenewAck, setAutoRenewAck] = useState(AUTORENEW_ACK_DEFAULT);

  const disclosure = buildAutoRenewalDisclosure("annual");

  const subscribe = async () => {
    setError("");
    setBusy(true);
    try {
      await logConsent(supabase, {
        userId: user.id,
        kind: "autorenew",
        disclosureText: disclosure.label,
        meta: {
          plan: "annual",
          price: disclosure.price,
          trialEndsOn: disclosure.trialEndsOn,
          firstChargeOn: disclosure.firstChargeOn,
        },
      });
      await startCheckout("annual");
    } catch (e) {
      setError(e.message || "Could not start checkout");
      setBusy(false);
    }
  };

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
      <h1 className="font-display font-semibold text-4xl text-ink m-0">
        Unlock everything{kidName ? ` for ${kidName}` : ""}.
      </h1>
      <p className="mt-2 text-base font-semibold text-ink/60 max-w-xl">
        {kidName || "Your kid"} is set up and ready. Choose how far the learning goes — you can
        change it any time.
      </p>

      <div className="mt-8 grid sm:grid-cols-2 gap-5 items-stretch">
        {/* Free is a real plan, and its button carries full weight. */}
        <div className="bg-white rounded-[20px] border-[1.5px] border-ink/10 p-6 flex flex-col">
          <h2 className="font-display font-medium text-2xl text-ink m-0">Free</h2>
          <p className="font-display font-semibold text-4xl text-ink mt-3 mb-4">$0</p>
          <ul className="m-0 p-0 list-none space-y-2 text-[15px] font-semibold text-ink">
            <li>5 games — addition, subtraction, multiplication, division, counting</li>
            <li>On the web, iPad, and iPhone</li>
          </ul>
          <div className="flex-1" />
          <button
            type="button"
            className="mt-6 w-full h-14 rounded-[18px] border-2 border-teal text-teal font-display font-semibold text-lg cursor-pointer bg-transparent"
            onClick={onFree}
          >
            Stay on the free plan
          </button>
        </div>

        {/* Sun is reserved for the single paid action. Ink on Sun — never cream. */}
        <div className="relative bg-seafoam rounded-[20px] p-6 flex flex-col">
          <span className="absolute -top-3 right-5 bg-sun text-ink text-xs font-bold rounded-full px-3 py-1">
            14 days free
          </span>
          <h2 className="font-display font-medium text-2xl text-ink m-0">larkit Plus</h2>
          <p className="mt-3 mb-4">
            <span className="font-display font-semibold text-4xl text-ink">$54.99</span>
            <span className="text-sm font-semibold text-ink/70"> / year · or $8.99 monthly</span>
          </p>
          <ul className="m-0 p-0 list-none space-y-2 text-[15px] font-semibold text-ink">
            <li>All 22 games, K–5</li>
            <li>Every kid in your household — one price</li>
            <li>Flight logs — printable worksheets for any game, with answer keys</li>
            <li>Progress syncs across web, iPad, and iPhone</li>
          </ul>
          <div className="flex-1" />
          {/* The separate auto-renewal consent — its own affirmative act,
              never pre-ticked, never merged into Terms acceptance. */}
          <label className="flex gap-3 items-start mt-6 text-left">
            <input
              type="checkbox"
              checked={autoRenewAck}
              onChange={(e) => setAutoRenewAck(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0"
            />
            <span className="text-sm text-ink/70 leading-relaxed">{disclosure.label}</span>
          </label>
          <button
            type="button"
            disabled={planButtonsDisabled({ autoRenewAck, busy })}
            className="mt-4 w-full h-14 rounded-[18px] bg-sun text-ink font-display font-semibold text-lg shadow-[0_5px_0_#C4471B] btn-press cursor-pointer disabled:opacity-50"
            onClick={subscribe}
          >
            Start the free trial
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-bold text-ember text-center">{error}</p>}

      <p className="mt-6 text-sm text-ink/60 text-center">
        Cancel anytime in one step from{" "}
        <Link to="/account/billing" className="underline">your billing settings</Link>. The free
        plan is free forever.{" "}
        <Link to="/terms" className="underline">Terms</Link> ·{" "}
        <Link to="/privacy" className="underline">Privacy</Link>
      </p>
    </main>
  );
}

export default function OnboardingFlow() {
  const { user, loading } = useAuth();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const [existingKids, setExistingKids] = useState(null);
  const [step, setStep] = useState("kid");
  const [newKids, setNewKids] = useState([]);

  useEffect(() => {
    if (!loading && !user) navigate("/signup", { replace: true });
  }, [user, loading, navigate]);

  // Consent evidence, kind "account": recorded once per user, after the OAuth
  // round-trip lands them here. The disclosure text is the literal sentence
  // rendered beside the sign-in buttons on /signup. A localStorage marker
  // keeps repeat visits from re-logging; duplicate rows would be harmless
  // (the table is append-only evidence) but noisy.
  useEffect(() => {
    if (!user) return;
    const marker = `larkit-consent-account-${user.id}`;
    if (localStorage.getItem(marker)) return;
    logConsent(supabase, {
      userId: user.id,
      kind: "account",
      disclosureText: ACCOUNT_CONSENT_TEXT,
    }).then((row) => {
      if (row) localStorage.setItem(marker, row.created_at || "1");
    });
  }, [user]);

  // Returning parents with kids land on the profile picker, never back in
  // the wizard — unless they came to add another kid (?add=1).
  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetchKids(user.id).then((kids) => {
      if (!alive) return;
      setExistingKids(kids);
      const adding = new URLSearchParams(window.location.search).get("add") === "1";
      if (kids.length > 0 && !adding) navigate("/profiles", { replace: true });
    });
    return () => { alive = false; };
  }, [user, navigate]);

  if (loading || !user || existingKids === null) return null;

  const finish = (kids) => {
    const all = [...existingKids, ...kids];
    if (all.length === 1) {
      setActiveKid(all[0].id);
      navigate("/", { replace: true });
    } else {
      navigate("/profiles", { replace: true });
    }
  };

  const handleKidsDone = (kids) => {
    setNewKids(kids);
    if (paywallEnabled() && !isPremium) setStep("plan");
    else finish(kids);
  };

  return (
    <div className="flex-1 flex flex-col">
      <WizardRail
        step={step === "kid" ? 2 : 3}
        onBack={() => (step === "plan" ? setStep("kid") : navigate(-1))}
      />
      {step === "kid" ? (
        <KidStep kidCount={existingKids.length} onDone={handleKidsDone} />
      ) : (
        <PlanStep kidName={newKids[0]?.first_name} onFree={() => finish(newKids)} />
      )}
    </div>
  );
}
