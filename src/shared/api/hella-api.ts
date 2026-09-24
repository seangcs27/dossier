import type { Operator, OperatorId } from '../types';

export const IMAGE_BASE = 'https://cdn.jsdelivr.net/gh/PuppiizSunniiz/Arknight-Images@main';
// Pre-cropped half-body bust portraits (a fixed 180x360 — genuinely portrait-shaped,
// unlike the square full-illustration crops in IMAGE_BASE/characters/) — the same
// asset category Sanity Gone displays as charportraits. Not in PuppiizSunniiz's repo
// (checked the full tree — no such folder there); this one's README documents it as
// exactly this: "干员半身像" (operator half-body portraits), same fan-asset-repo
// pattern as everything else this project already sources from, official art under
// Hypergryph's copyright per the repo's own disclaimer.
const PORTRAIT_BASE = 'https://cdn.jsdelivr.net/gh/yuanyan3060/ArknightsGameResource@main/portrait';

// Baked at build time by build-operator-index.mjs — one JSON file per operator, every
// operator, not just CN-supplement ones (see buildOperatorDetails there): full Operator
// objects, CN ones already shape-normalized and translated. Same-origin static file, no
// third-party API round trip, and the only path — an id the last build didn't know about
// is a wait for the next rebuild, not a live fallback.
export async function fetchOperator(id: OperatorId): Promise<Operator> {
  const res = await fetch(`operator-details/${encodeURIComponent(id)}.json`);
  if (!res.ok) throw new Error(`no baked payload for ${id}`);
  return res.json() as Promise<Operator>;
}

export function operatorAvatarUrl(id: OperatorId): string {
  return `${IMAGE_BASE}/avatars/${id}.png`;
}

// `_1` is the base/E1 look, `_2` is E2. Not every id has both (a couple of alter forms
// only ship `_2`), so this is meant to be tried with an <img onerror> fallback chain
// down to `_2` then the avatar, not asserted to exist outright.
export function operatorPortraitUrl(id: OperatorId, suffix: '1' | '2' = '1'): string {
  return `${PORTRAIT_BASE}/${id}_${suffix}.png`;
}

// The same portrait, baked into the bundle as WebP by scripts/build-operator-index.mjs and
// copied beside the page like branch-icons/. The grid asks for this first and keeps the CDN
// chain above as its fallback, because the build cannot guarantee every id was fetched.
//
// Why bother: a 117 KB PNG becomes ~21 KB, and more importantly the request stops being a
// cold CDN edge miss. On a quiet site each portrait is wanted by exactly one card, so it is
// almost never warm at the edge — measured ~800-1200 ms cold against ~160-180 ms warm.
export function operatorPortraitLocalUrl(id: OperatorId): string {
  return `portraits/${encodeURIComponent(id)}.webp`;
}

// The faction badge printed on the back of a card, keyed by the game's own faction id
// ('rim', 'kjerag'). Baked into the bundle by the build like branch-icons/, and held as
// an alpha mask rather than a picture, so the card can tint it. About 4 KB each, one per
// faction rather than one per operator.
export function factionLogoUrl(nationId: string): string {
  return `faction-logos/${encodeURIComponent(nationId)}.webp`;
}

// The square avatar for one specific outfit, keyed by the same suffix `arts[].suffix`
// carries ('2', 'summer#4', ...). Every skin has one, and at ~55KB it is roughly a
// hundredth of the full illustration — which matters because the detail page's skin rail
// renders these at 64px. Suffix '1' is the base look, whose avatar carries no suffix.
export function operatorSkinAvatarUrl(id: OperatorId, suffix: string): string {
  const stem = suffix === '1' ? id : `${id}_${suffix}`;
  return `${IMAGE_BASE}/avatars/${encodeURIComponent(stem)}.png`;
}

// The detail page's artwork, resized on the way through a public image proxy.
//
// The source files are the reason a detail page is slow: they are full-size square PNGs,
// and SilverAsh's E2 is 3.4 MB and took 2.8 s to arrive when measured. The same image at
// 1024px WebP is 186 KB and lands in about 0.1 s. Baking these like the card portraits
// would mean ~1,360 illustrations and hundreds of megabytes in the bundle, so this is the
// one image set that stays remote.
//
// wsrv.nl caches a year, so only the first visitor to an operator pays. Callers keep the
// raw URL as an onerror fallback — if the proxy ever disappears the page is merely slow
// again rather than broken.
export function artUrl(rawUrl: string, width: number, quality = 82): string {
  const source = rawUrl.replace(/^https?:\/\//, '');
  return `https://wsrv.nl/?url=${encodeURIComponent(source)}&w=${width}&output=webp&q=${quality}`;
}

export function skillIconUrl(skillId: string): string {
  return `${IMAGE_BASE}/skills/skill_icon_${encodeURIComponent(skillId)}.png`;
}

// White monochrome glyph on transparency. Takes the CSS slug ('defender', 'vanguard'),
// not the game enum — there are only eight, so they cache across the whole grid.
// Baked into the bundle like the branch icons, and for the same reason: an icon almost
// nobody requests is almost never warm at a CDN edge, so it was costing between half a
// second and nearly three on a first view. With these local the grid touches no third
// party at all. Takes the CSS slug ('vanguard', 'defender') — the game's own enum values
// do not name the upstream files.
export function classIconUrl(slug: string): string {
  return `class-icons/${encodeURIComponent(slug)}.webp`;
}

// Archetype/branch glyph, keyed by subProfessionId. Downloaded from arknights.wiki.gg's
// `Category:Branch icons` at build time (see fetchBranchIcons in
// scripts/build-operator-index.mjs) and served from our own origin — the previous source,
// Aceship's mirror, stopped updating in 2022 and was missing every branch added since.
// The download is best-effort — a branch the wiki has no icon for, or a failed fetch, just
// leaves a gap — so callers still hide the <img> on error rather than showing a broken one.
export function archetypeIconUrl(subProfessionId: string): string {
  return `branch-icons/${encodeURIComponent(subProfessionId)}.png`;
}
