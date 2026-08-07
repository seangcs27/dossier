# Dossier — Arknights Operator Lookup

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
- **Rich detail dossier** at `#/op/<id>` — deep-linkable, shareable URLs:
  - Header: avatar, rarity, class/branch, archetype, position, faction
  - Lore, tags, trait, and obtain approach
  - **Artwork viewer** — every elite art and alternate outfit, with illustrator credit
  - Per-elite-phase stats table (HP / ATK / DEF / RES / DP cost / block / redeploy / attack interval)
  - Attack-range grids per elite phase
  - Skills with icons, SP cost/recovery, and per-level descriptions
  - Talents, modules, potentials, and RIIC base skills
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

All generated output is gitignored and rebuilt from scratch each time. A weekly cron in
the deploy workflow keeps the published site current as new operators release.

| Source | Used for |
|---|---|
| [HellaAPI](https://awedtan.ca/api) | Primary operator data. Its `/cn/operator` endpoint backfills operators with no global release yet |
| [Kengxxiao/ArknightsGameData](https://github.com/Kengxxiao/ArknightsGameData) | Raw CN `character_table.json` — covers HellaAPI's ~1-patch lag (~20 operators) |
| [arknights.wiki.gg](https://arknights.wiki.gg) | CN release dates; English trait + bio for CN-only operators (Cargo API); branch/archetype icons, downloaded into the bundle |
| [sanitygone.help](https://sanitygone.help) | `releaseOrder`, a PRTS-scraped ordinal — the preferred sort signal |
| [PuppiizSunniiz/AN-EN-Tags](https://github.com/PuppiizSunniiz/AN-EN-Tags) | Community English translations: skills, talents, RIIC buffs, potentials, recruitment tags |
| [PuppiizSunniiz/Arknight-Images](https://github.com/PuppiizSunniiz/Arknight-Images) | Avatars, class icons, skill icons, full illustrations |
| [yuanyan3060/ArknightsGameResource](https://github.com/yuanyan3060/ArknightsGameResource) | 180×360 bust portraits for grid cards |

Every source except HellaAPI is supplemental: if one is unreachable the build logs a
warning and degrades rather than failing. All network calls carry a 20 s timeout.

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
        ├── router.ts          # Hash routing (#/ , #/op/<id>)
        ├── format.ts          # Display helpers
        ├── logo.ts            # Random logo/favicon variant per load
        ├── operator-index.ts  # Grid data store: sort + filter
        ├── views/grid.ts      # Operator grid, search, filter popover
        ├── views/detail.ts    # Rich operator dossier
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

All Arknights game data and artwork is the property of **Hypergryph / Yostar**. This is a
non-commercial fan reference built on community-maintained data mirrors (credited above),
and carries no affiliation or endorsement. Assets will be removed on request.

*Scaffolded from [hololive-helper](https://github.com/seangcs27/hololive-helper); Phase 2+ replaced the original feature set entirely.*
