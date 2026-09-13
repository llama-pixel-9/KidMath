import { useEffect, useRef, useState } from "react";
import { speak, stopSpeaking } from "./speech";
import { birdUrl } from "./worldArt";
import { Diamond, Sheet } from "./ui";

/**
 * The quest dialog: audio-first (every line is spoken the moment it
 * appears; text is support for readers), the speaker's portrait, and the
 * one action the step needs:
 *   next — a big ▶ (Sun) button
 *   play — no button; the answer happens in the world (tap the things!)
 *   pick — wooden number signs; a wrong pick wobbles and re-asks
 *   done — ✓ with the stars earned
 */
export default function QuestDialog({ dialog, wrongTick, rightTick, onNext, onPick }) {
  const cardRef = useRef(null);
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    if (dialog?.line) speak(dialog.line);
    return stopSpeaking;
  }, [dialog]);

  useEffect(() => {
    if (!wrongTick) return;
    speak("Hmm, try again!");
    cardRef.current?.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-10px)" }, { transform: "translateX(10px)" }, { transform: "translateX(-6px)" }, { transform: "translateX(0)" }],
      { duration: 360, easing: "ease-in-out" },
    );
    const t = setTimeout(() => setPicked(null), 380);
    return () => clearTimeout(t);
  }, [wrongTick]);

  if (!dialog) return null;
  const portrait = dialog.portrait ? birdUrl(dialog.portrait) : null;

  return (
    <Sheet label={dialog.speaker}>
      <div ref={cardRef} className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {portrait && (
            <div className="shrink-0 w-16 h-16 rounded-2xl bg-seafoam/60 flex items-center justify-center overflow-hidden">
              <img src={portrait} alt="" className="w-14 h-14 object-contain" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-teal text-sm tracking-wide">{dialog.speaker}</span>
              <button
                type="button"
                aria-label="Hear it again"
                onClick={() => speak(dialog.line)}
                className="rounded-full w-7 h-7 flex items-center justify-center bg-ink/5 hover:bg-ink/10 text-sm"
              >
                🔊
              </button>
            </div>
            <p className="mt-0.5 text-[17px] sm:text-lg font-bold text-ink leading-snug">{dialog.line}</p>
          </div>
        </div>

        {dialog.hint === "pick" && dialog.options && (
          <div className="mt-4 flex justify-center gap-3">
            {dialog.options.map((n) => {
              const isPicked = picked === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setPicked(n);
                    onPick(n);
                  }}
                  className={`world-sign w-20 h-20 rounded-2xl font-display font-semibold text-4xl text-ink shadow-md active:scale-95 transition-transform ${
                    isPicked ? (rightTick ? "ring-4 ring-teal" : "ring-4 ring-sun") : ""
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        )}

        {dialog.hint === "play" && (
          <p className="mt-3 text-center text-sm font-bold text-ink/60">Tap the glowing spots.</p>
        )}

        {dialog.hint === "next" && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onNext}
              aria-label="Continue"
              className="rounded-full w-14 h-14 flex items-center justify-center bg-sun hover:bg-ember text-cream text-2xl font-bold shadow-md active:scale-95"
            >
              ▶
            </button>
          </div>
        )}

        {dialog.hint === "done" && (
          <div className="mt-4 flex justify-end items-center gap-3">
            {dialog.stars > 0 && (
              <span className="flex items-center gap-1" aria-label={`${dialog.stars} stars earned`}>
                {Array.from({ length: dialog.stars }).map((_, i) => (
                  <Diamond key={i} className="w-6 h-6 world-diamond-pop" />
                ))}
              </span>
            )}
            <button
              type="button"
              onClick={onNext}
              aria-label="All done"
              className="rounded-full w-14 h-14 flex items-center justify-center bg-teal hover:bg-deep-teal text-cream text-2xl font-bold shadow-md active:scale-95"
            >
              ✓
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
