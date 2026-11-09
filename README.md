# Dossier

A fan reference for five games, built from one shared codebase and published as two things:

- **The site** — live at **[seangcs27.github.io/dossier](https://seangcs27.github.io/dossier/)**, a sidebar tile for each game: Arknights (the original: a searchable operator grid and a rich per-operator dossier), Arknights: Endfield, Path to Nowhere, hololive Dreams and Fate/Grand Order. Built with [Astro](https://astro.build), one static page per route
- **A browser extension** (Firefox/Chrome, Manifest V3) — the Arknights lookup in a toolbar popup

Everything is resolved at **build time** into static files (about 460 operators, a payload
each), so a page loads from a same-origin file (~100 ms) instead of a third-party API round
trip, and there is no server behind the site. See [Data pipeline](#data-pipeline).

---

## Features

### The site

- **Operator grid** — full-art portrait cards with class/archetype badges, live search by
  name/appellation, and a filter popover (class, branch, rarity, recruitment tags). Sorted
  newest-first by default, with release/name sort options.
- **Operator dossier** at `/op/<id>/` — deep-linkable, shareable URLs. A two-column page
  modelled on [Sanity Gone](https://sanitygone.help)'s operator view:
  - **Artwork column** (left, sticky) — every elite art and alternate outfit, switched from a
    thumbnail rail over the art, captioned with the illustrator
  - **Data panel** (right, fixed 590px) — rarity strip, faction badge, name + alter epithet, and a
    class / branch / melee-ranged row; six tabs: Attributes, Talents, Skills, Modules, RIIC, Misc
  - **Attributes** recomputes live from its own controls — elite button group, level slider with
    a typed input, module checkbox + stage pills, trust checkbox with a 0–200 input, and a
    potential dropdown — rather than showing a static per-phase table
  - **Skills** — skill pills, a rank slider running 1–7 through M1–M3, SP cost / initial SP /
    duration, and the skill's range overlaid on the operator's (added cells blue, removed red)
  - Descriptions render the game's own markup with `{placeholders}` interpolated from each
    entry's blackboard, so buff values read as the game states them instead of being stripped
    to plain text
  - Elite and potential are shared state across tabs, so switching tabs keeps your build
- **Schedule** at `/events/` — the Global server's events and headhunting pools: what is
  live, what has been announced, and what CN has already run with a predicted Global date
  (the CN run plus the recent gap between the two servers, about 160 days), as two lists and
  a month calendar, modelled on [Arkpedia](https://www.arkpedia.net/schedule)'s
- **Arknights: Endfield** at `/endfield/` — a showcase of one operator at a time with a
  filmstrip of the rest, search and filters, and a first dossier page per operator
- **Path to Nowhere** at `/ptn/` — a line-up wall of every Sinner at their own height
  (mugshots or original illustrations; ordered by newest, rank or birthday), search and the
  game's own filters, English and Chinese, a notice for the next birthday, and a dossier per
  Sinner: profile, skills, phase-ups, crimebrand, shackles and file
- **hololive Dreams** at `/holodori/` — a front page; a sheet of every holomem's sticker
  with a birthday calendar; songs (a jacket turns over, a chorus plays from the music
  video); cards with stats, skills, voice lines and a 5-star reveal; the gacha record; and a
  page per holomem with her voice lines
- **Fate/Grand Order** at `/fgo/` — a summoning circle of the classes over the Servants'
  frames, with search and filters (no dossier yet)
- **Dark theme** — follows the system, with a switch in the topbar to override it. Arknights
  and Fate/Grand Order are dark in both, so they show no switch
- **Navigation** — Astro's client router swaps pages without a reload, and keeps the sidebar
  and a roster's search and filters across them. Old `#/…` links from before the move still
  land on their page

### Browser extension

- Toolbar popup with the same operator search → grid → detail flow
- Self-contained MV3 page (no background worker, no content scripts)

---

## Data pipeline

`npm run build:index` runs before every build, and is seven scripts: one for Arknights'
operators, one for its attack ranges, one for its event schedule, and one each for Endfield,
Path to Nowhere, hololive Dreams and Fate/Grand Order. `scripts/build-operator-index.mjs`
fetches and joins several independent sources, then writes:

- `src/shared/generated/operators.json` — the slim grid index (bundled into both targets)
- `src/shared/generated/operator-details/<id>.json` — one full dossier per operator
- `src/shared/generated/ranges.json` — every attack range in use
- `src/shared/generated/branch-icons/<subProfessionId>.png` — archetype badge icons

`scripts/build-event-index.mjs` runs beside it and writes `events.json` and
`event-banners/`, the Global schedule, from arknights.wiki.gg's event and banner tables and
the game's own activity and gacha tables.

All generated output is gitignored and rebuilt from scratch each time. A cron every 6 hours in the
deploy workflow (02:30, 08:30, 14:30 and 20:30 UTC) keeps the published site current as new
operators, Sinners, cards and gachas release.

**Arknights**

| Source | Used for |
|---|---|
| [ArknightsAssets/ArknightsGamedata](https://github.com/ArknightsAssets/ArknightsGamedata) | The game's own excel tables, EN and CN (`character_table`, skills, modules, base skills, handbook, ranges, skins, items, activity and gacha tables): every operator's payload, the CN-only operators, costs and the schedule's pools. The one load-bearing source |
| [arknights.wiki.gg](https://arknights.wiki.gg) | CN release dates (Cargo API); CN-only operators' English text and files; the Global event schedule and its banners; branch icons, downloaded into the bundle |
| [sanitygone.help](https://sanitygone.help) | `releaseOrder`, a PRTS-scraped ordinal, the preferred sort signal; the model for the operator page |
| [PuppiizSunniiz/AN-EN-Tags](https://github.com/PuppiizSunniiz/AN-EN-Tags) | Community English translations: skills, talents, RIIC buffs, potentials |
| [PuppiizSunniiz/Arknight-Images](https://github.com/PuppiizSunniiz/Arknight-Images) | Avatars, outfit avatars, class, skill and module icons, full illustrations; loaded by the page, with [jsDelivr](https://www.jsdelivr.com) as the fallback host |
| [yuanyan3060/ArknightsGameResource](https://github.com/yuanyan3060/ArknightsGameResource) | 180×360 bust portraits for grid cards, baked to WebP |
| [Wikimedia Commons](https://commons.wikimedia.org) | The four crossover logos in `scripts/collab-logos/` |
| [Arkpedia](https://arkpedia.net/schedule) | The model for the Events page; not fetched |

**Arknights: Endfield**

| Source | Used for |
|---|---|
| [endfield.wiki.gg](https://endfield.wiki.gg) | Roster, card art, splash art, glyphs and each operator's page (Cargo and MediaWiki APIs), read by `scripts/build-endfield-index.mjs` |

**Path to Nowhere**

| Source | Used for |
|---|---|
| [pathtonowhere.wiki.gg](https://pathtonowhere.wiki.gg) | Roster and each Sinner's dossier, mugshots and original illustrations (baked), and the other prints, loaded by the page; read by `scripts/build-ptn-index.mjs` |
| [无期迷途WIKI](https://wiki.biligame.com/wqmt) (BWIKI) | The model for the roster filter and Sinner page, and a source (`scripts/lib/ptn-bili.mjs`, its Semantic MediaWiki API): Chinese names and tags, limited and core-damage flags, every Sinner's page and crimebrand, terms, voice lines, skill ranges, and the 11 CN-only Sinners whole. Kept in `scripts/lib/ptn-bili-snapshot.json` for the builds it will not answer. The 25 badges in `icons/ptn/` are its files, baked once |
| [S1N](https://s1n.gg) | When each Sinner was released, five Sinners the wiki has no page for, and the birthdays of four of them; written down by hand in `scripts/lib/ptn-record.mjs`, not fetched |

**hololive Dreams**

| Source | Used for |
|---|---|
| [HolodoriDB](https://github.com/HolodoriDB) master data dumps (`holodori-db-eng-diff`, `holodori-db-jpn-diff`) | The cast, songs, cards, skills, voice lines and their Japanese text, read by `scripts/build-holodori-index.mjs` |
| HolodoriDB's CDN (`cdn.holodori.dev`) | Card portraits and illustrations, stickers, round icons, skill icons and jackets for the newer songs (baked); animations, signatures, voice lines, motif sigils and gacha logos (loaded by the page). Backed up by hand to the `media-backup` release |
| [hololive Dreams official site](https://www.hololive-dreams.com/en) | Each holomem's key art and the song jackets it lists |
| [Gamerch](https://gamerch.com/hololive-dreams/) | The three card type icons in `icons/holodori/`, baked once |
| [holodori.best](https://holodori.best) | The gacha record (names, dates, featured cards), written down by hand in `scripts/lib/holodori-gachas.mjs`; the model for the card page |
| [hololive Dreams Lab](https://dreams.wf-calc.net/wiki/game-updates?lang=en) | Announced ★5 previews and the announcements' headlines |
| [Steam news](https://store.steampowered.com/news/app/4282500) | The game's own announcements on Steam |
| [YouTube](https://www.youtube.com) | Each song's chorus, played from its official music video in YouTube's embedded player; where it plays recorded by hand in `scripts/lib/holodori-clips.mjs` |
| [Wikimedia Commons](https://commons.wikimedia.org) | hololive's triangle, for the sidebar tile |

**Fate/Grand Order**

| Source | Used for |
|---|---|
| [Atlas Academy](https://atlasacademy.io) | The roster, from its export API (data under [ODC-BY 1.0](https://opendatacommons.org/licenses/by/1-0/)), and the party figures its cards show, read by `scripts/build-fgo-index.mjs` |
| [Fate/Grand Order Wiki](https://fategrandorder.fandom.com) | Chaldea's emblem, for the sidebar tile |

**Every game**

| Source | Used for |
|---|---|
| [wsrv.nl](https://wsrv.nl) | Resizes the full illustrations and prints the pages load at the size shown |
| [Google Fonts](https://fonts.google.com) | Poppins, Archivo, JetBrains Mono, Cinzel, EB Garamond, Barlow Condensed and Noto Sans SC, self-hosted under the SIL Open Font License |

Only the Arknights excel tables are load-bearing: any other source that is unreachable makes
the build log a warning and keep the last build's data rather than fail. All network calls
carry a 20 s timeout.

Some newly-released CN operators are only partly translated — the community translation
project works in release order and hasn't reached the newest yet. Those fall back to the
original Chinese rather than showing nothing. See [TODO.md](TODO.md) for the current gaps.

---

## Build & Develop

```bash
npm install

npm run build:site   # the Astro site, the deployed one → dist/astro/
npm run dev:site     # its dev server, http://localhost:4321/dossier/

npm run build        # production build — the extension and the webpack SPA → dist/
npm run build:ext    # extension only → dist/ext/
npm run build:web    # webpack SPA only → dist/web/ (not deployed; the baseline for shots and design previews)
npm run dev          # watch mode — extension
npm run dev:web      # watch mode — webpack SPA

npm run build:index  # regenerate the bundled data only (runs automatically pre-build)
npm run routes       # every route the site answers, checked against the router → dist/routes.txt
npm run render-check # every pure renderer in src/web/render/, run in plain Node
npm run shots -- capture dist/web .shots/<set>   # screenshots at 3 widths, and the smoke run
npm run design       # the component previews in design/ (build:web first)
npm run clean        # remove ./dist/
```

Requires Node.js 22 and npm. No other global dependencies. A full data build is mostly
network time: it fetches from the wikis, the game's data repositories and a few CDNs, and
bakes the art it keeps. Behind an HTTP proxy, run it as `NODE_USE_ENV_PROXY=1 npm run build:index`.

### Load the extension

**Firefox:** `about:debugging` → "This Firefox" → "Load Temporary Add-on" → select `dist/ext/manifest.json`

**Chrome:** `chrome://extensions` → Developer mode ON → "Load unpacked" → select `dist/ext/`

### Run the site locally

`npm run dev:site` serves it at <http://localhost:4321/dossier/>. Pages render from the
bundled static data; no network is needed except for the images and sound the pages load
from other hosts. Check a built page over http, not `file://`: the browser blocks fetches
and masks there.

### Deploy

Every push to `master`, and a cron every 6 hours, runs `.github/workflows/deploy-pages.yml`:

1. restore the generated data from the last run's cache, or from the `dossier-img-backup`
   release when the cache has gone
2. `npm run build:index`, then upload the baked images to that release
3. type-check the repo and `site/`, build the Astro site, and run `scripts/site-check.mjs`:
   a page for every route, every address in the HTML a file of the build, and each page's
   first-load JavaScript inside its budget
4. publish `dist/astro/` to GitHub Pages

A failed check fails the deploy and the last good one stays live. The workflow uses no
repository secrets, only the auto-provisioned `GITHUB_TOKEN` (with `contents: write` for the
release). One-time setup: repo Settings → Pages → Source = "GitHub Actions".

### Assets and backups

The site hosts only what the build bakes. Art and media the pages load from other hosts are
copied to GitHub releases of this repo as insurance:

| Release | Holds | Made |
|---|---|---|
| `dossier-img-backup` | The images the build bakes and the site serves | Every deploy |
| `source-art-backup` | Art loaded from other hosts: Arknights, Path to Nowhere, hololive Dreams' key art | By hand: `node scripts/backup-art.mjs` |
| `media-backup` | hololive Dreams' voice lines, animations, signatures and full card art | By hand: `node scripts/backup-holodori-media.mjs` |

Only the first is read, by the deploy. The other two are not a fallback: no page serves from
them. The assets are not in the repo itself (about 1.7 GB, and GitHub Pages caps a site at
1 GB). **Hosting them ourselves on object storage is planned, not built**
([PLAN-asset-hosting.md](PLAN-asset-hosting.md), 9 November 2026): until it is, the backups
are the only copy. [CLAUDE.md](CLAUDE.md) ("Where the pictures and media live") has the
numbers and the reasoning.

---

## Project Structure

```
dossier/
├── manifest.json                 # Extension manifest (MV3)
├── package.json                  # npm workspaces: this package and site/
├── webpack.{base,ext,web}.js     # Shared config + the extension and webpack SPA bundles
├── icons/                        # Extension icons, logo variants, game emblems, badges
├── site/                         # The Astro site: the deployed web target
│   ├── astro.config.mjs
│   ├── integrations/             # assets.mjs copies the static files; preload.mjs
│   └── src/
│       ├── pages/                # A page per route: rosters, dossiers, cards, holomems…
│       ├── layouts/ components/  # Shell.astro reads src/web/index.html
│       └── lib/                  # page.ts (mount a view per page), ported.ts (old #/ links)
├── scripts/
│   ├── build-*-index.mjs         # One per game, plus ranges and events (npm run build:index)
│   ├── lib/                      # Fetch, image baking, wiki parsers, hand-kept records
│   ├── backup-art.mjs            # Remote art → source-art-backup release, by hand
│   ├── backup-holodori-media.mjs # Audio and video → media-backup release, by hand
│   ├── site-check.mjs            # The deploy's checks: pages, addresses, JS budgets
│   ├── route-inventory.mjs       # Every route the site answers
│   ├── render-check.mjs          # Runs each pure renderer in plain Node
│   ├── shots.mjs                 # Screenshots at 3 widths, the smoke run, diffs
│   └── build-design-previews.mjs # Component previews for design review
├── .github/workflows/
│   └── deploy-pages.yml          # Build, check, deploy: every push and every 6 hours
├── CLAUDE.md                     # The detailed notes: decisions, sources, how each page works
├── TODO.md                       # The running backlog
├── PLAN-astro-hybrid.md          # The move onto Astro, by phase
├── PLAN-asset-hosting.md         # Hosting the source art and media ourselves (planned)
└── src/
    ├── shared/                   # Used by both targets
    │   ├── api/hella-api.ts      # Static-first operator fetch, image URL helpers
    │   ├── cache/                # 1 hr TTL in-memory cache
    │   ├── generated/            # Build output (gitignored)
    │   └── types/                # Operator, stats, skills, talents, ranges…
    ├── styles/                   # SCSS tokens + base, shared by both targets
    ├── extension/                # MV3 extension (popup only)
    │   ├── popup/                # Search → grid → detail UI
    │   └── utils/html.ts         # escHtml / cleanText
    └── web/                      # The views the site mounts (and the webpack SPA)
        ├── index.ts · router.ts  # SPA entry and hash router
        ├── shell.ts              # The page around a view: sidebar, topbar, section links
        ├── views/                # One view per page, for every game
        ├── render/               # Pure string renderers shared with the Astro pages
        ├── card.ts · filter-box.ts  # The roster page and search box the games share
        ├── *-index.ts            # Each game's data store
        ├── styles.scss · _*.scss # Layout, and each game's own look
        └── fonts/                # Self-hosted faces
```

---

## Tech Stack

| Tool | Purpose |
|---|---|
| TypeScript 5 (strict) | All source |
| Astro | The deployed site: a static page per route, with a client router between them |
| Webpack 5 + ts-loader | The extension, and the SPA bundle the site's views come from |
| SCSS | Shared design tokens, per-target layout, each game's own look |
| Vanilla TS/DOM | No UI framework: the views are plain modules |
| sharp | Re-encodes the art the build keeps to WebP |
| Manifest V3 | Firefox 109+, Chrome 88+, Edge |
| GitHub Actions + Pages | CI deploy, and a data refresh every 6 hours |

---

## Attribution

All Arknights game data and artwork is the property of **Hypergryph / Yostar**, and
Arknights: Endfield's of **Hypergryph / Gryphline**. Path to Nowhere's is the property of
**AISNO Games**; hololive Dreams' of **COVER Corporation** and **QualiArts**; Fate/Grand
Order's of **TYPE-MOON / FGO PROJECT**. This is a
non-commercial fan reference built on community-maintained data mirrors (credited above),
and carries no affiliation or endorsement. Assets will be removed on request.

The Persona 3 Reload, Monster Hunter, Ave Mujica and Delicious in Dungeon logos are
trademarks of their respective owners. They are shown only to mark which crossover an
operator came from. The sidebar's emblems (Rhodes Island's, Endfield Industries', Path to
Nowhere's, hololive's and Chaldea's) are likewise their owners', shown only to name the
game a tile opens.

Path to Nowhere's pages are set in **Barlow Condensed**, © The Barlow Project Authors,
under the SIL Open Font License 1.1 (`src/web/fonts/barlow-condensed/OFL.txt`), and their
Chinese in **Noto Sans SC**, © Adobe, under the same licence (`src/web/fonts/noto-sans-sc/OFL.txt`).

*Scaffolded from [hololive-helper](https://github.com/seangcs27/hololive-helper); Phase 2+ replaced the original feature set entirely.*
