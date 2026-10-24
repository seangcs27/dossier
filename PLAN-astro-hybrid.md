# Plan: Astro hybrid for the Dossier website

Written 22 October 2026, after a spike (21 October). Phases 0 and 1 are done (24 October); the
rest is not started. The owner executes it, phase by phase; each phase ends in something that can be merged and, if it goes wrong, reverted
alone. Sizes are guesses: S under a day, M one to three days, L three to seven.

Revised 23 October 2026 for the Endfield and FGO redesign (#18 per-game logo, #19 the Endfield
showcase and the FGO summoning circle). The phases, gates and decisions are unchanged; what
moved is marked in Phases 0 to 4 and the route table.

## What "hybrid" means here

**The website only.** Astro builds the pages, the shell (sidebar, topbar) and the routes; the
interactive views we already have (filters, the Path to Nowhere wall, the dossiers, the
players) stay TypeScript and mount into an Astro page as client scripts. The pages that are
mostly reading (hololive Dreams' front page, gachas, a holomem, a card, Events) become real
HTML at build time.

**The extension is not touched.** It stays plain TypeScript built by `webpack.ext.js`, and
reads only `src/shared`. No Astro, no WXT. WXT would matter only if the popup were ever
rewritten in a UI library, which nothing here asks for.

Not goals: a UI framework for the views, a rewrite of `detail.ts` / `grid.ts` / `ptn.ts`, a
server, or Rust.

## Baseline (measured 23 October 2026, on `master` after #18 and #19)

| | Today |
|---|---|
| Entry | `dist/web/app.js` 787 KB (152 KB gzipped), the whole site's code **and about 577 KB of bundled JSON** (73% of it) |
| CSS | `styles.css` 238 KB (30 KB gzipped) |
| `dist/web` | 119 MB: operator payloads 25 MB, hololive Dreams 35 MB, Path to Nowhere 30 MB, Endfield 10 MB, FGO 7 MB, card portraits 10 MB |
| Routes | 919 once every dossier has an address (table below) |
| Spike: hololive Dreams front page in Astro | HTML 26 KB (5.6 KB gz) + JS 102 KB (19.7 KB gz); looked the same with the same CSS; the JS was mostly `songs.json`, so it would be a few KB with the data left out |

The spike showed one thing that must be designed for: the front page's "Ends in 7d 10h" and
"in 17 days" are computed from the reader's clock. Rendered at build they are as old as the
last daily deploy.

## Target

```
Astro (site/)                                 existing TypeScript, unchanged in kind
├─ layouts/Shell.astro   sidebar, topbar  ──► shell.ts   drawer, section blob, filter box
├─ pages/*.astro         one per route        views/*.ts   mount(container) for interactive views
│    static view:  render(data) → HTML        render/*.ts  pure string renderers, shared by both
│    interactive:  empty #view + <script>     *-index.ts   data stores (DOM-free)
└─ build: HTML + per-page JS chunks + the same compiled CSS
src/shared/generated  ← untouched (build:index)        webpack.ext.js → dist/ext  ← untouched
```

## Decisions

**Taken 22 October 2026: the owner accepted every recommendation below (D1 to D6).** Phase 1 can start once Phase 0 is done.

| # | Question | Decision |
|---|---|---|
| D1 | URLs: real paths (`/dossier/holodori/songs/`) or keep `#/` for the client views | Real paths everywhere, with a shim that turns an old `#/…` link into its path (`parseHash` already knows them) |
| D2 | Moving between pages: plain page loads, or Astro's `ClientRouter` | `ClientRouter`. Plain loads would drop what the SPA keeps today: roster filters, a playing voice line, the chorus player. See Phase 6 |
| D3 | How much of a dossier is built at build time | Shell only for Arknights (463) and Path to Nowhere (160): the right `<title>`, the right URL, and the payload fetched as now. Full HTML would be about 463 pages of 150 KB |
| D4 | Where Astro lives | `site/`, its own package (npm workspace), so its Vite and TS config stay out of webpack's way |
| D5 | Astro components or the string renderers | Both: Astro for page structure, and the existing string functions (`tileHtml`, `bannerHtml`, `skillHtml`…) called with `set:html`, so a tile has one definition for the server and for a filter's re-render |
| D6 | Asset URLs (the baked JSON holds relative ones: `holodori/jackets/m0049.webp`) | An explicit `assetUrl()` helper. Avoid `<base href>`: it changes how `#` links and, in some browsers, `url(#goo)` SVG filter references resolve. Check in Phase 1 |

## Phases

### Phase 0 — Baseline and guards (no product change) · S · done 24 October 2026
- **Route inventory script**: reads `router.ts` and the generated JSON, writes the 919
  addresses. Becomes the CI route-count check.
- **Screenshot harness** (`scripts/shots.mjs`): headless Edge or Chrome over http (never
  `file://`; it hides broken fetches), about 25 representative routes (one per view, one
  dossier per game; the Endfield showcase and the FGO circle included) at 1400, 800 and 390 px, compared with pixelmatch. Baselines kept out of
  git.
- **Smoke run**: each route mounts with no console error.
- **Audit**: a module that touches a browser global when it is imported cannot be imported at
  build time, so it stays client-only. Measured (24 October 2026): `card-spin.ts`
  (`matchMedia`), `holodori-audio.ts`, `holodori-clip.ts`, `index.ts`, `ptn-lang.ts`
  (`navigator`), `router.ts` (`window`), `sections.ts` and `views/detail.ts`. `logo.ts` reaches
  `document` only when called. The `*-index.ts` data modules are DOM-free (the spike imported
  them in Node).
- **Import audit**: `card.ts` and `views/endfield.ts` import `focusSelector` and
  `watchFilterTab` from `views/grid.ts`, which imports `operator-index` and so bundles
  `operators.json` (147 KB). Measured: 11 of the 15 views reach `views/grid.ts` that way
  (Endfield, FGO, Path to Nowhere's two, hololive Dreams' seven), so once Vite splits the code
  per page each of them would carry the Arknights grid and its data. Each of hololive Dreams'
  seven also carries all five of its JSON files, because `holodori-index.ts` imports them
  together: 376 KB of JSON a page, 170 KB of it the Arknights'. Phase 2 removes both.
- **Baseline re-measured**: the table above. Before #19 it read 782 KB of JavaScript and
  224 KB of CSS.
- **Done when**: `npm run shots` compares any two builds and the baseline set exists.
  **Met 24 October 2026:**
  - `npm run routes` (`scripts/route-inventory.mjs`) lists 919 routes (Arknights 467,
    Endfield 35, Path to Nowhere 161, hololive Dreams 255, FGO 1), each checked against
    `router.ts`'s own `parseHash`, into `dist/routes.txt`.
  - `npm run shots -- capture <site-dir> <out-dir> [name]` (`scripts/shots.mjs`) shoots 21
    pages at 1400, 800 and 390 px (63 shots, about 100 s) in the Chrome or Edge on the
    machine, over http, and is the smoke run: it exits 1 on an exception, a console error or a
    file of the site's own that is missing. `compare <a> <b>` diffs two sets and writes the
    changed ones to `<b>/diff/`. It shoots one page at a time: with three tabs open Chrome
    starved the background ones and the screenshots timed out.
  - The baseline is `.shots/baseline` (git-ignored). Two captures of one build agree to within
    0.01% of a page's pixels; a half-pixel letter-spacing on the headings moved 0.01% to 20% of
    them.
  - The smoke run found one fault already: the Endfield roster asks for
    `endfield/portraits/chr_0036_jsspsi.webp` (Si), which the wiki does not have, so it is a
    404. Not fixed here.

### Phase 1 — Astro beside webpack · M · done 24 October 2026
- `site/` per D4: Astro 5, strict TS, `output: 'static'`, `base: '/dossier'`,
  `trailingSlash: 'always'`, `outDir` somewhere other than `dist/web` for now. (Astro 5.18 on
  Node 22 needed an `estree-walker` hoist on this machine; pin and prove it in CI.)
- `Shell.astro`: `src/web/index.html` split into a layout (sidebar, topbar, drawer, the goo
  SVG filters) with `game`, `view`, `title` props. `<body data-view>` stays: the CSS keys on
  it.
- Styles: import `src/web/styles.scss` as a global. Check the emblem `mask-image` URLs, the
  `@font-face` URLs under `base`, and `@property --thumb`. Seven font families are now
  self-hosted (four came with #19), each declared in its game's partial. The five game
  partials are 125 KB of SCSS source: decide here whether they stay one stylesheet or split
  per game (they are scoped by `body[data-view]`, so they can).
- `shell.ts`: the parts of `index.ts` that are the shell's (drawer, section links and
  `sections.ts`, the search box, the per-game logo and favicon in `logo.ts`) split from
  `dispatch()`. Each page's script calls `markSection(...)` and `setLogoGame(...)` itself.
- `assetUrl()` per D6.
- The spike page, kept: `/holodori/`.
- **Done when**: `/holodori/` matches the SPA at the three widths, the drawer and section
  blob work, no console errors. **Rollback**: delete `site/`, `src/web/shell.ts` and put
  `index.ts` back.

**Met 24 October 2026.** What is there: `site/` is an npm workspace (Astro 5.18.2, pinned; it
installs clean, the `estree-walker` hoist the spike needed did not come back). `Shell.astro`
reads `src/web/index.html` instead of copying it, so the two targets share one source of the
markup until Phase 8. `site/integrations/assets.mjs` copies the files webpack's CopyPlugin
copies (read out of it, so the lists cannot differ) and serves them under `astro dev`.
`src/web/shell.ts` has `initShell()` and `showShell(view)`, moved out of `index.ts` as they
were. `npm run build:site` writes `dist/astro` (17 s for one page; 119 MB of it is the assets).

How it was checked:
- The SPA after the split: 63 of 63 shots identical to the Phase 0 baseline. The webpack web
  bundle and all 88 files of the extension build are byte for byte what they were before the
  workspace was added.
- `/holodori/` is identical to the SPA's `#/holodori` at 1400, 800 and 390 px, and so was a
  temporary second page, `/holodori/songs/` (left out of the commit), which also checks the
  section fill and a second route. `shots capture … --astro` shoots the routes in
  `site/src/ported-routes.json`.
- By script (not kept): the drawer opens from the menu button, shuts on Escape, the scrim and
  on widening past a phone, and the page behind it is inert while it is out; the section fill
  sits exactly under the link being shown; no console error, exception or 404.

Three differences from the text above:
- **`/holodori/` is the SPA's own front page**, mounted into the shell by the page's script, not
  the spike's static page. The spike's page does not match the SPA (other links, no gacha
  logos); drawing the page at build time is Phases 2 and 3. The spike's numbers stay above.
- **`<base href>` is in, and `assetUrl()` (D6) is not yet.** The views and the baked JSON write
  every address beside `index.html` (`icons/…`, `holodori/jackets/…`); one folder down they
  miss, and wrapping each one is Phase 2's work. `<base href="/dossier/">` makes them resolve
  as they do now, and sends a `#/…` link to the SPA at the root, where a route not yet ported
  lives. D6's worry, `url(#goo)`, did not bite: those references are in the stylesheet, where
  a fragment-only address is the document's own. Revisit it route by route in Phase 2.
- **The stylesheet goes at the site's root**, not in `_astro/`, which is the "emblem URLs" check
  in the Styles item. A custom property holding a relative `url()` is read against the
  stylesheet, not the page: `--logo: url(icons/games/arknights.webp)` (the sidebar's emblems)
  and the same in `icons.ts`, `detail.ts` and `grid.ts`. From `_astro/` the emblems were 404s,
  and no `<base>` helps. Set in `site/astro.config.mjs`.

What it costs today: `/holodori/` ships 236 KB of JavaScript (44 KB gzipped) and 236 KB of CSS,
because it mounts the whole view with its imports, `views/grid.ts` and `operators.json`
among them (the list Phase 2 starts from).

### Gate 1
Stop here and choose again if shell parity took far longer than estimated, or the shell cannot
be separated from `dispatch()` without rewriting it. The fallback is the cheaper plan:
on-demand loading of each game's views and data inside the current webpack build.

**Passed 24 October 2026.** Parity came within the estimate, and the shell came out of
`dispatch()` by moving code, not rewriting it. Not tested yet: a page that is not a client
mount, `ClientRouter`, a dynamic route, and the SPA and the Astro build served together (the
`#/…` links assume it).

### Phase 2 — The pure render layer · L · done 24 October 2026
The refactor everything else depends on.
- Each view is split into `render(data, now?) → string` (pure: no DOM, no `window`) and
  `mount(container)` (events, state, side effects). Most tile and banner helpers are already
  pure; the work is in the views that build a page and wire it in one function.
- Astro pages use the renderers with `set:html` (D5).
- **Clock-dependent output** (gacha "Ends in", birthdays "in N days"): rendered with the
  build time, tagged with `data-*`, and a small `fresh.ts` recomputes in the browser. The
  daily deploy bounds the staleness to a day.
- **Data**: a page ships no JSON it neither renders nor filters. Server side imports the file
  in the page's frontmatter; client side takes an inlined slice or a cached fetch.
- **Shared helpers out of `views/grid.ts`**: move `focusSelector` and `watchFilterTab` (the
  search box's and filter tab's shared handling, used by `card.ts` and `views/endfield.ts`)
  into a module of their own, so the Endfield, FGO, Path to Nowhere and hololive Dreams pages
  do not carry the Arknights grid and `operators.json`. Split `holodori-index.ts` the same way,
  so a hololive Dreams page imports only the JSON it uses.
- **Done when**: the SPA's string output and Astro's are identical for the same data, for
  every renderer moved. **Rollback**: the renderers stay valid for the SPA.

**Met 24 October 2026.** Thirteen modules in `src/web/render/`: hololive Dreams' front page,
gachas, holomem page, card page, the songs' tile and back, the cards' tile, the chorus disc,
the Events page and the Endfield dossier, plus the date and clock formatters. Each view mounts
what its renderer draws and keeps its state and events. `npm run render-check` runs them all
in plain Node (no window, no document) twice from a fixed clock: 22 draws, and it fails a
module that touches a global, draws two ways or has no entry in its table (checked against a
module that reads `document`). Three were done by subagents in worktrees of their own (the
Events page, the Endfield dossier, the card page), each shown against the baseline before it
was merged; the integrated result is 63 of 63 shots identical to the Phase 0 baseline, so no
view moved a pixel. The Endfield dossier's markup was also compared as a string, old view
against new, for all 34 operators, and the card page's for 10 states: byte for byte.

Where it differs from the text above:
- **`fresh.ts` is in** (`src/web/fresh.ts`, `freshen(root, at)`). Clock-dependent text carries a
  `data-*` attribute and `freshen` sets it again from the reader's clock: a gacha's status, a
  date in the reader's time zone, a birthday's "in N days", the years since a debut, an
  event's countdown and its "your time" tooltip. It imports only formatters that have no
  data of their own, or the data would ship on every page. Checked by building a page six
  hours before the screenshot clock: its shots still match. What `freshen` cannot do is move
  a card between sections (a banner that has ended stays under "Running now"), so a page is
  as stale as the last deploy, a day at most.
- **`holodori-index.ts` was not split.** Measured, it did not need it: Rollup drops a JSON
  file nothing in the page uses, and the cost was the player and the song backs. The chorus
  disc now carries what the player needs (`data-title`, `-mv`, `-chorus`, `-estimated`) and a
  jacket's back is a `<template data-back-of>` the page carries, so no page holds `songs.json`.
  The SPA's player was checked by clicking both kinds of disc.
- **The card page's renderer has its own copies of two audio helpers** (`waveHtml`, and
  `volumeHtml` taking the volume as an argument), because `holodori-audio.ts` reads
  `window` and `localStorage` at import. A later pass can make that module import them.
  The reveal stays client-side; an Astro card page takes the 0.5 default volume and the
  client script has to sync the slider from `localStorage`.
- **Not done here, and not needed:** the Path to Nowhere and Arknights dossiers, which are shell
  pages with a client mount (D3), and the rosters, which are Phase 4.

### Phase 3 — Static content pages · L
In this order (value over risk):
1. hololive Dreams: front page; gachas; holomem × 54 (`getStaticPaths`); card × 196 (head,
   stats readout and fact list at build, with the payload inlined instead of fetched; the
   level slider, blooms, skills, the reveal and the voice player as client scripts).
2. Events (3 tabs; the countdown script from Phase 2).
3. Endfield dossier × 34.
4. Path to Nowhere dossier × 160 (the wall stays client).

Each page gets a `<title>`, a description, a canonical URL and a JS budget (proposed: 25 KB
gzipped for a static page, 40 KB with an interactive island).
- **Done when**, per page: the screenshot diff is inside the threshold, the budget is met,
  links resolve. **Rollback**: remove the page; the SPA route is still there.

**Met 24 October 2026, except one budget and the link check.** `npm run build:site` writes 449
pages (133 MB with the assets): hololive Dreams' front page, gachas, 54 holomems and 196 cards,
the three Events tabs, 34 Endfield dossiers, 160 Path to Nowhere dossiers. The 11 page kinds
the screenshot harness covers (`shots capture dist/astro … --astro`, 33 shots) are identical to
the SPA's at 1400, 800 and 390 px, and the smoke run is clean; the clock was pinned with
`DOSSIER_NOW`. Each page has a title, a description and a canonical address.

| Page | First-load JS, gzipped | Drawn how |
|---|---|---|
| Endfield dossier, gachas | 3.3 to 4.4 KB | at build time |
| Events list, Headhunting | 5.3 KB | at build time; countdowns set every second; **drawn again by the SPA's own view the moment a card has changed section since the build** (checked: built three weeks early, both tabs still identical to the SPA's) |
| front page, holomem | 8.3 KB | at build time, plus the chorus player |
| Events calendar | 5.3 KB, then 168 KB (raw) | built, then the SPA's view mounted over it (month, toggle and steps are its) |
| Path to Nowhere dossier | 31.7 KB | a shell, and the SPA's view mounted |
| **Card page** | **52.8 KB** | at build time with its payload inlined; the SPA's handlers adopt it (`mountHolodoriCard(view, id, payload)` draws nothing) |

- **Over budget: the card page** (52.8 KB against 40). It carries the art viewer, the reveal,
  the voice player and the audio engine up front. A later pass can load those on first use.
- **Adopted, not redrawn:** on the card page a bloom, a level change and the volume were
  clicked: the stats change, the stage and voice nodes are untouched, and the slider takes the
  stored volume (80) where the page was drawn at the default (50).
- **Card level and bloom reset on each load** until Phase 6 (`ClientRouter` keeps module
  state); the gachas and front page are as stale as the last deploy for what a banner's
  group is (the text is set again), a day at most.
- **Links** still go to `#/…` and so, through `<base>`, to the SPA at the root; making them
  real paths and checking them is Phase 6, as the plan has it.

### Phase 4 — Interactive rosters as client views · L
Arknights grid, Endfield roster (the showcase), FGO roster (the summoning circle), the Path to
Nowhere wall, hololive Dreams' sheet, songs and cards. The Endfield and FGO rosters were
simple before #19; both now keep search, filters and the operator or class picked in module
state. The Astro page is the shell plus an empty `#view` and a `<script>` that calls the
existing `mount*(container)` unchanged. Vite splits the code per page and each page loads
only its game's data.
- **Done when**: search, every filter group, sort and the language switch behave as before
  (scripted checks), and per-page JS meets a budget (proposed 120 KB gzipped for a roster).
- Needs Phase 6 (or `sessionStorage`) to keep state across a visit elsewhere.

### Gate 2
Compare first-load JavaScript on the non-dossier pages with the 152 KB gzipped baseline. The
case for continuing is a drop of about 60% with no feature lost. If it is not there, stop and
take the cheaper plan.

### Phase 5 — The Arknights dossier (463) · M
Per D3: one generated shell page per operator (`/op/<id>/`, about 10 KB each, with the
right `<title>`), whose script fetches `operator-details/<id>.json` and calls `mountDetail`.
`detail.ts` (1,386 lines), `art-viewer.ts` and `tooltip.ts` stay as they are. **Done when**
all 463 resolve and the Misc, Modules and Skills tabs match the baseline screenshots.

### Phase 6 — Navigation · M
- **Router**: `ClientRouter` (D2). The page is not reloaded, so module state, the audio
  engine and the chorus player survive. The player's `iframe` takes `transition:persist`.
  Views mount on `astro:page-load`; the old "stop the sound on `hashchange`" becomes
  `astro:before-swap`.
- **Legacy links**: on load, an old `#/op/…` address is turned into its path with the
  existing `parseHash` and `location.replace`. Keep it for at least six months.
- **Done when**: Back and Forward, a filter kept across a visit, a voice line continuing
  across a card step, and an old bookmark all work.

### Phase 7 — CI and cut-over · M
- `build:web` becomes `astro build` (the `prebuild:web` index step stays); the artifact path
  stays `dist/web`.
- First deploy the Astro build under `/dossier/next/` inside the same artifact (a second
  `base`), for about a week of use. Then flip.
- CI checks: `tsc`, a link check over the output, route count equal to the Phase 0
  inventory, and a per-page size budget script.
- The daily cron stays.
- **Rollback**: revert the workflow change; the webpack path still exists until Phase 8.

### Phase 8 — Cleanup · S
Delete `webpack.web.js`, the CopyPlugin lists, `src/web/index.html`, `router.ts` and
`index.ts`'s dispatch. Keep `webpack.ext.js`. Rewrite the router, sidebar and build sections
of `CLAUDE.md`; close the items in `TODO.md`. Remove `/next/`.

## Route inventory (what must exist at the end)

| Game | Routes |
|---|---|
| Arknights | roster `/`, dossier × 463, Events × 3 |
| Endfield | roster, dossier × 34 |
| Path to Nowhere | wall, dossier × 160 |
| hololive Dreams | front, sheet, songs, cards, gachas, holomem × 54, card × 196 |
| FGO | roster |

919 pages. At 10 to 60 KB each that is 10 to 50 MB on top of today's 119 MB, well under
GitHub Pages' 1 GB site limit.

## Risks

| Risk | Why | Mitigation |
|---|---|---|
| Module-level state | Rosters, audio, the chorus player and the language choice all live in module variables | `ClientRouter` (Phase 6); `sessionStorage` where a full load is unavoidable |
| CSS keyed on `body[data-view]` | Every game's world is scoped by it | Layout sets it; screenshot harness covers each view |
| Relative asset URLs in baked JSON | Nested paths break `holodori/...` | `assetUrl()`; link checker in CI |
| Two renderers drifting | A tile built on the server and again in a filter | One string function used by both (D5), and the identity test in Phase 2 |
| Clock-dependent text | Static HTML is as old as the build | `data-*` plus `fresh.ts`; daily cron |
| No tests today | Nothing says a view still works | Phase 0 harness before any change |
| Build time and size | 919 pages and 119+ MB | Measure in Phase 1; shell-only dossiers (D3) |
| Old links | People have `#/op/…` bookmarks | Shim in Phase 6 |

## Done means

First-load JavaScript on every non-dossier page is a fraction of today's 152 KB gzipped; each
page has its own title and address; every old link still lands; the extension build is
byte-for-byte the same as before; no feature is gone.
