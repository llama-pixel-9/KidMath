import { clockHand } from "./clockHand.js";

/**
 * Read-only analog clock face — the QUESTION-side figure (figureRegistry
 * `clockFace`). The interactive sibling is AnalogClock (answerType "clock"),
 * which draws its own face plus a digit pad; this one only shows a time, for
 * choice/judged items where the child reads the face and answers elsewhere.
 * Same geometry as AnalogClock so the two faces look identical.
 */
export default function ClockFace({ hour, minute }) {
  const cx = 80;
  const cy = 80;
  const minuteAngle = (minute || 0) * 6;
  const hourAngle = (((hour || 12) % 12) + (minute || 0) / 60) * 30;
  const mh = clockHand(cx, cy, 58, minuteAngle);
  const hh = clockHand(cx, cy, 40, hourAngle);
  return (
    <div className="flex justify-center">
      <svg
        width="160"
        height="160"
        viewBox="0 0 160 160"
        role="img"
        aria-label="clock face"
      >
        <circle cx={cx} cy={cy} r="70" className="fill-white stroke-slate-300" strokeWidth="4" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = clockHand(cx, cy, 62, i * 30);
          return <circle key={i} cx={a.x2} cy={a.y2} r="2.5" className="fill-slate-400" />;
        })}
        <line x1={cx} y1={cy} x2={hh.x2} y2={hh.y2} className="stroke-slate-700" strokeWidth="5" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={mh.x2} y2={mh.y2} className="stroke-sky-500" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4" className="fill-slate-700" />
      </svg>
    </div>
  );
}
