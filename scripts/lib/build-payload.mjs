// Joins the excel tables into the payload shape src/shared/types/operator.ts describes —
// the shape HellaAPI used to return, minus the three fields nothing reads (deploys,
// paradox, recruit). Every rule here was verified against the payloads HellaAPI produced;
// scripts/compare-payloads.mjs is what keeps it honest.
import { table } from './gamedata.mjs';

// The game's JSON writes an EMPTY array-typed field as `{}` rather than `[]`, and it does
// this for any such field, not just one: the blackboard of a talent with no numbers,
// `evolveCost` on a 3-star who promotes for free, `skills` and `allSkillLvlup` on 12F who
// has none, `potentialRanks`, `levelUpCostCond`. HellaAPI normalised every one of them
// before we ever saw a payload, and the app depends on that: interpolate() in
// src/web/format.ts:73 calls .find() on a blackboard, which throws on an object.
//
// Hence the blanket rule — every empty object becomes an empty array. The risk it carries
// is flattening a field that is legitimately an empty dictionary, and the gate is what
// catches that: such a field reports as `array vs object` against the golden payload, and
// its key goes in KEEP_AS_OBJECT. A roster-wide run with zero structural mismatches is the
// proof that this set is complete.
const KEEP_AS_OBJECT = new Set([]);

function normalizeEmptyArrays(value, key = '') {
  if (Array.isArray(value)) return value.map(v => normalizeEmptyArrays(v));
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length && !KEEP_AS_OBJECT.has(key)) return [];
    return Object.fromEntries(entries.map(([k, v]) => [k, normalizeEmptyArrays(v, k)]));
  }
  return value;
}

export async function buildPayload(charId, server = 'en') {
  const chars = await table(server, 'character_table');
  const patch = await table(server, 'char_patch_table');

  // Amiya's Guard and Medic forms are the only two operators the character table doesn't
  // hold — the game keeps them in char_patch_table, where all three Amiya records are just
  // named "Amiya". The bracketed form the grid shows comes from patchDetailInfoList's
  // `infoParam` ("Guard", "Medic"), which is how the golden payloads got "Amiya (Guard)".
  const patched = patch.patchChars?.[charId];
  const form = patch.patchDetailInfoList?.[charId]?.infoParam;
  const raw = chars[charId]
    ?? (patched && { ...patched, name: form ? `${patched.name} (${form})` : patched.name });
  if (!raw) return null;

  // Normalised here and not only on the way out, because the joins in later tasks read
  // `data.skills` and `data.phases` directly — and an operator with no skills (12F) has
  // `{}` there, which has no .filter.
  const data = normalizeEmptyArrays(raw);

  const uni = await table(server, 'uniequip_table');
  const skillTable = await table(server, 'skill_table');

  // Wrapping the whole payload means every field a later task adds is normalised too.
  return normalizeEmptyArrays({
    id: charId,
    data,
    // Readable branch name: 'craftsman' -> 'Artificer'. CN data names it in Chinese, so a
    // CN-only branch keeps '' here and build-operator-index.mjs fills it from the wiki.
    archetype: server === 'en' ? uni.subProfDict[data.subProfessionId]?.subProfessionName ?? '' : '',
    // Each of the character's skill refs paired with the skill's own entry. HellaAPI called
    // these `deploy` and `excel`, and the detail view still reads both names.
    skills: (data.skills ?? [])
      .filter(ref => skillTable[ref.skillId])
      .map(ref => ({ deploy: ref, excel: skillTable[ref.skillId] })),
  });
}
