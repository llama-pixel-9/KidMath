import { useEffect, useState } from "react";
import { V2_ONLY_MODE_IDS } from "../modes/index.js";
import { getVersionSwitch } from "../itemBank/cloudLoader.js";
import { previewEnabled, topicVisible } from "../itemBank/versionSwitch.js";

// Before the switch loads: what an empty switch means to a viewer who is not
// in preview. A v2-only topic whose default is v2 (Math Facts) is shown at
// once; one whose default is preview (Word Problems, Multi-Digit Math) stays hidden, so it
// never flashes in and back out for a kid it is not served to.
const hiddenFor = (map, preview = false) => new Set(V2_ONLY_MODE_IDS.filter((id) => !topicVisible(id, map, { v2Only: true, preview })));
const BEFORE_LOAD = hiddenFor(new Map());

/**
 * The topics every kid- and parent-facing surface leaves out: v2-only topics
 * whose switch does not serve this browser (src/itemBank/versionRules.js
 * topicVisible; the native engine gives the same answer through
 * KidMath.hiddenTopics). Until the switch loads, a topic shows by its
 * default; a switch row then decides. `loaded` turns true once the switch
 * has been read, so a page that must decide (the /play/<topic> route) can
 * wait for it.
 */
export function useHiddenTopicsState() {
  const [state, setState] = useState(() => ({ hidden: BEFORE_LOAD, loaded: !V2_ONLY_MODE_IDS.length }));
  useEffect(() => {
    if (!V2_ONLY_MODE_IDS.length) return undefined;
    let alive = true;
    getVersionSwitch().then((map) => {
      if (!alive) return;
      setState({ hidden: hiddenFor(map, previewEnabled()), loaded: true });
    });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

/** The hidden topic ids (a Set), for the pickers. */
export function useHiddenTopics() {
  return useHiddenTopicsState().hidden;
}
