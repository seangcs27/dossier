# Dossier — Arknights Operator Lookup

An Arknights operator reference with two faces, built from one shared codebase:

- **Web SPA** — live at **[seangcs27.github.io/dossier](https://seangcs27.github.io/dossier/)**: searchable operator grid plus a rich per-operator dossier
- **Browser extension** (Firefox/Chrome, Manifest V3) — the same lookup in a toolbar popup

Operator data comes from [HellaAPI](https://awedtan.ca/api); images from the [Arknight-Images](https://github.com/PuppiizSunniiz/Arknight-Images) CDN.

---

## Features

### Web SPA

- **Operator grid** — all operators with avatars, profession, and rarity; live search by name/appellation; sorted by rarity then name
- **Rich detail dossier** at `#/op/<id>` — deep-linkable, shareable URLs:
  - Header: avatar, rarity, profession/sub-profession, archetype, position, faction
  - Lore, tags, trait, and obtain approach
  - Per-elite-phase stats table (HP / ATK / DEF / RES / DP cost / block / redeploy / attack interval)
  - Attack-range grids per elite phase
  - Skills with icons, SP cost/recovery, and max-level descriptions
  - Talents, potentials, and base skills
- **Hash routing** — back/forward navigation and refresh-safe deep links, no server config needed

### Browser extension

- Toolbar popup with the same operator search → grid → detail flow
- Self-contained MV3 page (no background worker, no content scripts)

---

## Build & Develop

```bash
npm install

npm run build        # production build — both targets → dist/
npm run build:ext    # extension only → dist/ext/
npm run build:web    # web SPA only   → dist/web/

npm run dev          # watch mode — extension
npm run dev:web      # watch mode — web SPA

npm run clean        # remove ./dist/
```

Requires Node.js and npm. No other global dependencies.

### Load the extension

**Firefox:** `about:debugging` → "This Firefox" → "Load Temporary Add-on" → select `dist/ext/manifest.json`

**Chrome:** `chrome://extensions` → Developer mode ON → "Load unpacked" → select `dist/ext/`

### Run the web SPA locally

Open `dist/web/index.html` in a browser (hits the live HellaAPI).

### Deploy

Every push to `master` runs `.github/workflows/deploy-pages.yml`: build `dist/web/` → publish to GitHub Pages. One-time setup: repo Settings → Pages → Source = "GitHub Actions".

---

## Project Structure

```
dossier/
├── manifest.json              # Extension manifest (MV3)
├── package.json
├── tsconfig.json
├── webpack.base.js            # Shared TS loader config
├── webpack.ext.js             # Extension bundle → dist/ext/
├── webpack.web.js             # SPA bundle → dist/web/
├── generate_icons.py          # Icon utility
├── icons/
├── .github/workflows/
│   └── deploy-pages.yml       # Pages deploy on push to master
└── src/
    ├── shared/                # Used by both targets
    │   ├── api/hella-api.ts   # HellaAPI client + CDN image URLs
    │   ├── cache/             # 1 hr TTL in-memory cache (operators, ranges)
    │   └── types/             # Operator, stats, skills, talents, ranges…
    ├── extension/             # MV3 extension (popup only)
    │   ├── popup/             # Search → grid → detail UI
    │   └── utils/html.ts      # escHtml
    └── web/                   # Web SPA
        ├── index.ts           # Entry: router dispatch
        ├── router.ts          # Hash routing (#/ , #/op/<id>)
        ├── format.ts          # Shared display helpers
        ├── views/grid.ts      # Operator grid + live search
        ├── views/detail.ts    # Rich operator dossier
        └── index.html         # Shell + theme CSS
```

---

## Tech Stack

| Tool | Purpose |
|---|---|
| TypeScript 5 (strict) | All source |
| Webpack 5 + ts-loader | Dual-target bundling (extension + SPA) |
| Vanilla TS/DOM | No framework, no router dependency |
| Manifest V3 | Firefox 109+, Chrome 88+, Edge |
| GitHub Actions + Pages | CI deploy of the SPA |

*Scaffolded from [hololive-helper](https://github.com/seangcs27/hololive-helper); Phase 2+ replaced the original feature set entirely.*
