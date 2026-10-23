# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Dossier** is an Arknights operator lookup tool with two targets built from a shared codebase:

1. **Browser extension** (Firefox/Chrome, Manifest V3) — operator lookup in a popup
2. **Web SPA** — operator search and detail view, plus the Global event schedule,
   deployable to GitHub Pages. It also carries four more games: **Arknights: Endfield**, as
   a roster and a first dossier page (see "Endfield" below), **Path to Nowhere**, as a
   roster with search and filters and a dossier per Sinner, **hololive Dreams**, as a
   front page, a sticker sheet of its cast with search and filters, its songs, its cards, its gachas and a page per holomem, and **Fate/Grand Order**, as a roster
   with a summoning circle for its classes, search and filters, and no dossier yet (see "The
   other games' rosters"); the extension is Arknights alone.

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

npm run routes       # Every route the web target answers (919), checked against router.ts → dist/routes.txt
npm run shots -- capture dist/web .shots/<set>   # Screenshots at 3 widths, and the smoke run
npm run shots -- compare .shots/<a> .shots/<b>   # Pixel diff of two sets; changed ones to <b>/diff/

npm run clean        # Remove ./dist/
```

`build:index` is seven scripts: `build:index:operators` (the index, the per-operator detail
payloads, the branch icons), `build:index:ranges` (`ranges.json`), `build:index:events`
(`events.json` and the event banners), `build:index:endfield` (the Endfield roster, its
portraits, splash art and glyphs, and a payload per operator), and `build:index:ptn`,
`build:index:holodori` and `build:index:fgo` (a roster each, and its card art). All run under `node --no-network-family-autoselection`.

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
A daily cron (00:00 UTC) rebuilds so newly released operators appear without a manual push;
it was weekly until 20 October 2026, when hololive Dreams' ★5 previews, up for about a day
before their gacha, made the owner pick daily over the Chinese wiki's 567s.
Requires repo Settings → Pages → Source = "GitHub Actions" (one-time).

## Repository Layout

```
scripts/
  build-operator-index.mjs   ← operators.json + operator-details/ + branch-icons/ + portraits/
  build-range-index.mjs      ← ranges.json
  build-event-index.mjs      ← events.json + event-banners/
  build-endfield-index.mjs   ← endfield/operators.json + portraits/, splash/, icons/, operator-details/
  build-ptn-index.mjs        ← ptn/sinners.json + ptn/figures/ + ptn/sinner-details/
  build-holodori-index.mjs   ← holodori/characters.json + figures/ + stickers/ + icons/ + songs.json +
                               jackets/ + cards.json + card-art/ + card-full/ + card-details/ + gachas.json +
                               upcoming.json
  lib/holodori-gachas.mjs    ← hololive Dreams' gacha banners: names, dates and featured cards,
                               recorded by hand from holodori.best, one entry a banner
  lib/holodori-clips.mjs     ← where each song's clip plays in its music video where the game's window is
                               not right for it, and the videos of two songs the dump has none for,
                               recorded by hand from YouTube
  backup-holodori-media.mjs  ← hololive Dreams' audio, video and full card art onto the media-backup release, run by hand
  backup-art.mjs             ← Arknights' and Path to Nowhere's remote art onto the art-backup release, run by hand
  lib/release-backup.mjs     ← the two backups' fetch, restore and upload
  build-fgo-index.mjs        ← fgo/servants.json + fgo/figures/
  lib/mode-order.mjs         ← where each mode-only operator sorts, recorded by hand
  lib/wiki-text.mjs          ← reads an arknights.wiki.gg operator page: templates, wiki markup to the game's
  lib/endfield-page.mjs      ← reads an endfield.wiki.gg operator page into its payload
  lib/ptn-page.mjs           ← reads a pathtonowhere.wiki.gg Sinner page into its payload
  lib/ptn-record.mjs         ← when each Sinner was released, and the files of five the wiki has
                               no page for: recorded by hand from S1N, one line a release
  lib/ptn-bili.mjs           ← reads the game's Chinese wiki: every Sinner's Chinese name, tags and
                               flags, the CN-only Sinners and their pages, a picture's address
  lib/ptn-bili-page.mjs      ← that wiki's {{禁闭者图鉴}} page into the same payload as ptn-page.mjs
  lib/ptn-bili-snapshot.json ← what that wiki last gave whole: its roster, 160 pages' text, the crimebrands' and their terms', for a
                               build it will not answer (tracked; a local build rewrites it)
  lib/ptn-ranges.mjs         ← the shape of every skill range the Chinese wiki draws, recorded by hand
  lib/ptn-cn-english.mjs/.json ← the CN-only Sinners' skills and the rest in English, translated by hand
  lib/ptn-font.mjs           ← cuts Noto Sans SC to the characters PtN's placards set, into src/web/fonts/noto-sans-sc/
  lib/fetch.mjs              ← timedFetch / fetchJson / wikiApi, shared by the three roster scripts
  lib/bake-images.mjs        ← bakeImages: card art fetched once, re-encoded to WebP and kept
  collab-logos/<slug>.svg|png  ← the four collabs' own logos, from Wikimedia Commons (tracked)
  build-design-previews.mjs  ← design/components/*.html (inlines the real compiled CSS)
  route-inventory.mjs        ← every route the web target answers, from the generated data, checked against router.ts
  shots.mjs                  ← screenshots of 21 pages at 3 widths, the smoke run, and the diff of two sets

design/            ← Claude Design mirror; components/ and manifest.json are generated
                     (gitignored), source/ holds the icon artwork
icons/             ← extension + favicon PNGs; 7 Wiš'adel variants per size (-1 to -7, the
                     logo's rotation), and the plain avatar with no suffix, which the
                     extension and the fallback markup use
  games/<game>.webp  ← the sidebar's five game emblems, white on transparency (tracked)
  ptn/<kind>-<name>.webp  ← Path to Nowhere's 25 rank, tendency and libram badges, 72px (tracked)
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
      operator-details/<id>.json  ← 460 full Operator payloads, copied as static files
      ranges.json             ← every attack range in use (~57), bundled
      branch-icons/<sub>.png  ← self-hosted archetype glyphs, copied as static files
      portraits/<id>.webp     ← card art, re-encoded from PNG at build, copied as static files
      faction-logos/<id>.webp ← one badge per faction (45): the nation on the card back
                                (the team for the ones with no nation), the most specific
                                faction in the detail header; plus collab-<slug>.webp, the
                                four collab logos, which take the badge's place on both
      items.json              ← name/icon/rarity of the ~90 materials any payload prices, bundled
      item-icons/<iconId>.webp  ← those materials' icons at 96px, copied as static files
      elite-icons/<0-2>.webp    ← the game's elite badges, 40px, painted as CSS masks
      potential-icons/<1-6>.webp  ← the game's potential rank badges, 48px, full colour
      game-consts.json        ← keyword glossary + promotion LMD, from gamedata_const, bundled
      events.json             ← the Global schedule: ~27 events and ~34 headhunting pools, bundled into the web target
      event-banners/<stem>.webp  ← those events' banners at 960px, copied as static files
      endfield/operators.json    ← the Endfield roster (33), bundled into the web target
      endfield/portraits/<id>.webp  ← its card art, 180x360, copied as static files
      endfield/splash/<id>.webp     ← each operator's full illustration at 1024px, copied as static files
      endfield/icons/<kind>-<name>.webp  ← 16 class, element and weapon glyphs, 64px
      endfield/operator-details/<id>.json  ← 33 payloads parsed from the wiki's pages; nothing reads them yet
      ptn/sinners.json           ← Path to Nowhere's roster (160, 11 of them CN only), bundled into the web target
      ptn/figures/mugshot/<id>.webp   ← each Sinner whole, as the wall stands them (160), up to 1100 tall
      ptn/figures/original/<id>.webp  ← the same of their original illustration (160); both copied as static files
      ptn/sinner-details/<id>.json  ← 160 dossier payloads parsed from the wiki's pages, with the Chinese wiki's text beside the English (`zh`), copied as static files
      holodori/characters.json   ← hololive Dreams' roster (54), bundled into the web target
      holodori/figures/<id>.webp ← each holomem's key art as a bust, 176x232 on transparency (54), copied as static files
      holodori/icons/<id>.webp   ← the game's round icon of each holomem, 128px (54), copied as static files
      holodori/stickers/<asset>.webp  ← each holomem's six membership stickers, 256px (318), copied as static files
      holodori/songs.json        ← its songs (215) with their four charts' levels and credits, bundled into the web target
      holodori/jackets/<id>.webp ← every song's jacket (215: 157 from the game's site, 58 from HolodoriDB's CDN), 240px
      holodori/cards.json        ← its cards (192): name, holomem, rarity, type, outfit, bundled into the web target
      holodori/card-art/<id>.webp   ← each card's portrait, 256x512 (192), copied as static files
      holodori/card-full/<id>.webp  ← each card's illustration at 1024 wide (192), copied as static files
      holodori/card-details/<id>.json  ← 192 card payloads: stats by level, blooms, skills, voice lines, dialogues
      holodori/gachas.json       ← the gacha record (15 entries), bundled into the web target
      holodori/upcoming.json     ← the ★5s announced for a gacha the record lacks, from hololive Dreams Lab, bundled
      fgo/servants.json          ← Fate/Grand Order's roster (470), bundled into the web target
      fgo/figures/<id>.webp      ← its card art (470), 148x296, copied as static files
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
    index.ts        ← app entry: random logo, hash-router dispatch (grid, detail, events,
                      the other games' pages), the table of games (GAMES: each one's
                      roster and its word for its cast), which game the sidebar and which
                      page the section links mark, and the phone's games drawer
    router.ts       ← hash routing (#/ , #/op/<id> , #/events , #/events/pools ,
                      #/events/calendar , #/endfield , #/endfield/op/<id> , #/ptn ,
                      #/ptn/sinner/<id> , #/holodori , #/holodori/holomems ,
                      #/holodori/gachas , #/holodori/songs ,
                      #/holodori/cards , #/holodori/card/<id> ,
                      #/holodori/holomem/<id> , #/fgo)
    card.ts         ← the card and the roster page the games after Endfield share: RosterCard,
                      mountRoster, and its search box and filter panel for a game that asks
    logo.ts         ← picks one of 7 Wiš'adel icon variants per page load, again on hover, and
                      then once a second for as long as a mouse rests on the logo. All seven
                      are on the emoticon set's red square: the plain avatar (-1) was given
                      one by laying the cut-out over the other six's shared background, at the
                      1.17x (and 1px) a search over scale and shift found it best fits them
                      (they fit themselves at 1.00). Per game since 21 October 2026
                      (`setLogoGame`, from `dispatch`): hololive Dreams rests on hololive's
                      triangle in white on its blue (`icons/logo-holodori.webp`, the
                      sidebar's emblem) and, with a mouse on the logo, rolls Kronie, Ouro
                      Kronii's blue clock bear (`icons/holodori-kronie.webp`, the owner's own
                      copy of the emoji from their hololive-helper repo) every 2.5 s, and one
                      roll in 8 an animated Ina'nis chibi (`icons/holodori-ina.webp`, from
                      that repo's `ina-nis.gif`, cropped to a square on her body); it goes
                      back to the triangle when the mouse leaves. Endfield, Path to Nowhere
                      and Fate/Grand Order wear their sidebar emblem in white on a square of
                      our own choice (`icons/logo-<game>.webp`: charcoal, red, blue; one face
                      each), and with a mouse on Path to Nowhere's, one roll in 20 (every second while
                      it rests there) is the duck of its April Fools 2025
                      (`icons/ptn-duck.webp`, the game's own "Ga" avatar from the Chinese
                      wiki), until the mouse leaves. The owner's first plan for hololive Dreams was
                      a mascot per holomem from hololive.wiki's "List of Mascots" (50
                      baked; only 10 were clean, the rest video screenshots, a smudge at
                      44px) and they cut it down. All of it is third-party art the owner
                      approved on 21 and 22 October; baked once by hand, not by the build
    sections.ts     ← the fill behind the section link being shown, and its move from one
                      link to the other as a drop with a tail (markSection)
    holodori-flip.ts  ← turning a hololive Dreams song's jacket over to its back
    holodori-audio.ts  ← one sound at a time across hololive Dreams' pages, their volume, and the waveform strip
    holodori-voice.ts  ← a card page's voice lines as bubbles, with the one dock they share
    holodori-reveal.ts  ← a 5-star card's reveal: the card-get line, then the animation with the signature over it
    holodori-clip.ts  ← a song's chorus, played from its music video in a YouTube embed
    tooltip.ts      ← the one floating tooltip behind every [data-tip]; nothing uses `title`
    scrollbar.ts    ← lights a scrollbar gold while its box is scrolled, and eases it back
    art-viewer.ts   ← the artwork viewer popup the detail page's art opens
    format.ts       ← escHtml/cleanText, descriptionToHtml, rarity/profession/alter helpers,
                      crumbsHtml (the breadcrumb over a dossier and the schedule)
    icons.ts        ← inline SVG glyphs for the detail page (stats, skill meta, elite ranks)
    operator-index.ts  ← grid data store: getOperators/filterOps/sortOps/subclassesFor/allTags
    event-index.ts  ← schedule data store: getEvents/getPools/lagDays, and the GameEvent / GamePool types
    endfield-index.ts  ← Endfield data store: getEndfieldOperators, fetchEndfieldOperator, and
                         the roster entry's and the payload's types
    ptn-index.ts / holodori-index.ts / fgo-index.ts  ← each of those games' data store and entry
                      type; PtN's also has the dossier payload's types and fetchPtnSinner
    ptn-lang.ts     ← Path to Nowhere's two languages: which is on (kept in localStorage), this
                      site's own words in each (t), and a Sinner's name, tags and code in it
    styles.scss     ← full-page layout, sidebar, topbar, chips, grid, detail, events; loads
                      the games' own partials last
    _endfield-grid.scss / _endfield-detail.scss  ← Endfield's world (paper, ink and signal yellow), its
                      showcase and its panel; the dossier's rules on that paper
    _ptn.scss / _fgo.scss  ← PtN's roster, a world of its own (the line-up wall), and its dossier's
                      own rules; FGO's world (Chaldea navy and gold), its summoning circle and its frames
    _holodori.scss  ← hololive Dreams' world: its front page, the sticker sheet, its calendar, songs, cards,
                      gachas and a holomem's page
    views/
      grid.ts       ← operator grid, live search, filter popover
      detail.ts     ← operator dossier, cloned from Sanity Gone (see below)
      events.ts     ← the Global event schedule, after Arkpedia's (see below)
      endfield.ts   ← the Endfield roster, a showcase of one operator and a filmstrip, with its search and filters (see below)
      endfield-detail.ts  ← the Endfield dossier (see below)
      ptn.ts / holodori.ts / fgo.ts  ← those games' roster pages: each fills card.ts's slots
      holodori-songs.ts / holodori-cards.ts  ← hololive Dreams' Songs and Cards pages, on the same roster
      holodori-holomem.ts  ← a holomem's own page: her key art, profile, cards, songs and stickers
      holodori-home.ts  ← hololive Dreams' front page: a tile to each page, gachas running, birthdays, newest songs
      holodori-gachas.ts  ← hololive Dreams' gachas: every banner recorded, with its logo, dates and cards
      holodori-card.ts  ← a card's own page: its art and videos, stats, skills, voice lines
      ptn-detail.ts  ← a Sinner's dossier, after the game's Chinese wiki (see below)
    index.html      ← markup shell; links styles.css
    fonts/barlow-condensed/  ← Path to Nowhere's placard face: two weights, each a WOFF2 and the
                      TTF behind it, and their licence (tracked)
    fonts/noto-sans-sc/  ← that face's Chinese: two weights cut by the build to what the placard
                      sets (scripts/lib/ptn-font.mjs), and the licence (tracked)
    fonts/poppins/  ← hololive Dreams' face: four weights (600 to 900) as WOFF2, and the licence (tracked)
    fonts/archivo/, fonts/jetbrains-mono/  ← Endfield's two faces, variable Latin WOFF2s, and their licences (tracked)
    fonts/cinzel/, fonts/eb-garamond/  ← FGO's two faces (Garamond with its italic), the same (tracked)

  styles.d.ts       ← `declare module '*.scss'` for the side-effect imports
```

## Webpack

Three config files:
- **`webpack.base.js`** — shared TS loader, SCSS loader chain (`MiniCssExtractPlugin.loader` → `css-loader` → `sass-loader`), resolve settings
- **`webpack.ext.js`** — extension entry (popup); copies `manifest.json`, `popup.html`, the four unsuffixed icon sizes, and `operator-details/` → `dist/ext/`
- **`webpack.web.js`** — SPA entry (app); copies `index.html`, all of `icons/`, `operator-details/`, `branch-icons/`, `portraits/`, `faction-logos/`, `endfield/portraits/`, `endfield/splash/`, `endfield/icons/`, `endfield/operator-details/`, `ptn/figures/`, `ptn/sinner-details/`, `holodori/figures/`, `holodori/jackets/`, `holodori/card-art/`, `holodori/card-full/`, `holodori/card-details/`, `holodori/stickers/`, `holodori/icons/`, `fgo/figures/`, `item-icons/`, `elite-icons/`, `potential-icons/` and `event-banners/` → `dist/web/`

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

**Scrollbars are the web target's alone** (`src/web/styles.scss`; the popup keeps the
browser's, by the owner's choice): an 8px gutter holding a 4px pill, no track and no arrow
buttons, 金藍 at rest (the one blue above 3:1 on both the page and a panel) and the accent's
gold while its box is being scrolled or the pointer is on it. Chromium and Safari take the
`::-webkit-scrollbar` parts; Firefox takes `scrollbar-width` / `scrollbar-color`, which sit
behind `@supports not selector(::-webkit-scrollbar)` because Chromium, given both, uses the
standard pair and goes back to a square thumb between arrows. The filter panel's track
stops 4px short of its round foot, where the thumb's tip crossed the corner.

The gold while scrolling is `scrollbar.ts`: one capturing `scroll` listener puts
`.is-scrolling` on the box and takes it off 700 ms after the last event, easing `--thumb`
between the two colours by hand with the Web Animations API (120 ms in, 600 ms out, from
whatever colour the thumb is at, so a scroll that resumes mid-fade does not jump). By hand
because a CSS transition would have to join each scroller's own `transition` list.
`--thumb` is a registered `<color>` (`@property`) so it can be eased at all, and it does not
inherit, since easing an inherited property on the page would restyle every element under it
each frame; the thumb reads its own box's value with `--thumb: inherit`. **The page's
scrollbar is styled from `<body>`, not `<html>`**: lit on `<html>`, the colour changed in
the computed style and never in the pixels, so the page's scroll events light the body.

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
endfieldPortraitUrl(id)                    // an Endfield operator's bust, bundle-relative endfield/portraits/
endfieldSplashUrl(id)                      // the same operator's full illustration, bundle-relative endfield/splash/
endfieldIconUrl(kind, name)                // an Endfield class, element or weapon glyph, bundle-relative endfield/icons/
factionLogoUrl(nationId)                   // bundle-relative faction-logos/ — a mask; takes any faction id
artUrl(rawUrl, width, quality?)            // full illustration, resized through wsrv.nl
operatorSkinAvatarUrl(id, suffix)          // per-outfit avatar — Arknight-Images CDN
itemIconUrl(iconId)                        // bundle-relative item-icons/ — keyed by iconId, not item id
eliteIconUrl(phase)                        // bundle-relative elite-icons/ — a mask, see eliteIcon()
potentialIconUrl(rank)                     // bundle-relative potential-icons/ — full colour, never masked
eventBannerUrl(banner)                     // bundle-relative event-banners/ — takes events.json's `banner` stem
skillIconUrl(skillId)                      // Arknight-Images CDN
moduleTypeIconUrl(typeIcon)                // module type badge ('gua-y') — Arknight-Images CDN
riicSkillIconUrl(skillIcon)                // base skill badge ('bskill_ws_nian') — Arknight-Images CDN
moduleImageUrl(uniEquipId)                 // module illustration — Arknight-Images CDN, ~300 KB, pass through artUrl
classIconUrl(slug)                         // Arknight-Images CDN, takes the CSS slug
archetypeIconUrl(subProfessionId)          // bundle-relative branch-icons/ — self-hosted
IMAGE_BASE
bindImageMirror(document)                  // installed by both entries; see below
```

"Arknight-Images CDN" is `IMAGE_BASE`, the repository on GitHub's raw host
(`raw.githubusercontent.com`). An image from it that fails is asked once of the same file
through jsDelivr before its own `onerror` runs: `bindImageMirror`, one capturing `error`
listener on the document. jsDelivr was the first host and is the fallback only, since it
fetches the whole repository before serving a file from it, and for this one that failed
53 of 303 files that exist and took about 8.7 s a file cold (GitHub: none, 0.8 s; 20
October 2026). The illustrations go through wsrv.nl, which caches a year, so GitHub is
asked directly for little more than the avatars and icons.

Branch icons are self-hosted because the old source (Aceship's mirror) stopped updating in
2022. Coverage is 72/72. The wiki's `Category:Branch icons` isn't exhaustive — "Supportive
Ranger Supporter.png" was never filed under it — so a branch the listing misses is fetched by
filename; callers still hide the `<img>` on error for anything the build couldn't get.

### Generated Operator Index (`src/shared/generated/`)

Built by `scripts/build-operator-index.mjs` and `scripts/build-range-index.mjs`,
**gitignored**, regenerated every build.

`operators.json` — one slim entry per operator, bundled into both JS bundles:

```ts
{ id, name, appellation, rarity, profession, subProfessionId, archetype, tags, releaseDate, releaseOrder, nation, nationId, faction, factionId, collab, collabLogo?, cnOnly?, mode? }
```

`operator-details/<id>.json` — the full `Operator` payload for **every** operator (460),
copied as static files rather than bundled. This is what makes a detail page load from a
same-origin file (~100 ms) instead of a live API call (~2.3 s).

`ranges.json` — every attack range referenced by any operator, skill or talent (~57 unique; operators share
them heavily), a few KB, bundled.

Operators flagged `isNotObtainable` are **kept, marked with their game mode** (29): the
`Reserve Operator - *` set and the Sharp/Pith/Touch/Stormeye/Tulip trainer families, which a
mode lends for a run and nothing gives you. The mode goes by the id's band, the split
AN-EN-Tags makes: the 500s are Integrated Strategies' (`mode: 'IS'`, 11), the 600s Stronghold
Protocol's (`'SP'`, 18); an unobtainable id in neither band would be dropped. The flag is
used rather than a name match because the trainer "Mechanist" (`char_610_acfend`) shares its
name with a real 6★ operator, as do "Raidian" and "Shalem". On a grid card they carry the
mode's initials as a badge (`.op-mode`) and its name up the edge strip, and the extension's
popup leaves them out.

**Where they sort is recorded in the repo**, `scripts/lib/mode-order.mjs`: one line per
mode-only operator, naming the released operator of its rarity that it comes just after. It
takes a `releaseOrder` a fraction past that operator's (the Stronghold Protocol trainers
364.01–364.08, after Lappland the Decadenza), so it sits beside it under the Release sort.
They were never released, so nothing dates them: no release date (the name lookup would hand
a trainer its namesake's), no Sanity Gone ordinal, a default-skin `getTime` of 0 in the
game's skin table, and a `character_table` order that goes by class rather than by date.
The places were worked out once from AN-EN-Tags' own list, `json/tl-akhr.json`, whose file
order is the order its grid shows within each rarity (not alphabetical: its maintainer
appends to it as operators are added): each goes after the newest released operator of its
rarity that the list has before it. They were then checked against the wiki's dates for each
mode's first CN run: Integrated Strategies' first operators after the batch of 2020-08-24
(Ceobe's Fungimist opened that day), its later ones after Highmore, Stronghold Protocol's
after the batch of 2024-10-31 (it opened 2024-11-15) and after that of 2025-10-31 (Alliance,
2025-11-14). Recorded rather than fetched each build because they do not change and the
fetch was one more thing to fail. A mode-only operator the record lacks sorts last, with a
build warning that names it. Payloads also carry `welfare`: true where
`itemObtainApproach` is an event reward, an anniversary reward or an Integrated Strategies
reward (81 operators).

**Four collabs have a logo of their own**, kept in the repo (`scripts/collab-logos/`, named
for the collab: `persona-3.svg`, `monster-hunter.svg`, `ave-mujica.svg`,
`delicious-in-dungeon.png`) because the game ships none: it files the Rhodes Island badge
under `sees`, `mujica` and `laios`, and Monster Hunter's operators are Rhodes Island's own.
They are the series' logos as Wikimedia Commons has them, each filed there as a public-domain
text logo and a trademark (the build script names the four files). The build bakes each
into `faction-logos/collab-<slug>.webp`, keeping only the alpha under plain white, since the
sources are black, white and red and the badge is a luminance mask; and it sets `collabLogo`
on those 19 operators' index entries, and `collab` + `collabLogo` on their payloads. Where
`collabLogo` is set, the card back and the detail header show it in place of the faction's
badge, with the collab's name as the tooltip. A collab with no file keeps its faction's
badge: Rainbow Six Siege has Team Rainbow's from the game. A new collab's logo is one file
dropped in that folder under the collab's name.

**Seven sources are joined at build time.** Only the game's own excel tables are load-bearing
— every other fetch degrades with a `console.warn`. (The wiki's release dates did not until
21 October 2026, when a wiki.gg outage, 502s on every wiki on the platform, failed the whole
operator build and with it the daily deploy, since `build:index` is a chain of `&&`. They now
fall back to the last build's dates, and the two operators whose archetype only the wiki
names keep the last build's: run against the downed wiki, the index came out identical.) When those tables are unreachable, both index
scripts keep the previous build's `src/shared/generated/` and exit 0 rather than failing or
overwriting it with an empty bundle; CI restores that data from the last run's cache (see
`.github/workflows/deploy-pages.yml`). GitHub drops a cache nobody has used for 7 days, so
each deploy also uploads every baked image (not the JSON) as `images.tar` on the
`image-backup` release, and a run that finds no cache restores the images from it before
building; the payloads are rebuilt from their sources. What the pages load from other hosts
at runtime is backed up by hand to two more releases, by scripts that share
`scripts/lib/release-backup.mjs` (fetch what `backup/<name>/` lacks, start from the
release's tar when that folder is empty, upload only when something was fetched):
`node scripts/backup-art.mjs` (Arknights' illustrations, outfit avatars, module
illustrations and icons from Arknight-Images, and Path to Nowhere's prints from its wikis;
the illustrations and prints kept as 2048px WebP, the art viewer's largest size; the
`art-backup` release, 19 October 2026) and `node scripts/backup-holodori-media.mjs`
(hololive Dreams, below). Run both after a build that added operators, Sinners or cards. With nothing on disk to keep, the build still
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
  match. A page is read without its editors' comments, as the wiki reads it: a new operator's
  page keeps the untranslated Chinese in one where the English is to go, and taken as text
  it came out on the site inside its `<!-- -->` markers (de Toledo's and Homebound's skills
  did). Pages are matched by the game id in the infobox, not the name ("Viy" is Вий). The
  handbook comes from two more places on the same wiki: the `OperatorFiles` table answers
  Basic Info and the Physical Exam line by line, and each operator's `/File` subpage holds
  the prose files — in English only where someone has translated them (Aphrissa in full, a
  Profile here and there), in Chinese otherwise. These operators carry `cnOnly` in the index
  and the payload: an "Upcoming" tag on the detail page's artwork and the "CN" side of the grid's Server filter.

  **No source has it**, so it is still Chinese: base-skill *names* for these operators (the
  wiki's `BaseSkills` table has 1 of their 41, and its own page prints "Unknown base skill";
  AN-EN-Tags translates the descriptions but not the names), a module's talent text at a
  raised potential, module flavour text, most archive files, and missions on a few pages.
- **sanitygone.help** — `releaseOrder`, a PRTS-scraped ordinal baked into Sanity Gone's own
  bundle. Near-universal coverage and verified accurate, including for operators the wiki
  can't date at all, so it's the **preferred** sort signal at runtime; `releaseDate` is the
  fallback, not the reverse. The asset URL is content-hashed and changes on every deploy,
  so it's discovered live by chasing page → `OperatorList.[hash].js` →
  `operators-index.json.[hash].js` rather than hardcoded. An operator Sanity Gone has not
  numbered yet has no `releaseOrder` in its entry, so the pattern that reads one stays
  inside the entry's own braces: left free to run on, it gave Timeslot the next entry's
  ordinal (Mayer's 57, then Scene's 148) and left that operator with none.
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
shipping a wrong order. Current state: ~460 operators, ~404 with a real CN date, ~430 with
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
It leaves out the operators only a game mode lends (`mode`): it has nowhere to say what they
are.
Opening an operator calls `getOperator()`, which reads the copied
`operator-details/<id>.json`. State (search text, current view) lives in module-level
variables and does not persist across popup close/reopen.

- `popup/index.ts` — search input, grid/detail switching, click delegation on `#view`
- `popup/render.ts` — pure render functions plus `bindAvatarFallbacks`
- `popup/popup.html` — layout shell; links `popup.css`

## Web SPA (`src/web/`)

Vanilla TS, no framework. Hash-routed: `#/` shows the operator grid; `#/op/<id>` shows the
operator dossier; `#/events` shows the Global event schedule; `#/endfield` and
`#/endfield/op/<id>` are the second game's roster and dossier; `#/ptn` and
`#/ptn/sinner/<id>` are Path to Nowhere's; `#/holodori` is hololive Dreams' front page, `#/holodori/holomems` its
sticker sheet, `#/holodori/songs`, `#/holodori/cards` and `#/holodori/gachas` its game's songs, cards and gachas, `#/holodori/card/<id>` a card's page and
`#/holodori/holomem/<id>` a holomem's page;
`#/fgo` is the roster of the one game that has nothing else yet. Every link to `#/`
(the wordmark, the Arknights tile, Operators, a breadcrumb) is taken over on a plain click
to land on the bare URL instead (`index.ts`).

**The sidebar** (`.sidebar`, in `index.html`) lists the games, one tile each, down the
window's left edge. It is fixed, and `body` is padded to clear it (`--side-w`), so nothing in
the page moved into a wrapper. A tile carries the game's emblem, painted as an alpha mask in
the tile's colour (金藍, the text colour under the pointer, the accent's gold for the game
showing): Rhodes Island's triangle for Arknights and Endfield Industries' for Endfield, from
the two wikis' `File:Rhodes_Island.png` and `File:Endfield_Industries.png`, baked once to
128px WebP in `icons/games/` (alpha times luminance, so the tower's black detail is cut out,
then white). The three games after them (PtN, Holodori, FGO, the owner's names for them)
have theirs from files the owner approved on 11 October 2026, baked the same way: for Fate/
Grand Order, Chaldea's laurel (the FGO Fandom wiki's `Chaldea Security Organization Logo`,
black on transparency, so its alpha is the shape); for hololive Dreams, hololive's triangle
(Wikimedia Commons' `Hololive 2026 logo triangle.svg`; hololive's mark, not the game's own);
for Path to Nowhere, the X of its logo (the wiki's `PtN Logo.png` is the name in white
across a red X of chain and brush, which one colour cannot hold and a 30px tile cannot
read, so the emblem is how red a pixel is, its gaps closed and its spatter dropped). A
squarer emblem dropped into `icons/games/` under the same name replaces any of them.
Which game a page belongs to is `gameOf()` in `index.ts`, by the route: everything that is
not another game's is Arknights', so a link made before there were others still lands where
it did. `GAMES` beside it holds each game's roster and its word for its cast; a game's tile
is `#nav-<its name there>`.

**On a phone (640px and under) the sidebar is a drawer**, since a rail would cost the grid a
column (it was a bar along the window's foot before, which the owner found was not a sidebar
at all). A menu button at the start of the topbar (`#side-toggle`) pulls it out from the left
over a dimmed page; it shows a "Games" heading and a close button, and a row per game with
the emblem and the name. It closes on the scrim, the close button, Escape, any change of
page (which is how picking a game closes it), and the window widening past 640px. While it
is out the topbar and the page are `inert`. Like the filter panel it animates whatever
`prefers-reduced-motion` says.

**The section links** (`.sections`, at the topbar's right end on every page) are the game's
own pages as a segmented pair: Operators and Events, the one showing filled in 群青. They
replaced a lone Events link, from which the only way back was the wordmark. The first goes
to the roster of whichever game is showing and is named for that game's cast (Operators,
Sinners, Holomems, Servants: `GAMES` in `index.ts`); it stays lit on a dossier. Events is
Arknights' alone and hides on the other games. hololive Dreams has three of its own, Songs,
Cards and Gachas, which show on its pages alone; its front page (`#/holodori`, where its
tile lands) is none of the four and lights none, so the fill is hidden there
(`markSection()` with no link). On a phone they drop their glyphs, and hololive Dreams' four
take a row of their own under the wordmark, with the search box under them on its rosters.

**The fill travels between the two as a drop of water** (`sections.ts`; the owner's ask:
"a water drop or blob moving to another"). It is not the link's own background: a blob
(`.sections-blob`) sits under the link being shown, in a layer of its own under the links
(`.sections-goo`), and on a change of section it goes to the other link over 520 ms, its
front edge setting off first so that it draws out on the way, trailing a thinner tail
(`.sections-drop`) that it pulls in after it. The layer wears a second goo filter,
`#goo-drop` in `index.html` (the filter panel's blur and cut, with no rim and a blur of 3,
since a wider one would cut the tail away), which is what tapers the tail into the blob.
The move is written out as 25 keyframes for each of the two, not left to an easing: the
tail's length is the gap between two edges that each ease on their own. The blob is placed
by measuring the link, and a `ResizeObserver` on the links re-places it when one changes
size (another game's label, a phone's smaller type); CSS cannot lay it out against the
links, for the reason the filter panel's tab is measured. `markSection()` does nothing but
re-place for the link already marked, which matters: **a change of hash fires a `popstate`
and then a `hashchange`**, and until 21 October 2026 every view was mounted twice per
navigation because `onRouteChange` acted on both, the second call cancelling the move as it
began. The router now skips a route whose address is the one it last drew for (`drawn` in
`router.ts`, which `goHome()` also sets, since it changes the address through the history API
and fires only `popstate`), so a view mounts once. Like the filter panel it plays whatever
`prefers-reduced-motion` says.

**The topbar lays itself out by its own width**, a container query on `.topbar`, because the
sidebar takes a share of the window that the bar never has. With 960px or more it is one
row: wordmark, search box, count, then the section links at the far end. The search box is
the one thing that gives way, from 420px down to about 340. Under 960px it is two rows: the
wordmark, the count and the section links above, the search box below at the bar's full
width. The phone rules at the foot of `styles.scss` lay the bar out the same way by the
window's width, which is what a browser without container queries is left with, with the
menu button first; on the grid the count pill gives its room in row 1 to the section links
and shows instead as a bare number inside the search box (`#search-count`), which `body`'s
`data-view` (set by `index.ts`) decides. Under 360px the wordmark shrinks to fit a 320px phone.

**Breadcrumbs** (`crumbsHtml` in `format.ts`) open a dossier and the schedule: the way back
as a pill with a back chevron ("‹ Operators", or "‹ Sinners" on a Sinner's page), a chevron, and the page's own name, in the
small caps the section labels use. A long name ellipsizes before the pill gives way.

### Grid (`src/web/views/grid.ts`)

Reads the bundled index through `src/web/operator-index.ts` and makes **no network requests
for data** (only images). Cards are built 48 at a time as the page nears the end of what
exists: all ~430 at once was ~550 ms of paint and layerize before first paint, and held
back every portrait request until it finished. The topbar's search box sits on the left,
beside the wordmark, 420px wide where the bar has the room (see above). It is one box with the Filters
button inside it at its right end: `.search-wrap` draws the one fill and the one line, so
nothing in the outline says where the field (`.search-field`) stops and the buttons' part
(`.filter-tab`) starts. Every corner follows the box's own radius, `--box-radius` (8px):
what sits inside the box is inset `--box-inset` (4px) from its outer edge and takes the
radius less the inset (4px), so inner and outer corners turn about the same centre. The
box's magnifier is its clear button: it turns into a cross once there is text
(a quarter-turn and a fade, played whatever `prefers-reduced-motion` says, like the filter
panel), and pressing it empties the box. The result count beside it is a pill. The Filters button opens a popover that hangs from the search box, as wide as the
box, and closes on the toggle, the close button, Escape, or a press anywhere outside the
cluster (a press in the search box is inside it: typing a name while picking filters is one
job). While it is open, Clear and the close button unfold beside the toggle
(`.filter-extra`, folded to no width when shut).

The popover is a folder with a tab. Its body hangs flush from the box's lower edge; its tab
stands up inside the box's right end, behind Filters, Clear and the close button, so the
buttons that work the panel sit on the panel's own tab and the field sits in the notch
beside it, closed off into a box of its own. Two of that box's corners are round: the top
left, which is the search box's own, and the bottom right, where the shape turns round the
end of the field. The other two are turned inside out: the outline's top edge runs flat
from the field on over the tab's corner, its left edge flat from the field on down past the
body's, and the field's boundary there is the round corner of the tab, or of the body,
curving in to meet that edge. That is the owner's mock; a pass that left those two joins
square, with no curve, was sent back. The
shape is two plain blocks behind the panel (`.blob-tab`, `.blob-body`), run together by an
SVG "goo" filter in `index.html` (blur, then cut the blur back to a hard edge, then a 1px
rim); the panel's own content sits over them unfiltered. The body starts at the box's lower
edge. The blocks are square, and the filter's blur is what rounds every corner of the shape:
a corner comes out at about 1.86 times the blur, and 4.3 makes that the box's 8px, so the
tab and the panel's foot carry the radius of the box they hang from. The two corners the
field turns inside out are not the filter's, though. The tab's top left and the body's top
left are put out of sight behind the field (the tab block runs 12px further left than the
buttons, and a stub stands up from the body's corner, `.blob-body::before`), and the round
corner seen at each is drawn by the field: `.search-field::before` and `::after`, 9px
squares whose radial gradient leaves the inside of the curve clear, draws the line along
it and fills the rest with the field's fill, with the flat edge's line as a border down one
side. So the curve is the field's own line and turns the accent with it. The top right one
fades in with the field's line; the bottom left one, and that corner of the field going
square, wait 0.42s for the body, which is within 2px of the edge by then. The field's bottom right
corner is a little tighter than the filter's (6px) and is the only line there, with the
shape solid behind it. Filters gives up its lit state for a quiet outline while the panel
is open, like Clear beside it. The box is on a layer above the shape. Open, the box's own
fill and line fade out, which is what uncovers the tab, and the field shows the fill and
line it keeps underneath (its border lies exactly on the box's, by negative margins, and
its fill stops short of it). Both blocks stop 1px short of the box's edges, so the filter's
rim, drawn outside a block, lands on the box's own border line. The tab ends where the body
begins and no lower: two blocks that only touch still join, because their blurs add, and
nothing is left hanging under the box when the body has run back up. `grid.ts` measures the tab's width and the box's height with a
`ResizeObserver` (`--tab-w`, `--box-h`): the first moves with the Filters label and all
through Clear and the close button folding. CSS anchor positioning cannot do that job here:
a `filter` makes its element the containing block for everything positioned inside it, and
an anchor has to be reachable from that containing block, so the blocks inside the filtered
layer cannot anchor to the buttons outside it. Opening scales the body out from under the
tab on the card's ease (a fast start and a long settle, no rebound) and closing draws it
back up; the blocks never fade, because the filter cuts on opacity. `#more-filters[hidden]`
keeps its layout: the shape takes its height from the panel and still has to run back up.

**It animates whatever `prefers-reduced-motion` says, on purpose** (the comment on
`.filter-pop` has the reasoning). On Windows that setting is the "Animation effects" switch,
off on the owner's machine, and with it honoured the panel appeared and vanished with no
animation at all. An earlier rule honoured it only half, by a specificity accident: the open
state still animated and the close did not, which is what "the close has no animation" was.
`card-spin.ts` takes the same view of that setting.

Inside the popover: class tiles (glyph over name, four across); Archetype / Subclass tiles in
the same style, grouped under a header per picked class and shown only once a class is picked
— multi-select, where a picked branch narrows only its own class (Caster + Supporter + Mech-accord
Caster is every Supporter plus the Mech-accord Casters), and a branch that would yield nothing
under the other filters dims; a six-segment rarity group tinted by rarity; collab
chips; a Server button split in two, GLOBAL and CN (the CN-only operators), each half with its count;
a Game mode button split in three the same way, ROSTER, IS and SP (the operators only
Integrated Strategies or Stronghold Protocol lends); and an Advanced options disclosure
holding Sort (Release order / Name — clicking the
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
  1200px. Clicking the art opens `art-viewer.ts`: a centred modal `<dialog>` popup (960×840
  at most, the page dimmed around it, an X in its top-right corner) with the piece at 2048px;
  zoom, 50–400% (every piece opens at 100%, which fits the stage), by buttons, slider, wheel,
  a two-finger pinch on a screen or a trackpad; drag to pan once zoomed in; and every piece
  the operator has by arrow buttons, the arrow keys, a thumbnail row, a sideways drag at 100%
  or below, or a two-finger sideways swipe on a trackpad. The piece's name is at the bar's
  left and its "2 / 3" count at the right, in the popup's bottom-right corner. The
  stage sets `touch-action: none` and reads every gesture itself from pointer and wheel
  events (a trackpad pinch is a wheel with ctrl held; Safari's is its own `gesturechange`).
  The page takes whichever piece was showing when it closed.
- **Skin rail** — renders each outfit's **55 KB square avatar**, not its illustration.
  Pointing 64px thumbnails at full art meant SilverAsh pulled 16.4 MB before the page
  settled; avatars put that at ~2.9 MB. A missing avatar falls back to the illustration.
- **Panel** — rarity-tinted strip with stars, then faction badge + serif operator name (the
  alter epithet in `--dim`) + class / branch / position row. The badge is the operator's most
  specific faction (team, else group, else nation), painted as a luminance mask in one colour
  for every operator (the accent's gold at 60%, as on the back of a card; it followed rarity
  until the owner found that odd, and gold was their pick over a pale neutral). A crossover
  operator shows its collab's own logo there instead (Persona 3 Reload, Monster Hunter, Ave
  Mujica, Delicious in Dungeon; see `collabLogo` above), because the game files the Rhodes
  Island badge under `sees`, `mujica` and `laios`. **LIMITED** sits in the artwork's
  top-right corner (`splashTagsHtml`), for the 26 operators the CN gacha table's LIMITED
  pools name plus every collab operator (27; they come from LINKAGE pools, which that table
  doesn't flag). It and the other tags are the same outlined pill, stacked one above the
  other at one width: a grey "Upcoming" (CN-only), a grey "IS" or "SP" (an operator only
  that mode lends), "Welfare" in the text colour (a free operator, the payload's `welfare`),
  and LIMITED in the rarity colour. All but LIMITED carry a tooltip. Beside the name they
  squeezed it on a phone. The branch name carries the
  class trait as its tooltip. Position is Melee, Ranged, or — the reference's rule —
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
hover (after a 300 ms rest, so the grid's cards don't flash theirs), on a tap, and on
keyboard focus. Every tooltip on the site goes through it; no element carries `title`. That covers ~98% of keyword uses; the rest render without one.

Not cloned, for lack of data: **summon/token** stat blocks, the Misc tab's potential-token
row, and outfit prices. `src/web/icons.ts` draws the stat, skill and position
glyphs inline rather than fetching them — ATK, attack interval, block, DP cost and the three
position glyphs are Sanity Gone's own drawings (GPL-2.0 via iansjk/sanity-gone), since the game
ships none. The elite and potential badges are the game's own art, baked by the build.

### Events view (`src/web/views/events.ts`)

The Global server's schedule, after **Arkpedia's** Schedule page (`arkpedia.net/schedule`),
as three tabs that are routes of their own: **Events** (`#/events`), **Headhunting**
(`#/events/pools`) and **Calendar** (`#/events/calendar`).

The two lists share one layout: sections of banner cards — Live now, Upcoming (announced for
Global), and Predicted (run on CN, not yet announced for Global). A card is the banner, the
kind as tags (Side Story, Vignette, Rerun, Crossover, the Celebration / Festival / Carnival
group…; for a pool Standard, Kernel, New Operators, Limited, Joint Operation…), the name, the
dates in server time (UTC-7) and a countdown; the dates' tooltip gives the reader's own
time, or for a prediction the CN run it came from. An event whose stages have closed stays
under Live now until its shop does, reading "Stages closed · Shop closes in 3d". A pool card
also lists its featured operators, highest rarity first, in their rarity's colour, each a
link to the dossier. Which section a thing is in is decided at render time from the reader's
clock, since the page is read for up to a week after the build. The countdowns are a live
clock, to the second ("3d 18h 26m 05s"): the schedule is baked but "now" is the reader's, so
one `setInterval` rewrites each card's line every second and rebuilds the list when
something starts, closes or ends. The views have no unmount hook, so the timer stops itself
once its panel is gone from the page.

The calendar is one month of the server's days, a grid per week: the dates in the first row
and a lane per overlapping bar under it. An event is a filled bar, a prediction a dashed
one, what is running today takes the accent, and a Headhunting toggle adds the pools as
outlined bars. Previous / next stop at the first and last month there is anything to show
(the build keeps 92 days of what has ended, so the current month is whole). The month and the
toggle are module state, kept across visits like the grid's filters.

`scripts/build-event-index.mjs` bakes `events.json`. **Events come from arknights.wiki.gg's
Cargo tables**: `Events` (English name, type, rerun / crossover flags, CN-exclusive flag) and
`EventServerDetails` (each server's start, end and banner, times in UTC). The game's own
`activity_table` was the other candidate and lost: it names a CN-only event in Chinese, has
no Contingency Contract, and knows nothing of a Global event until the client update that
carries it, where the wiki has one as soon as it is announced. It is still read for the one
thing the wiki lacks, `rewardEndTime`, when the shop closes: the game's activity for an event
is the one that ends on the same second and starts within two days (the names differ).

**Pools are a join.** The wiki's `Banners` table has every pool's featured operators, and the
dates of the named ones on both servers. The rotating standard and kernel pools it lists with
no dates at all, so those come from the game's `gacha_table`, matched by number: the Nth
standard pool the game has opened ("Rare Operators…", `NORMAL` / `DOUBLE` rules) is the
wiki's Standard Pool N, and likewise `CLASSIC` / `CLASSIC_DOUBLE` for kernel, whose operators
the game names by id in `dynMeta`. The wiki's operator names are matched to the index blind
to punctuation and accents ("Kal'tsit - Esperanta" for "Kal'tsit·Esperanta"); one that does
not match stays a plain name.

**A predicted date is the CN run plus a lag in calendar days**, each server's own (CN is
UTC+8, Global UTC-7): the median, over the last 10 events both servers have run, of the days
between the two starts (159 in October 2026), put on Global's hours (opens 10:00, closes
03:59 server time). That reproduced Arkpedia's predicted schedule to the day for three months
ahead. Two things override the usual lag. **A neighbour's:** anything that opened on CN
within 4 days of an event whose Global date is known takes that event's real lag, which is
how a pool lands on the day its own event was announced for. **The anniversary:** the CN
summer carnival (the wiki's `Carnival` group) is pinned to 16 January, Global's launch day,
where it has opened in 2024, 2025 and 2026 (the Friday before in 2022 and 2023), and its
pool follows it. Nothing after the carnival is moved: in past years the lag was back to
normal by the next event, and Arkpedia's later predictions, which run 10–16 days after ours,
could not be reproduced from any rule. A CN run whose predicted Global end has passed with no
Global run is dropped as not coming, as is the event the wiki flags CN-exclusive.

Banners are the wiki's 1560×500 PNGs (~1 MB), fetched as its 960px thumbnail and re-encoded
to WebP (~50 KB), for the events and pools the lists show (~32 files). Files are named for
the wiki image, not the event, so an event's banner changing from the CN one to the EN one is
a new file; ones nothing listed uses are deleted. None of this is load-bearing: with the wiki
unreachable the last build's `events.json` is kept, or an empty one written, and the page
says it has no schedule; with only the game's tables unreachable the schedule is written
without shop times and rotating pools.

Not built: Arkpedia's birthdays on the calendar and its pull planner.

### Endfield (`src/web/views/endfield.ts`, `endfield-detail.ts`)

Arknights: Endfield, the second game. It was the owner's "you pick one", and picked because
its wiki (`endfield.wiki.gg`, the same platform as the Arknights one) keeps the same kind of
Cargo table the Arknights build already reads, and because an operator there is close enough
to one here to go on the same card.

**The roster** (`#/endfield`) is a showcase, the owner's pick of three directions on 22
October 2026 (a design canvas of Endfield's and FGO's directions, built with the real art):
one operator at a time, their splash art at full size on a drafting grid with a ruler down
its edge, their element written out huge behind it in outline and its colour, and their file
on a plate beside it: rarity as ticks in the game's colours (6★ orange, 5★ gold, 4★ violet),
the name in wide capitals, faction, class / element / weapon with their glyphs, the quote,
the tags and an "Open dossier" bar in the yellow. Under it a filmstrip holds every operator
the search and the picks leave, in a group to each rarity; a frame, the plate's arrows or
the arrow keys anywhere in the showcase put an operator up (only the feature is redrawn, so
the strip keeps its scroll), and the operator up is kept across visits and through a search
that keeps them. There are 34, the Endministrator's two forms as two. Under 900px the art
goes over the plate. The element colours are ours (Electric is violet so it never reads as
the yellow); the game's own were not checked. The Events section link is Arknights' and is
hidden; Operators links here.

**The world** is the game's own interface, on both its pages (`body[data-view='endfield']`
and `'endfield-detail'`, `_endfield-grid.scss`): off-white and concrete, ink, one signal
yellow, Archivo at its widest for names and JetBrains Mono for codes (Google Fonts' variable
Latin cuts, self-hosted; the owner approved the download on 22 October 2026). Like Path to
Nowhere's it is the site's surface variables restated, so the sidebar, the topbar and the
panel follow; the game showing is its emblem in ink on the yellow, the section link ink with
the yellow on it. The dossier is still the Arknights dossier's parts on that paper, its
header band paper with an ink rule (the Arknights header's charcoal glass left the ink name
unreadable) and the name in the roster's wide capitals.

It has the topbar's search box and filter panel, which are the same elements the Arknights
grid works: whichever grid mounted last has them, each keeps its own state, and every handler
is assigned, not added, so that only one grid is listening. The search is by name. The
panel's groups are Class (6 tiles), Element (5), Weapon (5), Rarity (4 to 6) and Faction (9
chips): any pick within a group, every group across them. Its buttons carry `data-group` /
`data-value` where the Arknights panel's carry `data-kind`, so that neither grid's handler
takes the other's buttons in the half second the panel takes to hide after a change of page.
`grid.ts` exports the two things both grids need, `focusSelector` and `watchFilterTab`; the
rest of the box's and the panel's handling is a second copy of `grid.ts`'s, about 45 lines:
a change to either there has to be made here too.

**The dossier** (`#/endfield/op/<id>`, `views/endfield-detail.ts`) is on the Arknights
dossier's layout: the splash art behind the page and in the art column, and in the panel the
rarity strip, the name (with the form, for the Endministrator), class / element / weapon
with their glyphs, the quote, a fact list (faction, gender, birthday, main and secondary
attribute, headhunting, expertise, hobbies, gift preference; a row the wiki has nothing for
is left out) and the tags. All of that is from the roster index. **It does not read the
per-operator payload yet**, so it has no attributes, potentials, skills, talents, base skills
or file; `fetchEndfieldOperator` and the payload's types in `endfield-index.ts` are there
for that pass, and the page's body is one function per section so that those sections are
appended. An id the index lacks reads "Unknown operator".

`scripts/build-endfield-index.mjs` bakes all of it from the one wiki. From its `Operators`
table: `endfield/operators.json` (id, name, rarity, class, element, weapon, faction, tags,
and the profile: gender, birthday, quote, expertise, hobbies, gift preference, main and
secondary attribute, headhunting; a '???' the wiki writes for "not known yet" is dropped;
highest rarity first, then by name); each operator's portrait, the image the table calls
`tooltip`, which is the same 180x360 bust as an Arknights card's (the Endministrator's two
are a little smaller), re-encoded to WebP at about 21 KB; and each one's splash, fetched as
the wiki's 1024px thumbnail of a 2048px PNG and re-encoded to WebP (8.5 MB for the 33). The
16 glyphs are the files the wiki keeps under each class, element and weapon type's own name
(`Guard.png`, `Great Sword.png`), baked to 64px WebP; three of them (Guard, Caster, Defender)
carry a soft shadow, so they are shown as pictures, not painted as masks. And from each
operator's own page, read 50 pages to a request and parsed by `scripts/lib/endfield-page.mjs`:
`endfield/operator-details/<id>.json`, with the rest of the file (full name, race, the
physical exam, what each expertise and hobby is, the profile), attributes at six levels,
potentials, skills with their twelve ranks (Arcane's two sets, each under its form's name),
talents and base skills. The Endministrator's two ids share a page and so a payload. Costs
are left on the page, as are the lead paragraph, the recommended weapons and the voice
actors.

Images already on disk are kept; the payloads are written again every build. None of it is
load-bearing: with the wiki unreachable the last roster is kept, or an empty one written,
and the page says it has no operators; a single image or page that cannot be had is named
in that set's summary line and whatever is on disk for it stays.

Not built: the dossier's sections from the payload, what anything costs, a release order.

### The other games' rosters (`src/web/card.ts`, `views/ptn.ts`, `views/holodori.ts`, `views/fgo.ts`)

Path to Nowhere, hololive Dreams and Fate/Grand Order (PtN, Holodori and FGO on the sidebar,
the owner's names for them) are the rest of the owner's plan of 20 September 2026 for the
site to carry the games they play. The sources were researched then, and each was checked
again on 11 October. FGO has a roster with search and filters, and no dossier: its cards
open nothing. Path to Nowhere has search, filters and a dossier per Sinner as well, and
hololive Dreams search and filters (all below).

**The owner means each game to have a design of its own in time.** Path to Nowhere's roster
is the first to have one (the line-up wall, below), hololive Dreams' the second (the
sticker sheet, below). Until a game's turn comes it is on the
Arknights card and the Arknights dossier's parts, and its pages copy what its own reference
site shows, in this site's elements.

**One card, one page.** `card.ts` has both. `RosterCard` is the Arknights plate with a
game's own words in its slots (name, epithet, class line, micro line, the word up the edge,
tags on the back, art, and `href` where the card opens a page), and `mountRoster(container,
roster)` shows a `Roster`: its items, the function that makes a card of one, the noun the
count uses, and what to say when the build baked nothing. The count goes in the topbar's
pill, and the cards are built 48 at a time as the Arknights grid builds its own. With
`find`, the page also has the topbar's search box and filter panel: the text the search
looks in, and a list of `RosterFilter` groups, each its values and one of four looks
(tiles as the Arknights classes are, a joined row as its rarities are, loose chips, or
badges), with `folded` for a list too long to stand open. A group of badges is laid out as
a row of a table, its name in a cell at the left and its choices beside it (`.filter-row`);
a badge can carry a picture before its name (`icon`), say something other than the value
it filters by (`text`), and a group can be sorted into named kinds, a line to each (`sets`).
Any pick within a group, every group across them. The search and the picks live in a `RosterState` the game's own view keeps, so they
survive a visit elsewhere and never show on another game's roster. With `looks`, a switch
over the grid (`.roster-bar`, the Any / All switch's construction) chooses between two or
more ways of drawing the same cards, and `toCard` is told which (`name` is what a screen
reader calls the switch, "Card art" if not given); with `orders`, a second
switch beside it chooses the order they are dealt in (the first is the one a page opens in;
one with no `compare` is the roster's own, any
other a `compare`, and the sort is stable, so what an order does not rank stays as the
roster has it). With `switches`, the page has switches of its own before those two, each
answered by its own `pick` (Path to Nowhere's language, which mounts the page again), and
`prompt` words the search box where "Search <noun>…" would be the wrong language.
**A roster that is not a grid of cards gives `draw` in place of `toCard`**:
it is handed the element to fill and the items in the order to show them, with the look
and the order that are on, and draws its own page; the count, the search, the filters and
the two switches are still `card.ts`'s. The handling of the box
and the panel is `grid.ts`'s once more (assigned handlers, since every roster works the
same elements; `data-group` / `data-value` on the buttons, as Endfield's), written here
once for any game that asks; a roster without `find` puts the box away. Whichever roster
mounts words the search box for its own cast. Three things about the plate that a view has
to know:

- **`tier` is the colour and `marks` is the tab**, and the two are separate. `tier` (1–6)
  picks the rarity colour; `marks` is what stands on the tab, a character to a line. The
  stylesheet cuts a tab's edges under each rarity class for a tab of that many lines, so
  `card.ts` gives the tab the class of its line count and sets the colour by hand. A view is
  then free to put five stars in the top colour (FGO) or a year in the plainest.
  `marksLabel` is the tab as a screen reader is to say it, since it is not a rarity
  on every roster.
- **`art` is optional.** Without it the plate shows the name's first letter.
- **The plate is 1:2 and `.op-avatar` contains its picture**, which suits the Arknights
  bust and not Fate/Grand Order's figure: that game's own partial (`_fgo.scss`, loaded
  last by `styles.scss`) switches its page to `object-fit: cover`, scoped by the
  `data-view` its route puts on `<body>`.

On a phone the pill drops the noun and keeps the number (`.count-noun`): the section link
beside it is the same word, and "54 holomems" beside "Holomems" did not fit the row.

**PtN's, hololive Dreams' and FGO's art is baked**, by `scripts/lib/bake-images.mjs`, which
the three scripts call: each picture is fetched from its source once, four at a time, cut to what a card shows
of it and written as WebP beside the roster, and kept from then on (CI restores it with the
rest of the generated data; delete the directory to refresh). An entry's `art` is the baked
file's address beside the page, or the original's on the source's own host for a picture
the bake could not get, which is why FGO's partial keeps its rule: on a baked picture it
changes nothing. The owner approved those downloads on 11 October 2026 (143 PNGs and about
44 MB from the PtN wiki, 470 PNGs and 42.5 MB from Atlas Academy, which baked to 6.1 MB and
5.3 MB), and on 12 October the same PtN files a second time, with the 142 originals, to be
baked whole for the wall (285 files, about 125 MB, baked to 20.5 MB). On 12 October too:
11 illustrations from the game's Chinese wiki, for the Sinners the English wiki has no
original of (1200x1500 PNGs), and its 25 badges for `icons/ptn/`. And on 13 October 10
mugshots (`证件照`, 600x1200 PNGs, 274 to 616 KB, 4 MB in all, baked to 39 to 86 KB) for
the Sinners the English wiki has none of.

**Path to Nowhere** (`#/ptn`, 160 Sinners: the English wiki's 144, five it has no page for
yet, and 11 only the CN server has, all below). `scripts/build-ptn-index.mjs` reads
`pathtonowhere.wiki.gg`, which has no Cargo tables. A playable Sinner's page is one call of
`{{SinnerPage}}` (or `{{ReforgePage}}`, ten of them), and both templates file the page
under `Category:Playable Sinners`, so that category is the roster and the head of the call
is the Sinner's file. (`Category:Sinners`, the likelier name, holds the two templates and
nothing else.) The category is read as a generator with the pages' text, 50 to a request,
and the mugshots' addresses are asked for the same way: six requests a build. An entry is
id (the page title as a slug), name, number (what follows `MBCC-S-`, which is not unique),
rank, height in centimetres (every file has one, 115 to 191), tendency, libram, birthplace,
tags, and the pictures: `figure` and `figureOriginal`, the mugshot (the standing figure the
wiki's own infobox shows, `File:<page> Prisonphoto.png`, 150 of 160; the other 10 the
Chinese wiki's) and the original illustration (all 160, 11 of them the Chinese wiki's),
each baked whole, cut back to the figure's own edges and no taller
than 1100px, with its width over its height; and `released`, the day they came to the
Global server, which is not the wiki's (below). The order is rank S, A, B and then name.

Its two references are the owner's: the game's Chinese wiki (`wiki.biligame.com/wqmt`) and
`s1n.gg`. **The Chinese wiki is a source for the build as well as the model for the
pages** (`scripts/lib/ptn-bili.mjs`). It was taken for one a script cannot read, and it
is not: it runs Semantic MediaWiki, its `api.php` answers the build's own user agent and
its `robots.txt` does not close it, and one `action=ask` over `[[分类:禁闭者]]` returns
every Sinner with the properties its own roster filters by. The build takes from it each
Sinner's Chinese name (`nameCn`), its tags for them (`tagsCn`: 体系 and 角色TAG, 59 in
all, which are not the English wiki's 47 translated), whether they are limited or a
collab's (`limited`), whether they deal core damage (`core`), and the day they came to the
CN server. A row is joined to the English roster by the Chinese name the English page
gives, then the English name the Chinese page gives, then the number where only one Sinner
has it; that matched all 149, and **the 11 left over are on the CN server alone**
(`cnOnly`): five still to come to Global (Arancia, Daffodil, Famorene Eirene, Requiem,
Helix) and the six of a JoJo collab (the owner's choice of 12 October 2026 to carry both).
They have a `releasedCn` and a collab's own `code` where they have no MBCC number, and
**their whole file is that wiki's page for them, in Chinese**
(`scripts/lib/ptn-bili-page.mjs`, 13 October 2026; the first pass left them a head and
nothing under their tabs, which the owner found). The page is one `{{禁闭者图鉴}}` call
whose parameters are the same things the English wiki's call has: attributes (level 1, the
top of each promotion, level 90), the basic attack, ultimate and two passives with ten
levels each, five shackles, ten compliance stages, six materials, and the files. Its
four templates become game markup (`{{禁闭者数值}}` a raised value, `{{伤害文本}}` a
reminder, `{{术语查看}}` its text, `{{展开折叠}}` its text under the condition that
unlocks it). What it has that the English payload has no field for rides in two optional
payload fields, `title` (头衔, shown as a fact) and `extras` (梦魇天赋, 破碎防线, shown
after Mania Intensify); the compliance stages past 100% a Sinner has are one more file
entry. A Sinner's page there names no exclusive crimebrand; **the crimebrand's own page
does** (`专属烙印:<name>`, filed under `分类:专属烙印`, a `{{专属烙印图鉴}}` call whose
`专属角色` is the Sinner's Chinese name), and the build reads them all in one category
request (`fetchBiliBrands`, `parseBiliBrand`). Its effect is one text with each number as
its three levels have it ("20%/25%/30%", the wiki's `{{烙印数值}}`), and a skill it grants
is named inside that text, so the payload's brand has an unnamed skill of one level there,
and the tab shows no skill name. What that skill does is on the page of the term the text
names (`术语解释:【禁忌魇魔】-必杀`, the page the wiki's `{{术语查看}}` hover shows), and the
numbers often a term further down (the summon `【梦魇】` it makes, with the 120%/135%/150%
the English page has). So the build reads the terms the crimebrands and the Sinners' own
pages name, and the terms those name, three deep (`fetchBiliTerms`, about 460 pages in 10
requests), and a brand carries every term reachable from its effect as `terms`, listed
under it in the order met (140 of the 160 name one). A Sinner's page does the same for the
terms its skills, trait and shackles name ("【残锋】"), listed under the Skills tab
(`terms`; 149 Sinners). A term is shown by the name its page gives it, so a Sinner's own
version of a shared one keeps the suffix the wiki gives it ("【残锋-阿兰恰】" beside
"【残锋】"). **The rest of that page is kept as well** (17 October 2026, the owner's "I just
want the data"), in either language since the English wiki has none of it: the damage type
(a fact), the day they came to the CN server (now for every Sinner, not only the CN-only),
whether they have been reworked there (33), the day of their containment (2), their
capture video's Bilibili id (145, a link on the File tab), their dream (15, after Mania
Intensify), and the ultimate's energy cost and core damage (badges beside its name, on
the English ultimate too). **And everything else that page shows** (19 October 2026, the
owner's "achieve whatever you see from this page"), on both sides, keyed to the English
payload's skills and shackles by their order: each skill's range, drawn from the wiki's
shape codes (`{{技能范围|3*3}}`) by a table recorded by hand from its 47 range templates
(`scripts/lib/ptn-ranges.mjs`; rows set from the left as the wiki floats them, 'o' the
Sinner, 't' a target the skill is centred on); the phase-ups (`phases`: the stats' jump at
each old cap, what each unlocks, the 异方晶 each gives); what each phase-up and skill level
costs (`costs`), from the template's own per-rank tables (`PHASE_COST`, `SKILL_COST` in
`ptn-bili-page.mjs`) filled with the page's materials; the voice lines, from each Sinner's
`语音:<name>` page (`voiceLines`, Chinese in either language); the crimebrand's 世界观
quote; and the pictures beside the text: each skill's icon (`<name> 普攻 <skill>.png`), each
shackle's (`<name><shackle>.png`), the crimebrand's (`烙印<brand>.png`), the phase-up
unlocks' and each material's (`道具<item>.png`). Those are kept in the payload as the file's
title, turned into its address by one lookup of every title (`fetchBiliImages`, 50 to a
request), and shown through the proxy, never downloaded; a title the wiki has no file for
is dropped. Item names stay Chinese on the English side (in the tooltip): the English wiki
names a Sinner's materials but not in an order that lines up. Not taken: the danger
assessment, which is the rank on every page that has one.
**Their pictures** are that
wiki's three files under its own names, `<name>立绘.png` (the original),
`<name>升阶.png` (the phase-up art, 2040x1632, never downloaded: listed, and resized by
the proxy as every print is) and `<name>证件照.png` (the mugshot, 600x1200, baked). The
build asks for each kind a Sinner is short of, whoever they are: the 11 CN-only, Pine and
Pixel (no mugshot on the English wiki), Kisugi Ai (no original), and the three Kisugi
(no phase-up art). **That wiki is load-bearing once a build has used it**, which it was not
meant to be: it answers a client that asks too fast with HTTP 567 (14 October 2026, after a
day of probing it from one machine, and for hours after), and a build that took that for
"unreachable" came back with the CN-only Sinners and every Chinese name gone, and GitHub's
runners were refused the same way on the first deploy that read the pages, for the whole
run. So `ptn-bili.mjs` goes one request at a time with a 400 ms pause and asks again after
a 567 (waiting 5, 20 and 60 s), and a request that still fails falls to **the snapshot**:
`scripts/lib/ptn-bili-snapshot.json`, tracked (2.0 MB, 0.5 compressed), which has that
wiki's roster rows, the text of each of its 160 pages (notes to editors dropped), every
exclusive crimebrand's page (`brands`) and the terms they and the pages name (`terms`), the voice pages (`voices`), and the addresses of the pictures asked of it (`files`, `images`), as the last build that read it whole left them. Any
such build writes it again, so **a local build refreshes it and its diff is committed with
the rest**; a build that fell back to it never writes it. With no snapshot a later build
keeps the last build's files whole (`fromChinese` in `build-ptn-index.mjs`) with a warning,
and a first build with nothing to keep ships the English half.

**Every Sinner's page on that wiki is read, not only the CN-only ones**, and its text is
kept beside the English wiki's in each payload as `zh` (`scripts/lib/ptn-bili-page.mjs`,
one request to 50 pages). On the Chinese side the Sinner's page lays `zh` over the payload
(`localised` in `ptn-detail.ts`): bio, trait, Mania Intensify, skills, shackles,
compliance, materials, the files, their birthplace, ability, case, gender and birthday, and
the title and extras that wiki has, and the exclusive crimebrand from its own page. Only
what it has text for is kept, so what it lacks stays the English wiki's, and the numbers
(it has five levels where the English page has ten) are not taken from it. It names the CN
voice actor alone, so on the Chinese side that name, in Chinese, takes the "(CN)" one's
place in the English list of three, and every one's language is said in Chinese
("唐雅菁（中）, Hanamori Yumiri（日）"). The Chinese page's ten compliance stages replace the
English five and its sticker. An attire's name, which that page does not list, stays the
English wiki's.

**The roster's search and filters** are that wiki's own, laid out as it lays its own
filter table out (the owner's screenshot of it): a Sinner is found by either name or by
number ("019"), and the panel's rows are Rank (狂厄 / 高危 / 普管), Tendency (6), Libram
(16, sorted into its four kinds: 原罪, 天启, 不朽, 无界), Limited (standard, limited,
collab), Core damage (none, yes) and, folded, Tags. Every rank, tendency and libram has
the game's own badge before its name: 25 files from that wiki, baked once to 72px WebP
and tracked in `icons/ptn/` (the owner approved the downloads; the bake was a one-off
script, not part of the build). **A rank's badge has its Chinese character drawn in it,
so it is the Chinese side's alone**: in English a rank is its letter. The badges are in the
game's colours, as that wiki's filter shows them (the owner's ask, 14 October 2026): the
tendency and libram badges white at full strength, a rank's badge and name in its colour
(S amber, A violet, B periwinkle, sampled from the badges; `_ptn.scss`), names in the text
colour. Each group's badges stand in columns of one width (`.filter-row .collab-row`, as
many 5.25rem columns as fit, which is "PESTILENCE"'s width), so they line up as that
wiki's table does: three across in Chinese, two for the librams in English.

**The game's pages are in two languages**, English and Chinese (`ptn-lang.ts`), by a
switch on the roster (first of its three) and beside a Sinner's trail; the choice is kept
in `localStorage`, and the first visit goes by the browser's language. The owner's scope
for it, of three offered: **names and labels**. A Sinner's name, the placards, the
line-ups' titles, the tabs, the fact lists' labels, the filter and its badges, and the
search box's prompt change; and under a Sinner's tabs, the English side is the English
wiki's text and the Chinese side the Chinese wiki's (the owner's "fill zh", 14 October
2026, which widened the scope from the first pass). **The CN-only Sinners' English is
translated by hand** (20 October 2026, the owner's "translate them"): their trait, Mania
Intensify, skills, shackles, compliance, crimebrand, extras and terms, by
`scripts/lib/ptn-cn-english.mjs` (a term table, name table and the stock line shapes) and
`ptn-cn-english.json` beside it (every other text, Chinese to English). The build puts the
English on the payload and the Chinese under `zh`, as every other Sinner has it, marks the
entry `translated`, and logs how many texts are still Chinese (0 today); the English side
says it is an unofficial translation. Their bio, files and voice lines stay Chinese in
either language. A CN-only Sinner with no translation is held in Chinese whatever the
reader chose, its EN greyed with a tooltip, by `holdPtnLang` in `ptn-lang.ts`, which leaves
the stored choice alone and which every PtN view sets or lifts as it mounts. A new CN-only
Sinner is their terms and names in the module and their texts in the JSON; once the English
wiki writes their page they are no longer CN-only and its text takes over. The shell's own
words on these pages change too (the owner's ask, 14 October 2026): the Filters button,
Clear and an empty search's message through the roster's `words` (`card.ts`), and the
section link from each PtN view, since a change of language mounts the view again and not
the route. `dispatch` in `index.ts` puts Clear back to English on every change of page,
since the Arknights and Endfield grids never word it. The sidebar, the drawer and the
search box's clear and close buttons' screen-reader names stay English. The tags
are each wiki's own, so a pick among them does not carry over a change of language.

**Path to Nowhere is the first game to get a design of its own, and the owner's brief for
it is the game's**: its roster turns between its Sinners' mugshots and their original
illustrations, and a Sinner's page shows every picture the game has of them. So the roster
has a Mugshot / Original switch (`looks`, above), and the dossier opens on whichever of the
two the roster was showing.

**The roster is a line-up wall, not a grid of cards** (`drawWall` in `views/ptn.ts`,
`_ptn.scss`). The owner found the cards' art too small and the roster flat, and picked this
on 12 October 2026 from a page of directions, then slate over a paler wall and the mugshot
as the picture it opens on, after a proof that stood ten Sinners against both. Every Sinner
stands whole on a floor line, against a wall ruled every 10 cm with its numerals down the
left edge, **scaled to the height their file gives**: the wall shows 0 to 210 cm over the
top 86% of a row and the floor is the rest, so a figure's picture is its centimetres tall
and everything on a row is placed in centimetres. Under each, on the floor, is a black
placard with what a card printed: `MBCC-S-019`, the name, the rank's letter, tendency and
libram. **The roster is one wall, a window tall, that runs on sideways** (the owner's asks
of 12 and 13 October 2026; it wrapped at first, six or seven to a row, and was then a wall
to a line-up down the page): the line-ups stand one after another along it, a rule down
the wall between two. The wall is the scroller, and its rules and floor are its
background, so they stay where they are while the figures pass along them. The scale is a
strip of the same wall that sticks to the left edge (`.wall-scale`, a real element, since
a pseudo-element of the scroller would scroll away with it), so a figure leaving goes
behind the numerals. A line-up's name and head count are in a band over the wall
(`--ptn-head`) and stick beside the scale for as long as any of the line-up shows, pushed
out by the next one's; on a desktop the switches sit at that band's far end, a name going
out under them. The row's height is what the window has left: `--ptn-row` is `100vh` less
the topbar (`--ptn-over`, a number per breakpoint, measured: 77, 182 and 152px), the band
and the rail, so the page itself does not scroll on a window 620px tall or more.

**The ways along it** are `wireWall` in `views/ptn.ts`, beside the wall's own scrolling by
touch and trackpad. A mouse drags it (`onDrag`: a press that moves 5px is a drag, and the
click that ends one is swallowed, since every figure is a link). A wheel turned over it
moves it sideways, and at either end the turn is the page's again. An arrow at each end
(`.wall-nav`) moves it 80% of a window, and is gone at the end it would lead past. And
**the rail under the floor is its scrollbar** (`.wall-rail`; the browser's own is hidden):
a part to a line-up, as wide as that line-up's share of the wall and named in short
("CN", "2026", "S"), a red-topped window over what is showing, a press on a part to go to
its line-up, a drag along it to take the wall with the pointer. The arrows and the rail
move the wall by hand over 420 ms (`glide`), not by the browser's smooth scroll, which
Firefox turns off with the system's motion setting. **The wall comes back to where it was
left** from a Sinner's page, a change of picture or of language: the Sinner at its left
edge and how far into their place the edge was are kept (`left`), for the same order and
the same number standing; a search or a pick starts it from its head. Pictures wait for
the wall to reach them (`loading="lazy"`), each place held by its outline until then.

**Rank is no longer a colour but a place**: by rank there is a line-up to
each of S, A and B, with its name and head count; newest first there is one to a year of
arrests ("Arrested 2026" down to "Arrested 2022", which is the launch and the four that
year then added; "arrest" is the game's own word for getting a Sinner, and was picked
over the owner's "detained" for that), whose placards give the month, and before them one
of the Sinners only the CN server has ("CN server only"), who go by the day they came to it. Under the
pointer or the keyboard's focus a figure steps forward, the rest of its wall falls back,
its placard takes the world's one red and its height is read off over its head. A press
opens its page. **Only the figure and the placard answer the pointer**: a Sinner's box is a
row tall, and the owner found the bare wall at the 200 line setting off whoever stood
under it, so the box itself takes no pointer events. There is no card to turn: the tags
are in the filters and on the page.

Three things about it that are not what they seem:
- **The height is the picture's, so it is only as true as the picture.** A raised arm or
  a carried thing counts: 000, at 168 cm, has her head near 150, and under Original
  Demon's shield and OwO's lion head stand taller than they do. That is why the mugshot is
  the picture the wall opens on: in it every Sinner stands for a line-up already, name
  board in hand.
- **A figure's place is held before its picture comes**, by the picture's shape (an entry's
  `ratio`): an outline at the right height, which is also all a Sinner with no picture
  would have, with "No photograph on file" (nobody today, now that the Chinese wiki's
  mugshots are baked). A Sinner missing one of the two stands as the other under either
  look, which nobody needs now but a build that could not reach that wiki.
- **The numerals are a picture the wall's edge is masked by**, so that they take the
  wall's ink, and a picture cannot load a font: they are set in the reader's own narrow
  face whatever the placards come to be set in.

**The shell goes with it**: on this game's two pages (`body[data-view='ptn']` and
`'ptn-detail'`, `$world` in `_ptn.scss`), the sidebar, the topbar, the filter panel and the
tooltip go from Dossier's navy and gold to ink and bone, which is nothing but the surface
variables restated, since the shell takes every colour from them; the page under them
restates them again for the wall. **The placard face is Barlow Condensed**, the owner's
pick of three on 12 October 2026 (the others were League Gothic and Big Shoulders): its
Medium and Bold, as the Google Fonts repository has them, in `src/web/fonts/barlow-
condensed/` with their Open Font License beside them. Each weight is a WOFF2 first, Google
Fonts' own Latin cut (44 KB the pair, from `fonts.gstatic.com`, the owner's ask), with the
TTF behind it (213 KB the pair) for a browser that cannot read one; a stylesheet's `url()`
to a file is all webpack needs to emit one, and a browser asks for them only on a page that
sets something in them. Neither has Chinese, so **the Chinese is Noto Sans SC** (17 October
2026, the owner's pick of three from a specimen against Noto Serif SC and ZCOOL QingKe
HuangYou): Source Han Sans under Google's name, the face the game's own CN site sets its
interface in, its Black standing for the placard's 700. The whole font is a 17.8 MB
variable TTF (the owner approved the download), so `scripts/lib/ptn-font.mjs` cuts it at
build time with `subset-font` to the characters the placard sets (the roster's names and
tags, a file's headings, `ptn-lang.ts`; 1,742 today), at 500 and 900, about 250 KB each,
into `src/web/fonts/noto-sans-sc/`. The cut is tracked, as the snapshot is, and written
only when it changes; the TTF is kept with the generated data, which CI caches, and a
build that cannot fetch or cut keeps the last cut. A character the cut lacks, and all the
running text, is in the reader's own face. After them in `--ptn-placard` is the reader's
own nearest (Bahnschrift, where Windows has it), which is what the wall was designed in. **Every rule in that face
asks for 500 or 700**, the two it ships (17 October 2026): one that asked for the shell's
400 or 600 got the nearest anyway, so nothing moved but the rule. The small labels went
into it too (a line-up's head count, the trail, a fact's label, a badge, the Filters
button), the placard's number and kind lines went from 10.5px to 12, and on the Chinese
side the page is `lang="zh-CN"` (set by both views, put back to English by `dispatch`),
which picks the Chinese glyphs and sets the names, titles and tabs without tracking.

**Beside that switch is the order's: Newest, which the page opens in by the owner's choice,
or Rank, the roster's own.** Newest goes by an entry's `released`, the day the Sinner came
to the Global server, and **that day is recorded by hand**, in `scripts/lib/ptn-record.mjs`:
the 45 who were there when it opened on 27 October 2022, and every release since as a line
of a day and its Sinners, 48 of them to October 2026. The wiki has no release dates (no
field for one on a page, a `Patch History` page that is a table's header, an `Arrests`
page that leaves its later banners undated). **They were read off S1N** (`s1n.gg`, the
owner's reference), which has them on its own pages: its Sinners page is sorted by release,
and its Banners page has an Archive tab of every Global banner, dated, with who stood on
it; a Sinner's day is the first banner they are on. Where the wiki dates the same banner
the two agree to the day (40 Sinners of 51). Recorded and not fetched, as the Arknights
mode-only operators' places are: the site has no API a build is meant to read and states
no terms. **A new release is one line added there.** A Sinner the roster has and the record
has not is taken to be newer than everyone in it: no `released`, first under Newest in a
line-up of their own, and named in a build warning; so is a name in the record that is
nobody's, which is a slip or a page the wiki has renamed. A Sinner's page gives the day
among its facts.

The first Newest order, a day earlier, was made from what the wiki does have (the day a
Sinner's pictures were first uploaded, and the banners it dates) and kept only from 2024
on. Against the record it had 97% of pairs right, 11 Sinners more than 60 days out
(Lysandra by 320) and 31 Sinners of 2022 and 2023 with no day at all. It was made that way
because the first look at S1N went to its data, found a backend no build should lean on,
and never read the pages; the owner said there was a sorting out there, and there was.

**Five Sinners have no page on the wiki and are on the roster anyway** (Norma, Isomer,
Pixel, Phanuel and Evie, released from July to October 2026). The wiki has their pictures
and their `Attires` and `Gallery` subpages before it has the page, so those are read as
anyone's; the head of their file (number, rank, tendency, libram, birthplace, height and
tags) is in the same record (`UNFILED`), as S1N's own page for each has it, and their page
here says so in its first paragraph and has nothing under the other tabs. Pixel has no
pictures there either, and stands as the Chinese wiki's illustration. Once the wiki writes a Sinner's page, that page is read and the record's
entry is passed over.

**A Sinner's dossier** (`#/ptn/sinner/<id>`, `views/ptn-detail.ts`) is in the same world:
the wall goes on down its left, and the Sinner's file stands on the right as a slab of ink.
What the file shows is that wiki's Sinner page, section for section, on the Arknights
dossier's panel, tabs, entries and fact lists, squared off and set in the placard's face
where the Arknights page has a serif; its head is the roster's placard at a page's size
(`.file-head`: the number, the name, the rank beside both, tendency and libram).

**The wall there is one Sinner's** (`.cell`). It is as tall as the window has left under
the topbar and the trail, and **its scale is the Sinner's own**, where the roster's is one
for everybody: it tops out at their height and a twelfth (`HEADROOM`), so whoever they are
they stand at about 60% of an 800px window and 70% of a 1080px one. Its rules and numerals
are real elements, a rule every 10 cm from the floor, in the placard's face; a red line
marks their own height, labelled. On the floor is the name of the picture on show (an
attire's led by its collection, with its stars) over **a frame for each picture the game
has of them**, the owner's ask for this game: the original, the phase-up art, the mugshot,
the interrogation's pictures where the wiki has them, then each attire, newest first. **The
mugshot and the original stand on the floor**, from the baked figures, so the first of them
is on the wall before the payload has come. **Every other picture hangs on the wall as a
framed print**: the attires and the phase-up art were to stand too and turned out to be
scenes as wide as they are tall, the Sinner among effects and scenery with no floor under
them (Hecate's are 1178 by 1100 once their empty margin is cut). The phase-up art hangs
with no frame or mount (`.cell-print.bare`, 20 October 2026, the owner's ask): it is cut
out on transparency, so the bone mount showed through it as a white sheet. A press on either opens
the Arknights art viewer (`openArtViewer`, which takes a `thumbOf` for callers whose pieces
have no outfit avatars). The list is the payload's `arts`: 716 pieces across the roster
(160 originals, 147 phase-up, 150 mugshots, 68 interrogation pictures, 191 attires), which
`parseSinnerArt` reads out of each Sinner's `Attires` and `Gallery` subpages (six requests,
50 titles each) before the build asks the wiki for every file's address (another dozen); a
file a page names and the wiki never got is left out. **None of the prints is downloaded**:
the files are 1 to 9 MB each and about 1.4 GB in all, so the page asks the resizing proxy
for each at the size shown (`artUrl`: 128px for a frame, 1024 on the wall with `trim` to
cut an empty margin away, 2048 in the viewer), as the Arknights illustrations are and for
the same reason; the Chinese wiki's illustrations go through the same proxy. A Sinner with
only one of the two baked figures opens on that one. Under 1200px the
wall is on top, at about 70% of the screen's height, and the file under it.

The file's long page of tables becomes six
tabs. **Profile** is its basic information and attributes: the wiki's lead paragraph, a fact
list, the tags, each stat as "level 1 / highest level the wiki has" as that page prints
one, the 溢变 (overflow) line that page prints under them, the trait, and Mania Intensify. **Skills** is the basic attack, the ultimate and the
passives, each as it is at level 1 and then a line for what each later level changes, which
is how both wikis write them (there is no full text per level to put under a slider), with
its icon and its range. **Phase-up** is the three phase-ups (the cap each raises, the stats'
jump, what it unlocks, what it costs) and then each skill level's cost, as the Arknights
material discs squared off. **Crimebrand** is the exclusive crimebrand's picture, its quote
and the skill it grants. **Shackles** is the five shackles with their icons, then
compliance (what each tenth gives, and the sticker at 100%), and the materials' names where
there are no costs. **File** is who the Sinner is, each document under the wiki's heading
for it, folded away as the Arknights archive files are, and the voice lines. The tab on show is kept from one
Sinner to the next. The header and the art are the roster's entry; everything under the
tabs is `ptn/sinner-details/<id>.json`, fetched when the page opens, which the same build
script bakes from the rest of the same page text (`scripts/lib/ptn-page.mjs`), at no
further request. Its texts are in the game markup `descriptionToHtml` renders: a number the
wiki colours blue is a raised value, what it colours orange a reminder. The wiki's slips are
mended on the way (an unclosed style attribute, a stray brace in a template, a placeholder
nobody filled in), and a stat level it marks "TBA" is left out; three Sinners have no
numbers at all yet, and 20 have only level 1 of each skill.

Not on the dossier, though the English wiki has them: the interrogation records' own pages,
an attire's description and how it is got (its `Attires` subpage has both). The ranges,
costs and voice lines are the Chinese wiki's (above).

**hololive Dreams** (`#/holodori`, 54 holomems, the game's own word for its cast). Its
tile opens a **front page** (`views/holodori-home.ts`, 18 October 2026, the owner's "home
page"): a tile into each of Holomems, Songs, Cards and Gachas with its count and a few of
its pictures, the gachas running now, the next six birthdays as the game's round icons,
and the six newest songs. The sticker sheet is `#/holodori/holomems`.
`scripts/build-holodori-index.mjs` reads six tables of HolodoriDB's dump of the game's
master database from `raw.githubusercontent.com` (`HolodoriDB/holodori-db-eng-diff`, one of
six per-language repositories that are each the whole database; a bot refreshes them every
three hours). The roster is the `Character` table's playable rows, 54 of 62, which are
exactly the talents the game's own site lists; the other eight, talents who have graduated,
have a name and a costume and no profile. An entry is id, name, short name, branch, groups,
fan name, birthday, debut, greeting and colours (the table's five), in the game's own order,
and `art`. The dump itself is unofficial and carries no licence; what is baked from it are
facts the official site also publishes. The owner was told so on 11 October 2026 and kept
the roster.

**The pictures are the official site's, not the game's.** The game's assets are encrypted
and its terms forbid extracted ones; its site's holomem page
(`www.hololive-dreams.com/en/holomem`) publishes each talent's key art, the whole figure on
transparency, through its image host (`images.microcms-assets.io`). The build reads that
page, matches each picture to a holomem by her English name, fetches it once at 560px and
bakes a bust (`holodori/figures/<id>.webp`, 176x232 on transparency; the page paints her
colour behind it): a crop 0.72 of the figure's height, its top 4% down, centred on the
head, which is where the opaque pixels of the figure's top quarter centre, or a place
recorded by hand (`FACE_X`) for the seven whose hair, ears or a prop pull that off. The
owner chose these pictures after being told that the game's guidelines bar reproducing its
promotional material without permission, and approved the download on 15 October 2026 (54
pictures, about 1.6 MB, baked to 750 KB). The page credits both sources under the roster.

**The roster is a sheet of stickers** (`draw` in `views/holodori.ts`, `_holodori.scss`), with
a calendar beside it: Sheet (the one it opens in) and Calendar. It began on 15 October 2026
as a sticker album, the owner's pick from the fifth hand of directions, with the category's
grid beside it; the sheet came before both on 16 October, and on 17 October the owner had
the album and the grid taken out. **The sheet** is every sticker at once, the owner's ask
for the whole cast on one page: a block to a branch, flowing on beside the last where
there is room, a strip to a generation and her short name under each sticker, each holomem
once (Fubuki in her first group, Gen 1). The sticker's width is set from the sheet's (`--s`,
56 to 84px) so that all 54 stand on a 1280x800 or 1440x900 screen; on a phone it scrolls.
The branches are the game's own: DEV_IS is a Japanese branch, and the game has only ReGLOSS
of it (four; Hiodoshi Ao's row is not playable), and no FLOW GLOW at all, in its data or on
its site (checked 17 October 2026). **A birthday in the next 60 days lifts her sticker**:
tilted, a corner peeled, a sun-yellow tab with the date ("Next" on the nearest of all 54,
whatever a search leaves on show); on the day it lies flat in a ring of the same yellow.
**The next birthday is spotlit** (18 October 2026, the owner's ask): a sun banner over the
sheet and the calendar names whoever is next, with her icon, the date and the days to go
(and today's on pink), and on the sheet her sticker bobs in a sun ring with rays turning
behind it and an ink "Next" tab. A still, fainter version was tried and the owner kept
this one. "Next" is everyone on the nearest day, so two who share a
birthday are both lit (none of the 54 do today).
Hakos Baelz's 29 February is the 28th in a year without one. All of it goes by the reader's
clock. **A search or a filter greys the other slots** to their printed outline in place, so
nobody's place moves. The filters are Branch and Generation, the generations sorted by
branch. **Pressing a sticker turns it over** (the Web Animations API, a turn to its edge and
the back turning on from it) to her back: her colours as stripes, number and groups, name,
branch, greeting, fan name, debut, birthday, colour swatches and a link to her page; Escape,
the close button or a press elsewhere turn it back. Calendar is the next twelve months at a
glance, a card to each: its birthdays and debut anniversaries (with the count: "5th
anniversary") by the day, as a face beside a name; in this month what has passed fades,
today's are on the sun, and the card is ringed in it with "Today" on its head.

**The game itself has two pages, Songs and Cards** (`views/holodori-songs.ts`,
`views/holodori-cards.ts`), built on 17 October 2026 after the owner asked where the game's
details were. Both are `mountRoster` pages with search, filters and orders, on the sheet's
dotted paper. **Songs**: a press turns a jacket over to its back (`holodori-flip.ts`). a jacket over the title, the
singers' faces and the four charts' levels in their colours (Easy, Normal, Hard, Expert);
the back has the length, the day it was added, the credits, how it is unlocked, the music
video and the copyright line. **A disc on the jacket's corner plays the song's chorus**
(20 October 2026, the owner's ask; 205 of 219 songs, the ones with a music video): the part
of the song's official music video the game marks as its chorus (`chorus`, from the Music
table's `chorusStartMillisecond` and `chorusEndMillisecond`), in YouTube's own embedded
player (`youtube-nocookie.com`, `holodori-clip.ts`). No audio is copied or hosted, which is
the point: the songs are COVER's and the publishers', and COVER's guidelines leave reusing
a song as it is out of what they allow. The player stays in view in the window's corner
while it plays, as YouTube's API policy wants, and can be moved (the owner's ask, 21
October): by the grip along its top, its title, or the arrow keys on the grip, kept inside
the window and remembered while the page is open. The disc has a ring that is always there
and a pink arc that fills from the time the player reports over `postMessage`, with a halo
going out from it while the clip plays. **The game's chorus window is in the game's own cut
of the song, which is about 2 minutes, and the dump's `mvUrl` is most often the full music
video (3 to 5)**: found on 21 October by comparing each video's length with the song's
`playingSeconds`, 171 of 205 were more than 8 s apart, and the window landed in the wrong
part of them. Those songs' clips are therefore **recorded by hand** in
`scripts/lib/holodori-clips.mjs` (`CLIP_AT`): the first peak of the video's "most replayed"
graph where the game's chorus could be in the full version, 3 s before it, for the length of
the game's chorus. It is an estimate, which the song carries as `estimated` and the player
words "Highlight" instead of "Chorus"; the same pick on the 32 songs whose lengths line up
fell within 8 s of the game's own window 29 times in 32, over a narrow range. The same file
gives two songs the dump has no link for their official upload (`MV_FOR`, hololive Dreams'
channel, the game's length); 12 songs still have no disc: 10 older ones whose only uploads
are the full-length audio or a different version, and Amaryllis and CORE//UNBREAKABLE,
dated 23 and 25 October, which have no video yet. A new song's link comes from the dump,
and its game window is used as it is until someone checks its length. Filters: Original /
Cover, branch, singer; orders: Newest, Game order, Title, Expert. **Cards**: the card's own portrait (the game's, 1:2) in a frame
of its rarity (sky ★3, lilac ★4, a sun-to-pink foil ★5) with its type (Cute, Pure, Happy),
opening the card's page. Filters: rarity, type, branch, holomem; orders: Newest, Holomem,
Rarity.

The build reads them from the same dump: `Music`, `MusicDifficulty` and `LangMusic_Eng`
for the songs (tutorial rows dropped), and for the cards `Card`, `CardLevel`,
`CardLevelLimit`, `CardPotential`, the three skill level tables, `SkillTreeConnectEffect`,
`Costume`, `LiveLeaderSkill`, `CharacterVoice`, `LiveDialogueVoice` and their language
tables. A card's type is not named in `Card`; it is read from the skill-target text its
`attributeType` points at ("[attribute=cute]Cute Type[/attribute]"). 54 cards have no
outfit and so no outfit skill. **The jackets are the
official site's** (`/en/music`, the owner's approval of 16 October 2026): matched to a song
by its title, folded to letters and digits, and baked to 240px WebP (157 files, 2.6 MB).
The 58 songs the site does not list (the newer ones) have the game's own jacket from
HolodoriDB's CDN instead (`img_music_jacket_<jacketAssetId>`, approved 17 October 2026;
215 files, 3.6 MB in all); a song with neither would stand its singers' busts on their
colours in its place (the first letter, for a song the whole cast sings).
Each of the three files is kept from the last build, or written empty, when its tables
cannot be had.

**A card has a page of its own** (`#/holodori/card/<id>`, `views/holodori-card.ts`, 17
October 2026, the owner's "card pages first"), after holodori.best's card page: its
illustration in its rarity's frame (opening the art viewer on the CDN's full-size file),
with an Animation and a Signature beside it on a 5-star card (84 of 192), played from the
CDN, and **Reveal** (`holodori-reveal.ts`, 20 October 2026), which plays the two and the
card-get line as the game does for a card won, from one tap (a browser lets a page play
sound only after one). **The order is read off a recording of a real 5-star pull** (a
YouTube video, 21 October 2026; frames sampled and its audio's loudness measured in the
browser, nothing downloaded): the line is said first, on a white screen with its words
(here the line's karaoke fill, in the holomem's colour; the audio is loud for about 1.5 s
there and silent for the rest), then the animation plays and the signature is written
over it from the same instant. The animation is silent, begins on a white burst (which is
why the white screen leads into it) and ends on a flash, after which the card's own art
comes up under the signature, which stays. The owner's asks that led here: "can they all
be play tgt" (all three at once, the first version after the animation-then-signature
one), then "check YouTube for some reference so the timing would look impeccable".
**The signature's video is 1280x1440: its top half is the writing in colour and its bottom
half a white matte of the same strokes**, two 16:9 pictures that line up with the card (the
first version drew the whole frame, which showed the writing twice and off to one side).
Both halves are drawn onto canvases (a canvas shows a video from another host and only
cannot be read back, which nothing does; the CDN sends no CORS headers) over the screen,
the matte inverted and multiplied in and the colour screened in, which is the alpha
composite. The writing fades out in the video's last half-second, so the frame before the
fade is the one that stays (`FADE`). Under the screen three tracks (the line, the
animation, the signature) run along the whole (10 s, 9 s and 5 s, and 0.4 s held after the
line, on the card checked), with Skip, Replay and the volume; the
name, the holomem (a link to her page) and a fact list; then **Stats**, a level
slider and blooms 0 to 5 over the three stats and their total, with the limit breaks the
level needs; **Skills**, passive, active, special, connect effect (none on a 3-star) and
outfit skill, each at the level the bloom gives it; **Voice lines** (card get, conversation,
live skill, bloom 1 to 5: 5-star cards only) and **Live dialogues** (her line and another
holomem's answer, 390 across the cards), each with its audio from the CDN, as bubbles
(`holodori-voice.ts`): in the speaker's colour with her face, the card's own holomem on the
left and whoever answers on the right, filling with its words as it plays and with a
waveform to press for a place in it (a shape for the eye, from the line's name, not read
from the audio). A dialogue has Play conversation, and one dock, pinned to the window's foot
while the voices are on screen, has previous, next, play, the line's waveform, its time, a
volume and a speed. **The volume** (a speaker that mutes and a slider, `volumeHtml()` in
`holodori-audio.ts`, the owner's "make voice adjustable") is one for the voice lines and a
reveal's three parts, starting at 50% (the owner's pick, 21 October), kept in `localStorage`
and the same wherever it stands on the page; a
song's clip is YouTube's own player, which has its own. One sound plays at a time across
the site (a reveal, a line or a chorus stops the one before), and a change of page stops it. The page keeps its stage
and voices when a bloom or the payload redraws the rest, so that nothing playing is cut.
The level and bloom are kept from one card to the next; the level opens at the card's top. Previous and
next card in the game's order are at the trail's right.

Everything under the head is the payload, `card-details/<id>.json`. **A stat is
`ceil(ceil(base × share / 1000) × (1000 + boost) / 1000)`**: the level's base from
`CardLevel`, the card's per-mille share of it, and the blooms' stat boosts added up (a
5-star's bloom 2 gives 100; a 3-star's bloom 2 gives 50 and bloom 5 100 more). Rounding
twice is holodori.best's: seven of its numbers across a 5-star and a 3-star card were
matched only that way. A skill has two levels, and the bloom whose `CardPotential` row
names it raises it to the second; the payload keeps both texts. A level past a cap needs
a limit break: `CardLevelLimit` rows carry no count, so they are sorted by cap.

**The card art is HolodoriDB's CDN's** (`cdn.holodori.dev`, which serves the game's own
files unpacked; public, no bot check). Each card's portrait (`img_card_vert`, 256x512) is
re-encoded to WebP, its illustration (`img_card_full_…_unsquished`, 1820x1024; the plain
file is the same squeezed to 2048 wide) baked at 1024 wide: 384 files, about 74 MB fetched,
22 MB baked, approved by the owner on 17 October 2026. The animations, signatures, voice
lines and the full-size illustration are asked of the CDN by the page and never downloaded
by the build. **The audio and video are backed up by hand** (the owner's ask, 18 October
2026): `node scripts/backup-holodori-media.mjs` after a build fetches every voice line,
live dialogue, animation, signature and full-size illustration the payloads name that
`backup/holodori-media/` (gitignored) lacks, about 440 MB the first time, and uploads the folder as
`holodori-media.tar` on the `media-backup` release. With the folder empty it starts from
that tar, so a run with the CDN gone never uploads less than the release had.
holodori.best's own API sits behind a Cloudflare check and is not read.

**A holomem has a page of her own** (`#/holodori/holomem/<id>`, `views/holodori-holomem.ts`,
17 October 2026), opened from her sticker's back. The game site's key art is wide (about
1.64:1) with her on its right and running off its foot, so it fills a stage of her colours as
tall as the stage, at its right end, and her profile (number, groups, greeting, birthday with
the days to it, debut, fans, colours) stands on the stage's empty left; on a phone the stage
is the picture's shape, over the profile. Under them are her cards and the songs she sings
(not the whole cast's, which are counted), the Cards and Songs pages' own tiles: a card
opens its page, a jacket turns over as on the Songs page; then her six **membership
stickers** (two sign-up stickers and four more, the Stamp table's `chr-membership-*` rows;
FUWAMOCO's, filed under 80001, are both twins'), die-cut with a white edge. The stickers
and the 54 round icons are the CDN's (`img_stamp_<asset>_lang-eng`, 512px, baked at 256;
`img_chr_icon_normal_<5 digits>`, 256px, baked at 128), approved by the owner on 17
October 2026: 6.9 MB and 0.45 MB baked. The game's 11 common stickers are no one's and are
left out. The picture is not baked: the entry's `figure` is its address on the site's
image host, which the page asks for at 720px; without it the bust stands in. Previous and
next holomem in the game's order are at the trail's right.

**Gachas** (`#/holodori/gachas`, `views/holodori-gachas.ts`, 18 October 2026): every
banner, running now first (edged in the sun, with "Ends in 22h 36m"), then the standing and
beginner's gachas two or three to a line, then the past banners; each is its logo, name,
dates in the reader's own clock and the cards it features, opening their pages. **The
dump names a gacha by its id alone** (`Gacha`, 23 rows), so the names, dates and cards are
**recorded by hand** in `scripts/lib/holodori-gachas.mjs` from holodori.best's gacha pages,
as the Path to Nowhere release record is from S1N: one entry a banner, its two gachas (the
usual one and its "Take your pick!" twin, which share name, dates and cards) as one, times
in UTC. Read on 18 October 2026; holodori.best does not load three (the launch banner's
pair, `pickup-*-260728`, and the ★5 ticket gacha), so they are left out, and the build
warns of any gacha the dump has and the record has not, and of a featured card the Card
table lacks. **A new banner is one entry added at the top.** The logos are asked of the
CDN by the page (`img_gacha_logo_<id>_lang-eng`, 205x128), not baked; the ★4 ticket gacha
has none.

**What is announced comes first** (20 October 2026, the owner's ask to know a banner
before it opens). The game previews each new ★5 about a day ahead on its English X account
(the dump learns of the gacha only once it is open, within the hour), and X cannot be read
by a build. **hololive Dreams Lab** (`dreams.wf-calc.net/wiki/game-updates?lang=en`), a fan
site whose robots.txt allows a crawl, collects those posts by date on a server-rendered
page, each an `<h3>` "★5 [Card] Holomem previewed" with "from Monday, October 19 at 11:00
AM (JST)" under it and the official post linked. `buildUpcoming` reads them into
`holodori/upcoming.json` (card, holomem, opening time in UTC, the post), keeping those that
open no more than 14 days before the build, and warns if the page names no preview at all.
The page shows them under **Announced**, a card to each opening time, until the record has
a banner opening within the hour of it. A preview names no banner, so the card reads "New
★5 Members"; not every ★5 is previewed there (Kaela was not, for Blissful Seaside Days).
**That is why the deploy runs daily**: a preview is up for about a day before its gacha.

The world is scoped under `body[data-view='holodori']` and each of its other pages' views: the shell's surface variables
restated in white and the game's ink, a sky ground with the game's "Dream Park" lettering
as a pattern, and Poppins (600 to 900, self-hosted, OFL) throughout. Like the rest of the
site it animates whatever `prefers-reduced-motion` says. Its handlers are assigned to its
own page element, since `card.ts`'s finder takes `document`'s.

**Fate/Grand Order** (`#/fgo`, 470 Servants, 52 of them JP only).
`scripts/build-fgo-index.mjs` reads Atlas Academy's two "basic" exports, NA's and JP's with
English names (about half a megabyte each; the full exports are tens of megabytes, which is
not for a build to download), and joins them as the Arknights index joins Global and CN: a
Servant only JP has is kept and flagged `jpOnly`. A row is playable when its `type` is
`normal` or `heroine` (Mash alone); the rest are the enemy-only entries the game still
numbers. An entry is id, collection number, name (the true name, with the first as `alias`
for the eight who are summoned under another), rarity, class, attribute, alignment, and
`art`, the figure the game stands in a party slot (`NarrowFigure/<id>/<id>@0.png`,
148x375), baked as the 148x296 of it a card shows. The order is the collection number's.

**The roster is a summoning circle with the game's own frames** (`draw` in `views/fgo.ts`,
`_fgo.scss`), the owner's pick of 22 October 2026: of the directions on the canvas, the
circle of one with the Saint Graph cards of another. On the left, sticky while the list
scrolls, the circle: every Servant at its centre (a button, the one that shows every class),
the seven knight classes on its inner ring and the eight Extra classes round the outside
(Shielder, Ruler, Avenger, Alter Ego, Moon Cancer, Foreigner, Pretender, Beast; the game's
three Beast classes are the one Beast here), each with how many the search and the filters
leave, and dimmed at none. It is drawn in percent of its width and set in container units,
so it is the same drawing at any size. On the right, the class picked, or every class in
the circle's order under a heading each; a Servant is the game's frame, its metal by rarity
as the game's own (bronze for one and two stars, silver for three, gold for four and five),
the class over the figure and the stars under it, then `No. 002` (and "JP"), the name, and a
bracketed variant ("Alter") or the name they are first summoned under on a line of its own.
The search looks in the name, that first name and the number; the filters are rarity,
attribute, alignment and server; the order switch is Number, Rarity or Name. The class
picked is kept across visits, and a search that empties it goes back to every class. The
world is Chaldea's navy and gold, Cinzel for what is engraved and EB Garamond for the rest
(self-hosted, approved with Endfield's). The art sits 18% of its overhang down, which puts
the two cut corners at the figure's top out of sight; the bake cuts at the same 18% (`LIFT`
in the script), and the two have to agree. Not built: the game's class icons (Atlas Academy
has them, a download to ask for), a dossier. Atlas Academy's data is ODC-BY 1.0
and asks for credit, which the README gives and the site itself does not yet.

Not built for any of the three: glyphs; a release order for hololive Dreams or FGO (Path
to Nowhere has its own, from a record kept by hand). Not built for hololive Dreams: units, a gacha's rates and the cards it has besides its featured ones, stories, the launch banner. Not built for FGO: a dossier.

## Testing

No test suite. Verification is `npx tsc --noEmit` plus both webpack builds, then manual
checks: load `dist/ext/` in Firefox/Chrome and open the toolbar popup, and open
`dist/web/index.html` for the SPA. Both grids should render with no data requests. After a
style change, run `npm run design` and check `design/components/*.html`.

**`scripts/shots.mjs`** (24 October 2026, Phase 0 of `PLAN-astro-hybrid.md`) is the nearest
thing to a test. `capture` serves a built `dist/web` over http, opens 21 pages (one per view
and a dossier or two per game) at 1400, 800 and 390 px in the Chrome or Edge on the machine
(`puppeteer-core`; `CHROME_PATH` names one), and writes PNGs: about 100 s for the 63. It holds
everything still so that two shots of one build match (the clock at 23 October 2026 noon,
`Math.random` seeded, animations at their last frame, lazy images loaded, every other host
refused), one page at a time (three tabs at once starved the background ones into timeouts).
It is also the smoke run, and exits 1 on an exception, a console error or a file of the
site's own that 404s. `compare` takes two sets and passes a page that differs by up to 0.01%
of its pixels. Sets live in `.shots/` (git-ignored): shoot `master` as the baseline, change
something, shoot again, compare. It is not a test of behaviour: nothing is clicked.

Visual changes are reviewed by the author personally — say what you changed and where to
look, don't just assert it works.

## Browser Compatibility

- **Firefox** 109+ (MV3), **Chrome** 88+, **Edge** (MV3 compatible)
