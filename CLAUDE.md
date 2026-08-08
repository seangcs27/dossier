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

**Building behind an HTTP proxy** (sandboxes, some corporate networks): `build:index` fetches
with Node's built-in `fetch`, which — unlike `curl` and `git` — **ignores `HTTPS_PROXY`**. The
requests bypass the proxy and come back as an opaque `wiki 403` / `tree 403` rather than a
connection error, which reads like the upstream rejecting you. Run it as:

```bash
NODE_USE_ENV_PROXY=1 npm run build:index
```

Deliberately not baked into the npm scripts: GitHub Actions has no proxy, where the plain
fetch is correct and the flag would only add an experimental-warning banner to every build.

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
    format.ts       ← escHtml/cleanText, descriptionToHtml, rarity + profession helpers
    icons.ts        ← inline SVG glyphs for the detail page (stats, skill meta, elite ranks)
    operator-index.ts  ← grid data store over the generated index: sort/filter helpers
    styles.scss     ← full-page layout, topbar, chips, grid, detail
    views/
      grid.ts       ← operator grid + live search; cards link to #/op/<id>
      detail.ts     ← operator dossier, cloned from Sanity Gone (see below)
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
rules, the card's rarity bar, and the SPA's filter-chip colours are all generated from it.

The palette follows **Sanity Gone's**: their `neutral-*` ramp for surfaces (`bg` #101014 →
`chip` #363643) and their six rarity hues (1 white, 2 green, 3 blue, 4 purple, 5 yellow,
6 orange). Each rarity carries a `dark` partner as well as its `color`, because the card's
bottom accent bar and the detail header's tint are both gradients between the two.

**Operator cards carry no solid panel.** The card is a fixed-height box (280px on the web,
3:4 in the popup) with the illustration filling it edge to edge and one absolutely
positioned `.op-overlay` on top. The overlay paints a
`transparent 40% → rgb(5 5 7 / 67%) 67% → #1c1c1c 100%` vertical gradient and holds the
name, class and rarity, so the text sits over art that has already faded to black rather
than on a grey shelf below it. The rarity bar at the bottom doubles as the hover
"View operator" CTA (4px → 32px). This is exactly how Sanity Gone builds theirs.

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
{ id, name, appellation, rarity, profession, subProfessionId, archetype, tags, releaseDate, releaseOrder }
```

`archetype` is the readable subclass name (`splashcaster` → `Splash Caster`) and `tags` are
the recruitment tags, both used by the grid's filter panel.

Operators flagged `isNotObtainable` are **dropped** (~28): the `Reserve Operator - *` set and
the Sharp/Pith/Touch/Stormeye/Tulip trainer families, which were never released. The flag is
used rather than a name match because the Integrated Strategies trainer "Mechanist"
(`char_610_acfend`) shares its name with a real 6★ operator, as does "Raidian".

Four sources are joined at build time:

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
  HellaAPI's plain `/operator/:id` returns `HTTP 200 {}` for an id it knows about but hasn't
  ingested *global* (translated) data for yet — these same recently-added CN operators.
  `fetchOperator()` in `hella-api.ts` falls back to HellaAPI's separate `/cn/operator/:id` in
  that case, which carries the same shape straight from CN game data: skills, talents,
  modules, bases, attributes are all present, just untranslated (Chinese prose). `data.name`
  is swapped for `data.appellation` (already English, the same field the build script uses
  above) so the header/breadcrumb still show the right name. Only a genuinely-unknown id (or
  one CN doesn't have either) falls through to "Unknown operator".
- **arknights.wiki.gg Cargo API** — CN release dates (`Operators` → debut event →
  `EventServerDetails.startTime`). The game data has **no** release-date field, and char-id
  numbers are banded by category (`0xxx` standard, `1xxx` alters, `2xxx` limiteds, `4xxx`
  newer), so they do *not* track release order — sorting by them scatters alters and
  limiteds. Fallbacks: earliest any-server date when an event has no CN row; a surname-swap
  for JP collab names (`Sakiko Togawa` ↔ `Togawa Sakiko`); and, when `Operators.event` itself
  is blank but `obtain`'s wikitext links a real place (confirmed for "Raidian" → `[[Sui's
  Garden of Grotesqueries]]`), a fuzzy prefix match against known event names, since the
  linked text doesn't always exactly match the full event name in `EventServerDetails`.
  CN-supplemented operators have no dateable event — too new for the wiki, too new for a
  gacha banner too (`gacha_table.json` has no debut pool for them yet) — but they're known to
  be newer than everything HellaAPI has, so they get the `9999-12-31` sentinel and sort
  **first**, not last, until HellaAPI and the wiki catch up and give them a real date.
- **sanitygone.help** — `releaseOrder`, a PRTS-scraped release ordinal baked into Sanity
  Gone's own bundle (their build draws on a wider set of CN/EN/JP/KR/TW tables plus an actual
  PRTS scrape, which this project doesn't replicate). Near-universal coverage and verified
  accurate — including for operators arknights.wiki.gg can't date at all — so it's the
  **preferred** sort signal at runtime; `releaseDate` above is the fallback, not the reverse.
  The asset URL is content-hashed and changes on every Sanity Gone deploy, so it's discovered
  live by chasing the reference chain from their operators page (page →
  `OperatorList.[hash].js` → `operators-index.json.[hash].js`) instead of hardcoded.
  Supplemental only, same as the CN game data fetch: a change to Sanity Gone's build output
  shape logs a warning and the index falls back to `releaseDate`-only ordering, rather than
  failing the build.

After exclusion and supplementing the index holds ~427 operators: ~399 with a real CN release
date, ~426 with a Sanity Gone `releaseOrder`. The script hard-fails below 300 dated operators,
so a wiki schema change breaks the build instead of silently shipping a wrong order.

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

Vanilla TS, no framework. Hash-routed two-view app: `#/` shows the operator grid; `#/op/<id>` shows the operator dossier.

### Detail view (`src/web/views/detail.ts`)

A deliberate clone of **Sanity Gone's** operator page (`sanitygone.help`) — layout,
control set and information architecture all follow theirs, so read
[SanityGoneAK/sanity-gone](https://github.com/SanityGoneAK/sanity-gone) (`src/components/operator/`)
before changing the shape of this page:

- **Page** — the selected artwork fills a fixed background at 7.5% opacity, faded into
  `--bg` by a gradient. Art column left (sticky, with a vertical skin-thumbnail rail
  overlaying the top-left of the art and an illustrator caption bottom-left); a
  fixed 590px data panel right, collapsing to one column below 1200px.
- **Panel** — rarity-tinted strip with stars, then a 72px avatar + serif operator name
  (the alter epithet in `--dim`) + class / branch / melee-ranged row. The branch name
  carries the class trait as its `title` tooltip.
- **Tabs** — Attributes, Talents, Skills, Modules, RIIC, Misc. Every panel opens with its
  own controls above a rule. **Elite and potential are shared state across panels**, unlike
  the reference, which resets them per tab.
- **Attributes** — elite button group, level slider + round typed input, module
  checkbox/pills, trust checkbox + 0–200 input, potential dropdown; the trust bonus scales
  by `min(trust, 100) / 100`. Stats render as a two-column `dl` with a centre rule.
- **Skills** — skill pills + a 1–10 rank slider labelled `1…7, M1–M3`, skill header, an
  SP-cost / initial-SP / duration row, the description, and the skill's range overlaid on
  the operator's (added cells blue, removed cells red).

Descriptions are rendered by `descriptionToHtml` in `format.ts`, not `cleanText`: the game
data is a markup language (`<@ba.vup>+{atk:0%}</>`), so tags become styled spans and
`{placeholders}` are interpolated from the entry's own `blackboard`. An unresolvable key
renders as the raw token rather than vanishing — that only happens when an entry ships
without its blackboard.

Not cloned, for lack of data: promotion/mastery **material costs** (the API gives item ids
but no names or icons), **summon/token** stat blocks, the reference's handbook-driven Misc
tab (profile, physical exam, voice actor — HellaAPI exposes no handbook; ours shows tags,
trait, archive blurb, obtain source, the potential ladder and a fact list instead), and
outfit prices. `src/web/icons.ts` draws the stat/skill/elite glyphs inline rather than
fetching them, so the detail page adds no image requests beyond artwork and skill icons.

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
