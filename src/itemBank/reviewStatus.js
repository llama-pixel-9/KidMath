// Review-status constants for item-bank items.
//
// Extracted from applicationItems.js (Phase 0.4) into a dependency-free leaf so
// the per-mode item files under ./items/ can import APPROVED without a circular
// import back through the applicationItems.js aggregator.

export const REVIEW_STATUS = {
  DRAFT: "draft",
  REVIEWED: "reviewed",
  APPROVED: "approved",
  RETIRED: "retired",
};

export const APPROVED = REVIEW_STATUS.APPROVED;
