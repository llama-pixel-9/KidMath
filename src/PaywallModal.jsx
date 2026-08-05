import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Printer, Cloud, Users, X } from "lucide-react";
import { AuthContext } from "./AuthContextValue";
import { startCheckout } from "./premium";
import { logConsent } from "./legal";
import {
  buildAutoRenewalDisclosure,
  planButtonsDisabled,
  AUTORENEW_ACK_DEFAULT,
} from "./legal/disclosures";
import { supabase } from "./supabaseClient";

/**
 * The web paywall. Same presentation rules as iOS: lead with the annual plan
 * (49% off — the price that's meant to be bought), monthly shown flat and
 * never discounted, 14-day trial on both, every child included.
 *
 * The auto-renewal disclosure + separate unchecked checkbox below the plan
 * picker is a legal requirement (CA B&P §17602 and sibling statutes), not
 * copy — see docs/legal-implementation.md step 5 before changing it.
 */
const FEATURES = [
  { icon: Sparkles, text: "All 22 practice modes, Grades 1-4" },
  { icon: Printer, text: "Printable PDF worksheets with answer keys" },
  { icon: Cloud, text: "Progress syncs across web, iPad, and iPhone" },
  { icon: Users, text: "Every child in your household — one price" },
];

export default function PaywallModal({ onClose }) {
  const { user, signInWithGoogle } = useContext(AuthContext);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState("annual");
  const [autoRenewAck, setAutoRenewAck] = useState(AUTORENEW_ACK_DEFAULT);

  const disclosure = buildAutoRenewalDisclosure(plan);

  const subscribe = async () => {
    setError("");
    setBusy(true);
    try {
      await logConsent(supabase, {
        userId: user.id,
        kind: "autorenew",
        disclosureText: disclosure.label,
        meta: {
          plan,
          price: disclosure.price,
          trialEndsOn: disclosure.trialEndsOn,
          firstChargeOn: disclosure.firstChargeOn,
        },
      });
      await startCheckout(plan);
    } catch (e) {
      setError(e.message || "Could not start checkout");
      setBusy(false);
    }
  };

  const planCard = (id, selected) =>
    `w-full text-left rounded-2xl border-2 p-4 cursor-pointer transition-colors ${
      selected ? "border-teal bg-seafoam/40" : "border-slate-200 bg-white hover:border-slate-300"
    }`;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 w-full max-w-md max-h-[92vh] overflow-y-auto"
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end">
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 cursor-pointer">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <div className="text-center">
          <div className="flex justify-center mb-3"><span className="inline-block w-8 h-8 bg-sun rotate-45 rounded-[7px]"></span></div>
          <h2 className="text-2xl font-semibold font-display text-ink">Unlock all of larkit</h2>
          <p className="mt-1 font-semibold text-ink/60">Try everything free for 14 days</p>
        </div>

        <ul className="mt-5 space-y-2">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-teal shrink-0" />
              <span className="text-sm font-semibold text-slate-600">{text}</span>
            </li>
          ))}
        </ul>

        {!user ? (
          <div className="mt-6 space-y-3 text-center">
            <p className="text-sm font-semibold text-slate-500">
              Parents: sign in first so the subscription follows your family everywhere.
            </p>
            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-full py-3 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 font-extrabold cursor-pointer hover:border-slate-300"
            >
              Continue with Google
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <div className="space-y-3" role="radiogroup" aria-label="Choose a plan">
              <button
                type="button"
                role="radio"
                aria-checked={plan === "annual"}
                onClick={() => setPlan("annual")}
                className={planCard("annual", plan === "annual")}
              >
                <span className="block text-xs tracking-widest font-bold text-teal">BEST VALUE · 49% OFF</span>
                <span className="block text-lg font-extrabold text-ink">$54.99/year — that's $4.58/month</span>
                <span className="block text-xs font-semibold text-slate-500">14-day free trial, then auto-renews</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={plan === "monthly"}
                onClick={() => setPlan("monthly")}
                className={planCard("monthly", plan === "monthly")}
              >
                <span className="block text-lg font-extrabold text-ink">$8.99/month</span>
                <span className="block text-xs font-semibold text-slate-500">14-day free trial, then auto-renews</span>
              </button>
            </div>

            {/* The separate auto-renewal consent — its own affirmative act,
                never pre-ticked, never merged into Terms acceptance. */}
            <label className="flex gap-3 items-start mt-5 text-left">
              <input
                type="checkbox"
                checked={autoRenewAck}
                onChange={(e) => setAutoRenewAck(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0"
              />
              <span className="text-sm text-slate-600 leading-relaxed">{disclosure.label}</span>
            </label>

            <button
              type="button"
              disabled={planButtonsDisabled({ autoRenewAck, busy })}
              onClick={subscribe}
              className="mt-4 w-full py-4 rounded-[18px] bg-teal text-cream font-display font-semibold text-lg shadow-[0_5px_0_#064A41] btn-press cursor-pointer disabled:opacity-50"
            >
              Start my 14-day free trial
            </button>

            <p className="mt-3 text-xs text-slate-500 text-center">
              Cancel anytime in one step from{" "}
              <Link to="/account/billing" className="underline">your billing settings</Link>.{" "}
              <Link to="/terms" className="underline">Terms</Link> ·{" "}
              <Link to="/privacy" className="underline">Privacy</Link>
            </p>
          </div>
        )}

        {error && <p className="mt-3 text-sm font-semibold text-red-500 text-center">{error}</p>}

        <p className="mt-4 text-xs text-slate-400 text-center leading-relaxed">
          One subscription covers every child in your household. Addition, subtraction,
          multiplication, division, and counting stay free forever.
        </p>
      </motion.div>
    </motion.div>
  );
}
