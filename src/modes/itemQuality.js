import { ITEM_FAMILIES } from "./itemMetadata";

const REQUIRED_METADATA_FIELDS = [
  "modeId",
  "gradeBand",
  "domain",
  "cluster",
  "subskill",
  "itemFamily",
  "cognitiveDemand",
  "representation",
  "blueprintId",
];

export function validateQuestion(question) {
  const errors = [];
  if (question == null || typeof question !== "object") {
    return { valid: false, errors: ["question must be an object"] };
  }
  if (question.answer == null) {
    errors.push("question.answer is required");
  }

  const metadata = question.metadata;
  if (!metadata) {
    errors.push("question.metadata is required");
  } else {
    for (const key of REQUIRED_METADATA_FIELDS) {
      if (!metadata[key]) errors.push(`metadata.${key} is required`);
    }
    if (!Object.values(ITEM_FAMILIES).includes(metadata.itemFamily)) {
      errors.push("metadata.itemFamily must be conceptual/procedural/application");
    }
    if (!Array.isArray(metadata.mathPractices) || metadata.mathPractices.length === 0) {
      errors.push("metadata.mathPractices must include at least one practice");
    }
    if (!Array.isArray(metadata.misconceptionTags)) {
      errors.push("metadata.misconceptionTags must be an array");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateChoices(question, choices) {
  const errors = [];
  if (!Array.isArray(choices) || choices.length < 2) {
    errors.push("choices must contain at least two options");
    return { valid: false, errors };
  }
  const unique = new Set(choices);
  if (unique.size !== choices.length) errors.push("choices must be unique");
  if (!unique.has(question.answer)) errors.push("choices must include the correct answer");
  return { valid: errors.length === 0, errors };
}
