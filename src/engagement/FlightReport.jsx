import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ConfettiRain from "../components/ConfettiRain.jsx";
import LarkMark from "../components/LarkMark.jsx";
import { rankForLevel } from "./ranks.js";

/**
 * The Flight Report (gamification spec §02) — the end card, retuned.
 *
 * Ring, lark, pun headline, Apricot strip, teal button and text link are the
 * §11 end card unchanged. New here: the strip carries the four-payout total
 * and can grow downward into the itemised ledger ("How did I get 14?"), and
 * the slot beneath holds one of three states — level read-out, Seafoam
 * nomination note (§03), or the expanded ledger. The card must never be
 * fixed-height: the nomination note is 84px against the level bar's 39px.
 */

// Headlines are bird puns, never a score judgement (§11).
const END_CARD_PUNS = [
  "Talon-ted!",
  "Nice flying!",
  "Owl be impressed!",
  "Toucan-t stop you!",
  "Wing it again?",
  "Egg-cellent!",
  "That soared!",
  "Feather in your cap!",
];

function LedgerRow({ label, value, strong = false }) {
  return (
    <div
      className={`flex items-center justify-between text-[14px] text-ink ${
        strong ? "font-extrabold border-t border-ink/20 pt-1.5 mt-1.5" : "font-bold"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">+{value}</span>
    </div>
  );
}

function LevelBar({ level, maxLevel = 10, balance }) {
  const rank = rankForLevel(level);
  return (
    <div aria-label={`Level ${level} of ${maxLevel} — ${rank.name}. ${balance} stars in the Nest.`}>
      <div className="h-2.5 rounded-full bg-ink/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-teal"
          initial={{ width: 0 }}
          animate={{ width: `${(level / maxLevel) * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5 text-[14px] font-bold text-ink">
        <span>
          Level {level} · {rank.name}
        </span>
        <span>{balance} in the Nest</span>
      </div>
    </div>
  );
}

// §03 state 2: news, never a modal, never a blocking offer. The Fledging
// Flight itself is proposed at the next take-off.
function NominationNote({ nextLevel }) {
  return (
    <div className="flex items-center gap-3 bg-seafoam rounded-2xl px-4 py-3 min-h-[84px] text-left">
      <span className="flex items-center justify-center w-11 h-11 rounded-full bg-cream shrink-0">
        <LarkMark size={26} />
      </span>
      <span>
        <span className="block text-[15px] font-extrabold text-ink">Ready for higher skies</span>
        <span className="block text-[14px] font-bold text-ink/80">
          Next time, six questions to reach Level {nextLevel}.
        </span>
      </span>
    </div>
  );
}

export default function FlightReport({
  maxLevel = 10,
  payout,
  total,
  level,
  engagement,
  nomination = null,
  lifetimeStars,
  lowMotionMode = false,
  onPlayAgain,
}) {
  const navigate = useNavigate();
  // Collapsed by default from the second week on (§02 state 3).
  const [ledgerOpen, setLedgerOpen] = useState(() => Boolean(engagement?.firstWeek));
  const ratio = total > 0 ? payout.firstTryCorrect / total : 0;
  const headline = END_CARD_PUNS[(lifetimeStars + total) % END_CARD_PUNS.length];
  const rank = rankForLevel(level);
  const streak = engagement?.streak ?? 0;

  return (
    <motion.div
      data-blocks-keys="" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {!lowMotionMode && <ConfettiRain />}
      <motion.div
        className="relative bg-white rounded-3xl shadow-[0_8px_0_#14231F14] p-8 mx-4 max-w-sm w-full text-center"
        initial={{ scale: 0.5, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        {/* Score ring: Lark Teal fill = percent first-try correct, on an Ink
            8% track; the lark is the reward and appears here only. */}
        <div className="relative w-[148px] h-[148px] mx-auto">
          <div
            className="w-full h-full rounded-full flex items-center justify-center"
            style={{ background: `conic-gradient(#0B7A6A ${Math.max(ratio * 100, 3)}%, #14231F14 0)` }}
          >
            <div className="w-[120px] h-[120px] rounded-full bg-white flex items-center justify-center">
              <LarkMark size={58} />
            </div>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-ink text-cream rounded-full px-3.5 py-1 font-display font-semibold text-[15px] whitespace-nowrap">
            {payout.firstTryCorrect} / {total}
          </div>
        </div>

        <h2 className="text-3xl font-display font-semibold text-ink mt-5">{headline}</h2>

        {/* Apricot strip. When the ledger opens it grows downward into the four
            reasons on the same surface — one object opening, not a new panel. */}
        <div className="mt-3 bg-apricot rounded-2xl px-4 py-2.5 inline-block min-w-[240px]">
          <div className="flex items-center justify-center gap-2.5">
            <span className="w-4 h-4 bg-sun rotate-45 rounded-[3px] shrink-0" aria-hidden="true" />
            <span className="text-[15px] font-bold text-ink">
              +{payout.total} {payout.total === 1 ? "star" : "stars"}
            </span>
            {streak > 1 && (
              <>
                <span className="w-px h-[18px] bg-ink/20 shrink-0" aria-hidden="true" />
                <span className="text-[15px] font-bold text-ink">{streak} day migration</span>
              </>
            )}
          </div>
          {ledgerOpen && (
            <motion.div
              className="mt-2.5 pt-2.5 border-t border-ink/15 space-y-1 text-left"
              initial={lowMotionMode ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
            >
              {payout.landing > 0 && <LedgerRow label="You finished" value={payout.landing} />}
              {payout.precision > 0 && (
                <LedgerRow
                  label={`${payout.firstTryCorrect} right first try`}
                  value={payout.precision}
                />
              )}
              {payout.altitude > 0 && (
                <LedgerRow label={`${rank.name} skies`} value={payout.altitude} />
              )}
              {payout.circleBack > 0 && (
                <LedgerRow
                  label={payout.circleBack === 1 ? "Old miss fixed" : "Old misses fixed"}
                  value={payout.circleBack}
                />
              )}
              <LedgerRow label="Into the Nest" value={payout.total} strong />
            </motion.div>
          )}
        </div>

        <button
          className="block mx-auto mt-2 text-[14px] font-bold text-teal cursor-pointer hover:underline underline-offset-2"
          onClick={() => setLedgerOpen((v) => !v)}
        >
          {ledgerOpen ? "Hide" : `How did I get ${payout.total}?`}
        </button>

        {/* The slot: level read-out, or the Seafoam nomination note (§03).
            (The third state is the ledger above.) Container height follows
            content — never fixed. */}
        <div className="mt-3 text-left">
          {nomination ? (
            <NominationNote nextLevel={level + 1} />
          ) : (
            <LevelBar level={engagement?.levelAfter ?? level} maxLevel={maxLevel} balance={engagement?.balance ?? 0} />
          )}
          {engagement?.glideDown && (
            <p className="text-[13px] font-bold text-deep-teal mt-2 text-center">
              Smoother skies for a bit.
            </p>
          )}
        </div>

        <button
          autoFocus
          className="mt-6 w-full h-14 bg-teal text-cream text-xl font-display font-semibold rounded-[18px] shadow-[0_5px_0_#064A41] btn-press cursor-pointer"
          onClick={onPlayAgain}
        >
          Play again
        </button>
        <button
          className="mt-3 text-[15px] font-bold text-teal cursor-pointer hover:underline underline-offset-2"
          onClick={() => navigate("/")}
        >
          Back to the nest
        </button>
      </motion.div>
    </motion.div>
  );
}
