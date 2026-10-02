/* Topics whose word problems (application-family stories) play holds back.
 *
 * Sai, 2026-10-02: word problems are on by default, so a kid sees stories
 * both when practice moves on through a topic's skills and when the kid picks
 * a skill. The v1 stories of the topics below stay out of play all the same:
 * Sai is not confident in them, and each topic's v1 stories retire only when
 * that topic's v2 stories go live. When a topic's v2 stories go live, its v1
 * stories retire and the topic leaves this list.
 *
 * Play only: a story is never chosen for these topics, whatever the
 * word-problems setting, by a skill session, the plain session, the template
 * generator behind either, or a due retry (a saved one is dropped when the
 * mistake bank is restored). The admin pin (`/play/<mode>?item=`)
 * still serves the pinned row whatever its family, and a QA `?qaVariety=` link
 * still gets the generator variety it names; printed worksheets do not read
 * this list. Pure, no imports: the native engine bundles it.
 */
export const STORIES_HELD_MODE_IDS = Object.freeze(["addition", "subtraction", "barModels", "numberBonds"]);

/** Are this topic's stories held out of play? */
export function storiesHeld(modeId) {
  return STORIES_HELD_MODE_IDS.includes(modeId);
}

/** May play serve a new story in this topic? The kid's setting, minus the held topics. */
export function playStoriesAllowed(modeId, allowWordProblems) {
  return allowWordProblems !== false && !storiesHeld(modeId);
}

/** A held topic's story (a saved retry included): play never serves it. */
export function isHeldStory(question, fallbackModeId = null) {
  if (question?.metadata?.itemFamily !== "application") return false;
  return storiesHeld(question.mode || question.metadata.modeId || fallbackModeId);
}
