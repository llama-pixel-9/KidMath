export const ITEM_FAMILIES = {
  CONCEPTUAL: "conceptual",
  PROCEDURAL: "procedural",
  APPLICATION: "application",
};

export function levelToGradeBand(level) {
  if (level <= 3) return "K-1";
  if (level <= 6) return "2-3";
  return "4-5";
}

export function buildItemKey(question) {
  const meta = question.metadata || {};
  const display = question.display || {};
  const displayKey = [
    display.type || "",
    display.promptText || "",
    Array.isArray(display.sequence) ? display.sequence.join(",") : "",
    display.count ?? "",
    display.step ?? "",
  ].join("|");
  return [
    question.mode || meta.modeId || "",
    question.op || "",
    question.a ?? "",
    question.b ?? "",
    question.answer ?? "",
    meta.subskill || "",
    meta.blueprintId || "",
    displayKey,
  ].join("::");
}

export function createQuestionMetadata({
  modeId,
  level,
  domain,
  cluster,
  subskill,
  itemFamily,
  cognitiveDemand,
  representation,
  mathPractices,
  standardRefs,
  misconceptionTags,
  blueprintId,
  itemId,
  itemSource,
  reviewStatus,
  structureType,
}) {
  return {
    modeId,
    level,
    gradeBand: levelToGradeBand(level),
    domain,
    cluster,
    subskill,
    itemFamily,
    cognitiveDemand,
    representation,
    mathPractices: mathPractices || [],
    standardRefs: standardRefs || [],
    misconceptionTags: misconceptionTags || [],
    blueprintId,
    itemId: itemId || null,
    itemSource: itemSource || "generated",
    reviewStatus: reviewStatus || null,
    structureType: structureType || null,
  };
}
