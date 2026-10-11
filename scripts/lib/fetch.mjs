// How the newer build scripts reach their sources: the two shapes of answer they ask for,
// over one fetch with the build's name on it and a deadline. The operator, event and
// Endfield scripts each still carry their own copy of that fetch (TODO.md).

// MediaWiki throttles clients that don't identify themselves much harder.
const USER_AGENT = 'dossier-build/1.0 (https://github.com/seangcs27/dossier)';
// A stalled connection on a shared runner hung the build for 15 minutes, twice, before
// every request had a deadline.
const FETCH_TIMEOUT_MS = 20_000;

export async function timedFetch(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`timed out after ${FETCH_TIMEOUT_MS / 1000}s: ${url}`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// A JSON file or endpoint, parsed. Anything but a 2xx is an error that names the address.
export async function fetchJson(url) {
  const res = await timedFetch(url);
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return res.json();
}

// The caller of one MediaWiki API: wikiApi('https://x.wiki.gg/api.php') is the function
// that asks it, taking the query's parameters and giving back the parsed answer. An error
// the wiki reports in a 200 is thrown like any other.
export function wikiApi(api) {
  return async function wiki(params) {
    const json = await fetchJson(`${api}?${new URLSearchParams({ ...params, format: 'json', formatversion: '2' })}`);
    if (json.error) throw new Error(`wiki: ${JSON.stringify(json.error).slice(0, 200)}`);
    return json;
  };
}
