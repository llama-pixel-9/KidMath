import { motion } from "framer-motion";
import { useTheme } from "../useTheme.js";

import { RANKS, rankForLevel } from "./ranks.js";

/**
 * A mode's ten levels drawn as a path with the child's pin on it. The three
 * structural bands are landmarks — named ranks a child can hold on to — so a
 * level-up reads as travel, not as a number changing.
 */
export default function JourneyMap({ level, maxLevel = 10, compact = false }) {
  const { theme } = useTheme();
  const rank = rankForLevel(level);

  return (
    <div className="w-full" aria-label={`Level ${level} of ${maxLevel} — ${rank.name}`}>
      <div className="flex items-center gap-1">
        {Array.from({ length: maxLevel }, (_, i) => {
          const lv = i + 1;
          const done = lv < level;
          const here = lv === level;
          const landmark = lv === 1 || lv === 4 || lv === 7;
          return (
            <div key={lv} className="flex-1 flex flex-col items-center gap-0.5">
              {!compact && landmark && (
                <span className="text-sm leading-none" aria-hidden="true">
                  {RANKS[lv === 1 ? 0 : lv === 4 ? 1 : 2].emoji}
                </span>
              )}
              {here ? (
                <motion.span
                  className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 ring-2 ring-white shadow"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.4, 1] }}
                  transition={{ duration: 0.45 }}
                  aria-hidden="true"
                />
              ) : (
                <span
                  className={`w-2.5 h-2.5 rounded-full ${done ? "bg-emerald-400" : "bg-slate-300"}`}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>
      <p className={`text-center text-xs font-bold mt-1 ${theme.textMuted}`}>
        {rank.emoji} {rank.name} — Level {level}
      </p>
    </div>
  );
}
