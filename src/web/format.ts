import type { Rarity, Profession } from '../shared/types';

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

// Alters are always named "Base Name the Epithet" ("SilverAsh the Reignfrost", "Ch'en
// the Dawnstreak") — a naming convention the game itself uses consistently, not a
// heuristic. Splitting it out lets the base name and epithet render as two lines
// instead of one truncated string.
export function splitAlterName(name: string): { base: string; epithet: string | null } {
  const m = /^(.+?) the (.+)$/.exec(name);
  return m ? { base: m[1], epithet: m[2] } : { base: name, epithet: null };
}
