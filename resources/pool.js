'use strict';

// In-memory semaphore standing in for a real connection pool. Produces the
// same symptom curve as pool exhaustion (slots fill, waiters climb, latency
// rises, then errors) with no external dependency to provision per attendee.

const MAX = Number(process.env.RESOURCE_POOL_MAX ?? 5);
const TIMEOUT_MS = Number(process.env.RESOURCE_POOL_TIMEOUT_MS ?? 4000);

let active = 0;
let waiting = 0;
const queue = [];

function acquire() {
  return new Promise((resolve, reject) => {
    if (active < MAX) {
      active++;
      resolve();
      return;
    }

    waiting++;
    const entry = { resolved: false };

    const timer = setTimeout(() => {
      if (entry.resolved) return;
      entry.resolved = true;
      const idx = queue.indexOf(entry);
      if (idx !== -1) queue.splice(idx, 1);
      waiting--;
      console.log(`[resource-pool] acquire timed out after ${TIMEOUT_MS}ms (active=${active}, waiting=${waiting})`);
      reject(new Error('resource pool acquire timed out'));
    }, TIMEOUT_MS);

    entry.settle = () => {
      if (entry.resolved) return;
      entry.resolved = true;
      clearTimeout(timer);
      active++;
      waiting--;
      resolve();
    };

    queue.push(entry);
  });
}

function release() {
  active--;
  const next = queue.shift();
  if (next) next.settle();
}

function stats() {
  return { active, idle: MAX - active, waiting };
}

export default { acquire, release, stats };
