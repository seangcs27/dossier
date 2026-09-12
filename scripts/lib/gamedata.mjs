// The game's own excel tables, straight from GitHub. This replaces HellaAPI, which was a
// join over these same tables behind one self-hosted server (see TODO.md).
//
// Tables are large — character_table.json is ~19 MB, skill_table.json ~14 MB — so each one
// is fetched at most once per build and kept in memory.
const BASE = 'https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/master';
const FETCH_TIMEOUT_MS = 20_000;

const cache = new Map();

// Retries after a failure are only worth it a few times — most build-index scripts call
// table() from up to 12 concurrent buildPayload calls, so a table that is down for good
// (renamed file, schema change) would otherwise be re-fetched by every one of them, each
// paying the full FETCH_TIMEOUT_MS: the multi-minute hang that timeout exists to prevent.
const MAX_FAILURES = 3;
const failureCounts = new Map();

async function timedFetch(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`timed out after ${FETCH_TIMEOUT_MS / 1000}s: ${url}`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function table(server, name) {
  const key = `${server}/${name}`;
  if (!cache.has(key)) {
    const promise = (async () => {
      const url = `${BASE}/${server}/gamedata/excel/${name}.json`;
      const res = await timedFetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return res.json();
    })();
    // If the fetch fails, remove the promise from cache so the next call retries — but
    // only up to MAX_FAILURES times; past that, leave the rejection cached so every
    // further call fails fast instead of re-attempting a table that is never coming back.
    // Success is cached for the lifetime of the process.
    cache.set(key, promise.catch(err => {
      const failures = (failureCounts.get(key) ?? 0) + 1;
      failureCounts.set(key, failures);
      if (failures < MAX_FAILURES) cache.delete(key);
      throw err;
    }));
  }
  return cache.get(key);
}
