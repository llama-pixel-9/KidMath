import { useNavigate } from "react-router-dom";
import PlayCardPanel from "./PlayCards.jsx";

/**
 * §20 screen 01 — value, one page, never a carousel. Slogan, four benefit
 * rows, and the single teal panel holding live play cards. Sun stays reserved
 * for the paid action, so every button here is Lark Teal.
 */

// Benefit icons: feather-style strokes (2px, round caps) in 44px tinted wells,
// tints in §08 order.
const BENEFITS = [
  {
    text: "No ads. Not one.",
    well: "bg-seafoam",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14231F" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M6 6l12 12" />
      </svg>
    ),
  },
  {
    text: "Wrong answers are never punished.",
    well: "bg-teal-mid",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14231F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M8.5 12.5l2.5 2.5 4.5-5" />
      </svg>
    ),
  },
  {
    text: "Print real worksheets.",
    well: "bg-apricot",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14231F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="6" y="4" width="12" height="16" rx="1.5" />
        <path d="M9.5 9h5M9.5 12.5h5M9.5 16h3" />
      </svg>
    ),
  },
  {
    text: "Built for fun and focus.",
    well: "bg-sun-light",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14231F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 8v4l2.5 2" />
      </svg>
    ),
  },
];

export default function ValuePage() {
  const navigate = useNavigate();
  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="max-w-5xl mx-auto grid lg:grid-cols-[1.1fr_1fr] gap-10 items-stretch">
        <div className="flex flex-col justify-center">
          <h1 className="font-display font-semibold text-5xl sm:text-6xl text-ink leading-[1.05] m-0">
            Math that
            <br />
            takes flight.
          </h1>

          <ul className="mt-10 space-y-6 list-none p-0 m-0">
            {BENEFITS.map((b) => (
              <li key={b.text} className="flex items-center gap-4">
                <span className={`inline-flex items-center justify-center w-11 h-11 rounded-[12px] ${b.well} flex-none`}>
                  {b.icon}
                </span>
                <span className="text-lg font-bold text-ink">{b.text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-5">
            <button
              type="button"
              className="px-8 h-14 bg-teal text-cream font-display font-semibold text-xl rounded-[18px] shadow-[0_5px_0_#064A41] btn-press cursor-pointer self-start"
              onClick={() => navigate("/signup")}
            >
              Get started
            </button>
            <button
              type="button"
              className="text-teal font-bold text-base cursor-pointer text-left self-start bg-transparent border-none p-0"
              onClick={() => navigate("/signup")}
            >
              Already have an account? Sign in
            </button>
          </div>
        </div>

        <PlayCardPanel />
      </div>
    </main>
  );
}
