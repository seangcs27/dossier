# Plan: Astro hybrid for the Dossier website

Written 22 October 2026, after a spike (21 October). Not started. The owner executes it, phase
by phase; each phase ends in something that can be merged and, if it goes wrong, reverted
alone. Sizes are guesses: S under a day, M one to three days, L three to seven.

## What "hybrid" means here

**The website only.** Astro builds the pages, the shell (sidebar, topbar) and the routes; the
interactive views we already have (filters, the Path to Nowhere wall, the dossiers, the
players) stay TypeScript and mount into an Astro page as client scripts. The pages that are
mostly reading (hololive Dreams' front page, gachas, a holomem, a card, Events, the FGO
roster) become real HTML at build time.

**The extension is not touched.** It stays plain TypeScript built by `webpack.ext.js`, and
reads only `src/shared`. No Astro, no WXT. WXT would matter only if the popup were ever
rewritten in a UI library, which nothing here asks for.

Not goals: a UI framework for the views, a rewrite of `detail.ts` / `grid.ts` / `ptn.ts`, a
server, or Rust.

## Baseline (measured 21 October 2026)

| | Today |
|---|---|
| Entry | `dist/web/app.js` 782 KB (151 KB gzipped), the whole site's code **and about 579 KB of bundled JSON** (74% of it) |
| CSS | `styles.css` 224 KB (27 KB gzipped) |
| `dist/web` | 119 MB: operator payloads 25 MB, hololive Dreams 35 MB, Path to Nowhere 60 MB (generated, all games) |
| Routes | about 915 once every dossier has an address (table below) |
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

## Decisions to take before Phase 1

| # | Question | Recommendation |
|---|---|---|
| D1 | URLs: real paths (`/dossier/holodori/songs/`) or keep `#/` for the client views | Real paths everywhere, with a shim that turns an old `#/…` link into its path (`parseHash` already knows them) |
| D2 | Moving between pages: plain page loads, or Astro's `ClientRouter` | `ClientRouter`. Plain loads would drop what the SPA keeps today: roster filters, a playing voice line, the chorus player. See Phase 6 |
| D3 | How much of a dossier is built at build time | Shell only for Arknights (460) and Path to Nowhere (160): the right `<title>`, the right URL, and the payload fetched as now. Full HTML would be about 460 pages of 150 KB |
| D4 | Where Astro lives | `site/`, its own package (npm workspace), so its Vite and TS config stay out of webpack's way |
| D5 | Astro components or the string renderers | Both: Astro for page structure, and the existing string functions (`tileHtml`, `bannerHtml`, `skillHtml`…) called with `set:html`, so a tile has one definition for the server and for a filter's re-render |
| D6 | Asset URLs (the baked JSON holds relative ones: `holodori/jackets/m0049.webp`) | An explicit `assetUrl()` helper. Avoid `<base href>`: it changes how `#` links and, in some browsers, `url(#goo)` SVG filter references resolve. Check in Phase 1 |

## Phases

### Phase 0 — Baseline and guards (no product change) · S
- **Route inventory script**: reads `router.ts` and the generated JSON, writes the ~915
  addresses. Becomes the CI route-count check.
- **Screenshot harness** (`scripts/shots.mjs`): headless Edge or Chrome over http (never
  `file://`; it hides broken fetches), about 25 representative routes (one per view, one
  dossier per game) at 1400, 800 and 390 px, compared with pixelmatch. Baselines kept out of
  git.
- **Smoke run**: each route mounts with no console error.
- **Audit**: modules that touch `document` or `window` on import must be client-only. Today:
  `holodori-audio.ts`, `holodori-clip.ts`, `index.ts`, `sections.ts`, `views/detail.ts`
  (and `ptn-lang.ts`, `holodori-audio.ts` use `localStorage`). The `*-index.ts` data modules
  are DOM-free (the spike imported them in Node).
- **Done when**: `npm run shots` compares any two builds and the baseline set exists.

### Phase 1 — Astro beside webpack · M
- `site/` per D4: Astro 5, strict TS, `output: 'static'`, `base: '/dossier'`,
  `trailingSlash: 'always'`, `outDir` somewhere other than `dist/web` for now. (Astro 5.18 on
  Node 22 needed an `estree-walker` hoist on this machine; pin and prove it in CI.)
- `Shell.astro`: `src/web/index.html` split into a layout (sidebar, topbar, drawer, the goo
  SVG filters) with `game`, `view`, `title` props. `<body data-view>` stays: the CSS keys on
  it.
- Styles: import `src/web/styles.scss` as a global. Check the emblem `mask-image` URLs, the
  `@font-face` URLs under `base`, and `@property --thumb`.
- `shell.ts`: the parts of `index.ts` that are the shell's (drawer, section links and
  `sections.ts`, the search box) split from `dispatch()`. Each page's script calls
  `markSection(...)` itself.
- `assetUrl()` per D6.
- The spike page, kept: `/holodori/`.
- **Done when**: `/holodori/` matches the SPA at the three widths, the drawer and section
  blob work, no console errors. **Rollback**: delete `site/`.

### Gate 1
Stop here and choose again if shell parity took far longer than estimated, or the shell cannot
be separated from `dispatch()` without rewriting it. The fallback is the cheaper plan:
on-demand loading of each game's views and data inside the current webpack build.

### Phase 2 — The pure render layer · L
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
- **Done when**: the SPA's string output and Astro's are identical for the same data, for
  every renderer moved. **Rollback**: the renderers stay valid for the SPA.

### Phase 3 — Static content pages · L
In this order (value over risk):
1. hololive Dreams: front page; gachas; holomem × 54 (`getStaticPaths`); card × 196 (head,
   stats readout and fact list at build, with the payload inlined instead of fetched; the
   level slider, blooms, skills, the reveal and the voice player as client scripts).
2. Events (3 tabs; the countdown script from Phase 2).
3. FGO roster (no filters).
4. Endfield dossier × 33.
5. Path to Nowhere dossier × 160 (the wall stays client).

Each page gets a `<title>`, a description, a canonical URL and a JS budget (proposed: 25 KB
gzipped for a static page, 40 KB with an interactive island).
- **Done when**, per page: the screenshot diff is inside the threshold, the budget is met,
  links resolve. **Rollback**: remove the page; the SPA route is still there.

### Phase 4 — Interactive rosters as client views · L
Arknights grid, Endfield roster, the Path to Nowhere wall, hololive Dreams' sheet, songs and
cards. The Astro page is the shell plus an empty `#view` and a `<script>` that calls the
existing `mount*(container)` unchanged. Vite splits the code per page and each page loads
only its game's data.
- **Done when**: search, every filter group, sort and the language switch behave as before
  (scripted checks), and per-page JS meets a budget (proposed 120 KB gzipped for a roster).
- Needs Phase 6 (or `sessionStorage`) to keep state across a visit elsewhere.

### Gate 2
Compare first-load JavaScript on the non-dossier pages with the 151 KB gzipped baseline. The
case for continuing is a drop of about 60% with no feature lost. If it is not there, stop and
take the cheaper plan.

### Phase 5 — The Arknights dossier (460) · M
Per D3: one generated shell page per operator (`/op/<id>/`, about 10 KB each, with the
right `<title>`), whose script fetches `operator-details/<id>.json` and calls `mountDetail`.
`detail.ts` (1,386 lines), `art-viewer.ts` and `tooltip.ts` stay as they are. **Done when**
all 460 resolve and the Misc, Modules and Skills tabs match the baseline screenshots.

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
| Arknights | roster `/`, dossier × 460, Events × 3 |
| Endfield | roster, dossier × 33 |
| Path to Nowhere | wall, dossier × 160 |
| hololive Dreams | front, sheet, songs, cards, gachas, holomem × 54, card × 196 |
| FGO | roster |

About 915 pages. At 10 to 60 KB each that is 10 to 50 MB on top of today's 119 MB, well under
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
| Build time and size | About 915 pages and 119+ MB | Measure in Phase 1; shell-only dossiers (D3) |
| Old links | People have `#/op/…` bookmarks | Shim in Phase 6 |

## Done means

First-load JavaScript on every non-dossier page is a fraction of today's 151 KB gzipped; each
page has its own title and address; every old link still lands; the extension build is
byte-for-byte the same as before; no feature is gone.
