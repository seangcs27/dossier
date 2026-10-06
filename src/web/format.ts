import type { Blackboard, Rarity, Profession, OperatorData, OperatorMode } from '../shared/types';
import gameConsts from '../shared/generated/game-consts.json';

// The game mode a mode-only operator belongs to, spelled out.
export const MODE_LABEL: Record<OperatorMode, string> = {
  IS: 'Integrated Strategies',
  SP: 'Stronghold Protocol',
};

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

/**
 * The trail above a page that hangs off the operator grid (a dossier, the schedule): the
 * way back as a pill with a back chevron, then the page's own name. With no name it is the
 * pill alone, for a page still loading or one that failed.
 */
export function crumbsHtml(current?: string): string {
  return `
    <nav class="crumbs" aria-label="Breadcrumb">
      <a class="crumb-back" href="#/">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5L5.5 8l4.5 4.5"></path></svg>
        Operators
      </a>
      ${current === undefined ? '' : `
        <svg class="crumb-sep" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5"></path></svg>
        <span class="crumb-current" aria-current="page">${escHtml(current)}</span>
      `}
    </nav>
  `;
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

// Two tag families: @ba.* on operator text, @cc.* on RIIC base text. Anything beginning
// with `$` is a keyword the game client explains on tap ("Slow", "Bind"); those render
// muted, with the game's own definition from gamedata_const as a hover title.
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

const TERMS: Record<string, { name: string; description: string } | undefined> = gameConsts.terms;

// ` data-term="Slow" data-tip="-80% Movement Speed" tabindex="0"` for a `$` keyword the
// glossary knows, else nothing. tooltip.ts shows the pair on hover and on focus, which is
// what the tabindex is for. Definitions carry their own markup ("<$ba.stun>Stun</>"), which
// cleanText strips before it escapes the text for the attribute. Their line breaks become
// `&#10;`, which the tooltip still shows as a break: left raw, descriptionToHtml's closing
// newline pass would turn them into a literal "<br>" inside the attribute.
function termAttrs(tag: string): string {
  const term = tag.startsWith('$') ? TERMS[tag.slice(1)] : undefined;
  if (!term) return '';
  const attr = (text: string): string => cleanText(text).replace(/\r?\n|\\n/g, '&#10;');
  return ` data-term="${attr(term.name)}" data-tip="${attr(term.description)}" tabindex="0"`;
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
      out += `<span class="${tagClass(m[1])}"${termAttrs(m[1])}>`;
      depth++;
    }
  }
  emit(text.slice(last));
  while (depth-- > 0) out += '</span>';

  // Newlines survive the game data as both real and escaped; HTML collapses either.
  return out.replace(/\r?\n|\\n/g, '<br>');
}

// An entity, one Han character (CJK text has no spaces to split on), a number, a word, a
// run of whitespace, or a single symbol — so "+16%" against "+21%" marks only the "21".
const DIFF_TOKEN = /&[#\w]+;|\p{Script=Han}|\p{N}+(?:\.\p{N}+)?|\p{L}+|\s+|\S/gu;

// Marks what a rendered description adds or changes against the one it replaces, wrapping
// those words in `.text-diff`. Both sides are descriptionToHtml output: tags pass through
// untouched and only the text between them is compared, word by word on a longest common
// subsequence, so markup and entities stay intact. With no `base`, all of it is new.
export function markChanges(html: string, base: string | null): string {
  const tokens = (text: string): string[] => text.match(DIFF_TOKEN) ?? [];
  const words = (h: string): string[] => h.split(/<[^>]+>/).flatMap(tokens).filter(t => t.trim());
  const ours = words(html);
  const theirs = base === null ? [] : words(base);

  const lcs = Array.from({ length: ours.length + 1 }, () => new Array<number>(theirs.length + 1).fill(0));
  for (let a = ours.length - 1; a >= 0; a--) {
    for (let b = theirs.length - 1; b >= 0; b--) {
      lcs[a][b] = ours[a] === theirs[b] ? lcs[a + 1][b + 1] + 1 : Math.max(lcs[a + 1][b], lcs[a][b + 1]);
    }
  }
  // On a tie, skip the old word rather than the new one, so each old word pairs with its
  // EARLIEST match. The other way round, Nian's "+16% Max HP" paired with the "+4% Max HP"
  // her module adds later in the sentence, and the new clause read as unchanged.
  const kept = new Set<number>();
  for (let a = 0, b = 0; a < ours.length && b < theirs.length;) {
    if (ours[a] === theirs[b]) { kept.add(a); a++; b++; }
    else if (lcs[a + 1][b] > lcs[a][b + 1]) a++;
    else b++;
  }

  // Rebuild, joining neighbouring changed words (and the spaces between them) into one span.
  let index = 0;
  return html.split(/(<[^>]+>)/).map(part => {
    if (part.startsWith('<')) return part;
    let out = '';
    let run = '';
    let space = '';
    for (const t of tokens(part)) {
      if (!t.trim()) {
        if (run) space += t; else out += t;
        continue;
      }
      if (kept.has(index++)) {
        if (run) { out += `<span class="text-diff">${run}</span>`; run = ''; }
        out += space + t;
      } else {
        run += space + t;
      }
      space = '';
    }
    if (run) out += `<span class="text-diff">${run}</span>`;
    return out + space;
  }).join('');
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
