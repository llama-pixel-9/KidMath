import { useTheme } from "../useTheme.js";
import { DAILY_GOAL } from "./engagementStore.js";
import Feather from "../components/feather.jsx";

/**
 * The always-visible loop summary: star balance, day streak, daily goal.
 * Pure display — pass it the numbers (`balance`, `streak`, `today`).
 * Brand: the star is the Sun diamond, the streak is the feather bolt —
 * no gold, no flames, no third hue.
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
        <span className="block w-3 h-3 bg-sun rotate-45 rounded-[2.5px]" aria-hidden="true" />
        <span className={`text-sm font-extrabold ${theme.textPrimary}`}>{balance}</span>
      </button>

      {streak > 0 && (
        <span className={chip} title={`${streak} day${streak === 1 ? "" : "s"} in a row`}>
          <Feather name="streak" size={16} className="text-sun" />
          <span className={`text-sm font-extrabold ${theme.textPrimary}`}>{streak}</span>
          <span className={`text-xs font-semibold ${theme.textMuted}`}>day{streak === 1 ? "" : "s"}</span>
        </span>
      )}

      <span
        className={chip}
        title={goalDone ? "Daily goal done!" : `Earn ${DAILY_GOAL - today} more star${DAILY_GOAL - today === 1 ? "" : "s"} today`}
      >
        {goalDone ? (
          <Feather name="check" size={16} className="text-teal" />
        ) : (
          <span className="block w-3 h-3 rounded-full border-2 border-teal" aria-hidden="true" />
        )}
        <span className={`text-sm font-extrabold ${goalDone ? "text-deep-teal" : theme.textPrimary}`}>
          {Math.min(today, DAILY_GOAL)}/{DAILY_GOAL}
        </span>
      </span>
    </div>
  );
}
