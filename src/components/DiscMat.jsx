const PLACE_LABEL = { 1000: "1000", 100: "100", 10: "10", 1: "1" };
// Same tints as the PlaceValueDiscs answer widget (brand rule: ink labels on tints).
const PLACE_COLOR = { 1000: "bg-apricot", 100: "bg-seafoam", 10: "bg-teal-mid", 1: "bg-sun-light" };

function Mat({ cols, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {label && <span className="text-xs font-extrabold text-slate-500">{label}</span>}
      <div className="flex justify-center gap-2">
        {(cols || []).map(({ place, count }) => (
          <div key={place} className="flex flex-col items-center gap-1 rounded-xl bg-white/70 p-2 shadow-inner">
            <span className="text-xs font-bold text-slate-500">{PLACE_LABEL[place]}</span>
            <div className="flex flex-col-reverse gap-1 min-h-[56px] justify-start">
              {Array.from({ length: count }, (_, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-full ${PLACE_COLOR[place]} text-ink text-[10px] font-bold flex items-center justify-center shadow`}
                >
                  {PLACE_LABEL[place]}
                </div>
              ))}
              {count === 0 && <span className="text-xs text-slate-300 font-bold">—</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Read-only place-value disc mat(s) — the QUESTION-side figure
 * (figureRegistry `discMat`). The interactive sibling is PlaceValueDiscs
 * (answerType "placeValueDiscs"), which draws its own mat plus a digit pad;
 * this one only shows a mat (or two, for compare items) for choice/judged
 * questions. `display.discMat` is either { cols } or { mats: [{label, cols}] }.
 */
export default function DiscMat({ cols, mats }) {
  if (mats?.length) {
    return (
      <div className="flex justify-center gap-6 flex-wrap">
        {mats.map((m, i) => (
          <Mat key={i} cols={m.cols} label={m.label} />
        ))}
      </div>
    );
  }
  return (
    <div className="flex justify-center">
      <Mat cols={cols} />
    </div>
  );
}
