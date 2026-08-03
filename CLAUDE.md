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

npm run build:index  # Regenerate src/shared/generated/operators.json (runs automatically
                     # via prebuild:*/predev:* hooks — rarely needed by hand)

npm run clean        # Remove ./dist/
```

**Loading the extension:**
- **Firefox**: `about:debugging` → "Load Temporary Add-on" → select `dist/ext/manifest.json`
- **Chrome**: `chrome://extensions` → Developer mode ON → "Load unpacked" → select `dist/ext/`

**Running the web SPA:** Open `dist/web/index.html` in a browser. The grid needs no network at all (the operator index is baked into the bundle); only the detail view calls HellaAPI.

**Deploying the web SPA:** Push to `master` on GitHub — `.github/workflows/deploy-pages.yml` builds `dist/web/` and publishes to GitHub Pages at https://seangcs27.github.io/dossier/. Requires repo Settings → Pages → Source = "GitHub Actions" (one-time).

## Repository Layout

```
src/
  shared/           ← shared by both targets
    api/
      hella-api.ts  ← HellaAPI fetch client + image URL helpers
    cache/
      operator-cache.ts  ← 1hr TTL in-memory cache wrapping hella-api
    generated/
      operators.json  ← build-time operator index, bundled by BOTH targets (gitignored)
    types/
      operator.ts   ← Operator, OperatorData, Rarity, Profession, Position
      index.ts      ← re-export barrel

  styles/           ← SCSS shared by both targets
    _tokens.scss    ← palette maps: surfaces, professions, rarities
    _base.scss      ← :root custom properties, reset, .op-class/.op-rarity colours, spin

  extension/        ← MV3 browser extension (popup only)
    popup/
      index.ts      ← search + grid/detail switching; imports the generated index
      render.ts     ← renderLoading / renderError / renderGrid / renderDetail
      popup.scss    ← popup sizing (fixed 380px panel)
      popup.html    ← markup shell; links popup.css
    utils/
      html.ts       ← escHtml

  web/              ← SPA
    index.ts        ← app entry: hash-router dispatch (grid ↔ detail)
    router.ts       ← hash routing (#/ , #/op/<id>)
    format.ts       ← escHtml/cleanText, rarity + profession helpers
    operator-index.ts  ← grid data store over the generated index: sort/filter helpers
    styles.scss     ← full-page layout, topbar, chips, grid, detail
    views/
      grid.ts       ← operator grid + live search; cards link to #/op/<id>
      detail.ts     ← rich operator dossier (stats, ranges, skills, talents, potentials, base skills)
    index.html      ← markup shell; links styles.css

  styles.d.ts       ← `declare module '*.scss'` for the side-effect imports
```

## Webpack

Three config files:
- **`webpack.base.js`** — shared TS loader, SCSS loader chain (`MiniCssExtractPlugin.loader` → `css-loader` → `sass-loader`), resolve settings
- **`webpack.ext.js`** — extension entry (popup) + copies `manifest.json`/`popup.html`/`icons`, emits `popup.css` → `dist/ext/`
- **`webpack.web.js`** — SPA entry (app) + copies `index.html`, emits `styles.css` → `dist/web/`

## Styles

SCSS, compiled by webpack. Each entry point imports its own stylesheet for the build-time
side effect (`import './styles.scss'`), which `MiniCssExtractPlugin` pulls out into a real
`.css` file that the HTML shell `<link>`s — no inline `<style>` blocks, no runtime style
injection.

`src/styles/` holds what both targets render identically: the palette (as Sass maps), the
`:root` custom properties generated from those maps, the reset, the `.op-class.*` /
`.op-rarity.r*` colour modifiers, and the spinner keyframe. Adding a profession or changing
a rarity colour means editing **one map** in `_tokens.scss` — the custom properties, badge
rules, and the SPA's filter-chip colours are all generated from it.

Sizing deliberately stays per-target: the popup is a fixed 380px panel and the SPA is a
full page, so nearly every dimension differs. `src/web/styles.scss` and
`src/extension/popup/popup.scss` each own their own layout.

## Shared Layer (`src/shared/`)

### HellaAPI (`src/shared/api/hella-api.ts`)

Only the detail view talks to HellaAPI at runtime — operator *lists* come from the
generated index, never the network.

```ts
fetchOperator(id: OperatorId): Promise<Operator>
fetchRange(id: string): Promise<AttackRange>
operatorAvatarUrl(id: OperatorId): string   // jsdelivr CDN
skillIconUrl(skillId: string): string       // jsdelivr CDN
IMAGE_BASE: string
```

### Generated Operator Index (`src/shared/generated/operators.json`)

Built by `scripts/build-operator-index.mjs`, bundled into both targets by webpack, and
**gitignored** — every build regenerates it. One entry per operator:

```ts
{ id, name, appellation, rarity, profession, subProfessionId, archetype, tags, releaseDate }
```

`archetype` is the readable subclass name (`splashcaster` → `Splash Caster`) and `tags` are
the recruitment tags, both used by the grid's filter panel.

Operators flagged `isNotObtainable` are **dropped** (~28): the `Reserve Operator - *` set and
the Sharp/Pith/Touch/Stormeye/Tulip trainer families, which were never released. The flag is
used rather than a name match because the Integrated Strategies trainer "Mechanist"
(`char_610_acfend`) shares its name with a real 6★ operator, as does "Raidian".

Three sources are joined at build time:

- **HellaAPI** — primary operator identity, via a slim `?include=` query.
- **raw CN game data** (`Kengxxiao/ArknightsGameData`, `zh_CN/gamedata/excel/character_table.json`)
  — supplements HellaAPI, which lags the CN release frontier by roughly one patch (~10-15
  operators at any time). For any operator id present in CN data but not in HellaAPI's
  response, the script adds a minimal entry using CN's own `appellation` field as the display
  name — a pre-romanized name the game data carries even before official localization exists
  (this is also how Sanity Gone displays brand-new operators; some, like `Вий`, are Cyrillic
  by design, not a translation gap). `archetype` is looked up by matching `subProfessionId`
  against an operator HellaAPI already knows; `tags` are translated from CN's `tagList` via a
  small static CN→EN table (recruitment tags are a frozen ~18-value vocabulary, so this doesn't
  need a live source). Filtered to `profession` in the real 8-class set — `character_table.json`
  is a superset that also includes summons, deployable traps, and RIIC assistants
  (`TOKEN`/`TRAP`), which are not operators. `isSpChar` looks like a junk-data flag but isn't —
  it's set on every alter (SilverAsh the Reignfrost, Ch'en the Dawnstreak, ...) as much as on
  test records, so it's not used as a filter. This fetch is supplemental only: if it fails, the
  build logs a warning and continues without it, rather than failing the whole build over ~20
  records.
  Because `fetchOperator()` in `hella-api.ts` treats HellaAPI's `HTTP 200 {}` response (an id
  it knows about but hasn't ingested data for) as not-found, clicking into one of these
  operators shows "Unknown operator" instead of hanging — it just has no detail data yet.
- **arknights.wiki.gg Cargo API** — CN release dates (`Operators` → debut event →
  `EventServerDetails.startTime`). The game data has **no** release-date field, and char-id
  numbers are banded by category (`0xxx` standard, `1xxx` alters, `2xxx` limiteds, `4xxx`
  newer), so they do *not* track release order — sorting by them scatters alters and
  limiteds. Fallbacks: earliest any-server date when an event has no CN row, and a
  surname-swap for JP collab names (`Sakiko Togawa` ↔ `Togawa Sakiko`). CN-supplemented
  operators have no dateable event — too new for the wiki, too new for a gacha banner too
  (`gacha_table.json` has no debut pool for them yet) — but they're known to be newer than
  everything HellaAPI has, so they get the `9999-12-31` sentinel and sort **first**, not
  last, until HellaAPI and the wiki catch up and give them a real date.

After exclusion and supplementing the index holds ~427 operators, ~398 of them dated. The
script hard-fails below 300 dated operators, so a wiki schema change breaks the build instead
of silently shipping a wrong order.

### Operator Cache (`src/shared/cache/operator-cache.ts`)

Module-level in-memory cache with 1-hour TTL, used only by detail views.

```ts
getOperator(id: OperatorId): Promise<Operator>
getRange(id: string): Promise<AttackRange>
clearCache(): void
```

### Types (`src/shared/types/operator.ts`)

Key types: `Operator`, `OperatorData`, `OperatorSummary`, `OperatorSlim`, `OperatorIndexEntry`, `Rarity` (`TIER_1`–`TIER_6`), `Profession` (`PIONEER` = Vanguard in-game, `SUPPORT` = Supporter), `Position`.

`Profession` uses the game's internal enums (`TANK` = Defender, `WARRIOR` = Guard); label maps translate for display.

## Extension Architecture (`src/extension/`)

Single entry point: **`popup/index.ts`**. No background service worker and no content script. The popup renders its grid from the bundled `src/shared/generated/operators.json` — it opens with **zero network requests** — and only calls `getOperator()` when you open a specific operator. State (search text, current view) lives in module-level variables and does not persist across popup close/reopen.

- `popup/index.ts` — search input handling, grid/detail view switching, wires clicks via event delegation on `#view`
- `popup/render.ts` — pure render functions: `renderLoading`, `renderError`, `renderGrid`, `renderDetail`
- `popup/popup.html` — layout + theme (shares the color system used in `src/web/index.html`: profession colors, rarity colors, `.op-card` structure)

## Web SPA (`src/web/`)

Vanilla TS, no framework. Hash-routed two-view app: `#/` shows the operator grid; `#/op/<id>` shows a rich detail dossier (header, lore/tags, per-phase stats table, attack-range grids via `getRange`, skills, talents, potentials, base skills).

Data: the grid reads the bundled operator index through `src/web/operator-index.ts`
(`getOperators` / `filterOps` / `sortOps`) and makes **no network requests** — no fetch, no
localStorage, no loading state. Only the detail view hits the network, via the shared cache
(`getOperator`, `getRange`). The grid defaults to newest-first with a sort dropdown
(release/name/rarity/class) and class/rarity filter chips; operators without a `releaseDate`
sort last in both release directions.

Deployed to GitHub Pages by `.github/workflows/deploy-pages.yml` on every push to `master`, plus a weekly cron rebuild to pick up newly released operators.

## Testing

No test suite. Verification is `npx tsc --noEmit` plus both webpack builds, then manual checks: load `dist/ext/` in Firefox/Chrome and open the toolbar popup, and open `dist/web/index.html` for the SPA. Both grids should render with no network activity; open an operator to exercise the one remaining HellaAPI call.

## Browser Compatibility

- **Firefox** 109+ (MV3), **Chrome** 88+, **Edge** (MV3 compatible)
