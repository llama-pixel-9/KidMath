import { Star, Flame, Target } from "lucide-react";
import { useTheme } from "../useTheme.js";
import { DAILY_GOAL } from "./engagementStore.js";

/**
 * The always-visible loop summary: star balance, day streak, daily goal.
 * Pure display — pass it the numbers (`balance`, `streak`, `today`).
 */
export default function EngagementBar({ balance, streak, today, onOpenStickers }) {
  const { theme } = useTheme();
  const goalDone = today >= DAILY_GOAL;
  const chip = `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-sm ${theme.cardBg}`;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2" aria-label="Your stars, streak, and daily goal">
      <button
        type="button"
        className={`${chip} cursor-pointer`}
        onClick={onOpenStickers}
        aria-label={`${balance} stars — open sticker book`}
        title="Open your sticker book"
      >
        <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
        <span className={`text-sm font-extrabold ${theme.textPrimary}`}>{balance}</span>
      </button>

      {streak > 0 && (
        <span className={chip} title={`${streak} day${streak === 1 ? "" : "s"} in a row`}>
          <Flame className="h-4 w-4 text-orange-500 fill-orange-400" />
          <span className={`text-sm font-extrabold ${theme.textPrimary}`}>{streak}</span>
          <span className={`text-xs font-semibold ${theme.textMuted}`}>day{streak === 1 ? "" : "s"}</span>
        </span>
      )}

      <span
        className={chip}
        title={goalDone ? "Daily goal done!" : `Earn ${DAILY_GOAL - today} more star${DAILY_GOAL - today === 1 ? "" : "s"} today`}
      >
        <Target className={`h-4 w-4 ${goalDone ? "text-emerald-500" : "text-sky-500"}`} />
        <span className={`text-sm font-extrabold ${goalDone ? "text-emerald-600" : theme.textPrimary}`}>
          {Math.min(today, DAILY_GOAL)}/{DAILY_GOAL}
        </span>
        {goalDone && <span className="text-sm" aria-hidden="true">✓</span>}
      </span>
    </div>
  );
}
