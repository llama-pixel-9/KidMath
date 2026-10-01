import { useState } from "react";
import { motion } from "framer-motion";
import NumberPad from "./NumberPad.jsx";
import { SUBMIT_BUTTON, feedbackRing, isLocked, tapMotion, FIGURE_COLORS, useAnswerKeys } from "./kit";

/**
 * The canonical Grade 2-3 model, and the one representation the app had no way
 * to express. Compare and Change Unknown structures are taught on a number line
 * before they are taught symbolically, and fraction-as-a-number is inexpressible
 * without one (spec §A4, C2 #6-7).
 *
 * Two jobs:
 *   mode="locate"  tap the tick for a value        -> answer is that value
 *   mode="jump"    type the length of a drawn hop    -> answer is the distance
 *
 * In jump mode the child types the length on the keypad under the line. The
 * hop's two ends are drawn, so the widget must never submit their distance
 * itself: that would hand the child the answer.
 */
export default function NumberLine({
  onSubmit,
  feedback,
  theme,
  lowMotionMode,
  lowEndDevice,
  min = 0,
  max = 10,
  step = 1,
  from = null,
  to = null,
  labelEvery = 1,
  mode = "locate",
}) {
  const [picked, setPicked] = useState(null);
  const locked = isLocked(feedback);

  const ticks = [];
  for (let v = min; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(4)));

  const W = 320;
  const H = 96;
  const PAD = 18;
  const x = (v) => PAD + ((v - min) / (max - min)) * (W - PAD * 2);
  const baseY = 62;

  const submit = () => {
    if (locked || picked === null) return;
    onSubmit(picked);
  };

  return (
    <section className="flex flex-col items-center gap-4 w-full" aria-label="Number line">
      {mode === "locate" && <LocateKeys ticks={ticks} picked={picked} setPicked={setPicked} submit={submit} enabled={!locked} />}
      <div className={`w-full p-3 rounded-3xl ${theme?.cardBg || "bg-white/80"} ${feedbackRing(feedback)}`}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Number line from ${min} to ${max}`}>
          <line x1={PAD} y1={baseY} x2={W - PAD} y2={baseY} stroke={FIGURE_COLORS.ink} strokeWidth="3" />
          {/* arrowheads: the line continues in both directions */}
          <polygon points={`${PAD - 10},${baseY} ${PAD - 2},${baseY - 5} ${PAD - 2},${baseY + 5}`} fill={FIGURE_COLORS.ink} />
          <polygon points={`${W - PAD + 10},${baseY} ${W - PAD + 2},${baseY - 5} ${W - PAD + 2},${baseY + 5}`} fill={FIGURE_COLORS.ink} />

          {ticks.map((v, i) => {
            const major = i % labelEvery === 0;
            return (
              <g key={v}>
                <line
                  x1={x(v)}
                  y1={baseY - (major ? 9 : 5)}
                  x2={x(v)}
                  y2={baseY + (major ? 9 : 5)}
                  stroke={major ? FIGURE_COLORS.ink : FIGURE_COLORS.inkSoft}
                  strokeWidth={major ? 2.5 : 1.5}
                />
                {major && (
                  <text x={x(v)} y={baseY + 26} textAnchor="middle" fontSize="12" fontWeight="700" fill={FIGURE_COLORS.ink}>
                    {v}
                  </text>
                )}
                {mode === "locate" && !locked && (
                  <circle
                    cx={x(v)}
                    cy={baseY}
                    r="14"
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    onClick={() => setPicked(v)}
                  />
                )}
              </g>
            );
          })}

          {/* the hop, drawn as an arc so it reads as a jump rather than a span */}
          {mode === "jump" && from !== null && to !== null && (
            <path
              d={`M ${x(from)} ${baseY - 6} Q ${(x(from) + x(to)) / 2} ${baseY - 42} ${x(to)} ${baseY - 6}`}
              fill="none"
              stroke={FIGURE_COLORS.accent}
              strokeWidth="3"
              markerEnd=""
            />
          )}
          {mode === "jump" && from !== null && (
            <circle cx={x(from)} cy={baseY} r="6" fill={FIGURE_COLORS.accent} />
          )}
          {mode === "jump" && to !== null && (
            <circle cx={x(to)} cy={baseY} r="6" fill={FIGURE_COLORS.warm} />
          )}

          {picked !== null && (
            <motion.circle
              cx={x(picked)}
              cy={baseY}
              r="9"
              fill={FIGURE_COLORS.accent}
              initial={lowMotionMode ? false : { scale: 0 }}
              animate={{ scale: 1 }}
            />
          )}
        </svg>
      </div>

      {mode === "locate" && (
        <p className={`text-xl font-bold ${theme?.textSecondary || "text-slate-500"}`}>
          {picked === null ? "Tap the number line" : `You picked ${picked}`}
          <span className="key-hint static ml-2 align-middle">← →</span>
        </p>
      )}

      {mode === "jump" ? (
        <NumberPad onSubmit={onSubmit} feedback={feedback} theme={theme || {}} lowMotionMode={lowMotionMode} lowEndDevice={lowEndDevice} />
      ) : (
        <motion.button
          type="button"
          className={SUBMIT_BUTTON}
          disabled={locked || picked === null}
          onClick={submit}
          {...tapMotion(lowMotionMode)}
        >
          Check
        </motion.button>
      )}
    </section>
  );
}

/**
 * Locate mode's keys: left/right arrows walk the ticks (starting from the left
 * end), Home/End jump to the ends, Enter checks. Only the most recently
 * mounted key handler hears keys, and a parent's handler mounts after its
 * children's, so the number line must not register one in jump mode or it
 * would sit above the keypad and swallow its digits. Hence a child that only
 * renders in locate mode.
 */
function LocateKeys({ ticks, picked, setPicked, submit, enabled }) {
  useAnswerKeys((e) => {
    if (e.key === "Enter") { submit(); return true; }
    const idx = picked === null ? -1 : ticks.indexOf(picked);
    if (e.key === "ArrowRight") { setPicked(ticks[Math.min(ticks.length - 1, idx + 1)]); return true; }
    if (e.key === "ArrowLeft") { setPicked(ticks[Math.max(0, idx - 1)]); return true; }
    if (e.key === "Home") { setPicked(ticks[0]); return true; }
    if (e.key === "End") { setPicked(ticks[ticks.length - 1]); return true; }
    return false;
  }, enabled);
  return null;
}
