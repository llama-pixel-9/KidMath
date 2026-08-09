import { useEffect, useRef } from "react";
import { speak, stopSpeaking } from "./speech";

/**
 * The audio-first quest dialog (plan Phase 2): every line is spoken the
 * moment it appears; text is support for readers, not a requirement. Number
 * choices are big wooden-sign buttons; a wrong pick wobbles and re-asks —
 * it costs time, never progress.
 *
 * hint drives the single action affordance:
 *   next — a big ▶ Continue button
 *   play — no button; the answer happens in the world (tap the things!)
 *   done — a big ✓ button that closes the dialog
 */
export default function QuestDialog({ dialog, wrongTick, onNext, onPick }) {
  const cardRef = useRef(null);

  useEffect(() => {
    if (dialog?.line) speak(dialog.line);
    return stopSpeaking;
  }, [dialog]);

  // Wrong pick: an imperative shake (no re-render, no state) plus a spoken
  // nudge — the question stays up for another try.
  useEffect(() => {
    if (!wrongTick) return;
    speak("Hmm, try again!");
    cardRef.current?.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-10px)" },
        { transform: "translateX(10px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 320, easing: "ease-in-out" },
    );
  }, [wrongTick]);

  if (!dialog) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center p-4 pointer-events-none">
      <div
        ref={cardRef}
        role="dialog"
        aria-label={dialog.speaker}
        className="pointer-events-auto w-full max-w-md rounded-3xl bg-white/95 shadow-xl backdrop-blur p-5"
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            aria-label="Hear it again"
            onClick={() => speak(dialog.line)}
            className="shrink-0 rounded-full w-10 h-10 flex items-center justify-center bg-amber-100 text-xl"
          >
            🔊
          </button>
          <div className="flex-1">
            <div className="text-sm font-bold text-amber-700">{dialog.speaker}</div>
            <p className="text-lg font-semibold text-teal-950 leading-snug">{dialog.line}</p>
          </div>
        </div>

        {dialog.options && (
          <div className="mt-4 flex justify-center gap-3">
            {dialog.options.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onPick(n)}
                className="w-20 h-20 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-4xl font-bold shadow-md border-b-4 border-amber-800"
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {dialog.hint === "next" && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onNext}
              aria-label="Continue"
              className="rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-2xl font-bold px-8 py-2"
            >
              ▶
            </button>
          </div>
        )}

        {dialog.hint === "done" && (
          <div className="mt-4 flex justify-end items-center gap-3">
            {dialog.stars > 0 && (
              <span className="text-2xl" aria-label={`${dialog.stars} stars earned`}>
                {"⭐".repeat(dialog.stars)}
              </span>
            )}
            <button
              type="button"
              onClick={onNext}
              aria-label="All done"
              className="rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-2xl font-bold px-8 py-2"
            >
              ✓
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
