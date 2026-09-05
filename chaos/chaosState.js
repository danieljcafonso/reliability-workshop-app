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

  const isFault = state.latencyMs > 0 || state.errorRate > 0 || state.exhaustPool;
  if (isFault) {
    console.log(`[chaos] fault set: ${JSON.stringify(state)}${durationMs ? ` (auto-clears in ${durationMs}ms)` : ' (sustained until reset)'}`);
  } else {
    console.log('[chaos] reset to baseline');
  }

  if (durationMs) {
    clearTimer = setTimeout(() => {
      state = { ...DEFAULT_STATE };
      clearTimer = null;
      console.log('[chaos] fault auto-cleared, back to baseline');
    }, durationMs);
  }
}

export function getChaos() {
  return state;
}

export function resetChaos() {
  setChaos({});
}

