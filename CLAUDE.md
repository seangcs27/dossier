# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Dossier** is an Arknights operator lookup tool with two targets built from a shared codebase:

1. **Browser extension** (Firefox/Chrome, Manifest V3) — operator lookup in a popup
2. **Web SPA** — operator search and detail view, deployable to GitHub Pages

Everything is resolved **at build time**: the operator index, one full detail payload per
operator, every attack range, and the branch icons are all baked into the bundle. At
runtime both targets read same-origin static files and nothing else — there is no API behind
them, so an operator the last build didn't know about waits for the next rebuild.

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
  build-operator-index.mjs   ← operators.json + operator-details/ + branch-icons/ + portraits/
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
      operator-details/<id>.json  ← 431 full Operator payloads, copied as static files
      ranges.json             ← every attack range in use (~57), bundled
      branch-icons/<sub>.png  ← self-hosted archetype glyphs, copied as static files
      portraits/<id>.webp     ← card art, re-encoded from PNG at build, copied as static files
      faction-logos/<id>.webp ← one badge per faction (45): the nation on the card back
                                (the team for the 28 with no nation), the most specific
                                faction in the detail header
      items.json              ← name/icon/rarity of the ~90 materials any payload prices, bundled
      item-icons/<iconId>.webp  ← those materials' icons at 96px, copied as static files
      elite-icons/<0-2>.webp    ← the game's elite badges, 40px, painted as CSS masks
      potential-icons/<1-6>.webp  ← the game's potential rank badges, 48px, full colour
      game-consts.json        ← keyword glossary + promotion LMD, from gamedata_const, bundled
    types/
      operator.ts   ← Operator, OperatorData, Rarity, Profession, Position, …
      index.ts      ← re-export barrel

  styles/           ← SCSS shared by both targets
    _tokens.scss    ← palette maps + type / spacing / radius scales
    _base.scss      ← :root custom properties (colour + scale tokens), reset, rarity
                      colour modifiers, spin

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
    logo.ts         ← picks one of 7 Wiš'adel icon variants per page load, and again on hover
    tooltip.ts      ← the one floating tooltip behind every [data-tip] (keyword definitions)
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
- **`webpack.web.js`** — SPA entry (app); copies `index.html`, all of `icons/`, `operator-details/`, `branch-icons/`, `portraits/`, `item-icons/`, `elite-icons/` and `potential-icons/` → `dist/web/`

`operator-details/` is ~32 MB, so both `dist/` folders are large. That's a known, accepted
trade (see TODO.md, "Extension bundle size").

## Styles

SCSS, compiled by webpack. Each entry point imports its own stylesheet for the build-time
side effect (`import './styles.scss'`), which `MiniCssExtractPlugin` pulls out into a real
`.css` file that the HTML shell `<link>`s — no inline `<style>` blocks, no runtime style
injection.

`src/styles/` holds what both targets render identically: the palette and the type /
spacing / radius scales (as Sass maps), the `:root` custom properties generated from them,
the reset, the rarity colour modifiers, and the spinner keyframe. Changing a rarity colour
means editing **one map** in `_tokens.scss`.

The scales emit `--fs-*` (11 steps, 10→36px), `--sp-*` (9 steps, named by value — `--sp-8`
is 8px), and `--radius-*` (6 steps). They were read off the shipped stylesheet rather than
imposed on it, so adopting them moved no pixels. **Off-scale values stay literal on
purpose** — `.op-stars`' `11px 6px 7px` is tuned against its 13px clip-path fold, not to a
rhythm — and an exception written as an exception is the point. `src/web/styles.scss` is
fully on the scales; `src/extension/popup/popup.scss` is not yet.

**Colour encodes rarity only.** Class is deliberately neutral — eight saturated hues on
every card made the grid read as noise, and neither reference site colour-codes class.
Surfaces are mineral blue and gold leaf, from five named pigments (石青沉 #1A3550, 石青
#2D5A7C, 群青 #3A6BAA, 金藍 #7C9CC0, 泥金箔 #E8C870 — `_tokens.scss` says which role gets
which). A few colours in `styles.scss` / `popup.scss` are literal copies of these (tab fills,
card back, overlay gradients) and have to move with the map. Rarity
tiers 1–5 are Sanity Gone's hues (white/green/blue/purple/yellow); **tier 6 is ours — red, not
their orange**, which sat one hue step from 5★ yellow and was hard to tell apart at card
size. Each tier carries a `dark` partner (for gradients) and an `fg` (for filled
backgrounds).

**Operator card structure** (`.op-card`, web):
- Aspect-ratio 1/2, no solid panel. `.op-avatar` is the **portrait** (`yuanyan3060`, a
  180×360 bust crop), served as the baked `portraits/<id>.webp` and falling back to the
  CDN's `_1` → `_2` → square avatar → `?` placeholder.
- `.op-card-body` is a plain rectangle — `overflow: hidden`, no corner treatment. The
  hover lift (`translateY(-2px)`) sits on the `<a>`, so card and rarity tab travel
  together as one object.
- `.op-overlay` paints a transparent → black gradient over the lower art and holds name,
  alter epithet, class glyph + class label, the branch line (`.op-serial`: branch glyph +
  branch name, so each glyph sits beside the name it stands for), and `.op-cta` (a 4px bar that
  grows to 32px on hover to become the "View operator" CTA).
- `.op-stars` is a **sibling** of `.op-card-body`, not a child — a folded-corner tab
  at `left: 100%`, abutting the card's right edge with no overlap and extending into the
  24px column gutter. Its height *is* the rarity. `.op-card` itself must stay unclipped
  or the tab gets cut off.
- `.op-info` holds a **40px** right inset, which is composition rather than clearance
  (the tab no longer overlaps). It couples the card to `#grid`'s **148px** column floor:
  below a 148px column the class label elides, so the two numbers move together.

The card follows the "Web SPA Recreation Complete" Claude Design canvas rather than the
older `Dossier Design System` project, which predates the current UI. Neither is
authoritative on its own — the shipped CSS is.

Sizing deliberately stays per-target: the popup is a fixed 380px panel and the SPA is a
full page. `src/web/styles.scss` and `src/extension/popup/popup.scss` each own their layout.

`design/components/*.html` are standalone previews that **inline the real compiled
`dist/web/styles.css`**, so they can't drift from what the app renders. Regenerate with
`npm run design` after changing styles.

## Shared Layer (`src/shared/`)

### hella-api.ts

Static only. `fetchOperator` reads the baked `operator-details/<id>.json` and throws if it
isn't there — no API sits behind it. The module name is historical; what is left beside that
one read is the image URL helpers.

```ts
fetchOperator(id): Promise<Operator>       // baked file, same origin; throws if absent
operatorAvatarUrl(id)                      // square crop      — Arknight-Images CDN
operatorPortraitUrl(id, '1' | '2')         // 180x360 bust     — yuanyan3060 CDN
operatorPortraitLocalUrl(id)               // the same bust, bundle-relative portraits/ WebP
factionLogoUrl(nationId)                   // bundle-relative faction-logos/ — a mask; takes any faction id
artUrl(rawUrl, width, quality?)            // full illustration, resized through wsrv.nl
operatorSkinAvatarUrl(id, suffix)          // per-outfit avatar — Arknight-Images CDN
itemIconUrl(iconId)                        // bundle-relative item-icons/ — keyed by iconId, not item id
eliteIconUrl(phase)                        // bundle-relative elite-icons/ — a mask, see eliteIcon()
potentialIconUrl(rank)                     // bundle-relative potential-icons/ — full colour, never masked
skillIconUrl(skillId)                      // Arknight-Images CDN
moduleTypeIconUrl(typeIcon)                // module type badge ('gua-y') — Arknight-Images CDN
riicSkillIconUrl(skillIcon)                // base skill badge ('bskill_ws_nian') — Arknight-Images CDN
moduleImageUrl(uniEquipId)                 // module illustration — Arknight-Images CDN, ~300 KB, pass through artUrl
classIconUrl(slug)                         // Arknight-Images CDN, takes the CSS slug
archetypeIconUrl(subProfessionId)          // bundle-relative branch-icons/ — self-hosted
IMAGE_BASE
```

Branch icons are self-hosted because the old source (Aceship's mirror) stopped updating in
2022. Coverage is 72/72. The wiki's `Category:Branch icons` isn't exhaustive — "Supportive
Ranger Supporter.png" was never filed under it — so a branch the listing misses is fetched by
filename; callers still hide the `<img>` on error for anything the build couldn't get.

### Generated Operator Index (`src/shared/generated/`)

Built by `scripts/build-operator-index.mjs` and `scripts/build-range-index.mjs`,
**gitignored**, regenerated every build.

`operators.json` — one slim entry per operator, bundled into both JS bundles:

```ts
{ id, name, appellation, rarity, profession, subProfessionId, archetype, tags, releaseDate, releaseOrder, nation, nationId, faction, factionId, collab, cnOnly? }
```

`operator-details/<id>.json` — the full `Operator` payload for **every** operator (431),
copied as static files rather than bundled. This is what makes a detail page load from a
same-origin file (~100 ms) instead of a live API call (~2.3 s).

`ranges.json` — every attack range referenced by any operator, skill or talent (~57 unique; operators share
them heavily), a few KB, bundled.

Operators flagged `isNotObtainable` are **dropped** (~28): the `Reserve Operator - *` set
and the Sharp/Pith/Touch/Stormeye/Tulip trainer families, which were never released. The
flag is used rather than a name match because the Integrated Strategies trainer "Mechanist"
(`char_610_acfend`) shares its name with a real 6★ operator, as does "Raidian".

**Seven sources are joined at build time.** Only the game's own excel tables are load-bearing
— every other fetch degrades with a `console.warn`. When those tables are unreachable, both index
scripts keep the previous build's `src/shared/generated/` and exit 0 rather than failing or
overwriting it with an empty bundle; CI restores that data from the last run's cache (see
`.github/workflows/deploy-pages.yml`). With nothing on disk to keep, the build still
fails — an empty bundle is worse than a red run. Every request goes
through a 20 s timeout (a stalled connection on a shared runner hung the build for 15+
minutes, twice, before this).

- **`ArknightsAssets/ArknightsGamedata`** — the game's own excel tables (`en/gamedata/excel/`),
  joined by `scripts/lib/build-payload.mjs` into the same `Operator` payload the app has
  always read: `character_table` (plus `char_patch_table`, which is where Amiya's Guard and
  Medic forms live), `skill_table`, `uniequip_table` + `battle_equip_table`, `building_data`,
  `handbook_team_table`, `range_table`, `skin_table`, and `handbook_info_table` for the Misc
  tab's files (the one of these that isn't load-bearing: without it operators ship with no
  files). Two more feed the detail page's costs
  and tooltips rather than the payload — `item_table` (→ `items.json` + `item-icons/`) and
  `gamedata_const` (→ `game-consts.json`); both are non-load-bearing, and on failure keep the
  last build's file or write an empty one so the bundle still builds. This replaced HellaAPI (`awedtan.ca`), a
  single self-hosted server whose certificate expired in September 2026 and blocked every
  deploy until the migration landed.
- **raw CN game data** (the same repo's `cn/gamedata/excel/character_table.json`) —
  supplements the EN tables, which lag the CN release frontier by roughly one patch (~10–15
  operators). For any id in CN data but not in the EN tables, a minimal entry is
  added using CN's own `appellation` (a pre-romanized name the game data carries before
  official localization — this is how Sanity Gone displays brand-new operators too; some,
  like `Вий`, are Cyrillic by design, not a translation gap). `archetype` is looked up by
  matching `subProfessionId` against an operator the EN tables already name, falling back to the
  wiki's `Operators.branch` when none shares it (Supportive Ranger); `tags` come from a
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
  everything the EN tables carry, so they get the `9999-12-31` sentinel and sort **first**.

  The same wiki is where a CN-only operator's **English text** comes from: its page spells
  out every talent (per elite and potential), every skill rank and each module stage in
  templates, as unofficial translations. `fetchWikiPages` takes all of them in a handful of
  batched requests — the wiki answers a page-by-page crawl with a 429 after about a dozen —
  `scripts/lib/wiki-text.mjs` parses them and converts wiki markup to the game's, and
  `applyWikiText` fills in only what is still Chinese, and only on an exact elite/potential
  match. Pages are matched by the game id in the infobox, not the name ("Viy" is Вий). The
  handbook comes from two more places on the same wiki: the `OperatorFiles` table answers
  Basic Info and the Physical Exam line by line, and each operator's `/File` subpage holds
  the prose files — in English only where someone has translated them (Aphrissa in full, a
  Profile here and there), in Chinese otherwise. These operators carry `cnOnly` in the index
  and the payload: a "CN only" tag in the detail header and a filter chip in the grid.

  **No source has it**, so it is still Chinese: base-skill *names* for these operators (the
  wiki's `BaseSkills` table has 1 of their 41, and its own page prints "Unknown base skill";
  AN-EN-Tags translates the descriptions but not the names), a module's talent text at a
  raised potential, module flavour text, most archive files, and missions on a few pages.
- **sanitygone.help** — `releaseOrder`, a PRTS-scraped ordinal baked into Sanity Gone's own
  bundle. Near-universal coverage and verified accurate, including for operators the wiki
  can't date at all, so it's the **preferred** sort signal at runtime; `releaseDate` is the
  fallback, not the reverse. The asset URL is content-hashed and changes on every deploy,
  so it's discovered live by chasing page → `OperatorList.[hash].js` →
  `operators-index.json.[hash].js` rather than hardcoded.
- **PuppiizSunniiz/AN-EN-Tags** — community translations applied to CN-only operators'
  baked payloads: `tl-skills.json` / `tl-talents.json` (Ace), `puppiiz/riic_data.json`
  (RIIC buffs, keyed by `buffId`), `tl-potential.json` (a keyword substitution table —
  potential descriptions are templated strings from a closed vocabulary, not prose). The
  two Ace files stopped being updated in April 2026, so they cover no operator released
  since; the wiki pages above do.
- **PuppiizSunniiz/Arknight-Images** — the character-art tree, read at build time to know
  which outfit illustrations actually exist before listing them in `arts`.
- **yuanyan3060/ArknightsGameResource** — 180×360 bust portraits, the card art. Downloaded
  and re-encoded to WebP q80 with `sharp` (117 KB PNG → ~20 KB), because the win is latency:
  each portrait is wanted by one card, so it is almost always a cold CDN miss (~800–1200 ms
  against ~30 ms same-origin). Existing files are kept, not refetched — CI restores them from
  the generated-data cache — so upstream re-drawing a portrait never reaches us; delete
  `portraits/` to force a refresh.

The script hard-fails below **300** genuinely-dated operators (the `9999-12-31` sentinel
doesn't count toward it), so a wiki schema change breaks the build instead of silently
shipping a wrong order. Current state: ~431 operators, ~401 with a real CN date, ~430 with
a Sanity Gone `releaseOrder`.

### Operator Cache (`src/shared/cache/operator-cache.ts`)

Module-level in-memory cache with a 1-hour TTL, for `getOperator` only. `getRange` has no
cache of its own — it reads straight from the bundled `ranges.json` and throws if the id
isn't there; there's no live fallback left to cache the result of.

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
for data** (only images). Cards are built 48 at a time as the page nears the end of what
exists: all ~430 at once was ~550 ms of paint and layerize before first paint, and held
back every portrait request until it finished. The topbar's search box (260px) and a Filters button form one cluster
on the left, beside the wordmark. The box's magnifier is its clear button: it turns into a
cross once there is text, and pressing it empties the box. The result count beside them is a
pill of the same shape. The Filters button opens a popover, anchored under the cluster, that
closes on the toggle, its own close button (in a sticky head row), Escape, or a press
anywhere outside it.

Inside the popover: class tiles (glyph over name, four across); Archetype / Subclass tiles in
the same style, grouped under a header per picked class and shown only once a class is picked
— multi-select, where a picked branch narrows only its own class (Caster + Supporter + Mech-accord
Caster is every Supporter plus the Mech-accord Casters), and a branch that would yield nothing
under the other filters dims; a six-segment rarity group tinted by rarity; collab
chips; a Server chip, "Not on Global yet", for the CN-only operators; and an Advanced options disclosure holding Sort (Release order / Name — clicking the
active one reverses it) and multi-select recruitment tags with an any/all mode.
`renderMore()` rebuilds the panel on every change and restores focus to the equivalent
control afterwards. Operators without a `releaseDate` sort last in both release directions.

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
- **Panel** — rarity-tinted strip with stars, then faction badge + serif operator name (the
  alter epithet in `--dim`) + class / branch / position row. The badge is the operator's most
  specific faction (team, else group, else nation), painted as a luminance mask in the rarity
  colour; the game files the Rhodes Island badge under three collab ids (`sees`, `mujica`,
  `laios`), so only Team Rainbow has a logo of its own. **LIMITED** sits hard right on the
  name's row, for the 26 operators the CN gacha table's LIMITED pools name plus every collab
  operator (27; they come from LINKAGE pools, which that table doesn't flag). The branch name carries the
  class trait as its `title` tooltip. Position is Melee, Ranged, or — the reference's rule —
  Melee & Ranged when the trait says the operator "can be deployed on ranged" tiles.
- **Tabs** — Attributes, Talents, Skills, Modules, RIIC, Misc. Every panel opens with its
  own controls above a rule. **Elite and potential are shared state across panels**, unlike
  the reference, which resets them per tab.
- **Attributes** — elite button group, level slider + typed input, module checkbox/pills,
  trust checkbox + 0–200 input, and a potential menu of the game's rank badges with no words
  (a menu button, since a native `<select>` can't show images). Like the reference it offers
  Potential 1 plus only the ranks that change a stat shown here — Makoto Yuki gets 1, 2, 4, 6.
  The trust bonus scales by
  `min(trust, 100) / 100`. Attack speed from potentials and modules shortens the attack
  interval as the game does, `interval × 100 / (100 + ASPD)`, without the reference's
  rounding to a 30 fps frame (so Kal'tsit's PHY-Y reads 2.66 sec where it reads 2.67). Stats render as a two-column `dl` with a centre rule, then what
  promoting into the selected elite costs: LMD (from `gamedata_const.evolveGoldCost`, which
  the phase's own `evolveCost` leaves out) followed by the materials.
- **Talents** — elite button group and the same potential badge menu, here offering
  Potential 1 plus the ranks that change a talent unlocked at or below the selected elite
  (Makoto Yuki: 1, 3, 5). One live version per talent — the strongest the elite and potential
  unlock — under its unlock elite's badge and a serif name. A talent with a range of its own
  (28 operators) shows it under the description, overlaid on the operator's only when the
  talent replaces it (`talent_override_rangeid_flag`: Tomimi, Bena, Specter the Unchained).
  CN-only operators' talents stay in Chinese where AN-EN-Tags has no translation; the
  reference shows the same.
- **Skills** — skill pills + a 1–10 rank slider with a field you can type into (`5`, or `M2`
  in either case), both blue where the level's are gold, as in the reference. Then the skill
  header (trigger type and SP recovery type, coloured per type), an SP-cost / initial-SP /
  duration row, the description, the skill's range overlaid on the operator's (added cells
  blue, removed cells red), and what reaching the selected rank takes: its elite/level
  requirement (omitted at Elite 0 Lv1, as the reference does), for M1–M3 the training time —
  ours, the reference has none — and the materials. The recovery label is the game's "Auto"
  where the reference says "Per Second".
- **Modules** — module pills, stage pills and the potential badge menu (the ranks the stage's
  changes are written for). The game's type badge, the module's name and code; its stat
  changes as glyph / name / value rows, two or three across; what the stage does to the trait
  ("Trait (Added)" for an extra line, "(Updated)" for a rewrite) and to the talents ("Talent N
  (Updated)", "New Talent (Added)"), each the strongest candidate the potential unlocks, with
  what it changes marked in value-up blue — `markChanges` in `format.ts`, a word
  diff (the game data carries no such markup itself). A toggle on the name's row picks what
  it is a change from: **vs no module**, the operator's own trait or talent at Elite 2 and the
  same potential, where an added line is all marked; or **vs prev. stage**, the same effect
  one stage down, which marks only what this stage moved (stage 1 has no previous stage, so
  the toggle is disabled there); the
  module's illustration (resized through `artUrl`, the upstream PNG is ~300 KB); what
  unlocking or reaching the stage costs; the unlock missions; and the flavour text in a
  collapsed `<details>`, since it can spoil the story.
- **RIIC** — elite button group (only the elites some base skill unlocks at), then one live
  stage per base skill: its badge, serif name, an unlock badge when it needs more than Lv1,
  and the description. Stages are grouped by `bases[].slot`, the game's own `buffChar` entry,
  because an upgrade is often renamed outright ("Penguin Logistics α" into "Logistics
  Expert"); matching on the name is only a fallback for a payload baked without the slot.
- **Misc** — the reference's handbook layout, from `handbook_info_table` (baked into each
  payload as `handbook`, a list of titled files): recruitment tags, Profile, Basic Info beside
  the Physical Exam (a robot's Performance Review), Infection Status with the Clinical
  Analysis on a plate, then every other file — Archive Files, Promotion Record, Amiya's Class
  Conversion Records — as collapsed `<details>` under its own title. The token row follows
  (the operator's face beside `itemUsage` and `itemDesc`), then what the reference has no
  place for: trait, obtain source, the potential ladder, every named outfit and a fact
  list. CN-only operators' files are the CN table's, in Chinese; the Persona 3 operators'
  files have titles of their own and all show as collapsed sections.

Costs render as the reference's material discs (`costListHtml` in `detail.ts`): a 52px circle
ringed and washed in the item's rarity colour, the baked icon filling it, and the count in
a dark badge formatted compact ("180K"). The names come from `items.json`,
which holds only the materials some payload references; an id it lacks still shows its
count, unnamed, rather than the cost silently looking cheaper.

Descriptions are rendered by `descriptionToHtml` in `format.ts`, not `cleanText`: the game
data is a markup language (`<@ba.vup>+{atk:0%}</>`), so tags become styled spans and
`{placeholders}` are interpolated from the entry's own `blackboard`. An unresolvable key
renders as the raw token rather than vanishing. `$` tags (`<$ba.sluggish>`) are game keywords:
they render muted with the game's own definition ("Slow: -80% Movement Speed") from
`game-consts.json`, shown by `tooltip.ts` — one floating tooltip for every `[data-tip]`, on
hover and on keyboard focus, in place of the browser's `title`. That covers ~98% of keyword uses; the rest render without one.

Not cloned, for lack of data: **summon/token** stat blocks, the Misc tab's potential-token
row, and outfit prices. `src/web/icons.ts` draws the stat, skill and position
glyphs inline rather than fetching them — ATK, attack interval, block, DP cost and the three
position glyphs are Sanity Gone's own drawings (GPL-2.0 via iansjk/sanity-gone), since the game
ships none. The elite and potential badges are the game's own art, baked by the build.

## Testing

No test suite. Verification is `npx tsc --noEmit` plus both webpack builds, then manual
checks: load `dist/ext/` in Firefox/Chrome and open the toolbar popup, and open
`dist/web/index.html` for the SPA. Both grids should render with no data requests. After a
style change, run `npm run design` and check `design/components/*.html`.

Visual changes are reviewed by the author personally — say what you changed and where to
look, don't just assert it works.

## Browser Compatibility

- **Firefox** 109+ (MV3), **Chrome** 88+, **Edge** (MV3 compatible)
