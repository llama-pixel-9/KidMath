// The larkit palette — the only theme. The alt skins (mario/zelda/minecraft/
// neon) and the theme picker are gone by design: color carries meaning here
// (see design/larkit/README.md §12), so it is not decoration to hand out.
//
// The shape of a theme object is unchanged so every `useTheme()` consumer
// keeps working; getTheme() ignores the stored id and always returns larkit.
// The iOS Theme.swift mirrors this file — keep them in sync.

const larkit = {
  id: "larkit",
  label: "larkit",
  emoji: "🐦",
  description: "Math that feels like play.",
  bg: "bg-graph-paper",
  playBg: "bg-cream",
  navBg: "bg-white",
  navText: "text-ink",
  navActive: "bg-ink/5 text-teal",
  navHover: "hover:bg-ink/5 hover:text-teal",
  logoPill: "from-teal to-teal",
  cardBg: "bg-white",
  cardBorder: "border-ink/10",
  textPrimary: "text-ink",
  textSecondary: "text-ink/70",
  textMuted: "text-ink/50",
  heroGradient: "from-teal to-teal",
  ctaPrimary: "from-teal to-teal",
  ctaSecondary: "bg-white border-ink/10 text-teal",
  featureCards: [
    { bg: "bg-seafoam/30", gradient: "from-teal to-teal" },
    { bg: "bg-apricot/30", gradient: "from-sun to-sun" },
    { bg: "bg-teal-mid/20", gradient: "from-teal-mid to-teal-mid" },
  ],
  // The four answer-surface tints, fixed order (reading order): Seafoam,
  // Teal Mid, Apricot, Sun Light. Flat fills — the from/to pairs exist only
  // because call sites apply bg-gradient-to-br; both stops are the same hue.
  bubbleColors: [
    "from-seafoam to-seafoam",
    "from-teal-mid to-teal-mid",
    "from-apricot to-apricot",
    "from-sun-light to-sun-light",
  ],
  // Matching bottom edges (pressed shades) per tile tint, same order.
  bubbleEdges: [
    "shadow-[0_5px_0_#7FCFBE]",
    "shadow-[0_5px_0_#3E9E8E]",
    "shadow-[0_5px_0_#F0A47A]",
    "shadow-[0_5px_0_#E8895A]",
  ],
  modeColors: {
    addition: "bg-seafoam",
    subtraction: "bg-teal-mid",
    multiplication: "bg-apricot",
    division: "bg-sun-light",
    comparing: "bg-seafoam",
    counting: "bg-apricot",
    skipCounting: "bg-teal-mid",
    placeValue: "bg-sun-light",
  },
  progressTrack: "bg-ink/10 border-transparent",
  progressFill: "from-teal to-teal",
  progressIcon: "text-teal",
  stepBg: "bg-seafoam/40 text-deep-teal",
  stepLabel: "text-teal",
  worksheetCallout: "from-seafoam/30 to-cream",
  worksheetCalloutIcon: "text-teal",
  worksheetCalloutBtn: "from-teal to-teal",
  selectedBorder: "border-teal bg-seafoam/30",
  selectedText: "text-teal",
  selectedIcon: "text-teal",
  fontClass: "",
  completeMsg: "That soared!",
};

export const THEMES = { larkit };

export const THEME_IDS = Object.keys(THEMES);

export function getTheme() {
  return larkit;
}
