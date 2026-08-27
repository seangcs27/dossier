# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Dossier** is an Arknights operator lookup tool with two targets built from a shared codebase:

1. **Browser extension** (Firefox/Chrome, Manifest V3) — operator lookup in a popup
2. **Web SPA** — operator search and detail view, deployable to GitHub Pages

Everything is resolved **at build time**: the operator index, one full detail payload per
operator, every attack range, and the branch icons are all baked into the bundle. At
runtime both targets read same-origin static files; HellaAPI is only touched as a fallback
for an operator id the last build didn't know about.

`TODO.md` is the running backlog — read it before starting feature work; it records what's
blocking each item so you don't re-investigate.

## Build & Development Commands

```bash
npm install          # Install dependencies

npm run dev          # Watch mode — extension only
npm run dev:web      # Watch mode — web SPA only

npm run build        # Production build — both targets
npm run build:ext    # Production build — extension only  → dist/ext/
npm run build:web    # Production build — web SPA only   → dist/web/

npm run build:index  # Regenerate everything under src/shared/generated/ (runs automatically
                     # via prebuild:*/predev:* hooks — rarely needed by hand)

npm run design       # build:web, then regenerate design/components/*.html previews

npm run clean        # Remove ./dist/
```

`build:index` is two scripts: `build:index:operators` (the index, the per-operator detail
payloads, the branch icons) and `build:index:ranges` (`ranges.json`). Both run under
`node --no-network-family-autoselection`.

**Building behind an HTTP proxy** (sandboxes, some corporate networks): the build scripts
fetch with Node's built-in `fetch`, which — unlike `curl` and `git` — **ignores
`HTTPS_PROXY`**. The requests bypass the proxy and come back as an opaque `wiki 403` /
`tree 403` rather than a connection error, which reads like the upstream rejecting you.
Run it as:

```bash
NODE_USE_ENV_PROXY=1 npm run build:index
```

Deliberately not baked into the npm scripts: GitHub Actions has no proxy, where the plain
fetch is correct and the flag would only add an experimental-warning banner to every build.

**Loading the extension:**
- **Firefox**: `about:debugging` → "Load Temporary Add-on" → select `dist/ext/manifest.json`
- **Chrome**: `chrome://extensions` → Developer mode ON → "Load unpacked" → select `dist/ext/`

**Running the web SPA:** Open `dist/web/index.html` in a browser. Detail pages read
`operator-details/<id>.json` relative to the page, so `file://` works.

**Deploying the web SPA:** Push to `master` on GitHub — `.github/workflows/deploy-pages.yml`
builds `dist/web/` and publishes to GitHub Pages at https://seangcs27.github.io/dossier/.
A weekly Sunday cron rebuilds so newly released operators appear without a manual push.
Requires repo Settings → Pages → Source = "GitHub Actions" (one-time).

## Repository Layout

```
scripts/
  build-operator-index.mjs   ← operators.json + operator-details/ + branch-icons/
  build-range-index.mjs      ← ranges.json
  build-design-previews.mjs  ← design/components/*.html (inlines the real compiled CSS)

design/            ← Claude Design mirror; components/ and manifest.json are generated
                     (gitignored), source/ holds the icon artwork
icons/             ← extension + favicon PNGs; 7 Wiš'adel variants per size
docs/              ← local process docs (gitignored)
TODO.md            ← running backlog

src/
  shared/           ← shared by both targets
    api/
      hella-api.ts  ← static-first operator fetch + every image URL helper
    cache/
      operator-cache.ts  ← 1hr TTL in-memory cache; ranges served from the bundle
    generated/      ← ALL gitignored, rebuilt every build
      operators.json          ← slim grid index, bundled into both targets
      operator-details/<id>.json  ← 427 full Operator payloads, copied as static files
      ranges.json             ← every attack range in use (~51), bundled
      branch-icons/<sub>.png  ← self-hosted archetype glyphs, copied as static files
    types/
      operator.ts   ← Operator, OperatorData, Rarity, Profession, Position, …
      index.ts      ← re-export barrel

  styles/           ← SCSS shared by both targets
    _tokens.scss    ← palette maps: surfaces, rarities
    _base.scss      ← :root custom properties, reset, rarity colour modifiers, spin

  extension/        ← MV3 browser extension (popup only)
    popup/
      index.ts      ← search + grid/detail switching; imports the generated index
      render.ts     ← renderLoading / renderError / renderGrid / renderDetail /
                      bindAvatarFallbacks
      popup.scss    ← popup sizing (fixed 380px panel)
      popup.html    ← markup shell; links popup.css
    utils/
      html.ts       ← escHtml

  web/              ← SPA
    index.ts        ← app entry: random logo, hash-router dispatch (grid ↔ detail)
    router.ts       ← hash routing (#/ , #/op/<id>)
    logo.ts         ← picks one of 7 Wiš'adel icon variants per page load
    format.ts       ← escHtml/cleanText, descriptionToHtml, rarity/profession/alter helpers
    icons.ts        ← inline SVG glyphs for the detail page (stats, skill meta, elite ranks)
    operator-index.ts  ← grid data store: getOperators/filterOps/sortOps/subclassesFor/allTags
    styles.scss     ← full-page layout, topbar, chips, grid, detail
    views/
      grid.ts       ← operator grid, live search, filter popover
      detail.ts     ← operator dossier, cloned from Sanity Gone (see below)
    index.html      ← markup shell; links styles.css

  styles.d.ts       ← `declare module '*.scss'` for the side-effect imports
```

## Webpack

Three config files:
- **`webpack.base.js`** — shared TS loader, SCSS loader chain (`MiniCssExtractPlugin.loader` → `css-loader` → `sass-loader`), resolve settings
- **`webpack.ext.js`** — extension entry (popup); copies `manifest.json`, `popup.html`, the four unsuffixed icon sizes, and `operator-details/` → `dist/ext/`
- **`webpack.web.js`** — SPA entry (app); copies `index.html`, all of `icons/`, `operator-details/` and `branch-icons/` → `dist/web/`

`operator-details/` is ~32 MB, so both `dist/` folders are large. That's a known, accepted
trade (see TODO.md, "Extension bundle size").

## Styles

SCSS, compiled by webpack. Each entry point imports its own stylesheet for the build-time
side effect (`import './styles.scss'`), which `MiniCssExtractPlugin` pulls out into a real
`.css` file that the HTML shell `<link>`s — no inline `<style>` blocks, no runtime style
injection.

`src/styles/` holds what both targets render identically: the palette (as Sass maps), the
`:root` custom properties generated from those maps, the reset, the rarity colour
modifiers, and the spinner keyframe. Changing a rarity colour means editing **one map** in
`_tokens.scss`.

**Colour encodes rarity only.** Class is deliberately neutral — eight saturated hues on
every card made the grid read as noise, and neither reference site colour-codes class.
Surfaces follow **Sanity Gone's** `neutral-*` ramp (`bg` #101014 → `chip` #363643). Rarity
tiers 1–5 are their hues (white/green/blue/purple/yellow); **tier 6 is ours — red, not
their orange**, which sat one hue step from 5★ yellow and was hard to tell apart at card
size. Each tier carries a `dark` partner (for gradients) and an `fg` (for filled
backgrounds).

**Operator card structure** (`.op-card`, web):
- Aspect-ratio 1/2, no solid panel. `.op-avatar` is the **portrait** (`yuanyan3060`, a
  180×360 bust crop), falling back `_1` → `_2` → square avatar → `?` placeholder.
- `.op-card-body` carries the cut-corner `clip-path` (`--cut: 14px`) and the hover lift
  (`translateY(-2px)`). The lift lives here, not on the `<a>`, so the rarity tab stays put.
- `.op-overlay` paints a transparent → black gradient over the lower art and holds name,
  alter epithet, class glyph + branch glyph + class label, and `.op-cta` (a 4px bar that
  grows to 32px on hover to become the "View operator" CTA).
- `.op-stars` is a **sibling** of `.op-card-body`, not a child — a folded-corner tab
  appended beside the card's bottom-right, overhanging by `--jut: 16px`. Its height *is*
  the rarity. `.op-card` itself must stay unclipped or the tab gets cut off.

Sizing deliberately stays per-target: the popup is a fixed 380px panel and the SPA is a
full page. `src/web/styles.scss` and `src/extension/popup/popup.scss` each own their layout.

`design/components/*.html` are standalone previews that **inline the real compiled
`dist/web/styles.css`**, so they can't drift from what the app renders. Regenerate with
`npm run design` after changing styles.

## Shared Layer (`src/shared/`)

### hella-api.ts

Static-first. `fetchOperator` tries the baked `operator-details/<id>.json` first; only if
that 404s does it hit HellaAPI's `/operator/:id`, and only if *that* returns `200 {}` (an
id HellaAPI knows but hasn't ingested global data for) does it fall through to
`/cn/operator/:id`, normalising the CN skill shape and swapping `appellation` in for
`data.name`.

```ts
fetchOperator(id): Promise<Operator>       // baked file → /operator → /cn/operator
fetchRange(id): Promise<AttackRange>       // fallback only; ranges.json covers the rest
operatorAvatarUrl(id)                      // square crop      — Arknight-Images CDN
operatorPortraitUrl(id, '1' | '2')         // 180x360 bust     — yuanyan3060 CDN
operatorSkinAvatarUrl(id, suffix)          // per-outfit avatar — Arknight-Images CDN
skillIconUrl(skillId)                      // Arknight-Images CDN
classIconUrl(slug)                         // Arknight-Images CDN, takes the CSS slug
archetypeIconUrl(subProfessionId)          // bundle-relative branch-icons/ — self-hosted
IMAGE_BASE
```

Branch icons are self-hosted because the old source (Aceship's mirror) stopped updating in
2022. Coverage is 71/72 — "Supportive Ranger" has no wiki icon yet, so callers still hide
the `<img>` on error.

### Generated Operator Index (`src/shared/generated/`)

Built by `scripts/build-operator-index.mjs` and `scripts/build-range-index.mjs`,
**gitignored**, regenerated every build.

`operators.json` — one slim entry per operator, bundled into both JS bundles:

```ts
{ id, name, appellation, rarity, profession, subProfessionId, archetype, tags, releaseDate, releaseOrder }
```

`operator-details/<id>.json` — the full `Operator` payload for **every** operator (427),
copied as static files rather than bundled. This is what makes a detail page load from a
same-origin file (~100 ms) instead of a live API call (~2.3 s).

`ranges.json` — every attack range referenced by any operator (~51 unique; operators share
them heavily), a few KB, bundled.

Operators flagged `isNotObtainable` are **dropped** (~28): the `Reserve Operator - *` set
and the Sharp/Pith/Touch/Stormeye/Tulip trainer families, which were never released. The
flag is used rather than a name match because the Integrated Strategies trainer "Mechanist"
(`char_610_acfend`) shares its name with a real 6★ operator, as does "Raidian".

**Seven sources are joined at build time.** Only HellaAPI is load-bearing — its failure
stops the build; every other fetch degrades with a `console.warn`. Every request goes
through a 20 s timeout (a stalled connection on a shared runner hung the build for 15+
minutes, twice, before this).

- **HellaAPI** (`awedtan.ca/api`) — primary operator identity via a slim `?include=` query,
  plus the per-operator detail payloads.
- **raw CN game data** (`Kengxxiao/ArknightsGameData`, `zh_CN/.../character_table.json`) —
  supplements HellaAPI, which lags the CN release frontier by roughly one patch (~10–15
  operators). For any id in CN data but not in HellaAPI's response, a minimal entry is
  added using CN's own `appellation` (a pre-romanized name the game data carries before
  official localization — this is how Sanity Gone displays brand-new operators too; some,
  like `Вий`, are Cyrillic by design, not a translation gap). `archetype` is looked up by
  matching `subProfessionId` against an operator HellaAPI already knows; `tags` come from a
  static CN→EN table (recruitment tags are a frozen ~18-value vocabulary). Filtered to the
  real 8-class set — `character_table.json` also includes summons, traps and RIIC
  assistants (`TOKEN`/`TRAP`). `isSpChar` looks like a junk-data flag but isn't — it's set
  on every alter as much as on test records, so it is not used as a filter.
- **arknights.wiki.gg Cargo API** — CN release dates (`Operators` → debut event →
  `EventServerDetails.startTime`), plus trait text for CN-supplement operators. The game
  data has **no** release-date field, and char-id numbers are banded by category (`0xxx`
  standard, `1xxx` alters, `2xxx` limiteds, `4xxx` newer), so they do *not* track release
  order. Fallbacks: earliest any-server date; a surname swap for JP collab names
  (`Sakiko Togawa` ↔ `Togawa Sakiko`); and a fuzzy prefix match against known event names
  when `Operators.event` is blank but `obtain`'s wikitext links a real place.
  CN-supplemented operators have no dateable event yet, but are known to be newer than
  everything HellaAPI has, so they get the `9999-12-31` sentinel and sort **first**.
- **sanitygone.help** — `releaseOrder`, a PRTS-scraped ordinal baked into Sanity Gone's own
  bundle. Near-universal coverage and verified accurate, including for operators the wiki
  can't date at all, so it's the **preferred** sort signal at runtime; `releaseDate` is the
  fallback, not the reverse. The asset URL is content-hashed and changes on every deploy,
  so it's discovered live by chasing page → `OperatorList.[hash].js` →
  `operators-index.json.[hash].js` rather than hardcoded.
- **PuppiizSunniiz/AN-EN-Tags** — community translations applied to CN-only operators'
  baked payloads: `tl-skills.json` / `tl-talents.json` (Ace), `puppiiz/riic_data.json`
  (RIIC buffs, keyed by `buffId`), `tl-potential.json` (a keyword substitution table —
  potential descriptions are templated strings from a closed vocabulary, not prose).
- **PuppiizSunniiz/Arknight-Images** — the character-art tree, read at build time to know
  which outfit illustrations actually exist before listing them in `arts`.
- **yuanyan3060/ArknightsGameResource** — 180×360 bust portraits, the card art.

The script hard-fails below **300** genuinely-dated operators (the `9999-12-31` sentinel
doesn't count toward it), so a wiki schema change breaks the build instead of silently
shipping a wrong order. Current state: ~427 operators, ~399 with a real CN date, ~426 with
a Sanity Gone `releaseOrder`.

### Operator Cache (`src/shared/cache/operator-cache.ts`)

Module-level in-memory cache with 1-hour TTL. `getRange` checks the bundled `ranges.json`
first and only caches what it had to fetch live.

```ts
getOperator(id): Promise<Operator>
getRange(id): Promise<AttackRange>
clearCache(): void
```

### Types (`src/shared/types/operator.ts`)

Key types: `Operator`, `OperatorData`, `OperatorSummary`, `OperatorSlim`,
`OperatorIndexEntry`, `OperatorArt`, `Rarity` (`TIER_1`–`TIER_6`), `Profession`
(`PIONEER` = Vanguard in-game, `SUPPORT` = Supporter), `Position`.

`Profession` uses the game's internal enums (`TANK` = Defender, `WARRIOR` = Guard); label
maps in `src/web/format.ts` translate for display.

## Extension Architecture (`src/extension/`)

Single entry point: **`popup/index.ts`**. No background service worker and no content
script. The popup renders its grid from the bundled `operators.json` — it opens with
**zero network requests** — sorted rarity-desc then name, and filters on name/appellation.
Opening an operator calls `getOperator()`, which reads the copied
`operator-details/<id>.json`. State (search text, current view) lives in module-level
variables and does not persist across popup close/reopen.

- `popup/index.ts` — search input, grid/detail switching, click delegation on `#view`
- `popup/render.ts` — pure render functions plus `bindAvatarFallbacks`
- `popup/popup.html` — layout shell; links `popup.css`

## Web SPA (`src/web/`)

Vanilla TS, no framework. Hash-routed two-view app: `#/` shows the operator grid;
`#/op/<id>` shows the operator dossier.

### Grid (`src/web/views/grid.ts`)

Reads the bundled index through `src/web/operator-index.ts` and makes **no network requests
for data** (only images). Topbar carries live search and a sort dropdown
(release/name/rarity/class, default newest-first); class and rarity chips plus a "More"
popover holding single-select branch and multi-select recruitment tags with an any/all
mode. Click-away closes the popover. Operators without a `releaseDate` sort last in both
release directions.

### Detail view (`src/web/views/detail.ts`)

A deliberate clone of **Sanity Gone's** operator page (`sanitygone.help`) — layout, control
set and information architecture all follow theirs, so read
[SanityGoneAK/sanity-gone](https://github.com/SanityGoneAK/sanity-gone)
(`src/components/operator/`) before changing the shape of this page:

- **Page** — the selected artwork fills a fixed background at low opacity, faded into
  `--bg`. Art column left (breadcrumb, splash, a vertical skin-thumbnail rail overlaying
  the art, illustrator caption); a fixed data panel right, collapsing to one column below
  1200px.
- **Skin rail** — renders each outfit's **55 KB square avatar**, not its illustration.
  Pointing 64px thumbnails at full art meant SilverAsh pulled 16.4 MB before the page
  settled; avatars put that at ~2.9 MB. A missing avatar falls back to the illustration.
- **Panel** — rarity-tinted strip with stars, then avatar + serif operator name (the alter
  epithet in `--dim`) + class / branch / melee-ranged row. The branch name carries the
  class trait as its `title` tooltip.
- **Tabs** — Attributes, Talents, Skills, Modules, RIIC, Misc. Every panel opens with its
  own controls above a rule. **Elite and potential are shared state across panels**, unlike
  the reference, which resets them per tab.
- **Attributes** — elite button group, level slider + typed input, module checkbox/pills,
  trust checkbox + 0–200 input, potential dropdown; the trust bonus scales by
  `min(trust, 100) / 100`. Stats render as a two-column `dl` with a centre rule.
- **Skills** — skill pills + a 1–10 rank slider labelled `1…7, M1–M3`, an SP-cost /
  initial-SP / duration row, the description, and the skill's range overlaid on the
  operator's (added cells blue, removed cells red).

Descriptions are rendered by `descriptionToHtml` in `format.ts`, not `cleanText`: the game
data is a markup language (`<@ba.vup>+{atk:0%}</>`), so tags become styled spans and
`{placeholders}` are interpolated from the entry's own `blackboard`. An unresolvable key
renders as the raw token rather than vanishing.

Not cloned, for lack of data: promotion/mastery **material costs** (`evolveCost` and module
`itemCost` are in the payloads, but there are no item names or icons yet), **summon/token**
stat blocks, the reference's handbook-driven Misc tab (HellaAPI exposes no handbook; ours
shows tags, trait, archive blurb, obtain source, the potential ladder and a fact list), and
outfit prices. `src/web/icons.ts` draws the stat/skill/elite glyphs inline rather than
fetching them.

## Testing

No test suite. Verification is `npx tsc --noEmit` plus both webpack builds, then manual
checks: load `dist/ext/` in Firefox/Chrome and open the toolbar popup, and open
`dist/web/index.html` for the SPA. Both grids should render with no data requests. After a
style change, run `npm run design` and check `design/components/*.html`.

Visual changes are reviewed by the author personally — say what you changed and where to
look, don't just assert it works.

## Browser Compatibility

- **Firefox** 109+ (MV3), **Chrome** 88+, **Edge** (MV3 compatible)
