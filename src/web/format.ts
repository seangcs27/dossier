import type { Rarity, Profession, OperatorData } from '../shared/types';

export const PROFESSION_LABEL: Record<Profession, string> = {
  CASTER:   'Caster',
  MEDIC:    'Medic',
  PIONEER:  'Vanguard',
  SNIPER:   'Sniper',
  SPECIAL:  'Specialist',
  SUPPORT:  'Supporter',
  TANK:     'Defender',
  WARRIOR:  'Guard',
};

export const PROFESSION_CSS: Record<Profession, string> = {
  CASTER:   'caster',
  MEDIC:    'medic',
  PIONEER:  'vanguard',
  SNIPER:   'sniper',
  SPECIAL:  'specialist',
  SUPPORT:  'supporter',
  TANK:     'defender',
  WARRIOR:  'guard',
};

export function rarityNum(r: Rarity): number {
  return parseInt(r.replace('TIER_', ''), 10);
}

export function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// HellaAPI descriptions embed markup like <@ba.kw>keyword</> — strip tags, keep text.
export function cleanText(s: string): string {
  return escHtml(s.replace(/<[^>]*>/g, ''));
}

// "PHASE_2" -> "E2"
export function phaseLabel(phase: string): string {
  return 'E' + phase.replace('PHASE_', '');
}

// d.trait is a plain string for most operators (or null — the class's generic trait
// applies instead, via d.description) but for ~150 of 427 it's an evolving-candidate
// object instead, shaped like a talent (see OperatorData.trait's doc comment). Picks
// the last candidate — the fullest-grown state (max Elite phase + potential) — same
// convention the detail view already defaults to elsewhere (E2, max level, max trust).
// Returns null (falls back to d.description) when there's no override text to show,
// e.g. SilverAsh's trait is purely numeric with no text override at any tier.
export function traitText(d: OperatorData): string | null {
  if (typeof d.trait === 'string') return d.trait || null;
  if (d.trait && typeof d.trait === 'object') {
    const candidates = d.trait.candidates ?? [];
    const last = candidates[candidates.length - 1];
    return last?.overrideDescripton ?? last?.additionalDescription ?? null;
  }
  return null;
}

// Alters are always named "Base Name the Epithet" ("SilverAsh the Reignfrost", "Ch'en
// the Dawnstreak") — a naming convention the game itself uses consistently, not a
// heuristic. Splitting it out lets the base name and epithet render as two lines
// instead of one truncated string.
export function splitAlterName(name: string): { base: string; epithet: string | null } {
  const m = /^(.+?) the (.+)$/.exec(name);
  return m ? { base: m[1], epithet: m[2] } : { base: name, epithet: null };
}
