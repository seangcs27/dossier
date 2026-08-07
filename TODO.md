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
- **43 operators show no archetype badge** on their grid card. Aceship/Arknight-Images is
  the only public source of subclass icons and its mirror has stopped updating — it covers
  57 of the 72 subclasses in use. Missing: alchemist, counsellor, hammer, hunter,
  loopshooter, mercenary, primcaster, primguard, primprotector, ritualist, skybreaker,
  skywalker, soulcaster, supportiveranger, watchman. Checked yuanyan3060 and
  ArknightsAssets — neither ships subclass icons at all. The class badge still renders, so
  those cards degrade rather than break.

## Housekeeping

- `design/logo-concepts.html` (published artifact) still shows the discarded hand-drawn
  SVG mascot concepts rather than the chibi art that shipped.
