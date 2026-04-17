import { ITEM_FAMILIES } from "./itemMetadata";

export const MODE_BLUEPRINTS = {
  addition: {
    families: Object.values(ITEM_FAMILIES),
    subskills: ["makeTen", "composeDecompose", "unknownAddend"],
  },
  subtraction: {
    families: Object.values(ITEM_FAMILIES),
    subskills: ["differenceAsDistance", "decomposeToSubtract", "unknownSubtrahend"],
  },
  multiplication: {
    families: Object.values(ITEM_FAMILIES),
    subskills: ["equalGroups", "arrayReasoning", "factFluency"],
  },
  division: {
    families: Object.values(ITEM_FAMILIES),
    subskills: ["partitioning", "inverseFact", "unknownQuotient"],
  },
  comparing: {
    families: Object.values(ITEM_FAMILIES),
    subskills: ["symbolSelection", "benchmarkCompare", "distanceCompare"],
  },
  counting: {
    families: Object.values(ITEM_FAMILIES),
    subskills: ["subitizing", "countOn", "cardinality"],
  },
  skipCounting: {
    families: Object.values(ITEM_FAMILIES),
    subskills: ["patternRule", "stepInference", "groupsToProduct"],
  },
  placeValue: {
    families: Object.values(ITEM_FAMILIES),
    subskills: ["tensOnes", "expandedForm", "regroupingSense"],
  },
};
