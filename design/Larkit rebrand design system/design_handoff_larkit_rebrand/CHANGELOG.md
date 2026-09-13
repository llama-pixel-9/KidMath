# Larkit rebrand — change log

Two-bucket system: **Unreleased** is everything not yet in the live app. When you
push, move the whole block into a dated section under Shipped and empty Unreleased.

Rule of thumb: one bullet per *thing a developer must change*, with the brand-guide
section number and the file(s) it touches — not per design tweak.

---

## Unreleased — not yet in the app

### Auth, signup & onboarding — `Larkit Auth Onboarding.dc.html`
- NEW: three directions for login/signup/onboarding (iPad + web desktop): 1a The Perch
  (calm stepped wizard), 1b The Flock (teal-immersive, one screen), 1c The Aviary
  (conversational). **Direction not yet chosen — do not build.**
- NEW 2a "The Perch, flying" — the chosen merged direction: Perch layout and restraint,
  Flock taglines ("Little lark, big numbers", "they leave the nest…", "Give Maya the whole
  sky"), one full-bleed teal/Seafoam panel per screen, Sun reserved for the paid action,
  and the Aviary's two-card compare paywall redrawn in Perch type. Build against 2a.
- Screens covered per direction: value carousel, parent account (Apple/Google),
  add-a-kid (first name / age / grade), soft paywall with skip, returning profile picker.

### Game modes & naming — brand guide §13, §14 — `Larkit Brand.dc.html`
- RENAMED all game modes to one formula, [plain skill] + [alliterating bird word]:
  Addition Acorns, Subtraction Swoop, Multiplication Meadow, Division Dive,
  Fractions Feather, Counting Chicks, Comparison Crow, Time Tweet, Money Magpie,
  Shapes Shell, Measuring Wings, Place Value Perch. Bird words are capped at two
  syllables and limited to vocabulary a five-year-old already has. Retires Sum Perch / Countdown Coop / Times Tree / Split the Nest /
  Tell the Time / Weigh Station / Measure Up! everywhere, incl. in-game header (§13),
  flight-log headers (§15) and store copy.
- Home grid now shows all 12 modes, four tints cycling in reading order.
- Card icon spec: one Ink math glyph in the 38px cream well, Fredoka 600/20px — no bird art.
- Card subtitle is now scope ("Sums to 20"), not a restatement of the skill.

### Onboarding spec added — brand guide §20 — `Larkit Brand.dc.html`
- New section 20 "First flight — signup & onboarding" documents the approved 2a flow:
  five screens, Apple/Google only, first name + age + grade, soft paywall, profile picker.
- Voice rule: account flow is plain English; bird voice only on kid-facing screens and
  game names. Slogan is "Math that takes flight."
- Layout rule: one full-bleed teal panel per screen, standardised play cards (name +
  Sun level pill + figure + Fredoka prompt), Sun reserved for the paid action, web
  mirrors the app.

### Flight logs rebuilt — brand guide §15 — `Larkit Brand.dc.html`
- Sheet is now three fixed blocks (Part A stacked ×6, Part B inline ×4, Part C one thought
  problem) with captions — formats must not interleave.
- Stacked items: operands right-aligned in one digit column, single 1.5px rule, 34px clear
  answer space. Removes the second stray rule and the letter-spaced digits.
- Inline items: the bordered box IS the blank — no "?" and no printed answer.
- "Pick two numbers" prompts must print a number bank and a structured answer line.
- Generator fixes required: operands must obey level range (L1 = sums to 10); never fill the
  result slot; no duplicate items or repeated prompt wording; max one zero-fact per sheet.
- Removed all decorative colour glyphs (hearts, moons) — pure black only.
- Footer gains a "Landed ☐ of 11" score box; answer key is a separate sheet.

### Brand guide — `Larkit Brand.dc.html`
- Added a "Since the last push" strip under the header: orange `NEW · NOT YET PUSHED`
  badge convention + running list. Documentation only, nothing to implement.

---

## Shipped

### Pushed — 2026-08-02 (baseline)
Brand guide sections 01–19 as of the handoff: tokens, logo, type, grid, play area,
charts, math diagrams, comparison keys, the perch, feather icons, the aviary,
flight logs, nesting states, fledging, coin purse. Assets in `/brand`.
_Confirm this list matches what actually went live and edit if not._
