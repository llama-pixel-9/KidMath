/**
 * Prompt-choice helpers for the Review queue.
 *
 * rewordItems.js stores ranked prose alternatives on an item as
 * payload.display.promptOptions (best first, every one gate-verified). The
 * reviewer picks one; approval writes the pick into promptText and removes the
 * options so approved payloads are exactly what kids see.
 */

/** Ranked options for an item, or [] when it has none. */
export function promptOptionsOf(item) {
  const options = item?.payload?.display?.promptOptions;
  return Array.isArray(options) ? options.filter((o) => typeof o === "string" && o.trim()) : [];
}

/**
 * The list the reviewer chooses from: ranked rewrites first (best preselected),
 * the original wording last.
 */
export function choiceList(item) {
  const options = promptOptionsOf(item);
  if (options.length === 0) return [];
  const original = item?.payload?.display?.promptText || "";
  return [...options, original];
}

/** Payload with the chosen wording applied and the options removed. */
export function payloadWithChoice(payload, chosenText) {
  const display = { ...(payload?.display || {}) };
  delete display.promptOptions;
  if (typeof chosenText === "string" && chosenText.trim()) display.promptText = chosenText;
  return { ...payload, display };
}

/** Admin-shaped item with the chosen wording, for QC and rendering. */
export function itemWithChoice(item, chosenText) {
  if (!chosenText || chosenText === item?.payload?.display?.promptText) return item;
  return { ...item, payload: payloadWithChoice(item.payload, chosenText) };
}
