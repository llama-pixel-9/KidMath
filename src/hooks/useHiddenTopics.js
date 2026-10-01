import { useEffect, useState } from "react";
import { V2_ONLY_MODE_IDS } from "../modes/index.js";
import { getVersionSwitch } from "../itemBank/cloudLoader.js";
import { previewEnabled, topicVisible } from "../itemBank/versionSwitch.js";

// Before the switch loads: what an empty switch means (a v2-only topic with
// a default of v2, Math Facts, is shown), so a live topic is there at once.
const hiddenFor = (map, preview = false) => new Set(V2_ONLY_MODE_IDS.filter((id) => !topicVisible(id, map, { v2Only: true, preview })));
const BEFORE_LOAD = hiddenFor(new Map());

/**
 * The topics the pickers leave out: v2-only topics whose switch does not
 * serve this browser. Until the switch loads, a topic shows by its default;
 * a switch row set to v1 then takes it away.
 */
export function useHiddenTopics() {
  const [hidden, setHidden] = useState(BEFORE_LOAD);
  useEffect(() => {
    if (!V2_ONLY_MODE_IDS.length) return undefined;
    let alive = true;
    getVersionSwitch().then((map) => {
      if (!alive) return;
      setHidden(hiddenFor(map, previewEnabled()));
    });
    return () => {
      alive = false;
    };
  }, []);
  return hidden;
}
