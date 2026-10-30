# Dossier — Arknights

An Arknights operator reference with two faces, built from one shared codebase:

- **Web SPA** — live at **[seangcs27.github.io/dossier](https://seangcs27.github.io/dossier/)**: searchable operator grid plus a rich per-operator dossier
- **Browser extension** (Firefox/Chrome, Manifest V3) — the same lookup in a toolbar popup

All 427 operators are resolved at **build time** into static JSON, so detail pages load
from a same-origin file (~100 ms) instead of a third-party API round trip. See
[Data pipeline](#data-pipeline).

---

## Features

### Web SPA

- **Operator grid** — full-art portrait cards with class/archetype badges, live search by
  name/appellation, and a filter popover (class, branch, rarity, recruitment tags). Sorted
  newest-first by default, with release/name sort options.
- **Operator dossier** at `#/op/<id>` — deep-linkable, shareable URLs. A two-column page
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
- **Schedule** at `#/events` — the Global server's events and headhunting pools: what is
  live, what has been announced, and what CN has already run with a predicted Global date
  (the CN run plus the recent gap between the two servers, about 160 days), as two lists and
  a month calendar, modelled on [Arkpedia](https://www.arkpedia.net/schedule)'s
- **Other games**, a tile each on the sidebar — Arknights: Endfield at `#/endfield` (a
  roster with name search and filters, and a first dossier page per operator); Path to
  Nowhere at `#/ptn` (a roster with search and filters, and a dossier per Sinner: profile,
  skills, crimebrand, shackles and file); and a roster each for hololive Dreams
  (`#/holodori`) and Fate/Grand Order (`#/fgo`)
- **Hash routing** — back/forward navigation and refresh-safe deep links, no server config needed

### Browser extension

- Toolbar popup with the same operator search → grid → detail flow
- Self-contained MV3 page (no background worker, no content scripts)

---

## Data pipeline

`scripts/build-operator-index.mjs` runs before every build. It fetches and joins several
independent sources, then writes:

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
| [S1N](https://s1n.gg) | When each Sinner was released, and five Sinners the wiki has no page for; written down by hand in `scripts/lib/ptn-record.mjs`, not fetched |

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

npm run build        # production build — both targets → dist/
npm run build:ext    # extension only → dist/ext/
npm run build:web    # web SPA only   → dist/web/

npm run dev          # watch mode — extension
npm run dev:web      # watch mode — web SPA

npm run build:index  # regenerate the bundled data only (runs automatically pre-build)
npm run clean        # remove ./dist/
```

Requires Node.js 22 and npm. No other global dependencies. A full build takes ~60 s, most
of it the ~430 build-time fetches.

### Load the extension

**Firefox:** `about:debugging` → "This Firefox" → "Load Temporary Add-on" → select `dist/ext/manifest.json`

**Chrome:** `chrome://extensions` → Developer mode ON → "Load unpacked" → select `dist/ext/`

### Run the web SPA locally

Open `dist/web/index.html` in a browser. The grid and every detail page render from the
bundled static data; no network needed except operator images.

### Deploy

Every push to `master` runs `.github/workflows/deploy-pages.yml`: build `dist/web/` →
publish to GitHub Pages. It uses no repository secrets — only the auto-provisioned
`GITHUB_TOKEN`. One-time setup: repo Settings → Pages → Source = "GitHub Actions".

---

## Project Structure

```
dossier/
├── manifest.json              # Extension manifest (MV3)
├── webpack.{base,ext,web}.js  # Shared config + per-target bundles
├── icons/                     # Extension + favicon set
├── scripts/
│   ├── build-operator-index.mjs   # The data pipeline (see above)
│   ├── build-range-index.mjs      # Attack ranges
│   ├── build-event-index.mjs      # Global event schedule + banners
│   └── build-design-previews.mjs  # Component previews for design review
├── .github/workflows/
│   └── deploy-pages.yml       # Pages deploy on push + weekly data refresh
└── src/
    ├── shared/                # Used by both targets
    │   ├── api/hella-api.ts   # Static-first operator fetch, API fallback, CDN URLs
    │   ├── cache/             # 1 hr TTL in-memory cache
    │   ├── generated/         # Build output (gitignored)
    │   └── types/             # Operator, stats, skills, talents, ranges…
    ├── styles/                # SCSS tokens + base, shared by both targets
    ├── extension/             # MV3 extension (popup only)
    │   ├── popup/             # Search → grid → detail UI
    │   └── utils/html.ts      # escHtml / cleanText
    └── web/                   # Web SPA
        ├── index.ts           # Entry: router dispatch
        ├── router.ts          # Hash routing (#/ , #/op/<id> , #/events)
        ├── format.ts          # Display helpers
        ├── logo.ts            # Random logo/favicon variant per load
        ├── operator-index.ts  # Grid data store: sort + filter
        ├── views/grid.ts      # Operator grid, search, filter popover
        ├── views/detail.ts    # Rich operator dossier
        ├── views/events.ts    # Global event schedule
        └── styles.scss        # Full-page layout
```

---

## Tech Stack

| Tool | Purpose |
|---|---|
| TypeScript 5 (strict) | All source |
| Webpack 5 + ts-loader | Dual-target bundling (extension + SPA) |
| SCSS | Shared design tokens, per-target layout |
| Vanilla TS/DOM | No framework, no router dependency |
| Manifest V3 | Firefox 109+, Chrome 88+, Edge |
| GitHub Actions + Pages | CI deploy + weekly data refresh |

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
