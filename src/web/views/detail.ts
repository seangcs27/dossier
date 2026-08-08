// Operator dossier — a clone of Sanity Gone's operator page (sanitygone.help), built
// against the data this project already has.
//
// The layout, the control set and the information architecture are theirs: artwork on
// the left under a breadcrumb, a single tall data panel on the right that opens with a
// rarity strip and a serif name, then a tab bar (Attributes / Talents / Skills /
// Modules / RIIC / Misc) where every panel starts with its own elite + potential
// controls above a divider. Deviations from the reference are marked where they occur,
// and all of them come from data we don't have rather than from a design preference.

import { getOperator, getRange } from '../../shared/cache/operator-cache';
import {
  operatorAvatarUrl, operatorSkinAvatarUrl, skillIconUrl, classIconUrl, archetypeIconUrl,
} from '../../shared/api/hella-api';
import type {
  AttackRange,
  Blackboard,
  ModulePhase,
  Operator,
  OperatorAttributes,
  OperatorModule,
  OperatorSkillDetail,
  OperatorTalent,
  TalentCandidate,
} from '../../shared/types';
import {
  PROFESSION_LABEL,
  PROFESSION_CSS,
  rarityNum,
  escHtml,
  cleanText,
  descriptionToHtml,
  traitInfo,
  splitAlterName,
} from '../format';
import {
  ICON_HP, ICON_ATK, ICON_DEF, ICON_RES, ICON_ASPD, ICON_BLOCK, ICON_DP, ICON_REDEPLOY,
  ICON_SP_COST, ICON_SP_INIT, ICON_DURATION, ICON_MELEE, ICON_RANGED, ICON_BRUSH,
  eliteIcon,
} from '../icons';

// ── Stat model ───────────────────────────────────────────────────────────────

type StatKey = keyof Pick<
  OperatorAttributes,
  'maxHp' | 'atk' | 'def' | 'magicResistance' | 'cost' | 'blockCnt' | 'respawnTime' | 'baseAttackTime'
>;

// Order and wording follow the reference's stat block: HP/DEF/RES/Redeploy down the
// left, ATK/Interval/Block/DP down the right (the grid fills column-first).
const STAT_ROWS: { key: StatKey; label: string; icon: string }[] = [
  { key: 'maxHp',           label: 'Health',          icon: ICON_HP },
  { key: 'def',             label: 'Defense',         icon: ICON_DEF },
  { key: 'magicResistance', label: 'Arts Resistance', icon: ICON_RES },
  { key: 'respawnTime',     label: 'Redeploy Time',   icon: ICON_REDEPLOY },
  { key: 'atk',             label: 'Attack Power',    icon: ICON_ATK },
  { key: 'baseAttackTime',  label: 'Attack Interval', icon: ICON_ASPD },
  { key: 'blockCnt',        label: 'Block',           icon: ICON_BLOCK },
  { key: 'cost',            label: 'DP Cost',         icon: ICON_DP },
];

// Potentials that carry a stat change name their target with these enums.
const POTENTIAL_ATTR: Record<string, StatKey> = {
  MAX_HP: 'maxHp',
  ATK: 'atk',
  DEF: 'def',
  MAGIC_RESISTANCE: 'magicResistance',
  COST: 'cost',
  BLOCK_CNT: 'blockCnt',
  RESPAWN_TIME: 'respawnTime',
};

// Modules use snake_case blackboard keys for the same attributes.
const MODULE_ATTR: Record<string, StatKey> = {
  max_hp: 'maxHp',
  atk: 'atk',
  def: 'def',
  magic_resistance: 'magicResistance',
  cost: 'cost',
  block_cnt: 'blockCnt',
  respawn_time: 'respawnTime',
  base_attack_time: 'baseAttackTime',
};

// Stats interpolate linearly between the phase's level-1 and max-level key frames;
// potential and an equipped module are flat additions on top. The trust bonus is the
// same flat addition scaled by trust/100 and capped there — trust keeps climbing to 200
// in game but the stat bonus stops at 100, which is why the input allows 200 and the
// maths doesn't. Verified against Sanity Gone: Blemishine E2 Lv90, max trust, GUA-Y
// stage 3 => 3512 HP / 631 ATK / 651 DEF.
function computeStats(
  op: Operator, phaseIdx: number, level: number, trust: number, potential: number,
  modulePhase?: ModulePhase | null,
): Record<StatKey, number> {
  const phase = op.data.phases[phaseIdx];
  const frames = phase.attributesKeyFrames;
  const lo = frames[0].data;
  const hi = frames[frames.length - 1].data;
  const span = phase.maxLevel - 1;
  const t = span > 0 ? (level - 1) / span : 0;

  const out = {} as Record<StatKey, number>;
  for (const { key } of STAT_ROWS) out[key] = lo[key] + (hi[key] - lo[key]) * t;

  if (trust > 0) {
    const favor = op.data.favorKeyFrames;
    const bonus = favor?.[favor.length - 1]?.data;
    const scale = Math.min(trust, 100) / 100;
    if (bonus) for (const { key } of STAT_ROWS) out[key] += (bonus[key] ?? 0) * scale;
  }

  // potentialRanks[0] is Potential 2, so `potential` is how many ranks are unlocked.
  for (const rank of (op.data.potentialRanks ?? []).slice(0, potential)) {
    for (const mod of rank.buff?.attributes?.attributeModifiers ?? []) {
      const key = POTENTIAL_ATTR[mod.attributeType];
      if (key) out[key] += mod.value;
    }
  }

  for (const b of modulePhase?.attributeBlackboard ?? []) {
    const key = MODULE_ATTR[b.key];
    if (key) out[key] += b.value;
  }
  return out;
}

function fmtStat(key: StatKey, value: number): string {
  if (key === 'baseAttackTime') return `${value.toFixed(2)} sec`;
  if (key === 'respawnTime') return `${Math.round(value)} sec`;
  return String(Math.round(value));
}

// ── View state ───────────────────────────────────────────────────────────────

type TabId = 'attributes' | 'talents' | 'skills' | 'modules' | 'riic' | 'misc';

interface DetailState {
  op: Operator;
  ranges: Map<string, AttackRange>;
  tab: TabId;
  // Elite and potential are shared by every panel that has those controls rather than
  // kept per-panel as the reference does: moving from Attributes to Talents at E1/P4
  // and finding the controls reset to E2/P1 is a worse default than carrying them over.
  phaseIdx: number;
  potential: number;
  level: number;
  trustOn: boolean;
  trust: number;
  skillIdx: number;
  skillLevel: number;      // 0-based index into excel.levels
  moduleIdx: number;
  moduleLevel: number;     // 0-based index into data.phases
  moduleOn: boolean;       // whether the selected module feeds into the stat panel
  artIdx: number;          // which piece of artwork the viewer is showing
}

// Modules only exist from E2 and their own unlock level onwards, so the Attributes tab
// silently ignores one that the current elite/level couldn't have equipped.
function activeModulePhase(s: DetailState): ModulePhase | null {
  if (!s.moduleOn) return null;
  const mods = visibleModules(s.op);
  const mod = mods[s.moduleIdx];
  if (!mod?.data) return null;
  if (s.phaseIdx < 2 || s.level < mod.info.unlockLevel) return null;
  return mod.data.phases[Math.min(s.moduleLevel, mod.data.phases.length - 1)] ?? null;
}

let state: DetailState | null = null;
let mountSeq = 0;

const visibleSkills = (op: Operator): OperatorSkillDetail[] =>
  (op.skills ?? []).filter(s => !s.excel.hidden && s.excel.levels.length > 0);

const visibleTalents = (op: Operator): OperatorTalent[] =>
  (op.data.talents ?? []).filter(t =>
    (t.candidates ?? []).some(c => c.name && c.description));

const visibleModules = (op: Operator): OperatorModule[] =>
  (op.modules ?? []).filter(m => m.data?.phases?.length);

const maxPotential = (op: Operator): number => (op.data.potentialRanks ?? []).length;

function tabsFor(op: Operator): { id: TabId; label: string }[] {
  const tabs: { id: TabId; label: string }[] = [{ id: 'attributes', label: 'Attributes' }];
  if (visibleTalents(op).length) tabs.push({ id: 'talents', label: 'Talents' });
  if (visibleSkills(op).length) tabs.push({ id: 'skills', label: 'Skills' });
  if (visibleModules(op).length) tabs.push({ id: 'modules', label: 'Modules' });
  if ((op.bases ?? []).length) tabs.push({ id: 'riic', label: 'RIIC' });
  tabs.push({ id: 'misc', label: 'Misc' });
  return tabs;
}

const phaseNum = (phase: string): number => parseInt(phase.replace('PHASE_', ''), 10) || 0;

// ── Controls ─────────────────────────────────────────────────────────────────

function buttonGroup(
  act: string,
  items: { value: number | string; label: string; on: boolean }[],
  variant: 'elite' | 'pill' = 'pill',
  disabled = false,
): string {
  return `<div class="btn-group btn-group-${variant}">${items.map(i =>
    `<button class="btn-group-item${i.on ? ' on' : ''}" data-act="${act}" data-value="${i.value}"
             aria-pressed="${i.on}"${disabled ? ' disabled' : ''}>${i.label}</button>`,
  ).join('')}</div>`;
}

function eliteGroup(act: string, phases: number[], current: number): string {
  return buttonGroup(act, phases.map(p => ({
    value: p,
    label: `${eliteIcon(p)}<span class="visually-hidden">Elite ${p}</span>`,
    on: p === current,
  })), 'elite');
}

function potentialSelect(count: number, current: number): string {
  if (count === 0) return '';
  return `
    <label class="pot-select">
      <span class="visually-hidden">Potential</span>
      <select data-act="pot" id="pot">
        ${Array.from({ length: count + 1 }, (_, i) =>
          `<option value="${i}"${i === current ? ' selected' : ''}>Potential ${i + 1}</option>`).join('')}
      </select>
    </label>
  `;
}

function checkbox(act: string, label: string, on: boolean): string {
  return `
    <label class="ctl-check">
      <input type="checkbox" data-act="${act}"${on ? ' checked' : ''}>
      <span>${escHtml(label)}</span>
    </label>
  `;
}

// ── Attack range ─────────────────────────────────────────────────────────────

type Cell = 'empty' | 'active' | 'op' | 'added' | 'removed';

// Two ranges overlaid when `base` is given: cells the new range adds are outlined in
// blue, cells it loses are struck through in red — the reference's way of showing what
// a skill or talent does to an operator's reach, rather than two grids side by side.
function rangeGridHtml(range: AttackRange, base?: AttackRange | null): string {
  const all = [...range.grids, { row: 0, col: 0 }, ...(base?.grids ?? [])];
  const minRow = Math.min(...all.map(g => g.row));
  const maxRow = Math.max(...all.map(g => g.row));
  const minCol = Math.min(...all.map(g => g.col));
  const maxCol = Math.max(...all.map(g => g.col));

  const inNew = new Set(range.grids.map(g => `${g.row},${g.col}`));
  const inOld = new Set((base?.grids ?? []).map(g => `${g.row},${g.col}`));

  const rows: string[] = [];
  for (let r = minRow; r <= maxRow; r++) {
    const cells: string[] = [];
    for (let c = minCol; c <= maxCol; c++) {
      const k = `${r},${c}`;
      let cls: Cell = 'empty';
      if (r === 0 && c === 0)                 cls = 'op';
      else if (inNew.has(k))                  cls = base && !inOld.has(k) ? 'added' : 'active';
      else if (base && inOld.has(k))          cls = 'removed';
      cells.push(`<span class="range-cell range-${cls}"></span>`);
    }
    rows.push(cells.join(''));
  }
  const width = maxCol - minCol + 1;
  return `<div class="range-grid" style="grid-template-columns: repeat(${width}, 18px)">${rows.join('')}</div>`;
}

function rangeBlock(range: AttackRange | undefined, base?: AttackRange | null): string {
  if (!range) return '';
  return `
    <div class="range-block">
      <span class="range-label">Range</span>
      ${rangeGridHtml(range, base)}
    </div>
  `;
}

function rangeFor(s: DetailState, id: string | null | undefined): AttackRange | undefined {
  return id ? s.ranges.get(id) : undefined;
}

function operatorRange(s: DetailState): AttackRange | undefined {
  return rangeFor(s, s.op.data.phases[s.phaseIdx]?.rangeId);
}

// ── Attributes ───────────────────────────────────────────────────────────────

function attributesPanel(s: DetailState): string {
  const { op } = s;
  const phase = op.data.phases[s.phaseIdx];
  const stats = computeStats(op, s.phaseIdx, s.level, s.trustOn ? s.trust : 0, s.potential, activeModulePhase(s));
  const mods = visibleModules(op);
  const modCodes = mods.map(m => [m.info.typeName1, m.info.typeName2].filter(Boolean).join('-'));

  const controls = `
    <div class="ctl-primary">
      ${eliteGroup('phase', op.data.phases.map((_, i) => i), s.phaseIdx)}
      <div class="lvl-block">
        <input type="range" id="lvl" min="1" max="${phase.maxLevel}" value="${s.level}" step="1"
               aria-label="Operator level">
        <input type="number" id="lvl-num" class="num-round" min="1" max="${phase.maxLevel}"
               value="${s.level}" aria-label="Operator level">
      </div>
    </div>
    <div class="ctl-secondary">
      ${mods.length ? `
        <div class="ctl-cluster">
          ${checkbox('mod-on', 'Module', s.moduleOn)}
          ${buttonGroup('module', mods.map((m, i) => ({
            value: i, label: escHtml(modCodes[i] || `${i + 1}`), on: i === s.moduleIdx,
          })), 'pill', !s.moduleOn)}
          ${buttonGroup('module-lv', (mods[s.moduleIdx]?.data?.phases ?? []).map((p, i) => ({
            value: i, label: String(p.equipLevel), on: i === s.moduleLevel,
          })), 'pill', !s.moduleOn)}
        </div>
      ` : ''}
      <div class="ctl-cluster ctl-cluster-end">
        ${checkbox('trust-on', 'Trust', s.trustOn)}
        <input type="number" id="trust-num" class="num-box" min="0" max="200" value="${s.trust}"
               aria-label="Trust"${s.trustOn ? '' : ' disabled'}>
        ${potentialSelect(maxPotential(op), s.potential)}
      </div>
    </div>
  `;

  const statList = STAT_ROWS.map(({ key, label, icon }) => `
    <div class="stat-row">
      <dt>${icon}<span>${label}</span></dt>
      <dd data-stat="${key}">${fmtStat(key, stats[key])}</dd>
    </div>
  `).join('');

  // The reference also lists the LMD + material cost of each promotion here. The API
  // gives us item ids and counts but no item names or icons, so a cost table would read
  // as "30135 x4"; it's left out rather than shipped unreadable.
  return `
    <div class="panel-controls">${controls}</div>
    <dl class="stat-list">${statList}</dl>
    ${rangeBlock(operatorRange(s))}
  `;
}

// ── Talents ──────────────────────────────────────────────────────────────────

// The strongest candidate the current elite + potential actually unlocks — the same
// resolution the reference does, so the panel shows one live talent per slot rather
// than every historical version of it stacked up.
function activeCandidate(talent: OperatorTalent, phaseIdx: number, potential: number): TalentCandidate | null {
  const usable = (talent.candidates ?? []).filter(c =>
    c.name && c.description && !c.isHideTalent &&
    c.requiredPotentialRank <= potential &&
    phaseNum(c.unlockCondition.phase) <= phaseIdx);
  return usable.sort((a, b) => {
    const pa = phaseNum(a.unlockCondition.phase);
    const pb = phaseNum(b.unlockCondition.phase);
    return pa === pb ? b.requiredPotentialRank - a.requiredPotentialRank : pb - pa;
  })[0] ?? null;
}

function talentsPanel(s: DetailState): string {
  const talents = visibleTalents(s.op);
  const shown = talents
    .map(t => activeCandidate(t, s.phaseIdx, s.potential))
    .filter((c): c is TalentCandidate => !!c);

  const body = shown.length
    ? shown.map(c => `
        <section class="entry">
          <header class="entry-head">
            ${eliteIcon(phaseNum(c.unlockCondition.phase))}
            <h2 class="entry-name">${escHtml(c.name)}</h2>
          </header>
          <p class="rich">${descriptionToHtml(c.description, c.blackboard ?? [])}</p>
        </section>
      `).join('')
    : `<p class="empty-msg">No talents at this elite level and potential.</p>`;

  return `
    <div class="panel-controls panel-controls-inline">
      ${eliteGroup('phase', s.op.data.phases.map((_, i) => i), s.phaseIdx)}
      ${potentialSelect(maxPotential(s.op), s.potential)}
    </div>
    <div class="entry-list">${body}</div>
  `;
}

// ── Skills ───────────────────────────────────────────────────────────────────

const SP_TYPE: Record<string, { label: string; cls: string }> = {
  INCREASE_WITH_TIME:   { label: 'Auto',      cls: 'sp-auto' },
  INCREASE_WHEN_ATTACK: { label: 'Offensive', cls: 'sp-offensive' },
  INCREASE_WITH_ATTACK: { label: 'Offensive', cls: 'sp-offensive' },
  INCREASE_WHEN_HURT:   { label: 'Defensive', cls: 'sp-defensive' },
};

const SKILL_TYPE: Record<string, string> = {
  PASSIVE: 'Passive',
  MANUAL: 'Manual Trigger',
  AUTO: 'Auto Trigger',
};

const skillLevelLabel = (i: number): string => (i < 7 ? `${i + 1}` : `M${i - 6}`);

function skillsPanel(s: DetailState): string {
  const skills = visibleSkills(s.op);
  const skillIdx = Math.min(s.skillIdx, skills.length - 1);
  const skill = skills[skillIdx];
  const levels = skill.excel.levels;
  const idx = Math.min(s.skillLevel, levels.length - 1);

  return `
    <div class="panel-controls">
      <div class="ctl-primary">
        ${skills.length > 1
          ? `<span class="ctl-label">Skill</span>${buttonGroup('skill',
              skills.map((_, i) => ({ value: i, label: String(i + 1), on: i === skillIdx })))}`
          : ''}
        <div class="lvl-block">
          <input type="range" id="skill-lvl" min="1" max="${levels.length}" value="${idx + 1}" step="1"
                 aria-label="Skill rank">
          <span class="num-round num-round-static" id="skill-lvl-out">${skillLevelLabel(idx)}</span>
        </div>
      </div>
    </div>
    <div id="skill-body">${skillBodyHtml(s, skill, idx)}</div>
  `;
}

function skillBodyHtml(s: DetailState, skill: OperatorSkillDetail, idx: number): string {
  const lv = skill.excel.levels[idx];
  const sp = lv.spData;
  const spType = SP_TYPE[sp?.spType ?? ''] ?? { label: 'Always active', cls: 'sp-passive' };
  const duration = lv.duration < 0 ? 'Infinite' : lv.duration === 0 ? 'Instant' : `${lv.duration} sec`;
  const range = rangeFor(s, lv.rangeId);

  return `
    <div class="skill-head">
      <img class="skill-icon" src="${skillIconUrl(skill.excel.iconId ?? skill.excel.skillId)}"
           alt="" loading="lazy"
           onerror="this.outerHTML='<div class=\\'skill-icon skill-icon-placeholder\\'>?</div>'">
      <h2 class="entry-name">${escHtml(lv.name)}</h2>
      <div class="skill-type">
        <span>${escHtml(SKILL_TYPE[lv.skillType] ?? lv.skillType)}</span>
        <span class="dot"></span>
        <span class="${spType.cls}">${spType.label} recovery</span>
      </div>
    </div>
    <dl class="skill-meta">
      <div><dt>${ICON_SP_COST}<span>SP Cost</span></dt><dd>${sp?.spCost ?? '—'}</dd></div>
      <div><dt>${ICON_SP_INIT}<span>Initial SP</span></dt><dd>${sp?.initSp ?? '—'}</dd></div>
      <div><dt>${ICON_DURATION}<span>Duration</span></dt><dd>${escHtml(duration)}</dd></div>
    </dl>
    <p class="rich">${descriptionToHtml(lv.description, lv.blackboard ?? [])}</p>
    ${range ? rangeBlock(range, operatorRange(s)) : ''}
  `;
}

// ── Modules ──────────────────────────────────────────────────────────────────

function modulesPanel(s: DetailState): string {
  const mods = visibleModules(s.op);
  const modIdx = Math.min(s.moduleIdx, mods.length - 1);
  const mod = mods[modIdx];
  const phases = mod.data!.phases;
  const lvIdx = Math.min(s.moduleLevel, phases.length - 1);
  const phase = phases[lvIdx];
  const code = [mod.info.typeName1, mod.info.typeName2].filter(Boolean).join('-');

  const stats = phase.attributeBlackboard.map(b => {
    const key = MODULE_ATTR[b.key];
    const label = key ? STAT_ROWS.find(r => r.key === key)?.label ?? b.key : b.key;
    const sign = b.value > 0 ? '+' : '';
    return `<div class="mod-stat"><span>${escHtml(label)}</span><strong>${sign}${b.value}</strong></div>`;
  }).join('');

  const trait = phase.parts
    .flatMap(p => (p.overrideTraitDataBundle?.candidates ?? []).map(c => ({
      text: c.additionalDescription ?? c.overrideDescripton,
      bb: c.blackboard ?? [],
    })))
    .filter((x): x is { text: string; bb: Blackboard[] } => !!x.text)
    .map(x => `<p class="rich">${descriptionToHtml(x.text, x.bb)}</p>`)
    .join('');

  return `
    <div class="panel-controls">
      <div class="ctl-primary">
        ${mods.length > 1
          ? `<span class="ctl-label">Module</span>${buttonGroup('module',
              mods.map((m, i) => ({
                value: i,
                label: escHtml([m.info.typeName1, m.info.typeName2].filter(Boolean).join('-') || `${i + 1}`),
                on: i === modIdx,
              })))}`
          : ''}
        <span class="ctl-label">Stage</span>
        ${buttonGroup('module-lv', phases.map((p, i) => ({
          value: i, label: String(p.equipLevel), on: i === lvIdx,
        })))}
      </div>
    </div>
    <section class="entry">
      <header class="entry-head">
        <h2 class="entry-name">${escHtml(mod.info.uniEquipName)}</h2>
        ${code ? `<span class="tagline">${escHtml(code)}</span>` : ''}
        <span class="unlock-badge">${eliteIcon(phaseNum(mod.info.showEvolvePhase))}Lv${mod.info.unlockLevel}</span>
      </header>
      ${mod.info.uniEquipDesc ? `<p class="rich muted-text">${cleanText(mod.info.uniEquipDesc)}</p>` : ''}
      ${stats ? `<div class="mod-stats">${stats}</div>` : ''}
      ${trait}
    </section>
  `;
}

// ── RIIC ─────────────────────────────────────────────────────────────────────

// A base skill's upgrades ship as separate entries whose names differ only by a trailing
// rank glyph ("Wisdom" / "Wisdom α"). Normalising that away lets the panel show one live
// stage per skill, the way the reference does, instead of every rank at once.
const riicKey = (b: { skill: { buffName: string; roomType: string } }): string =>
  `${b.skill.roomType}|${b.skill.buffName.replace(/[\s·]*(α|β|γ|δ|Ⅰ|Ⅱ|Ⅲ|\+)+$/, '').trim()}`;

function riicPanel(s: DetailState): string {
  const bases = s.op.bases ?? [];
  const elites = [...new Set(bases.map(b => phaseNum(b.condition.cond.phase)))].sort();
  const elite = Math.min(s.phaseIdx, elites[elites.length - 1] ?? 0);

  // One stage per skill: the strongest the selected elite unlocks, like the reference.
  const byName = new Map<string, typeof bases[number]>();
  for (const b of bases) {
    if (phaseNum(b.condition.cond.phase) > elite) continue;
    const key = riicKey(b);
    const prev = byName.get(key);
    if (!prev || phaseNum(prev.condition.cond.phase) <= phaseNum(b.condition.cond.phase)) {
      byName.set(key, b);
    }
  }
  const shown = [...byName.values()];

  const body = shown.length
    ? shown.map(b => `
        <section class="entry">
          <header class="entry-head">
            <h2 class="entry-name">${escHtml(b.skill.buffName)}</h2>
            ${b.condition.cond.level > 1
              ? `<span class="unlock-badge">${eliteIcon(phaseNum(b.condition.cond.phase))}Lv${b.condition.cond.level}</span>`
              : ''}
          </header>
          <p class="rich">${descriptionToHtml(b.skill.description)}</p>
        </section>
      `).join('')
    : `<p class="empty-msg">No base skills at this elite level.</p>`;

  return `
    <div class="panel-controls panel-controls-inline">
      ${eliteGroup('phase', elites.length ? elites : [0], elite)}
    </div>
    <div class="entry-list">${body}</div>
  `;
}

// ── Misc ─────────────────────────────────────────────────────────────────────

// The reference's Misc tab is built on the operator handbook (profile, physical exam,
// voice actor, artist). HellaAPI doesn't expose the handbook, so this collects what we
// do have that has no home in the other tabs: recruitment tags, the class trait, the
// archive blurb, how the operator is obtained, faction, and the potential ladder — which
// the reference surfaces through the potential dropdown's own tooltips instead.
function miscPanel(s: DetailState): string {
  const d = s.op.data;
  const tags = (d.tagList ?? []).map(t => `<span class="op-tag">${escHtml(t)}</span>`).join('');
  const faction = s.op.factions
    ?.map(f => f.nationPower ?? f.groupPower ?? f.teamPower)
    .find(p => p != null)?.powerName;

  const facts: [string, string][] = [];
  if (s.op.archetype ?? d.subProfessionId) facts.push(['Branch', s.op.archetype ?? d.subProfessionId]);
  facts.push(['Position', d.position === 'MELEE' ? 'Melee' : 'Ranged']);
  if (faction) facts.push(['Faction', faction]);
  if (d.displayNumber) facts.push(['Operator code', d.displayNumber]);

  const pots = (d.potentialRanks ?? [])
    .map((r, i) => r.description
      ? `<div class="pot-row"><span class="pot-rank">Potential ${i + 2}</span><span class="rich">${descriptionToHtml(r.description)}</span></div>`
      : '')
    .join('');

  const trait = traitInfo(d) ?? (d.description ? { text: d.description, blackboard: [] } : null);

  return `
    ${tags ? `<div class="detail-tags">${tags}</div>` : ''}
    ${trait ? `<section class="entry"><h2 class="entry-name">Trait</h2><p class="rich">${descriptionToHtml(trait.text, trait.blackboard)}</p></section>` : ''}
    ${d.itemUsage ? `<section class="entry"><h2 class="entry-name">Archive</h2><p class="rich muted-text">${cleanText(d.itemUsage)}</p></section>` : ''}
    ${d.itemObtainApproach ? `<section class="entry"><h2 class="entry-name">Obtained from</h2><p class="rich">${escHtml(d.itemObtainApproach)}</p></section>` : ''}
    ${pots ? `<section class="entry"><h2 class="entry-name">Potentials</h2>${pots}</section>` : ''}
    <dl class="fact-list">
      ${facts.map(([k, v]) => `<div><dt>${escHtml(k)}</dt><dd>${escHtml(v)}</dd></div>`).join('')}
    </dl>
  `;
}

function panelHtml(s: DetailState): string {
  switch (s.tab) {
    case 'attributes': return attributesPanel(s);
    case 'talents':    return talentsPanel(s);
    case 'skills':     return skillsPanel(s);
    case 'modules':    return modulesPanel(s);
    case 'riic':       return riicPanel(s);
    case 'misc':       return miscPanel(s);
  }
}

// ── Shell ────────────────────────────────────────────────────────────────────

function headerHtml(s: DetailState): string {
  const d = s.op.data;
  const n = rarityNum(d.rarity);
  const { base, epithet } = splitAlterName(d.name);
  const cls = PROFESSION_CSS[d.profession];
  const info = traitInfo(d);
  const traitTip = cleanText(info?.text ?? d.description ?? '').replace(/<br>/g, ' ');
  const branch = s.op.archetype ?? d.subProfessionId;

  return `
    <div class="op-rarity-strip r${n}">
      <span class="visually-hidden">Rarity: ${n}</span>
      ${'<span class="strip-star">★</span>'.repeat(n)}
    </div>
    <div class="op-header">
      <img class="op-header-avatar" src="${operatorAvatarUrl(s.op.id)}" alt="" loading="lazy"
           onerror="this.style.visibility='hidden'">
      <h1 class="op-header-name">${escHtml(base)}${epithet ? `<span class="alter"> The ${escHtml(epithet)}</span>` : ''}</h1>
      <div class="op-header-classes">
        <span class="hdr-item">
          <img class="hdr-icon" src="${classIconUrl(cls)}" alt="">
          ${PROFESSION_LABEL[d.profession]}
        </span>
        <span class="hdr-item">
          <img class="hdr-icon" src="${archetypeIconUrl(d.subProfessionId)}" alt="" onerror="this.remove()">
          <span class="hdr-branch"${traitTip ? ` title="${traitTip}"` : ''}>${escHtml(branch)}</span>
        </span>
        <span class="hdr-spacer"></span>
        <span class="hdr-item hdr-position">
          ${d.position === 'MELEE' ? ICON_MELEE : ICON_RANGED}
          ${d.position === 'MELEE' ? 'Melee' : 'Ranged'}
        </span>
      </div>
    </div>
  `;
}

// Full-size artwork viewer: one large piece with a thumbnail rail down the left edge to
// switch between an operator's elite arts and outfits, captioned with the illustrator —
// the reference's splash panel, minus the outfit price tag (we have no skin cost data).
//
// The rail renders each outfit's 55KB square avatar, NOT its illustration. Pointing 64px
// thumbnails at the full art meant opening SilverAsh pulled 16.4MB — four inactive skins
// at up to 6.4MB each — before the page settled. Using avatars puts that at ~2.9MB, and
// the thumbnails appear immediately instead of trickling in. A skin whose avatar is
// missing falls back to its illustration rather than showing a hole.
function splashHtml(op: Operator, artIdx: number): string {
  const arts = op.arts ?? [];
  if (!arts.length) {
    return `<div class="splash splash-empty"><img class="splash-img" src="${operatorAvatarUrl(op.id)}" alt=""></div>`;
  }
  const i = Math.min(artIdx, arts.length - 1);
  const active = arts[i];
  return `
    <div class="splash">
      ${arts.length > 1 ? `
        <div class="splash-rail" role="tablist" aria-label="Artwork">
          ${arts.map((a, j) => `
            <button class="splash-thumb${j === i ? ' on' : ''}" data-act="art" data-value="${j}"
                    role="tab" aria-selected="${j === i}" title="${escHtml(a.label)}">
              <img src="${operatorSkinAvatarUrl(op.id, a.suffix)}" alt="${escHtml(a.label)}"
                   loading="lazy" decoding="async"
                   onerror="this.onerror=null;this.src='${a.url.replace(/'/g, '%27')}'">
            </button>
          `).join('')}
        </div>
      ` : ''}
      <img class="splash-img" src="${active.url}" alt="${escHtml(active.label)}"
           fetchpriority="high" decoding="async">
      <div class="splash-caption">
        <span class="splash-name">${escHtml(active.label)}</span>
        ${active.artist ? `<span class="splash-artist">${ICON_BRUSH}${escHtml(active.artist)}</span>` : ''}
      </div>
    </div>
  `;
}

function shellHtml(s: DetailState): string {
  const tabs = tabsFor(s.op);
  const arts = s.op.arts ?? [];
  const bgUrl = arts[Math.min(s.artIdx, Math.max(arts.length - 1, 0))]?.url;

  return `
    <div class="detail">
      ${bgUrl ? `<div class="detail-bg" style="background-image:url('${bgUrl.replace(/'/g, '%27')}')"></div>` : ''}
      <div class="detail-body">
        <div class="detail-art-col">
          <nav class="crumbs">
            <a href="#/">Operators</a>
            <span class="crumb-sep">/</span>
            <span class="crumb-current">${escHtml(s.op.data.name)}</span>
          </nav>
          ${splashHtml(s.op, s.artIdx)}
        </div>
        <div class="detail-data-col">
          <section class="op-panel">
            ${headerHtml(s)}
            <div class="op-tabs" role="tablist">
              ${tabs.map(t => `
                <button class="op-tab${t.id === s.tab ? ' on' : ''}" role="tab"
                        aria-selected="${t.id === s.tab}" data-act="tab" data-value="${t.id}">${t.label}</button>
              `).join('')}
            </div>
            <div class="op-tabpanel" id="panel">${panelHtml(s)}</div>
          </section>
        </div>
      </div>
    </div>
  `;
}

// ── Mount ────────────────────────────────────────────────────────────────────

function renderPanel(container: HTMLElement): void {
  const panel = container.querySelector<HTMLElement>('#panel');
  if (panel && state) panel.innerHTML = panelHtml(state);
}

function renderAll(container: HTMLElement): void {
  if (state) container.innerHTML = shellHtml(state);
}

// Sliders re-fire on every pointer move, so their handlers touch only the numbers they
// change — a full panel re-render would destroy the input mid-drag.
function updateStatsOnly(container: HTMLElement): void {
  if (!state) return;
  const stats = computeStats(
    state.op, state.phaseIdx, state.level, state.trustOn ? state.trust : 0,
    state.potential, activeModulePhase(state),
  );
  container.querySelectorAll<HTMLElement>('[data-stat]').forEach(el => {
    el.textContent = fmtStat(el.dataset.stat as StatKey, stats[el.dataset.stat as StatKey]);
  });
}

function updateSkillBody(container: HTMLElement): void {
  if (!state) return;
  const skills = visibleSkills(state.op);
  const skill = skills[Math.min(state.skillIdx, skills.length - 1)];
  const idx = Math.min(state.skillLevel, skill.excel.levels.length - 1);
  const body = container.querySelector<HTMLElement>('#skill-body');
  const out = container.querySelector<HTMLElement>('#skill-lvl-out');
  if (body) body.innerHTML = skillBodyHtml(state, skill, idx);
  if (out) out.textContent = skillLevelLabel(idx);
}

function errorHtml(id: string, label: string): string {
  return `
    <div class="detail">
      <div class="detail-body detail-body-error">
        <nav class="crumbs"><a href="#/">Operators</a></nav>
        <div class="state-msg"><div class="label">${label}</div>No dossier found for <code>${escHtml(id)}</code>.</div>
      </div>
    </div>
  `;
}

export async function mountDetail(container: HTMLElement, id: string): Promise<void> {
  const seq = ++mountSeq;
  // The grid's controls have no meaning on a detail page — hide the search box and the
  // whole actions cluster (filters/sort/count), but leave the logo bar standing so the
  // header stays put across routes instead of the page visibly restructuring.
  document.querySelector<HTMLElement>('.search-wrap')!.style.display = 'none';
  document.querySelector<HTMLElement>('.topbar-actions')!.style.display = 'none';
  document.getElementById('more-filters')!.hidden = true;
  document.getElementById('count')!.textContent = '';

  container.innerHTML = `
    <div class="detail">
      <div class="detail-body detail-body-error">
        <nav class="crumbs"><a href="#/">Operators</a></nav>
        <div class="state-msg"><span class="spinner"></span></div>
      </div>
    </div>
  `;

  let op: Operator;
  try {
    op = await getOperator(id);
  } catch (e) {
    if (seq !== mountSeq) return;
    container.innerHTML = errorHtml(id, e instanceof Error && /404/.test(e.message) ? 'Unknown operator' : 'Failed to load');
    return;
  }
  if (seq !== mountSeq) return;

  // Pull every range the page can show up front — each phase's, plus every skill level's
  // — so switching Elite or dragging the skill slider stays synchronous.
  const rangeIds = [...new Set([
    ...op.data.phases.map(p => p.rangeId),
    ...(op.skills ?? []).flatMap(s => (s.excel?.levels ?? []).map(l => l.rangeId)),
  ].filter((x): x is string => !!x))];
  const ranges = new Map<string, AttackRange>();
  await Promise.all(rangeIds.map(async rid => {
    try { ranges.set(rid, await getRange(rid)); } catch { /* range is non-essential */ }
  }));
  if (seq !== mountSeq) return;

  const lastPhase = op.data.phases.length - 1;
  // Elite 2 art is the one people expect to land on, same as the reference's splash.
  const arts = op.arts ?? [];
  const e2Idx = arts.findIndex(a => a.suffix === '2');
  state = {
    op, ranges,
    tab: 'attributes',
    phaseIdx: lastPhase,
    potential: 0,
    level: op.data.phases[lastPhase].maxLevel,
    trustOn: true,
    trust: 100,
    skillIdx: 0,
    skillLevel: Math.max(0, (visibleSkills(op)[0]?.excel.levels.length ?? 1) - 1),
    moduleIdx: 0,
    moduleLevel: Math.max(0, (visibleModules(op)[0]?.data?.phases.length ?? 1) - 1),
    moduleOn: false,
    artIdx: e2Idx >= 0 ? e2Idx : 0,
  };
  renderAll(container);

  container.onclick = (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el || !state) return;
    // Checkboxes and the potential <select> report through oninput/onchange instead.
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) return;
    const value = el.dataset.value!;
    switch (el.dataset.act) {
      case 'tab': state.tab = value as TabId; renderAll(container); return;
      // The artwork viewer lives in the shell, not the tab panel, so it needs the full
      // re-render — renderPanel() below would leave it untouched.
      case 'art': state.artIdx = Number(value); renderAll(container); return;
      case 'phase': {
        state.phaseIdx = Number(value);
        state.level = state.op.data.phases[state.phaseIdx].maxLevel;
        break;
      }
      case 'skill':
        state.skillIdx = Number(value);
        state.skillLevel = Math.max(0, visibleSkills(state.op)[state.skillIdx].excel.levels.length - 1);
        break;
      case 'module':    state.moduleIdx = Number(value);
                        state.moduleLevel = Math.max(0, (visibleModules(state.op)[state.moduleIdx]?.data?.phases.length ?? 1) - 1);
                        break;
      case 'module-lv': state.moduleLevel = Number(value); break;
      default: return;
    }
    renderPanel(container);
  };

  container.oninput = (ev) => {
    const el = ev.target as HTMLInputElement | HTMLSelectElement;
    if (!state) return;
    switch (el.id || (el as HTMLInputElement).dataset.act) {
      case 'lvl': {
        state.level = Number((el as HTMLInputElement).value);
        const num = container.querySelector<HTMLInputElement>('#lvl-num');
        if (num) num.value = String(state.level);
        updateStatsOnly(container);
        return;
      }
      case 'lvl-num': {
        const max = state.op.data.phases[state.phaseIdx].maxLevel;
        const v = Number((el as HTMLInputElement).value);
        if (!Number.isFinite(v) || v < 1 || v > max) return;
        state.level = v;
        const slider = container.querySelector<HTMLInputElement>('#lvl');
        if (slider) slider.value = String(v);
        updateStatsOnly(container);
        return;
      }
      case 'skill-lvl':
        state.skillLevel = Number((el as HTMLInputElement).value) - 1;
        updateSkillBody(container);
        return;
      case 'trust-num': {
        const v = Number((el as HTMLInputElement).value);
        if (!Number.isFinite(v) || v < 0 || v > 200) return;
        state.trust = v;
        updateStatsOnly(container);
        return;
      }
      case 'trust-on':  state.trustOn = (el as HTMLInputElement).checked; break;
      case 'mod-on':    state.moduleOn = (el as HTMLInputElement).checked; break;
      case 'pot':       state.potential = Number((el as HTMLSelectElement).value); break;
      default: return;
    }
    renderPanel(container);
  };
}
