export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// A prompt is "verbal" (a word/story problem) when it carries natural-language
// content rather than a pure symbolic expression. Used to gate items behind
// the Allow Word Problems preference. Short tokens like "tens"/"ones" that
// appear in place-value prompts stay below the threshold on purpose — those
// are still served because placeValue is a non-arithmetic mode.
export function isVerbalPrompt(promptText) {
  if (!promptText || typeof promptText !== "string") return false;
  const alpha = promptText.match(/[a-zA-Z]/g);
  return (alpha ? alpha.length : 0) >= 6;
}
