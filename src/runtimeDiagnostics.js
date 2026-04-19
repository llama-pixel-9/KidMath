function canUseRuntimeDiagnostics() {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search || "");
    return params.get("diag") === "1";
  } catch {
    return false;
  }
}

export function createRuntimeDiagnostics(scope = "runtime") {
  if (!canUseRuntimeDiagnostics()) {
    return {
      enabled: false,
      mark() {},
      setMax() {},
      dispose() {},
    };
  }

  const state = {
    scope,
    startedAt: performance.now(),
    marks: {},
  };

  const intervalId = setInterval(() => {
    const uptimeMs = Math.round(performance.now() - state.startedAt);
    const payload = {
      uptimeMs,
      marks: state.marks,
    };
    console.info(`[diag:${state.scope}]`, payload);
  }, 60_000);

  if (typeof window !== "undefined") {
    window.__kidmathDiag = window.__kidmathDiag || {};
    window.__kidmathDiag[scope] = state;
  }

  return {
    enabled: true,
    mark(name, value = 1) {
      state.marks[name] = (state.marks[name] || 0) + value;
    },
    setMax(name, value) {
      const prev = state.marks[name];
      if (prev == null || value > prev) {
        state.marks[name] = value;
      }
    },
    dispose() {
      clearInterval(intervalId);
      if (
        typeof window !== "undefined" &&
        window.__kidmathDiag &&
        window.__kidmathDiag[scope] === state
      ) {
        delete window.__kidmathDiag[scope];
      }
    },
  };
}
