import { useEffect, useState } from "react";
import { V2_ONLY_MODE_IDS } from "../modes/index.js";
import { getVersionSwitch } from "../itemBank/cloudLoader.js";
import { previewEnabled, topicVisible } from "../itemBank/versionSwitch.js";

const ALL_HIDDEN = new Set(V2_ONLY_MODE_IDS);

/**
 * The topics the pickers leave out: v2-only topics whose switch does not
 * serve this browser. Hidden until the switch has loaded (the safe direction:
 * an unreachable switch means v1 everywhere), so a topic never flashes in and
 * back out.
 */
export function useHiddenTopics() {
  const [hidden, setHidden] = useState(ALL_HIDDEN);
  useEffect(() => {
    if (!ALL_HIDDEN.size) return undefined;
    let alive = true;
    getVersionSwitch().then((map) => {
      if (!alive) return;
      const preview = previewEnabled();
      setHidden(new Set(V2_ONLY_MODE_IDS.filter((id) => !topicVisible(id, map, { v2Only: true, preview }))));
    });
    return () => {
      alive = false;
    };
  }, []);
  return hidden;
}
