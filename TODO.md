# Pending work

Running backlog. Newest concerns first; each entry says what's actually blocking it so
picking one up later doesn't need re-investigation.

## Planned

### Path to Nowhere, hololive Dreams, Fate/Grand Order — what is left

Each has a sidebar tile with an emblem and a roster (`#/ptn` 144 Sinners, `#/holodori` 54
holomems, `#/fgo` 470 Servants); CLAUDE.md, "The other games' rosters", has how. They are
the rest of the owner's plan of 20 September 2026 (a Hololive section beside the game is the
one part of it not started). PtN's and FGO's card art is baked (143 mugshots, 6.1 MB; 470
figures, 5.3 MB), and the three emblems are in; the owner approved those downloads on 11
October 2026. Path to Nowhere also has search, filters and a dossier per Sinner, and
hololive Dreams a sticker sheet with search and filters (54 busts from the game's official
site, approved 15 October 2026). Not built yet:

- **A design of its own for each game.** The owner means them to differ. Path to Nowhere
  is the first: its roster is a line-up wall (CLAUDE.md), built on 12 October 2026 to a
  brief the owner confirmed. hololive Dreams is the second: a sheet of all 54 stickers and a
  birthday calendar (the album and grid built on 15 October 2026 were taken out on 17
  October at the owner's ask). Its game itself has a Songs page (215 songs, 157 jackets from its official site,
  approved 16 October 2026) and a Cards page (192 cards with the game's own card art from
  HolodoriDB's CDN), each card with a page of its own (stats by level and bloom, skills,
  voice lines and live dialogues), built 17 October 2026; on 18 October a front page
  (`#/holodori`; the sheet moved to `#/holodori/holomems`), a Gachas page (a record kept by
  hand from holodori.best, `scripts/lib/holodori-gachas.mjs`) and each holomem's membership
  stickers. FGO is on the Arknights card still.
  A Sinner's page is in the same world, and the wall is set in Barlow Condensed.
- **What the line-up wall still wants:**
  - **The placard face as WOFF2.** The two TTFs are 213 KB; a Latin-only WOFF2 of each
    would be about a quarter of that. Nothing on this machine makes one (`fonttools` is not
    installed), and fetching Google's own would be another download for the owner to
    approve.
  - **The attires and the phase-up art hang as prints**, since they are scenes. If the
    owner wants them standing, each would need cutting out by hand, or a look at which of
    the 331 are a lone figure on transparency (the build could ask the proxy for each
    one's trimmed shape, which is 331 requests).
  - **It is long**: 144 whole figures are about 25 rows on a desktop and 56 on a phone.
  - **The roster's numerals are not in the placard's face**: they are a picture the wall
    is masked by, and a picture cannot load a font. A Sinner's page has real ones.
  - `ptn/mugshots/` and `ptn/originals/`, the cut pictures the cards read, are read by
    nothing now; the directories are still on disk and in CI's cache.
  - The design skill's own finish review and its `DESIGN.md` have not been run.
- **The gallery's larger pictures are not for baking**: the phase-up art, the attires and
  the interrogation pictures are 399 files and about 1.4 GB. (The originals, for the cards,
  are baked: 142 files.)
- **Path to Nowhere's release record is kept by hand** (`scripts/lib/ptn-record.mjs`, read
  off S1N on 12 October 2026; CLAUDE.md has how and why). Each release wants a line added:
  the day of the Sinner's first Global banner, from the Archive tab of `s1n.gg/banners`,
  and their names as the wiki titles their pages. The build says so when the roster has a
  Sinner the record lacks. Its last line is 8 October 2026 (Phanuel, Evie); S1N lists five
  more as unreleased (Famorene Eirene, Requiem, Helix, Daffodil, Arancia), which the roster
  has as CN-only from the Chinese wiki. When one comes to Global it wants its line here,
  under the name the English wiki titles its page (the Chinese wiki's English name for it
  may differ, and then the roster would show the Sinner twice until the join is taught it).
- **Five Sinners are on the roster with no file**, since the wiki has no page for them:
  Norma, Isomer, Pixel, Phanuel, Evie. The head of each is in the same record; skills,
  shackles and documents come when the wiki writes the page, with nothing to do here then.
  Pixel has no pictures on the English wiki either, and stands as the Chinese wiki's
  illustration, as Pine does.

  What the look into a release order found on the wiki, before S1N's was read:
  - The English wiki's `Arrests` page is its banner history, 115 banners in four tabs, each
    with its dates and the Sinners it features. It dates 81 of the 144 by their first
    banner; 39 more are only in banners whose dates were never filled in (the later rows),
    and can be ordered by row; 24 are in no banner, the launch roster and the newest alike,
    which nothing on the page tells apart. **A first dated banner is not a release date**,
    though: 27 of the 81 had their pictures on the wiki more than 60 days before it (a
    launch Sinner's later rate-up, as Crache's, or the Global run of one CN had first).
  - The wiki has no version history to fill the gap. `Patch History` is a table's header
    and no rows; there are six patch pages, all of 2023 and 2024; a Sinner's page has no
    date field; the day a page joined `Category:Playable Sinners` is 8 December 2025 for
    nearly all of them (a template change set it); and the `Events` page's reward column
    dates 11 Sinners, every one of whom a banner dates already.
  - What does reach the roster is **the day a Sinner's pictures were first uploaded**
    (`prop=imageinfo`, every version's timestamp, the oldest kept): 143 of 144, all but
    Pine. From 2024 on it reads as the day the Sinner was announced: 65 of those 68 have
    the original and the mugshot uploaded within three days of each other, a release or two
    a month. Before 2024 it does not: the wiki's editors uploaded in batches (14 Sinners
    in December 2022, 9 in April 2023, 9 in June 2023), so a launch Sinner with no banner
    lands up to a year late, and against the banner dates it puts 81 to 84% of pairs in
    the same order.
  - The game's Chinese wiki prints a release date on every Sinner's page (上线日期), the
    CN server's. It was thought to block scripts, and does not: its Semantic MediaWiki API
    answers a build's own user agent, and the build reads it now (`scripts/lib/ptn-bili.mjs`).
- **What stays English on Path to Nowhere's Chinese side.** The Chinese wiki's page for
  each Sinner and each exclusive crimebrand's page are read and laid over the English text
  on that side (14 October 2026), and the shell's Filters, Clear, section link and "No
  results" follow the language. Still English: an attire's name (that wiki lists none), the
  Japanese and Korean voice actors' names (it names the CN one only), "Lv", the sidebar and
  the phone's games drawer, and screen-reader names. **The CN-only Sinners' files are in
  Chinese in either language**, since that is the only text there is for them.
- **The Chinese wiki rate-limits (HTTP 567).** It did so on 14 October 2026 to the owner's
  machine after a day of probing it (for about 10 minutes at first, hours in all), and to
  GitHub's runner for a whole deploy. The build waits and asks again, and then reads
  `scripts/lib/ptn-bili-snapshot.json`, a tracked copy of what that wiki last gave whole
  (CLAUDE.md has it). **Its upkeep is yours**: a new Sinner or an edited page reaches the
  site only once a build that read the wiki live has rewritten the snapshot and it is
  committed, so after the game's patch days run `npm run build:index:ptn` locally and commit
  the file. The deploy log says `from the snapshot of the Chinese wiki` when it was used.
  It is 2.0 MB and a one-line JSON, so its diff is the whole file; each commit adds about
  that many compressed bytes to the history that changed (a few a month, at most).
- **GitHub's runners reach `wiki.biligame.com`**: the first deploy with it (13 October
  2026) logged 160 Sinners, 160 with a Chinese name, 11 on CN only. Should that stop, the
  build warns (`ptn: nothing from the Chinese wiki`) and ships the English half: no Chinese
  names, no CN-only Sinners, and Pine, Pixel and Kisugi Ai lose the illustration that wiki
  gives them. The mend then is to keep the last build's Chinese fields as the Arknights
  index keeps its last data.
- **The one wall's drag, wheel, arrows and rail were checked by script, not by hand**
  (13 October 2026): the browser pane the checks ran in stopped painting part way, so a
  real mouse's drag, the feel of the wheel on a notched mouse (it moves 100px a notch, with
  no easing), and the 1px edge down the scale's right side want the owner's eye. A
  pressed-and-held arrow does not repeat, and the rail's window cannot be grabbed on its
  own: a drag anywhere on the rail centres the wall on the pointer.
- **"Arrested 2026" is this site's wording** for a year's line-up, after the game's word
  for its gacha (Arrest, 逮捕). One word in `ptn-lang.ts` (`arrivals`, `arrived`,
  `newArrivals`) changes it in each language.
- **The English names of the four kinds of libram** (Sin, Apocalypse, Immortal, Infinite)
  are this site's translation of 原罪, 天启, 不朽, 无界: neither wiki gives them in English.
- **What a Sinner's dossier lacks beside its reference** (the game's Chinese wiki's page):
  - An attire's description and how it is got, which the `Attires` subpage the build
    already reads has, and the attack and skill animations it lists as GIFs.
  - 43 interrogation pictures the Sinners' galleries name and the wiki has no file for.
  - Skill range diagrams: the English wiki names a range (`MultiRow_3`, `Cross_1`, about
    60 of them, some typed with a space for the underscore) and draws it from an image.
  - What anything costs. The wiki's template works the counts out from the rank, the same
    for every Sinner of it, so the numbers are in `Template:SinnerPage`, not on the pages.
  - Voice lines, the interrogation records' own pages, a reforged Sinner's reforge nodes
    (ten Sinners), Mirage and trivia sections.
  - A title ("西区教母"), which that wiki has and the English one has no field for. The
    CN-only Sinners' payloads carry it (`title`); the 149 others would need that wiki's
    page read for them, as above.
- **PtN's emblem is the X of the game's logo**, mended from the wordmark, since the wiki's
  logo file is the name across that X. It is the weakest of the five at tile size. No file
  on the wiki is named for the MBCC's crest, which would be the counterpart of Rhodes
  Island's; `File:Site-logo.png` (137x137, 31 KB) and `File:MP Icon.png` (58x50, 1.7 KB)
  were found and not looked at. hololive Dreams' tile is hololive's triangle, not the
  game's own mark.
- **Search, filters, a dossier page** for FGO.
  `card.ts` has the search box and the filter panel for any roster that asks (`find`), so
  FGO's is a list of groups away: its index already carries rarity, class (17), attribute
  (5), alignment and JP only.
- **PtN's birthplace is not a filter**: it would need folding first (`WhiteSands Region`
  beside `WhiteSands`, and four ways of saying unknown).
- **Credit on the site itself.** Atlas Academy's data is ODC-BY 1.0, which asks for credit
  where the data is used. The README credits every source; the site has no page that does.
- **What else the sources have**, for later passes.
  - hololive Dreams: 200 costumes, units, stories (songs, cards, gachas and stickers are
    built). The gacha record lacks the launch banner (`pickup-*-260728`) and the ★5 ticket
    gacha, which holodori.best does not load, and every gacha's rates and full card list.
    The dump includes rows not yet released, so anything dated has to be filtered by its
    start time. The eight graduated
    talents are in the table and left out.
  - FGO: gender, 107 traits, ATK and HP, costumes, later ascensions' art, and a flag on 57
    Servants that looks like the welfare set (not verified).
  - PtN: gender, date of birth, height, case files, voice actors, the "Core" mark on 35
    tendencies, the ten reforged Sinners, and badges for tendency and libram (there is no
    `Umbra Icon.png`: the wiki uses the Corebreak one for it).
- **PtN ids are page-title slugs**, so a page the wiki renames changes its id. `pageid`
  would survive that and is opaque; the game's own ids are in `gilmarion/PtNData` for 105 of
  the 144. It matters once a dossier's address is built from the id.
- **Two FGO cards cannot be told apart** but by number and picture: Kishinami Hakuno, No.
  424 and No. 425.
- **Art the bake does not have.** Pine has no mugshot on the PtN wiki, and its card shows a
  "P". FGO's figures are the first ascension's; the later ones are on the same host
  (`@1`, `@2`). A picture redrawn at its source never reaches the site, since baked files
  are kept: delete `ptn/mugshots/` or `fgo/figures/` to fetch them again.
- **The drawer shows the short names** (PtN, Holodori, FGO) where it has room for the full
  ones.

### Arknights: Endfield — what is left

The second game has a sidebar tile (Endfield Industries' emblem), a roster (`#/endfield`, 33
operators on the Arknights card, with name search and a filter panel for class, element,
weapon, rarity and faction) and a first dossier page (`#/endfield/op/<id>`: splash art, name,
class / element / weapon, quote, the profile facts, tags), all baked from `endfield.wiki.gg`.
CLAUDE.md has how. Not built yet, roughly in the order worth doing:

- **The dossier's sections from the payload.** The build already bakes
  `endfield/operator-details/<id>.json` for all 33 (the rest of the file, attributes at six
  levels, potentials, skills with twelve ranks, talents, base skills) and `endfield-index.ts`
  has its types and `fetchEndfieldOperator`, but nothing reads either: the page shows only
  what the roster index has. `views/endfield-detail.ts` builds its body a function per
  section, so these are appended.
- **Costs.** Promotions, skill ranks, talents and base skills each list items and counts on
  the page; the parser leaves them there. They need the wiki's `Items` table and its icons.
- **Order.** Rarity, then name. The `Operators` table has no release date; `Versions` and
  `Banners` might date them.
- **Four cards elide their element and weapon line at a phone's two columns**, with no
  tooltip to read it in full: the line's `data-tip` is the operator's id alone.
- **Left on the wiki page by choice:** its opening paragraph, "Additional Info", the weapons
  the game recommends, the voice actors. The wiki's other tables that could feed a later
  pass: `Weapons`, `WeaponSkills`, `Gears`, `GearSets`, `BaseSkills`, `AbilityMatrixUpgrades`.
- **Three copies of the card's markup**: `grid.ts`, `views/endfield.ts`, and `card.ts`, the
  one the roster-only games share. Folding the first two into the third means rewriting two
  builders that are not broken; the Arknights card has slots the shared one lacks (the
  portrait's fallback chain, the mode badge, the faction logo on the back, the link).
- **Two copies of the search box's and filter panel's handling**, `grid.ts` and
  `views/endfield.ts`, about 45 lines.
- **Three copies of the build scripts' fetch helpers** (`timedFetch`, `wiki`): the operator,
  event and Endfield scripts each carry their own. The newer scripts share
  `scripts/lib/fetch.mjs`.

### Global schedule — what is left

The Events page (`#/events`) has the events, the headhunting pools and a month calendar,
with shop-close times and the anniversary pinned. Arkpedia's Schedule page is the reference.
Not built yet:

- **Predictions after the anniversary still differ from Arkpedia's.** Ours pin the carnival
  to 16 January and return to the usual lag, as past years did; Arkpedia's stay 10–16 days
  later through March. No rule reproduced theirs (they may be hand-set), so there is nothing
  to copy; revisit when the wiki's `EstimatedEventDetails` table, empty today, gets rows.
- **Birthdays and the pull planner.** Arkpedia's calendar has a Birthdays toggle and its
  event cards a "Plan pulls" button. Neither was asked for.
- **Standard pools ahead of the wiki.** The game dates a standard pool before the wiki has
  numbered it, so the next one can show with no operators and no banner (Standard Pool 177
  did). It fills in on the build after the wiki catches up.

### Mode-only operators in the grid

The 29 operators a game mode lends (IS, SP) are in the grid: badged on the card, tagged on
their detail page, filterable under Game mode, and placed among the released operators by
the places recorded in `scripts/lib/mode-order.mjs`. What is left:

- **The Server filter counts them under GLOBAL**, whose tooltip says "released".
- **"SO" is not marked.** AN-EN-Tags badges two obtainable operators, Raidian and Mechanist,
  as Special Operators, from its own `json/puppiiz/special_operator.json`. Nothing in the
  game tables read here says so.
- **A new mode-only operator needs a line by hand.** The record is fixed; one added to the
  game later sorts last and the build warns, naming it, until `mode-order.mjs` gets its line.
- **Seven wiki release dates disagree with the release order.** Skadi, Dur-nar, Breeze,
  Broca, Purestream, Chiave and Raidian carry a wiki date weeks or months later than the
  operators ordered after them (the wiki's "debut event" for them is a later one). Nothing
  shows it: the date is only the sort's fallback, and all seven have an order. Mayer had no
  order here until October 2026, and then Scene had none: the build was giving Timeslot,
  which Sanity Gone has not numbered, the ordinal of whichever entry came after it. Fixed;
  an operator with no order now is one Sanity Gone has not numbered, and sorts by its date.

### The filter blob — its animation unseen by me

The Filters popover's shape is an SVG goo filter over two blocks: a folder whose tab stands
in the search box's right end, behind the Filters, Clear and close buttons. It went through
a blob round the Filters button (liked), a plain panel as wide as the box ("not the slime
shape any more", and missing its animation, which was the reduced-motion rule doing what it
said on a machine with that setting on), a blob with shoulders and drips (animation back,
drips unwanted), and a square-cornered tab, before the owner mocked up the shape it has now:
the body starting at the box's lower edge, so the filter curves the join round the end of
the field. Every corner then took the search box's own 8px, the buttons inside it 4px, and
the box became one outlined box rather than two halves side by side. Last, the two joins
where the field's corner met the panel's (beside the tab, and over the body) were flattened
on the outside: the outline's top and left edges run straight through, and the panel's round
corner stays as the field's boundary under them. My first pass read the owner's mock as
square joins with no curve ("wrong, I still want the tab border to be curve"); the mock,
enlarged, shows the curve kept. It animates regardless
of that setting. I have confirmed the transitions start, open and close, and looked at the
open and shut states, but nobody has watched this version play at speed, and the gold line
on the box while typing could not be checked here: the app's browser pane never reports the
page as focused. One thing to watch for at speed: opening, the field's bottom left corner
changes shape 0.42s in, timed to the body's left edge reaching it (worked out from the ease,
checked on paused frames, not watched).

The owner asked for CSS anchor positioning to line the shape up with the buttons. It cannot
be used for that while the shape is a filtered layer (the filter makes that layer the
containing block for what is positioned inside it, and an anchor outside is out of reach),
so the tab's size is still measured in script. Drawing the folder without the filter, with
plain borders and an inverted-corner piece anchored to the buttons, would allow it, at the
cost of the liquid join and its animation.

### Detail page — match Sanity Gone, one tab at a time
Done tab by tab against the live reference (https://sanitygone.help/en/operators/makoto-yuki/
is a good specimen: limited, module, four-potential dropdown), so each pass can be reviewed
on its own. Attributes is done: stat glyphs, the game's elite and potential badges, the
position icon, circular material tiles, the LIMITED tag, and the faction badge in the header.
Talents is done: the potential badge menu limited to the ranks that change a talent, and
talent ranges (the reference marks a potential-upgraded talent no other way than that menu;
the cards already matched). Skills is done: a typed rank field beside the slider, the
reference's blue for both, no requirement badge at Elite 0 Lv1, and defensive-recovery skills
labelled as such (they read "Always active" before — the data's key is
`INCREASE_WHEN_TAKEN_DAMAGE`). The summon stat block under a token skill (43 skills) is still
not cloned: the payloads carry no summon stats. Modules is done: type badge and code, stat
rows with glyphs, the talent each stage changes (it showed only the trait before, so stages
2 and 3 looked like stat bumps) with the changed words marked blue against either the
operator's own text or the previous stage (a toggle), a potential menu, the module's illustration, and the
flavour text collapsed behind a spoiler warning. Module and potential attack speed now
shorten the Attributes tab's attack interval; both were ignored. RIIC is done: each base
skill's own badge beside its name, and stages grouped by the game's slot rather than by name
— a renamed upgrade used to show beside the skill it replaces, on 104 operator/elite
combinations. The reference shows no room-type icon, so neither do we. Misc is done: the
handbook files (profile, basic info, physical exam, clinical analysis, archive files,
promotion record) from `handbook_info_table`, laid out as the reference does. That closes
the tab-by-tab pass.

What the pass left open:

- **English for CN-only operators** now comes from the wiki: talents, skills, module names
  and effects, trait, and the handbook's Basic Info and Physical Exam. Still Chinese on those
  19, because no source has it: base-skill **names** (40 of them — the wiki's table has 1,
  AN-EN-Tags translates descriptions only), most archive files (the wiki has Aphrissa's in
  full and a Profile for a few), a module's talent text at a raised potential, module flavour
  text, and missions where the wiki page has none. Short of a machine translation or a
  hand-kept table of 40 names, these wait for the global release. The grid's "Not on Global
  yet" filter lists exactly who is affected.
- **Summon stat blocks** under a token skill, and the Misc tab's potential-token row: no data
  in the payloads for either.

### What the raw-gamedata migration left behind
The build no longer touches HellaAPI: `scripts/lib/gamedata.mjs` loads the game's excel
tables from `ArknightsAssets/ArknightsGamedata`, and `scripts/lib/build-payload.mjs` joins
them into the payload shape the app already read. Three loose ends:

- **The runtime has no live fallback.** `fetchOperator` reads the baked file and throws if it
  isn't there, so an operator released since the last build simply isn't on the site until
  the weekly rebuild. That was already the common path — the old fallback only covered the
  gap — but it is now the only path.
- **`.golden/` and `scripts/compare-payloads.mjs` are migration scaffolding.** The 431
  payloads in `.golden/` came from HellaAPI and are what proved the join correct, field by
  field. They are gitignored and drift further from the live tables every week, so the gate
  is worth keeping only while the join is still being changed. Delete both once it settles,
  or re-snapshot from a known-good build.
- **Three encoding rules are load-bearing and unobvious**, each found by the gate rather than
  by reading: the game writes an empty array as `{}` (so every empty object becomes `[]`,
  except `tokenAttributeBlackboard`, which is a real dictionary); Amiya's Guard and Medic
  forms live in `char_patch_table` and take their bracketed names from
  `patchDetailInfoList[id].infoParam`; and her skins are selected by `tmplId`, not `charId`.
  Changing `build-payload.mjs` without the gate risks silently undoing one.


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

### Filter popover — what the rework left
The panel was rebuilt around the search box — Archetype / Subclass with branch glyphs, a
six-segment rarity group, sort and tags under Advanced options, no click-away close — and
focus now survives `renderMore()`'s wholesale rebuild. Two of the original complaints still
stand:

- **Class and rarity are still two clicks away.** They live inside the popover; the hybrid
  sketch — class and rarity inline in the topbar, the rest in the popover — was never built.
- **Only the branch tiles say what a filter would yield.** They dim at zero; a rarity, tag or
  collab combination can still empty the grid with no warning until it does.

Also stale: `scripts/build-design-previews.mjs` hand-writes the old markup — six loose rarity
pills, a topbar `<select id="sort">`, and a card with the branch glyph still in the class row
and no branch line — so `npm run design` regenerates previews of a UI that no longer exists.

Not blocked on anything; needs a design pass rather than investigation.

### Collab logos — what is left
**Done:** Persona 3, Monster Hunter, Ave Mujica and Delicious in Dungeon show the series' own
logo on the card back and in the detail header, in place of the Rhodes Island badge the game
files them under. The four files are in `scripts/collab-logos/` (not `design/source/`, which
turned out to be gitignored whole, so the deploy build could not have read them there);
CLAUDE.md has how they are baked and wired. Rainbow Six Siege keeps the game's own badge.

| Collab | Wikimedia Commons file | Shape |
|---|---|---|
| Persona 3 | `Persona 3 Reload logo black.svg` | compact, reads at 72px |
| Monster Hunter | `Monster Hunter logo black.svg` | two-line wordmark, reads at 72px |
| Ave Mujica | `Ave-mujica-original-logo.svg` | one-line wordmark, small at 72px |
| Delicious in Dungeon | `Dungeon Meshi Logo.png` | the Japanese title, very wide, smallest at 72px |

What is left is better art for the two wide ones, if it exists. Commons' other files were
worse (the Dungeon Meshi SVG is outlines only, the Ave Mujica anime logo an opaque JPEG,
English Wikipedia's Monster Hunter logo a small colour raster), and monsterhunterwiki.org,
which has the series' emblems, sits behind a bot check and was left alone. A squarer emblem
dropped into the folder under the same name replaces a wordmark with no other change.

### Nation and group on the detail page, with their logos
**Partly done.** The detail header now shows one badge — the operator's most specific faction
(team, else group, else nation), from the 45 baked `faction-logos/` — and Misc has a
"Faction" row that prefers the nation. So Texas the Omertosa reads Penguin Logistics in the
header and Lungmen in Misc, and no operator shows both tiers with both logos. What is left is
that pairing: nation *and* group, each named, each with its logo. The notes below predate the
badge and are kept for the data they record; `factionLogoUrl()` exists and every id matched
its filename.

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
The Misc tab now lists every named outfit — series, tagline, flavour text, obtain method,
illustrator and designer — and each name switches the art viewer to it; the viewer's
caption carries the series. Still unshown: the availability window (`getTime`, `onPeriod`),
left out because it isn't clear which server's dates the EN table carries.

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

- **The last ~2% of keyword tooltips.** `game-consts.json` defines 6,113 of the 6,213 `$`
  keyword uses across the payloads. The misses (`ba.triggereffect`, `ba.airprotect`,
  `ba.sees`, `ba.slowdown`, `ba.groundbind`, `ba.magicarcane`, `ba.costlowerbound` and a few
  `cc.*`) are newer terms the EN table doesn't carry yet. AN-EN-Tags' `json/named_effects.json`
  holds an 11-term superset that would cover most of them, at the cost of one more source.
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

## Housekeeping

- `design/logo-concepts.html` (published artifact) still shows the discarded hand-drawn
  SVG mascot concepts rather than the chibi art that shipped.
