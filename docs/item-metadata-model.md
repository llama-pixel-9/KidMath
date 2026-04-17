# Item Metadata Model

Question generators emit metadata with this shape:

```js
{
  modeId: "addition",
  level: 4,
  gradeBand: "2-3",
  domain: "OA",
  cluster: "Add and subtract within 20 and beyond",
  subskill: "unknownAddend",
  itemFamily: "conceptual",
  cognitiveDemand: "DOK2",
  representation: "verbalContext",
  mathPractices: ["MP1", "MP2", "MP7"],
  standardRefs: ["K.OA", "1.OA", "2.OA"],
  misconceptionTags: ["operationSwap", "offByOne", "placeValueSlip"],
  blueprintId: "addition-conceptual-unknownAddend"
}
```

## Required for Generation

- Family scheduling/interleaving.
- Weakest-subskill targeting.
- Misconception-aware distractors.
- Item-quality linting.

## Required for Analytics

- Subskill mastery rollups.
- Family balance monitoring.
- Distractor diagnostics by misconception tag.
