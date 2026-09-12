// The game's own excel tables, straight from GitHub. This replaces HellaAPI, which was a
// join over these same tables behind one self-hosted server (see TODO.md).
//
// Tables are large — character_table.json is ~19 MB, skill_table.json ~14 MB — so each one
// is fetched at most once per build and kept in memory.
const BASE = 'https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/master';
const FETCH_TIMEOUT_MS = 20_000;

const cache = new Map();

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
    // If the fetch fails, remove the promise from cache so the next call retries.
    // Success is cached for the lifetime of the process.
    cache.set(key, promise.catch(err => {
      cache.delete(key);
      throw err;
    }));
  }
  return cache.get(key);
}
