import { levelToGradeBand } from "../bands.js";

export { levelToGradeBand };

export const ITEM_FAMILIES = {
  CONCEPTUAL: "conceptual",
  PROCEDURAL: "procedural",
  APPLICATION: "application",
};

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
  // Fraction answers are {num,den} objects; serialize so distinct fractions get
  // distinct keys (String({num,den}) would collapse them to "[object Object]").
  const answerKey =
    question.answer != null && typeof question.answer === "object"
      ? JSON.stringify(question.answer)
      : question.answer ?? "";
  return [
    question.mode || meta.modeId || "",
    question.op || "",
    question.a ?? "",
    question.b ?? "",
    answerKey,
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
