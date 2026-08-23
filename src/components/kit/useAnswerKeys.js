import { useEffect, useRef } from "react";

/**
 * Keyboard answers for kids on a computer. The touch UI is unchanged; this
 * only adds a second way to drive the same widget state.
 *
 * One window listener, one stack of handlers. The most recently mounted
 * widget is the only one that hears keys — during the AnimatePresence
 * swap two widget instances can be mounted at once (robot-kid-e2e skill),
 * and the stale one must not answer the new question.
 *
 * Keys are ignored when:
 *  - the widget is locked (feedback showing),
 *  - focus is in a real text field (ShapeFigure / CoinTray inputs),
 *  - a modal is up (anything carrying `data-blocks-keys`),
 *  - a modifier is held (browser shortcuts stay browser shortcuts).
 *
 * `handler(event)` returns true when it consumed the key.
 */
const stack = [];

function onWindowKeyDown(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const t = event.target;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
  if (document.querySelector("[data-blocks-keys]")) return;
  const top = stack[stack.length - 1];
  if (!top) return;
  if (top.current.enabled === false) return;
  if (top.current.handler(event) === true) event.preventDefault();
}

export function useAnswerKeys(handler, enabled = true) {
  const ref = useRef({ handler, enabled });
  useEffect(() => {
    ref.current.handler = handler;
    ref.current.enabled = enabled;
  });
  useEffect(() => {
    if (stack.length === 0) window.addEventListener("keydown", onWindowKeyDown);
    stack.push(ref);
    return () => {
      const i = stack.indexOf(ref);
      if (i >= 0) stack.splice(i, 1);
      if (stack.length === 0) window.removeEventListener("keydown", onWindowKeyDown);
    };
  }, []);
}

/** Digit-pad vocabulary: 0-9 type, Backspace deletes, Enter submits. */
export function useDigitKeys({ locked, onDigit, onBackspace, onSubmit, onDot, onExtra }) {
  useAnswerKeys((e) => {
    if (/^[0-9]$/.test(e.key)) { onDigit(e.key); return true; }
    if (e.key === "Backspace") { onBackspace(); return true; }
    if (e.key === "Enter") { onSubmit(); return true; }
    if (onDot && (e.key === "." || e.key === ",")) { onDot(); return true; }
    if (onExtra) return onExtra(e) === true;
    return false;
  }, !locked);
}

/** Choice vocabulary: 1-9 picks the nth option (0 = tenth), Enter submits. */
export function useIndexKeys({ locked, count, onIndex, onSubmit }) {
  useAnswerKeys((e) => {
    if (/^[0-9]$/.test(e.key)) {
      const i = e.key === "0" ? 9 : Number(e.key) - 1;
      if (i < count) { onIndex(i); return true; }
      return false;
    }
    if (e.key === "Enter" && onSubmit) { onSubmit(); return true; }
    return false;
  }, !locked);
}
