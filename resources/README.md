# Curriculum reference library

Openly licensed K–4 math curricula used as **structural reference** for
authoring item-bank content. Downloaded by `bash scripts/fetchResources.sh`;
the PDFs themselves are gitignored — this README and the fetch script are the
committed source of truth.

## Usage rules

- These materials inform **problem structures, pedagogy, sequencing, and
  difficulty calibration**. Item wording in the bank must be **original**
  (word-problem-authoring-guide.md) — never copy prompts from any curriculum,
  open or not, into `item_bank`.
- EngageNY's license is **NonCommercial-ShareAlike**: its content must not be
  redistributed or adapted into the (commercial) app itself. Local reference
  only.

## Contents

| Source | Dir | License | What it's for |
|---|---|---|---|
| CCSS Progressions (Univ. of Arizona / [mathematicalmusings.org](https://mathematicalmusings.org)) | `progressions/` | Free to distribute | The academic taxonomy behind our structure grid — `additiveStructures.js` mirrors its OA Table 1. Complete 2023 compilation + the K–5 CC/OA draft. |
| EngageNY / Eureka Math ([archive.org/details/engageny-mathematics](https://archive.org/details/engageny-mathematics)) | `engageny/` | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) | Complete K–4 modules (34 full-module PDFs), Singapore-influenced: tape diagrams, number bonds, word-problem progressions, fluency sequences. |
| Illustrative Mathematics K–5 | *(online, not mirrored)* | CC BY 4.0 | Browsable at [im.kendallhunt.com/k5](https://im.kendallhunt.com/k5/curriculum.html) and [curriculum.illustrativemathematics.org/k5](https://curriculum.illustrativemathematics.org/k5/curriculum.html); PDF export via [accessim.org](https://accessim.org) (free account). HTML-first, so it is consulted live rather than mirrored. |

## EngageNY module map (what to open for which mode)

- **Addition/subtraction word problems & structures**: GK M4, G1 M1/M2/M4/M6, G2 M4/M5
- **Place value**: G1 M4, G2 M3, G4 M1
- **Multiplication/division, arrays**: G3 M1/M3, G4 M3
- **Fractions**: G3 M5, G4 M5
- **Measurement, time, money**: G1 M3, G2 M7/M8, G3 M2, G4 M2/M7
- **Geometry & data**: G1 M5, G2 M6, G3 M6/M7, G4 M4/M6
