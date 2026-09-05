# Pending work

Running backlog. Newest concerns first; each entry says what's actually blocking it so
picking one up later doesn't need re-investigation.

## Planned

### UI/UX refactor (thorough)
The topbar, filter popover, grid card and detail layout have each been adjusted
incrementally rather than designed together, and it shows — spacing, type scale and
control placement aren't on a shared system. Wants a proper pass: define the type
scale and spacing tokens, then rebuild the grid/detail/topbar against them instead of
tuning values per component.

Known specifics to fold in:
- **Detail page layout: artwork left, data right.** Right now the artwork viewer sits in a
  full-width band above the tabs, so the stats/skills/talents panels start well below the
  fold. Sanity Gone puts the art in a left column with everything else in a right column,
  which fits both on screen at once. This is the single biggest layout win available.
- Filter discoverability regressed when class/rarity moved into the popover — they used
  to be one click, now they're two. Consider a hybrid (class/rarity inline, branch/tags
  in the popover).
- Detail page still restructures noticeably when navigating in from the grid (search and
  the actions cluster vanish). Persistent chrome or a transition would soften it.
- No empty/loading skeletons — the grid pops in.
- Desktop layout has only ever been verified by DOM measurement, never eyeballed at full
  width (the dev preview pane was stuck narrow). Worth a real look before refactoring.

### Collab filter, and a category for each collab
There's no `isCollab` flag in the data, but `data.teamId` is one in all but name — and the
investigation is done, so this is assembly rather than research.

**Collab characters** — people from another franchise, not from Terra. Each collab has its
own `teamId`, and every operator carrying one has `nationId: null`, because they aren't
from anywhere on Terra:

| `teamId` | Collab | Ops | `displayNumber` |
|---|---|---|---|
| `rainbow` | Rainbow Six Siege | 8 | `RS**` |
| `mujica` | BanG Dream! Ave Mujica | 5 | `AM**` |
| `laios` | Delicious in Dungeon | 4 | `DD**` |
| `sees` | Persona 3 | 4 | `PS**` |

The two signals agree exactly — no operator with one of those `teamId`s has a nation, and
no operator outside the group carries the prefix — so either works and checking both is a
free consistency assertion at build time.

**Collab-themed alters are a different thing** and shouldn't land in the same bucket.
Monster Hunter (`MH**`, 6 ops — Kirin R Yato, Rathalos S Noir Corne, Violet Mizutsune
Orchid, Zinogre S Catapult…) are Terra operators in a collab's costume: they keep their
`nationId` and their `teamId` is whatever it always was (`action4`, `reserve6`, empty). A
filter that says "collab" needs to decide whether it means the franchise crossover or the
event, because these are the same event and not the same kind of operator.

Two things to be careful of:

- **`nationId: null` alone is not the test.** 28 operators have no nation; 21 are collab
  and 7 aren't — Wiš'adel, W, Ines and Hoederer (no team at all), plus the three Followers.
- **The list needs a line per new collab.** `teamId` is a stable slug, but nothing in the
  data marks it as belonging to a crossover, so a curated set is unavoidable. Sanity Gone
  and the wiki both categorise collabs, so a build-time cross-check against
  arknights.wiki.gg is the alternative to hand-maintaining it.

Neither field is in `operators.json` yet — `teamId` and `displayNumber` would be harvested
the same way `nation` already is, in `buildOperatorDetails`, at no extra request cost.

### rem migration — decide it, then do it all at once
Every size in the project is px: the `--fs-*` and `--sp-*` scales, the grid's column
floors, `.op-stars`' clip polygon, the card's padding. That means a reader who has set a
larger default font size in their browser gets **no change at all** — px text responds to
page zoom but not to font-size preference, which is the setting people with low vision
actually use.

Switching to rem would fix that, and the scales in `_tokens.scss` are the right place to
start: they're already the single source for both targets, so `10px → 0.625rem` and so on
is a contained edit.

**The trap is partial conversion.** The pieces are tuned against each other, not against
absolute values:

- `.op-stars`' `polygon(0px 12px, 100% 24px, ...)` is matched to its own `padding: 24px 2px
  8px` — 24px of top padding clears a 24px-deep cut. Convert one and the cut eats the first
  star.
- `#grid`'s 160px floor is measured against pixel text widths (`"Supporter"` at 58px,
  `"Mech-accord Caster"` at 113px). Those measurements only hold at a 16px root.
- `aspect-ratio: 1 / 2` is matched to a fixed 180x360 portrait asset.

So the polygon should be the **last** thing converted, not the first, and the real cost is
re-taking every measurement recorded in `styles.scss`'s comments at whatever root size is
being targeted. Worth doing deliberately or not at all — a half-migrated stylesheet is
worse than the px one.

Open question before starting: whether the extension popup follows. It's a fixed 380px
panel by definition, so rem buys it much less than it buys the web SPA.

### Filter popover needs a rework
Everything filterable lives behind one "Filters" button, and the panel it opens is four
stacked groups (class glyphs, branch chips, rarity chips, tag chips + any/all) with a
Clear button. It works, but it's the least considered surface on the page:

- **Class and rarity used to be one click and are now two.** Already noted under the
  UI/UX refactor entry below; a hybrid — class and rarity inline in the topbar, branch and
  tags in the popover — was the sketch, never built.
- **The tag list is unbounded.** Every recruitment tag renders as a chip, so the panel is
  mostly tags by area, and they're the least-used dimension.
- **Branch is single-select while everything else is multi.** Inconsistent, and there's
  no visible reason for the asymmetry beyond how it was built.
- **No indication of what a filter would yield.** Selecting a class then a branch can
  produce zero results with no warning until the grid empties.
- **The panel re-renders wholesale on every click** (`renderMore()` rebuilds its
  `innerHTML`), so chip focus is lost after each toggle — keyboard use is unpleasant.

Not blocked on anything; it needs a design pass rather than investigation. Worth doing
alongside the UI/UX refactor below rather than separately, since both touch the topbar.

### Nation and group on the detail page, with their logos
The grid card now carries the operator's home nation up its left edge (`.op-edge`, from
`nation` in the generated index). The **detail page shows neither nation nor group**, which
is the bigger gap — that page is where you'd actually go looking for "where is SilverAsh
from".

Everything needed already exists; this is assembly, not investigation:

- **Nation** is in the baked payload at `factions[0].nationPower.powerName` (`Kjerag`), and
  is already surfaced in `operators.json` as `nation`. 403/427 operators have one, across
  19 nations.
- **Group** is right beside it at `factions[0].groupPower.powerName` — `Karlan Trade CO.,
  LTD` for SilverAsh — and is **not** extracted anywhere yet. `teamPower` is a third tier,
  usually null.
- **Logos** are on the Arknight-Images CDN at `factions/logo_<id>.png` — 47 of them, keyed
  by the same slugs the payload uses for both tiers (`logo_kjerag.png`, `logo_karlan.png`).
  A new `factionLogoUrl()` in `hella-api.ts` alongside `classIconUrl` is the natural home.

Two things to check before wiring it up:

- **The slug isn't always the filename.** `Ægir` is `logo_egir.png`, so at least one id
  needs transliterating. Diff the 47 filenames against the distinct `nationId`/`groupId`
  values and see how many others don't match; the ones that don't need hiding on error the
  way the branch icons already do.
- **Where it goes.** Misc is the obvious tab, but nation is identity rather than trivia —
  the class/branch row in the panel header may be the better home, which is a layout
  question rather than a data one.

### Outfit / skin coverage in the detail view
The artwork viewer lists each outfit and labels it with the skin's own name, but that's
all the skin data currently surfaced. `skins[].displaySkin` also carries the outfit's
description, obtain method, availability window and designer credits — none of it shown.
A proper skins section (rather than art-only) is the obvious next step.

Also one confirmed upstream art gap: **Windscoot**'s `epoque#49` outfit exists in the skin
table but has no image in PuppiizSunniiz/Arknight-Images, so it silently doesn't appear.
Everyone else's skins are fully covered (426/427).

### Extension bundle size
`dist/ext` is ~32 MB, almost entirely the 427 baked operator-detail JSONs. Within store
limits (Chrome 2 GB, Firefox AMO 200 MB) so it isn't blocking, but the popup only renders
name/class/rarity/description/levels/skill-IDs — a small slice of what those files hold.
Options: ship a slim per-operator payload for the extension, or let the popup fetch live
like it used to and keep the static bundle web-only.

### Verify the extension in a real browser
Everything so far has been checked by loading `dist/ext/popup.html` over `file://`. It has
never been loaded as an actual extension (`about:debugging` in Firefox, `chrome://extensions`
in Chrome). The toolbar icon and the popup's own sizing can only really be confirmed there.

## Feature backlog

- **Promotion / module material costs** on the detail view. `evolveCost` and module
  `itemCost` are already present in the baked payloads; needs item icons and names.
- **Voice lines.** AN-EN-Tags carries `charword_table.json` and `tl-voiceline.json`.
- **Framework decision:** stay vanilla TS or move to Astro. Currently vanilla, no blocker.

## Known data gaps (upstream, not bugs)

These are limits of the sources, not defects to fix in this repo — they resolve when the
upstream projects catch up.

- **Module trait text stays Chinese** for CN-only operators. The only module data in
  AN-EN-Tags covers talent-upgrade numbers, not the trait-override text the detail view
  renders. No known source.
- **Skill and talent *names*** stay Chinese for CN-only operators — the translation source
  only carries descriptions, there is no name field to pull.
- **Newer CN operators are largely untranslated** (roughly GALLUS² onward). The community
  translation project works in order and hasn't reached them.
- **Ботани, Укусик, Вий** have no arknights.wiki.gg page, so no English trait or bio.
- **Pedro has no archetype badge or archetype name.** His branch, "Supportive Ranger", is
  new enough that arknights.wiki.gg hasn't made a branch icon for it (71 of our 72
  branches are covered). Separately his `archetype` is an empty string: CN-supplement
  operators inherit that label by matching `subProfessionId` against an operator HellaAPI
  already knows, and he's the only one whose branch no existing operator shares. The wiki's
  `Operators.branch` Cargo field does have it — worth using as a fallback for blank
  archetypes.

## Housekeeping

- `design/logo-concepts.html` (published artifact) still shows the discarded hand-drawn
  SVG mascot concepts rather than the chibi art that shipped.
