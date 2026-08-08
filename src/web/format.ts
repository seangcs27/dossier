import type { Blackboard, Rarity, Profession, OperatorData } from '../shared/types';

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

// ── Rich description rendering ───────────────────────────────────────────────
// Game descriptions are a small markup language, not prose: `<@ba.vup>+{atk:0%}</>`
// means "render the blackboard value `atk` as a percentage, styled as a buff". Stripping
// it (cleanText, above) throws away both the emphasis and the numbers — "ATK +{atk:0%}"
// reads as "ATK +". This renders it the way the game and Sanity Gone do: tags become
// styled spans, `{placeholders}` are interpolated from the entry's own blackboard.

// Two tag families: @ba.* on operator text, @cc.* on RIIC base text. Anything else
// beginning with `$` is a status/keyword tooltip in the game client; we have no tooltip
// content for those, so they render as muted text rather than being dropped.
const TAG_CLASS: Record<string, string> = {
  '@ba.vup':         'value-up',
  '@ba.vdown':       'value-down',
  '@ba.rem':         'reminder-text',
  '@ba.kw':          'keyword',
  '@ba.talpu':       'potential',
  '@ba.dt.element':  'keyword',
  '@cc.vup':         'value-up',
  '@cc.vdown':       'value-down',
  '@cc.rem':         'reminder-text',
  '@cc.kw':          'keyword',
};

function tagClass(tag: string): string {
  return TAG_CLASS[tag] ?? 'skill-tooltip';
}

const PLACEHOLDER = /-?\{-?([^}:]+?)(?::([^}]+))?\}/g;

function interpolate(text: string, bb: Blackboard[]): string {
  return text.replace(PLACEHOLDER, (raw, key: string, format?: string) => {
    const entry = bb.find(b => b.key?.toLowerCase() === key.toLowerCase());
    // An unresolved key means the entry shipped without its blackboard (the CN fallback
    // path does this for a handful of operators). Showing the raw token is honest —
    // silently dropping it would read as a finished sentence with a hole in it.
    if (!entry) return raw;
    const v = entry.value;
    if (format === undefined) return String(v);
    if (format === '0%')  return `${Math.round(v * 100)}%`;
    if (format === '0.0') return v.toFixed(1);
    if (format === '0')   return v.toFixed(0);
    return String(v);
  });
}

// Tags nest (rarely, but they do), so this walks the string with a stack rather than
// running a flat regex replace: an unbalanced `</>` is ignored and an unclosed tag is
// closed at the end, which is what the game data occasionally needs.
export function descriptionToHtml(text: string | null | undefined, bb: Blackboard[] = []): string {
  if (!text) return '';
  const TOKEN = /<(\/|@[^>]*|\$[^>]*)>/g;
  let out = '';
  let depth = 0;
  let last = 0;
  let m: RegExpExecArray | null;

  const emit = (chunk: string) => {
    if (chunk) out += interpolate(escHtml(chunk), bb);
  };

  while ((m = TOKEN.exec(text)) !== null) {
    emit(text.slice(last, m.index));
    last = TOKEN.lastIndex;
    if (m[1] === '/') {
      if (depth > 0) { out += '</span>'; depth--; }
    } else {
      out += `<span class="${tagClass(m[1])}">`;
      depth++;
    }
  }
  emit(text.slice(last));
  while (depth-- > 0) out += '</span>';

  // Newlines survive the game data as both real and escaped; HTML collapses either.
  return out.replace(/\r?\n|\\n/g, '<br>');
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
// Same resolution as traitText below, but keeps the candidate's blackboard alongside the
// string so descriptionToHtml can fill in the {placeholders} the trait text carries.
export function traitInfo(d: OperatorData): { text: string; blackboard: Blackboard[] } | null {
  if (typeof d.trait === 'string') return d.trait ? { text: d.trait, blackboard: [] } : null;
  if (d.trait && typeof d.trait === 'object') {
    const candidates = d.trait.candidates ?? [];
    const last = candidates[candidates.length - 1];
    const text = last?.overrideDescripton ?? last?.additionalDescription;
    return text ? { text, blackboard: last?.blackboard ?? [] } : null;
  }
  return null;
}

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
