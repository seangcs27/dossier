# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Dossier** is an Arknights operator lookup tool with two targets built from a shared codebase:

1. **Browser extension** (Firefox/Chrome, Manifest V3) — operator lookup in a popup
2. **Web SPA** — operator search and detail view, deployable to GitHub Pages

Data comes from **HellaAPI** (`awedtan.ca/api`). Operator images are served from `cdn.jsdelivr.net/gh/PuppiizSunniiz/Arknight-Images@main/...`.

## Build & Development Commands

```bash
npm install          # Install dependencies

npm run dev          # Watch mode — extension only
npm run dev:web      # Watch mode — web SPA only

npm run build        # Production build — both targets
npm run build:ext    # Production build — extension only  → dist/ext/
npm run build:web    # Production build — web SPA only   → dist/web/

npm run clean        # Remove ./dist/
```

**Loading the extension:**
- **Firefox**: `about:debugging` → "Load Temporary Add-on" → select `dist/ext/manifest.json`
- **Chrome**: `chrome://extensions` → Developer mode ON → "Load unpacked" → select `dist/ext/`

**Running the web SPA:** Open `dist/web/index.html` in a browser (hits live HellaAPI).

**Deploying the web SPA:** Push to `master` on GitHub — `.github/workflows/deploy-pages.yml` builds `dist/web/` and publishes to GitHub Pages at https://seangcs27.github.io/dossier/. Requires repo Settings → Pages → Source = "GitHub Actions" (one-time).

## Repository Layout

```
src/
  shared/           ← shared by both targets
    api/
      hella-api.ts  ← HellaAPI fetch client + operatorAvatarUrl()
    cache/
      operator-cache.ts  ← 1hr TTL in-memory cache wrapping hella-api
    types/
      operator.ts   ← Operator, OperatorData, Rarity, Profession, Position
      index.ts      ← re-export barrel

  extension/        ← MV3 browser extension
    background/
      index.ts      ← service worker / message router
      shopify-api.ts
      tab-cache.ts
    badge/          ← in-page stock badge system
    popup/          ← toolbar popup UI (Stock + Calendar tabs)
    content.ts      ← content script (injected at document_end)
    injected.ts     ← page-context script (reads Shopify globals)
    config.ts       ← extension-wide tuneable constants
    utils/          ← logger, url, html helpers
    types/          ← extension-specific types (StockResponse, ProductInfo, etc.)
    data/
      talents.ts    ← static Hololive talent roster (legacy, from hololive-helper)

  web/              ← SPA
    index.ts        ← app entry: hash-router dispatch (grid ↔ detail)
    router.ts       ← hash routing (#/ , #/op/<id>)
    format.ts       ← escHtml/cleanText, rarity + profession helpers
    views/
      grid.ts       ← operator grid + live search; cards link to #/op/<id>
      detail.ts     ← rich operator dossier (stats, ranges, skills, talents, potentials, base skills)
    index.html      ← HTML shell with embedded CSS
```

## Webpack

Three config files:
- **`webpack.base.js`** — shared TS loader + resolve settings
- **`webpack.ext.js`** — extension entries (background, content, injected, popup) → `dist/ext/`
- **`webpack.web.js`** — SPA entry (app) + copies `index.html` → `dist/web/`

## Shared Layer (`src/shared/`)

### HellaAPI (`src/shared/api/hella-api.ts`)

```ts
fetchAllOperators(): Promise<Operator[]>
fetchOperator(id: OperatorId): Promise<Operator>
fetchRange(id: string): Promise<AttackRange>
operatorAvatarUrl(id: OperatorId): string   // jsdelivr CDN
skillIconUrl(skillId: string): string       // jsdelivr CDN
IMAGE_BASE: string
```

### Operator Cache (`src/shared/cache/operator-cache.ts`)

Module-level in-memory cache with 1-hour TTL.

```ts
getOperator(id: OperatorId): Promise<Operator>
getAllOperators(): Promise<Operator[]>
getRange(id: string): Promise<AttackRange>
clearCache(): void
```

### Types (`src/shared/types/operator.ts`)

Key types: `Operator`, `OperatorData`, `OperatorSummary`, `Rarity` (`TIER_1`–`TIER_6`), `Profession` (`PIONEER` = Vanguard in-game, `SUPPORT` = Supporter), `Position`.

## Extension Architecture (`src/extension/`)

Single entry point: **`popup/index.ts`**. No background service worker and no content script — the popup imports `src/shared/cache/operator-cache.ts` and `src/shared/api/hella-api.ts` directly to search operators and fetch detail. State (search text, current view) lives in module-level variables in `popup/index.ts` and does not persist across popup close/reopen.

- `popup/index.ts` — search input handling, grid/detail view switching, wires clicks via event delegation on `#view`
- `popup/render.ts` — pure render functions: `renderLoading`, `renderError`, `renderGrid`, `renderDetail`
- `popup/popup.html` — layout + theme (shares the color system used in `src/web/index.html`: profession colors, rarity colors, `.op-card` structure)

## Web SPA (`src/web/`)

Vanilla TS, no framework. Hash-routed two-view app: `#/` shows the operator grid (loads all operators via the shared cache, live-filters by name/appellation, sorted rarity desc then name asc); `#/op/<id>` shows a rich detail dossier (header, lore/tags, per-phase stats table, attack-range grids via `getRange`, skills, talents, potentials, base skills). Deployed to GitHub Pages by `.github/workflows/deploy-pages.yml` on every push to `master`.

## Testing

No test suite. Test the extension by building and loading in Firefox/Chrome, then opening the toolbar popup (it loads operator data directly from HellaAPI). Test the SPA by opening `dist/web/index.html`.

## Browser Compatibility

- **Firefox** 109+ (MV3), **Chrome** 88+, **Edge** (MV3 compatible)
