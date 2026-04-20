// Web Worker that pings the main thread on a fixed cadence. If the main
// thread fails to respond within BLOCK_THRESHOLD_MS, we record the gap as a
// "main thread blocked" interval. This is the only reliable way to detect
// real user-visible freezes from inside the page.

const PING_INTERVAL_MS = 2000;
const BLOCK_THRESHOLD_MS = 5000;

let lastPongAt = Date.now();
let maxBlockMs = 0;
let blockEvents = [];

setInterval(() => {
  const now = Date.now();
  const sinceLastPong = now - lastPongAt;
  if (sinceLastPong > BLOCK_THRESHOLD_MS) {
    if (sinceLastPong > maxBlockMs) maxBlockMs = sinceLastPong;
    blockEvents.push({ at: now, durationMs: sinceLastPong });
    if (blockEvents.length > 50) blockEvents = blockEvents.slice(-50);
    self.postMessage({ type: "block", durationMs: sinceLastPong });
  }
  self.postMessage({ type: "ping", at: now });
}, PING_INTERVAL_MS);

self.addEventListener("message", (e) => {
  const data = e.data || {};
  if (data.type === "pong") {
    lastPongAt = Date.now();
    return;
  }
  if (data.type === "report") {
    self.postMessage({ type: "report", maxBlockMs, blockEvents: blockEvents.slice() });
  }
});
