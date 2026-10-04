// Generates src/shared/generated/events.json and event-banners/ — the Global server's
// schedule: its events and headhunting pools, running, announced, and predicted from what
// the CN server has already run.
//
// Events come from arknights.wiki.gg's Cargo tables alone. `Events` names and types every
// event in English, and `EventServerDetails` holds each server's run of it: start, end and
// banner. The game's own activity_table would do for the dates, but it names a CN-only event
// in Chinese, and it knows nothing of a Global event until the client update that carries
// it; the wiki has an announced event as soon as it is announced. That table is still read
// for the one thing the wiki lacks, when an event's shop closes.
//
// Pools are a join. The wiki's `Banners` table has every pool's featured operators, and the
// dates of the named ones on both servers. The rotating standard and kernel pools it lists
// with no dates at all, so those come from the game's gacha_table, matched to the wiki's
// rows by number: the Nth standard pool the game has opened is the wiki's "Standard Pool N".
//
// Nothing here is load-bearing. With the wiki unreachable the last build's file is kept, or
// an empty one written: the Events page then has nothing to list, and the build goes on.
// With only the game's tables unreachable the schedule is written without shop times and
// rotating pools.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { table } from './lib/gamedata.mjs';

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'shared', 'generated',
);
const EVENTS_FILE = path.join(outDir, 'events.json');
const bannerDir = path.join(outDir, 'event-banners');

const WIKI_API = 'https://arknights.wiki.gg/api.php';
// MediaWiki throttles clients that don't identify themselves much harder.
const USER_AGENT = 'dossier-build/1.0 (https://github.com/seangcs27/dossier)';
const FETCH_TIMEOUT_MS = 20_000;

async function timedFetch(url) {
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

async function wiki(params) {
  const qs = new URLSearchParams({ ...params, format: 'json', formatversion: '2' });
  const res = await timedFetch(`${WIKI_API}?${qs}`);
  if (!res.ok) throw new Error(`wiki ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`wiki: ${JSON.stringify(json.error).slice(0, 200)}`);
  return json;
}

async function cargo(params) {
  const rows = [];
  for (let offset = 0; offset < 3000; offset += 500) {
    const json = await wiki({ ...params, action: 'cargoquery', limit: '500', offset: String(offset) });
    const batch = json.cargoquery.map(x => x.title);
    rows.push(...batch);
    if (batch.length < 500) break;
  }
  return rows;
}

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

// The wiki writes its times as 'YYYY-MM-DD HH:MM:SS', in UTC.
const toMs = stamp => Date.parse(`${stamp.replace(' ', 'T')}Z`);

// The lag is counted in calendar days, each server's own: CN keeps UTC+8 and Global UTC-7.
// Counting it between instants put a pool a day after the event it belongs to, because the
// wiki times a CN event from the day's reset (04:00) and a CN pool from when it opens.
const CN_OFFSET_MS = 8 * HOUR_MS;
const GLOBAL_OFFSET_MS = -7 * HOUR_MS;
const dayOn = (ms, offsetMs) => Math.floor((ms + offsetMs) / DAY_MS);

// How far Global runs behind CN: the median, over the last LAG_SAMPLE events both servers
// have run, of the days between the two starts. In October 2026 that was 159, and adding it
// to the CN dates gave Arkpedia's predicted schedule to the day for the three months ahead.
const LAG_SAMPLE = 10;

// Fewer paired events than this means the tables have changed shape, not that Global has
// stopped running events. They held 189 pairs when this was written.
const MIN_PAIRS = 100;

// A Global event opens at 10:00 server time and closes at 03:59, which are 17:00 and 10:59
// UTC on the same date. A predicted run is put on those hours, so it reads the same as an
// announced one.
const GLOBAL_OPEN_MS = 17 * HOUR_MS;
const GLOBAL_CLOSE_MS = 11 * HOUR_MS - 1000;

// An event or pool the usual lag is wrong for takes the lag of a better-known neighbour: one
// that opened on CN within this many days of it. That is how a pool is predicted for the day
// its own event has been announced for, rather than a week to either side of it.
const ANCHOR_REACH_DAYS = 4;

// How far back the schedule keeps what has ended, so the calendar's current month is whole.
const HISTORY_DAYS = 92;

// Global holds the CN summer carnival for its own anniversary. Its launch day was 16 January
// 2020, and the carnival event has opened on that date in 2024, 2025 and 2026 (on the Friday
// before in 2022 and 2023), wherever the usual lag would have put it. Returns the 16 January
// nearest `day`, as a day number.
function anniversary(day) {
  const year = new Date(day * DAY_MS).getUTCFullYear();
  return [year, year + 1]
    .map(y => Date.UTC(y, 0, 16) / DAY_MS)
    .reduce((best, d) => (Math.abs(d - day) < Math.abs(best - day) ? d : best));
}

// The names the wiki's numbered pools go by. A named pool ("Rage of the Many") has its own.
const POOL_NAME = {
  standard: 'Standard Pool',
  kernel: 'Kernel Headhunting',
  'kernel locating': 'Kernel Locating',
  jo: 'Joint Operation',
  orient: 'Orienteering',
  tftw: 'The Front That Was',
};

// 'EN People, A People banner.png' -> 'en-people-a-people-banner'. The file is named for
// the wiki's image, not for the event: an event's banner changes from the CN one to the
// EN one when Global announces it, and that has to be a new file rather than a kept one.
const slugOf = file => file.replace(/\.\w+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const BANNER_WIDTH = 960;

// Downloads the banners not already on disk, re-encoded to WebP, and deletes the ones
// nothing uses any more. The originals are 1560x500 PNGs of about 1 MB; the wiki resizes
// them itself, so what is fetched is its 960px thumbnail. Returns the slugs now on disk.
async function bakeBanners(files) {
  await mkdir(bannerDir, { recursive: true });
  const onDisk = new Set((await readdir(bannerDir)).map(f => f.replace(/\.webp$/, '')));
  const wantedSlugs = new Set(files.map(slugOf));
  for (const slug of onDisk) {
    if (wantedSlugs.has(slug)) continue;
    await rm(path.join(bannerDir, `${slug}.webp`));
    onDisk.delete(slug);
  }

  const missing = files.filter(f => !onDisk.has(slugOf(f)));
  const failed = [];
  // One request names every file; the wiki answers a file-by-file crawl with a 429.
  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50);
    let pages = [];
    try {
      const json = await wiki({
        action: 'query', titles: batch.map(f => `File:${f}`).join('|'),
        prop: 'imageinfo', iiprop: 'url', iiurlwidth: String(BANNER_WIDTH),
      });
      pages = json.query?.pages ?? [];
    } catch (err) {
      failed.push(`${batch.length} banners (${err.message})`);
      continue;
    }
    const urlOf = new Map(pages.map(p => [p.title.replace(/^File:/, ''), p.imageinfo?.[0]?.thumburl]));
    for (const file of batch) {
      try {
        // The wiki answers with spaces where the table may have underscores.
        const url = urlOf.get(file.replace(/_/g, ' '));
        if (!url) throw new Error('not on the wiki');
        const res = await timedFetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const webp = await sharp(Buffer.from(await res.arrayBuffer()))
          .resize({ width: BANNER_WIDTH, withoutEnlargement: true })
          .webp({ quality: 80, effort: 4 })
          .toBuffer();
        await writeFile(path.join(bannerDir, `${slugOf(file)}.webp`), webp);
        onDisk.add(slugOf(file));
      } catch (err) {
        failed.push(`${file} (${err.message})`);
      }
    }
  }
  console.log(
    `event banners: ${onDisk.size}/${wantedSlugs.size}` +
    `${failed.length ? ` — missing ${failed.join(', ')}` : ''} -> ${path.relative(process.cwd(), bannerDir)}`,
  );
  return onDisk;
}

// The wiki's operator names against ours, blind to punctuation and accents: it writes
// "Kal'tsit - Esperanta" where the game writes "Kal'tsit·Esperanta". Read from the index the
// operators script has just written; without one every operator stays a plain name.
const plain = name => name.normalize('NFD').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();

async function operatorIds() {
  try {
    const index = JSON.parse(await readFile(path.join(outDir, 'operators.json'), 'utf8'));
    // A mode-only operator can share a real one's name (Mechanist); a pool means the real one.
    return new Map(index.filter(op => !op.mode).map(op => [plain(op.name), op.id]));
  } catch {
    return new Map();
  }
}

async function buildSchedule() {
  const [events, runs, banners] = await Promise.all([
    cargo({ tables: 'Events', fields: 'event,image,eventType,eventGroup,isRerun,isCrossover,exclusiveRegion' }),
    cargo({ tables: 'EventServerDetails', fields: 'event,server,image,startTime,endTime' }),
    cargo({ tables: 'Banners', fields: 'name,no,bannerType,operators,image,startTimeCN,endTimeCN,startTimeGlobal,endTimeGlobal' }),
  ]);
  const meta = new Map(events.map(e => [e.event, e]));
  const runsOn = server => new Map(
    runs.filter(r => r.server === server && r.startTime && r.endTime)
      .map(r => [r.event, { start: toMs(r.startTime), end: toMs(r.endTime), image: r.image }]),
  );
  const cn = runsOn('cn');
  const global = runsOn('global');

  const pairs = [...global].filter(([name]) => cn.has(name))
    .sort((a, b) => a[1].start - b[1].start)
    .map(([name, run]) => {
      const cnDay = dayOn(cn.get(name).start, CN_OFFSET_MS);
      return { cnDay, lag: dayOn(run.start, GLOBAL_OFFSET_MS) - cnDay };
    });
  if (pairs.length < MIN_PAIRS) throw new Error(`only ${pairs.length} events run on both servers`);
  const recent = pairs.slice(-LAG_SAMPLE).map(p => p.lag).sort((a, b) => a - b);
  const lagDays = recent[Math.floor(recent.length / 2)];

  // Where the usual lag is known to be wrong: an event Global has run or announced (its
  // real lag), and a carnival still to come (the lag that lands it on the anniversary). A
  // pair far off the usual lag is a one-off, a login event or a rerun moved out of order,
  // and says nothing about its neighbours.
  const anchors = pairs.filter(p => Math.abs(p.lag - lagDays) < 30);
  for (const [name, run] of cn) {
    if (!global.has(name) && meta.get(name)?.eventGroup === 'Carnival') {
      const cnDay = dayOn(run.start, CN_OFFSET_MS);
      anchors.push({ cnDay, lag: anniversary(cnDay + lagDays) - cnDay });
    }
  }
  const lagAt = cnDay => {
    const near = anchors.reduce((best, a) => (Math.abs(a.cnDay - cnDay) < Math.abs(best.cnDay - cnDay) ? a : best));
    return Math.abs(near.cnDay - cnDay) <= ANCHOR_REACH_DAYS ? near.lag : lagDays;
  };
  // A CN run moved to Global: later by the lag, and onto Global's own hours.
  const predicted = (cnStart, cnEnd) => {
    const lag = lagAt(dayOn(cnStart, CN_OFFSET_MS));
    const onDay = (cnMs, edgeMs) => (dayOn(cnMs, CN_OFFSET_MS) + lag) * DAY_MS + edgeMs;
    return { start: onDay(cnStart, GLOBAL_OPEN_MS), end: onDay(cnEnd, GLOBAL_CLOSE_MS), predicted: true, cnStart, cnEnd };
  };

  const now = Date.now();
  const since = now - HISTORY_DAYS * DAY_MS;

  let listed = [];
  for (const [name, run] of global) listed.push({ name, ...run, predicted: false });
  for (const [name, run] of cn) {
    if (global.has(name) || meta.get(name)?.exclusiveRegion === 'cn') continue;
    listed.push({ name, image: run.image, ...predicted(run.start, run.end) });
  }

  // When the shop closes, which is days after the stages do. The game's activity for an
  // event is the one that ends on the same second and starts within two days of it; its
  // names are not the wiki's ("Stronghold Protocol: Alliance" for the wiki's "... Part 2").
  try {
    const activities = Object.values((await table('en', 'activity_table')).basicInfo);
    for (const e of listed) {
      if (e.predicted) continue;
      const shopEnd = Math.max(0, ...activities
        .filter(a => a.endTime * 1000 === e.end && Math.abs(a.startTime * 1000 - e.start) < 2 * DAY_MS)
        .map(a => a.rewardEndTime * 1000));
      if (shopEnd > e.end) e.shopEnd = shopEnd;
    }
  } catch (err) {
    console.warn(`shop times skipped: ${err.message}`);
  }

  // What has ended is kept for the calendar, a few months of it. A prediction that has
  // ended with nothing announced is dropped: Global's turn has come and gone.
  listed = listed.filter(e => (e.predicted ? e.end >= now : (e.shopEnd ?? e.end) >= since));
  listed.sort((a, b) => a.start - b.start);

  const ids = await operatorIds();
  const operatorsOf = names => names.split(',').map(n => n.trim()).filter(Boolean).map(n => ids.get(plain(n)) ?? n);

  let pools = [];
  for (const b of banners) {
    const name = b.name || `${POOL_NAME[b.bannerType] ?? b.bannerType} ${b.no}`;
    const common = { name, kind: b.bannerType, image: b.image, operators: operatorsOf(b.operators) };
    if (b.startTimeGlobal && b.endTimeGlobal) {
      pools.push({ ...common, start: toMs(b.startTimeGlobal), end: toMs(b.endTimeGlobal), predicted: false });
    } else if (b.startTimeCN && b.endTimeCN) {
      pools.push({ ...common, ...predicted(toMs(b.startTimeCN), toMs(b.endTimeCN)) });
    }
  }

  // The rotating pools. The wiki numbers them and names their operators but gives no dates;
  // the game dates them and, for a kernel pool, names the operators by id.
  try {
    const gacha = (await table('en', 'gacha_table')).gachaPoolClient;
    const rotation = (kind, rules, named) => gacha
      .filter(p => rules.includes(p.gachaRuleType) && (!named || named.test(p.gachaPoolName)))
      .sort((a, b) => a.openTime - b.openTime)
      .forEach((p, i) => {
        const row = banners.find(b => b.bannerType === kind && Number(b.no) === i + 1);
        const byId = [p.dynMeta?.main6RarityCharId, p.dynMeta?.sub6RarityCharId, ...(p.dynMeta?.rare5CharList ?? [])].filter(Boolean);
        pools.push({
          name: `${POOL_NAME[kind]} ${i + 1}`, kind, image: row?.image ?? '',
          operators: byId.length ? byId : operatorsOf(row?.operators ?? ''),
          start: p.openTime * 1000, end: p.endTime * 1000, predicted: false,
        });
      });
    // Standard pools all carry one name; an event pool under the same rules has its own.
    rotation('standard', ['NORMAL', 'DOUBLE'], /^Rare Operators/);
    rotation('kernel', ['CLASSIC', 'CLASSIC_DOUBLE']);
  } catch (err) {
    console.warn(`rotating pools skipped: ${err.message}`);
  }

  pools = pools.filter(p => p.end >= (p.predicted ? now : since));
  pools.sort((a, b) => a.start - b.start);

  // A Global run announced without a banner of its own borrows the CN one. Only what the
  // lists show gets one: the calendar draws what has ended as a bar.
  const imageOf = e => e.image || cn.get(e.name)?.image || meta.get(e.name)?.image || '';
  const shown = [
    ...listed.filter(e => (e.shopEnd ?? e.end) >= now).map(imageOf),
    ...pools.filter(p => p.end >= now).map(p => p.image),
  ];
  const baked = await bakeBanners([...new Set(shown.filter(Boolean))]);
  const bannerOf = image => (image && baked.has(slugOf(image)) ? slugOf(image) : '');
  const cnRun = e => (e.predicted ? { cnStart: e.cnStart, cnEnd: e.cnEnd } : {});

  return {
    lagDays,
    events: listed.map(e => {
      const m = meta.get(e.name);
      return {
        // The wiki files a rerun as a subpage of its event, 'Ato/Rerun', and tells an event
        // from a namesake with a suffix, 'Babel (event)'. Neither belongs in the name.
        name: e.name.replace(/\/Rerun$/, '').replace(/ \(event\)$/, ''),
        type: m?.eventType ?? '',
        group: m?.eventGroup ?? '',
        rerun: m?.isRerun === '1',
        crossover: m?.isCrossover === '1',
        start: e.start,
        end: e.end,
        ...(e.shopEnd ? { shopEnd: e.shopEnd } : {}),
        predicted: e.predicted,
        ...cnRun(e),
        banner: bannerOf(imageOf(e)),
      };
    }),
    pools: pools.map(p => ({
      name: p.name,
      kind: p.kind,
      start: p.start,
      end: p.end,
      predicted: p.predicted,
      ...cnRun(p),
      operators: p.operators,
      banner: bannerOf(p.image),
    })),
  };
}

await mkdir(outDir, { recursive: true });
try {
  const schedule = await buildSchedule();
  await writeFile(EVENTS_FILE, JSON.stringify(schedule));
  const count = list => `${list.filter(x => !x.predicted).length} on Global, ${list.filter(x => x.predicted).length} predicted`;
  console.log(
    `events: ${count(schedule.events)}; pools: ${count(schedule.pools)} ` +
    `(CN + ${schedule.lagDays} days) -> ${path.relative(process.cwd(), EVENTS_FILE)}`,
  );
} catch (err) {
  // The page imports this file, so one has to exist for the bundle to build at all.
  const kept = await readFile(EVENTS_FILE, 'utf8').then(() => true, () => false);
  if (!kept) await writeFile(EVENTS_FILE, JSON.stringify({ lagDays: 0, events: [], pools: [] }));
  console.warn(`events.json ${kept ? 'kept from the last build' : 'written empty'}: ${err.message}`);
}
