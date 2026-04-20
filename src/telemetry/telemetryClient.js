import { supabase, supabaseRestUrl, supabaseAnonKeyValue } from "../supabaseClient.js";
import HeartbeatWorkerCtor from "./heartbeatWorker.js?worker&inline";
import {
  classifyPreviousSession,
  clearFingerprint,
  readPreviousFingerprint,
  writeFingerprint,
} from "./postMortem.js";

const DISABLE_LOCAL_KEY = "kidmath_disable_telemetry";
const FLUSH_INTERVAL_MS = 30_000;
const HEARTBEAT_PERSIST_INTERVAL_MS = 5_000;
const EVENTS_RING_SIZE = 50;
const APP_VERSION = "telemetry-v1";

function generateSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}

function isDisabledLocally() {
  try {
    if (typeof window === "undefined") return true;
    const params = new URLSearchParams(window.location.search || "");
    if (params.get("telemetry") === "0") return true;
    if (params.get("telemetry") === "1") return false;
    return localStorage.getItem(DISABLE_LOCAL_KEY) === "1";
  } catch {
    return false;
  }
}

async function isDisabledByFlag() {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", "session_telemetry")
      .single();
    if (error || !data) return false;
    return data.enabled === false;
  } catch {
    return false;
  }
}

function describeDevice() {
  if (typeof window === "undefined") return {};
  const ua = navigator.userAgent || "";
  const isIPadUA = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return {
    user_agent: ua.slice(0, 500),
    device_label: isIPadUA ? "iPad-class" : navigator.platform || "unknown",
    viewport: {
      w: window.innerWidth,
      h: window.innerHeight,
      dpr: window.devicePixelRatio || 1,
    },
    hardware: {
      cores: navigator.hardwareConcurrency || null,
      memoryGb: navigator.deviceMemory || null,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      reducedMotion:
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    },
  };
}

class TelemetryClient {
  constructor() {
    this.enabled = false;
    this.sessionId = null;
    this.startedAt = Date.now();
    this.userId = null;
    this.counters = {};
    this.events = [];
    this.maxBlockMs = 0;
    this.blockEvents = [];
    this.lastFlushedSnapshot = null;
    this.flushInFlight = false;
    this.lastVisibility = typeof document !== "undefined" ? document.visibilityState : "unknown";
    this.previousSummary = null;
    this.worker = null;
    this.flushTimer = null;
    this.fingerprintTimer = null;
    this.longTaskObserver = null;
  }

  recordEvent(kind, extra) {
    if (!this.enabled) return;
    this.events.push({
      t: Date.now() - this.startedAt,
      kind: String(kind).slice(0, 40),
      extra: extra == null ? null : (typeof extra === "object" ? extra : String(extra).slice(0, 120)),
    });
    if (this.events.length > EVENTS_RING_SIZE) {
      this.events = this.events.slice(-EVENTS_RING_SIZE);
    }
  }

  inc(name, value) {
    if (!this.enabled) return;
    const inc = typeof value === "number" ? value : 1;
    this.counters[name] = (this.counters[name] || 0) + inc;
  }

  setMax(name, value) {
    if (!this.enabled) return;
    const prev = this.counters[name];
    if (prev == null || value > prev) this.counters[name] = value;
  }

  setUser(userId) {
    if (!this.enabled) return;
    this.userId = userId || null;
  }

  startLongTaskObserver() {
    if (typeof PerformanceObserver === "undefined") return;
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.inc("longTaskCount");
          this.inc("longTaskTotalMs", Math.round(entry.duration));
          this.setMax("maxLongTaskMs", Math.round(entry.duration));
        });
      });
      observer.observe({ entryTypes: ["longtask"] });
      this.longTaskObserver = observer;
    } catch {
      /* not supported */
    }
  }

  startHeartbeatWorker() {
    try {
      const worker = new HeartbeatWorkerCtor();
      worker.addEventListener("message", (e) => {
        const data = e.data || {};
        if (data.type === "ping") {
          worker.postMessage({ type: "pong" });
          return;
        }
        if (data.type === "block") {
          this.inc("mainThreadBlockCount");
          this.setMax("mainThreadMaxBlockMs", data.durationMs);
          this.maxBlockMs = Math.max(this.maxBlockMs, data.durationMs || 0);
          this.blockEvents.push({ at: Date.now(), durationMs: data.durationMs });
          if (this.blockEvents.length > 50) this.blockEvents = this.blockEvents.slice(-50);
          this.recordEvent("main_thread_blocked", { ms: data.durationMs });
        }
      });
      this.worker = worker;
    } catch (err) {
      this.recordEvent("heartbeat_worker_failed", String(err && err.message));
    }
  }

  bindVisibility() {
    if (typeof document === "undefined") return;
    document.addEventListener("visibilitychange", () => {
      this.lastVisibility = document.visibilityState;
      this.recordEvent("visibility", document.visibilityState);
      if (document.visibilityState === "hidden") {
        this.flush({ reason: "visibility_hidden", clean: true });
      }
    });
    window.addEventListener("pagehide", () => {
      this.flush({ reason: "pagehide", clean: true });
    });
    window.addEventListener("error", (e) => {
      this.inc("windowErrorCount");
      this.recordEvent("window_error", String(e.message || "").slice(0, 120));
    });
    window.addEventListener("unhandledrejection", (e) => {
      this.inc("unhandledRejectionCount");
      this.recordEvent("unhandled_rejection", String((e.reason && e.reason.message) || e.reason || "").slice(0, 120));
    });
  }

  startTimers() {
    this.flushTimer = setInterval(() => {
      this.flush({ reason: "interval" });
    }, FLUSH_INTERVAL_MS);
    this.fingerprintTimer = setInterval(() => {
      this.persistFingerprint();
    }, HEARTBEAT_PERSIST_INTERVAL_MS);
  }

  persistFingerprint() {
    writeFingerprint({
      sessionId: this.sessionId,
      startedAt: this.startedAt,
      lastHeartbeatAt: Date.now(),
      lastVisibility: this.lastVisibility,
      maxBlockMs: this.maxBlockMs,
      lastEvents: this.events.slice(-25),
      userAgent: typeof navigator !== "undefined" ? (navigator.userAgent || "").slice(0, 200) : "",
    });
  }

  buildSnapshot() {
    return {
      counters: this.counters,
      events: this.events.slice(-EVENTS_RING_SIZE),
      max_block_ms: this.maxBlockMs,
      block_events: this.blockEvents.slice(-50),
      last_visibility: this.lastVisibility,
      uptime_ms: Date.now() - this.startedAt,
    };
  }

  async ensureSessionRow() {
    if (!supabase) return false;
    if (this.sessionRowCreated) return true;
    const device = describeDevice();
    try {
      const { error } = await supabase.from("session_diagnostics").upsert({
        session_id: this.sessionId,
        user_id: this.userId,
        app_version: APP_VERSION,
        started_at: new Date(this.startedAt).toISOString(),
        post_mortem: this.previousSummary || null,
        device_label: device.device_label,
        user_agent: device.user_agent,
        viewport: device.viewport,
        hardware: device.hardware,
        counters: this.counters,
        events: this.events,
        last_heartbeat_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "session_id" });
      if (!error) {
        this.sessionRowCreated = true;
        return true;
      }
    } catch (err) {
      this.recordEvent("telemetry_insert_failed", String(err && err.message));
    }
    return false;
  }

  async flush({ reason = "interval", clean = false } = {}) {
    if (!this.enabled) return;
    if (this.flushInFlight) return;
    this.flushInFlight = true;
    try {
      const snapshot = this.buildSnapshot();
      const payload = {
        session_id: this.sessionId,
        user_id: this.userId,
        last_heartbeat_at: new Date().toISOString(),
        end_reason: clean ? reason : null,
        ended_at: clean ? new Date().toISOString() : null,
        counters: snapshot.counters,
        events: snapshot.events,
        freeze_detected: snapshot.max_block_ms >= 5000,
        freeze_max_block_ms: snapshot.max_block_ms || 0,
        updated_at: new Date().toISOString(),
      };

      const usedBeacon = (() => {
        if (!supabaseRestUrl || !supabaseAnonKeyValue) return false;
        if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") return false;
        if (reason !== "visibility_hidden" && reason !== "pagehide") return false;
        try {
          const url = `${supabaseRestUrl}/session_diagnostics?on_conflict=session_id&apikey=${encodeURIComponent(supabaseAnonKeyValue)}`;
          const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
          return navigator.sendBeacon(url, blob);
        } catch {
          return false;
        }
      })();

      if (!usedBeacon) {
        await this.ensureSessionRow();
        if (supabase) {
          await supabase.from("session_diagnostics").upsert(payload, { onConflict: "session_id" });
        }
      }

      if (clean) clearFingerprint();
    } catch (err) {
      this.recordEvent("telemetry_flush_failed", String(err && err.message));
    } finally {
      this.flushInFlight = false;
    }
  }

  async start() {
    if (typeof window === "undefined") return;
    if (isDisabledLocally()) return;
    if (await isDisabledByFlag()) return;

    this.enabled = true;
    this.sessionId = generateSessionId();
    this.startedAt = Date.now();

    const previousFingerprint = readPreviousFingerprint();
    this.previousSummary = classifyPreviousSession(previousFingerprint);
    if (this.previousSummary) {
      this.recordEvent("previous_session_summary", this.previousSummary.classification);
    }

    this.startLongTaskObserver();
    this.startHeartbeatWorker();
    this.bindVisibility();
    this.startTimers();
    this.persistFingerprint();
    this.ensureSessionRow();

    window.__kidmathTelemetry = this;
  }
}

let singleton = null;
export function getTelemetry() {
  if (!singleton) singleton = new TelemetryClient();
  return singleton;
}
export async function bootstrapTelemetry() {
  const client = getTelemetry();
  await client.start();
  return client;
}
