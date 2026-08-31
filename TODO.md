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
