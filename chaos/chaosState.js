'use strict';

const DEFAULT_STATE = { latencyMs: 0, errorRate: 0, exhaustPool: false };

let state = { ...DEFAULT_STATE };
let clearTimer = null;

// A durationMs fault auto-clears — a self-resolving blip. Without it, the
// fault stays active until an explicit reset, i.e. a genuine sustained breach.
export function setChaos({ latencyMs, errorRate, exhaustPool, durationMs } = {}) {
  clearTimeout(clearTimer);
  clearTimer = null;

  state = {
    latencyMs: latencyMs ?? 0,
    errorRate: errorRate ?? 0,
    exhaustPool: exhaustPool ?? false,
  };

  if (durationMs) {
    clearTimer = setTimeout(() => {
      state = { ...DEFAULT_STATE };
      clearTimer = null;
    }, durationMs);
  }
}

export function getChaos() {
  return state;
}

export function resetChaos() {
  setChaos({});
}

