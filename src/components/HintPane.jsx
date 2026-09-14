import { useMemo } from "react";
import { hintFor } from "../hints/index.js";
import Scaffold from "./Scaffold.jsx";

/**
 * The hint: what the idea is, how to start THIS question (no answer), a
 * picture when one fits, and a fully worked example with other numbers.
 */
function Section({ label, children }) {
  return (
    <section className="mb-5 last:mb-0">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-teal m-0 mb-1.5">{label}</h3>
      {children}
    </section>
  );
}

export default function HintPane({ question }) {
  const hint = useMemo(() => hintFor(question), [question]);
  if (!question) return null;
  return (
    <div className="px-5 py-4 text-ink" data-testid="hint-pane">
      <p className="text-xs font-bold text-ink/50 m-0">{hint.modeTitle}</p>
      <h2 className="font-display font-semibold text-2xl m-0 mb-4 leading-tight">{hint.title}</h2>

      <Section label="The idea">
        <p className="m-0 text-base font-semibold leading-relaxed text-ink/85">{hint.idea}</p>
      </Section>

      <Section label="Try this">
        <ol className="m-0 pl-5 space-y-1.5 text-base font-semibold leading-relaxed text-ink/85">
          {hint.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </Section>

      {hint.visual && (
        <Section label="Picture it">
          <div className="rounded-2xl bg-cream px-3 pb-3 -mt-1">
            <Scaffold scaffold={hint.visual} />
          </div>
        </Section>
      )}

      <Section label="Worked example">
        <div className="rounded-2xl border-2 border-seafoam bg-seafoam/20 px-4 py-3">
          <p className="m-0 font-display font-semibold text-lg">{hint.example.problem}</p>
          <ol className="m-0 mt-2 pl-5 space-y-1 text-sm font-semibold leading-relaxed text-ink/85">
            {hint.example.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <p className="m-0 mt-2 text-sm font-bold text-deep-teal">
            Answer: {String(hint.example.answer)}
          </p>
        </div>
      </Section>
    </div>
  );
}
