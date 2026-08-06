import { getOperator, getRange } from '../../shared/cache/operator-cache';
import { operatorAvatarUrl, skillIconUrl, classIconUrl } from '../../shared/api/hella-api';
import type {
  AttackRange,
  ModulePhase,
  Operator,
  OperatorAttributes,
  OperatorModule,
  OperatorSkillDetail,
  OperatorTalent,
  TalentCandidate,
  UnlockCondition,
} from '../../shared/types';
import {
  PROFESSION_LABEL,
  PROFESSION_CSS,
  rarityNum,
  escHtml,
  cleanText,
  phaseLabel,
} from '../format';

// ── Stat model ───────────────────────────────────────────────────────────────

type StatKey = keyof Pick<
  OperatorAttributes,
  'maxHp' | 'atk' | 'def' | 'magicResistance' | 'cost' | 'blockCnt' | 'respawnTime' | 'baseAttackTime'
>;

const STAT_ROWS: { key: StatKey; label: string }[] = [
  { key: 'maxHp',           label: 'Max HP' },
  { key: 'atk',             label: 'ATK' },
  { key: 'def',             label: 'DEF' },
  { key: 'magicResistance', label: 'RES' },
  { key: 'cost',            label: 'DP Cost' },
  { key: 'blockCnt',        label: 'Block' },
  { key: 'respawnTime',     label: 'Redeploy' },
  { key: 'baseAttackTime',  label: 'Attack Interval' },
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
// trust, potential and an equipped module are flat additions on top. Verified against
// Sanity Gone: Blemishine E2 Lv90, max trust, GUA-Y stage 3 => 3512 HP / 631 ATK / 651 DEF.
function computeStats(
  op: Operator, phaseIdx: number, level: number, trust: boolean, potential: number,
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

  if (trust) {
    const favor = op.data.favorKeyFrames;
    const bonus = favor?.[favor.length - 1]?.data;
    if (bonus) for (const { key } of STAT_ROWS) out[key] += bonus[key] ?? 0;
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
  if (key === 'baseAttackTime') return `${value.toFixed(2)}s`;
  if (key === 'respawnTime') return `${Math.round(value)}s`;
  return String(Math.round(value));
}

// ── View state ───────────────────────────────────────────────────────────────

type TabId = 'attributes' | 'skills' | 'talents' | 'modules' | 'potential' | 'riic';

interface DetailState {
  op: Operator;
  ranges: Map<string, AttackRange>;
  tab: TabId;
  phaseIdx: number;
  level: number;
  trust: boolean;
  potential: number;
  skillIdx: number;
  skillLevel: number;
  moduleIdx: number;
  moduleLevel: number;
  moduleEquipped: boolean; // whether the selected module feeds into the stat panel
}

// Modules only exist from E2 and their own unlock level onwards, so the Attributes tab
// silently ignores one that the current elite/level couldn't have equipped.
function activeModulePhase(s: DetailState): ModulePhase | null {
  if (!s.moduleEquipped) return null;
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

function tabsFor(op: Operator): { id: TabId; label: string }[] {
  const tabs: { id: TabId; label: string }[] = [{ id: 'attributes', label: 'Attributes' }];
  if (visibleSkills(op).length) tabs.push({ id: 'skills', label: 'Skills' });
  if (visibleTalents(op).length) tabs.push({ id: 'talents', label: 'Talents' });
  if (visibleModules(op).length) tabs.push({ id: 'modules', label: 'Modules' });
  if ((op.data.potentialRanks ?? []).some(r => r.description)) tabs.push({ id: 'potential', label: 'Potential' });
  if ((op.bases ?? []).length) tabs.push({ id: 'riic', label: 'RIIC' });
  return tabs;
}

// ── Shared bits ──────────────────────────────────────────────────────────────

function unlockText(cond: UnlockCondition, potRank?: number): string {
  let s = `Unlocks ${phaseLabel(cond.phase)}`;
  if (cond.level > 1) s += ` · Lv${cond.level}`;
  if (potRank && potRank > 0) s += ` · Potential ${potRank + 1}`;
  return s;
}

function rangeGridHtml(range: AttackRange): string {
  const rows = range.grids.map(g => g.row);
  const cols = range.grids.map(g => g.col);
  const minRow = Math.min(...rows, 0);
  const maxRow = Math.max(...rows, 0);
  const minCol = Math.min(...cols, 0);
  const maxCol = Math.max(...cols, 0);
  const opCol = minCol - 1;
  const filled = new Set(range.grids.map(g => `${g.row},${g.col}`));
  const cells: string[] = [];
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = opCol; c <= maxCol; c++) {
      if (r === 0 && c === opCol)       cells.push('<span class="range-cell range-op"></span>');
      else if (filled.has(`${r},${c}`)) cells.push('<span class="range-cell range-on"></span>');
      else                              cells.push('<span class="range-cell"></span>');
    }
  }
  const width = maxCol - opCol + 1;
  return `<div class="range-grid" style="grid-template-columns: repeat(${width}, 14px)">${cells.join('')}</div>`;
}

function segmented(act: string, items: { value: number | string; label: string; on: boolean }[]): string {
  return `<div class="seg">${items.map(i =>
    `<button class="seg-btn${i.on ? ' on' : ''}" data-act="${act}" data-value="${i.value}">${escHtml(i.label)}</button>`,
  ).join('')}</div>`;
}

// ── Tab panels ───────────────────────────────────────────────────────────────

function attributesPanel(s: DetailState): string {
  const { op } = s;
  const phase = op.data.phases[s.phaseIdx];
  const modPhase = activeModulePhase(s);
  const stats = computeStats(op, s.phaseIdx, s.level, s.trust, s.potential, modPhase);
  const maxPot = (op.data.potentialRanks ?? []).length;
  const range = phase.rangeId ? s.ranges.get(phase.rangeId) : undefined;
  const mods = visibleModules(op);
  const modUsable = s.phaseIdx >= 2 && mods.length > 0;

  const controls = `
    <div class="ctl-row">
      <span class="ctl-label">Elite</span>
      ${segmented('phase', op.data.phases.map((_, i) => ({ value: i, label: `E${i}`, on: i === s.phaseIdx })))}
    </div>
    <div class="ctl-row">
      <span class="ctl-label">Level</span>
      <input type="range" id="lvl" min="1" max="${phase.maxLevel}" value="${s.level}" step="1">
      <output class="ctl-value" id="lvl-out">${s.level}</output>
      <span class="ctl-max">/ ${phase.maxLevel}</span>
    </div>
    <div class="ctl-row">
      <span class="ctl-label">Trust</span>
      <button class="seg-btn${s.trust ? ' on' : ''}" data-act="trust" data-value="${s.trust ? 0 : 1}">
        ${s.trust ? 'Max' : 'None'}
      </button>
      ${maxPot > 0 ? `
        <span class="ctl-label ctl-label-2">Potential</span>
        ${segmented('pot', Array.from({ length: maxPot + 1 }, (_, i) => ({
          value: i, label: `P${i + 1}`, on: i === s.potential,
        })))}
      ` : ''}
    </div>
    ${modUsable ? `
      <div class="ctl-row">
        <span class="ctl-label">Module</span>
        ${segmented('mod-equip', [
          { value: -1, label: 'None', on: !s.moduleEquipped },
          ...mods.map((m, i) => ({
            value: i,
            label: [m.info.typeName1, m.info.typeName2].filter(Boolean).join('-') || `${i + 1}`,
            on: s.moduleEquipped && i === s.moduleIdx,
          })),
        ])}
        ${s.moduleEquipped && mods[s.moduleIdx]?.data ? `
          <span class="ctl-label ctl-label-2">Stage</span>
          ${segmented('mod-stage', mods[s.moduleIdx].data!.phases.map((p, i) => ({
            value: i, label: `${p.equipLevel}`, on: i === s.moduleLevel,
          })))}
        ` : ''}
      </div>
    ` : ''}
  `;

  const grid = STAT_ROWS.map(({ key, label }) => `
    <div class="stat">
      <div class="stat-label">${label}</div>
      <div class="stat-value" data-stat="${key}">${fmtStat(key, stats[key])}</div>
    </div>
  `).join('');

  return `
    <div class="panel-controls">${controls}</div>
    <div class="stat-grid">${grid}</div>
    ${range ? `
      <div class="range-block">
        <div class="range-label">Attack Range</div>
        ${rangeGridHtml(range)}
      </div>
    ` : ''}
  `;
}

function skillsPanel(s: DetailState): string {
  const skills = visibleSkills(s.op);
  const skill = skills[Math.min(s.skillIdx, skills.length - 1)];
  const levels = skill.excel.levels;
  const idx = Math.min(s.skillLevel, levels.length - 1);
  const lv = levels[idx];
  const sp = lv.spData;

  const lvLabel = (i: number) => (i < 7 ? `Lv${i + 1}` : `M${i - 6}`);
  const meta = [
    sp ? `${spTypeLabel(sp.spType)} recovery` : '',
    sp ? `SP ${sp.initSp}/${sp.spCost}` : '',
    lv.duration > 0 ? `${lv.duration}s` : '',
  ].filter(Boolean).join(' · ');

  return `
    ${skills.length > 1 ? `
      <div class="ctl-row">
        <span class="ctl-label">Skill</span>
        ${segmented('skill', skills.map((sk, i) => ({
          value: i, label: `${i + 1}`, on: i === Math.min(s.skillIdx, skills.length - 1),
        })))}
      </div>
    ` : ''}
    <div class="ctl-row">
      <span class="ctl-label">Level</span>
      ${segmented('skill-lv', levels.map((_, i) => ({ value: i, label: lvLabel(i), on: i === idx })))}
    </div>
    <div class="detail-skill">
      <img class="skill-icon" src="${skillIconUrl(skill.excel.iconId ?? skill.excel.skillId)}"
           alt="${escHtml(lv.name)}" loading="lazy"
           onerror="this.outerHTML='<div class=\\'skill-icon skill-icon-placeholder\\'>?</div>'">
      <div class="skill-body">
        <div class="skill-name">${escHtml(lv.name)}</div>
        <div class="skill-meta">${escHtml(meta)}</div>
        <div class="skill-desc">${cleanText(lv.description)}</div>
      </div>
    </div>
  `;
}

function spTypeLabel(spType: string): string {
  switch (spType) {
    case 'INCREASE_WITH_TIME':   return 'Auto';
    case 'INCREASE_WITH_ATTACK': return 'Offensive';
    case 'INCREASE_WHEN_HURT':   return 'Defensive';
    default: return spType.replace(/_/g, ' ').toLowerCase();
  }
}

function talentsPanel(s: DetailState): string {
  return visibleTalents(s.op).map(talent => {
    const cands = (talent.candidates ?? []).filter(c => c.name && c.description);
    const rank = (c: TalentCandidate) =>
      parseInt(c.unlockCondition.phase.replace('PHASE_', ''), 10) * 100 + c.requiredPotentialRank;
    // Every unlock step, weakest first — the old view only ever showed the best one.
    const ordered = [...cands].sort((a, b) => rank(a) - rank(b));
    return `
      <div class="detail-talent">
        <div class="talent-name">${escHtml(ordered[ordered.length - 1].name)}</div>
        ${ordered.map(c => `
          <div class="talent-step">
            <div class="talent-unlock">${escHtml(unlockText(c.unlockCondition, c.requiredPotentialRank))}</div>
            <div class="talent-desc">${cleanText(c.description)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');
}

function modulePhaseHtml(phase: ModulePhase): string {
  const stats = phase.attributeBlackboard
    .map(b => {
      const key = MODULE_ATTR[b.key];
      const label = key ? STAT_ROWS.find(r => r.key === key)?.label ?? b.key : b.key;
      const sign = b.value > 0 ? '+' : '';
      return `<span class="mod-stat">${escHtml(label)} ${sign}${b.value}</span>`;
    }).join('');

  const trait = phase.parts
    .flatMap(p => p.overrideTraitDataBundle?.candidates ?? [])
    .map(c => c.additionalDescription ?? c.overrideDescripton)
    .filter((x): x is string => !!x)
    .map(d => `<div class="mod-trait">${cleanText(d)}</div>`)
    .join('');

  return `${stats ? `<div class="mod-stats">${stats}</div>` : ''}${trait}`;
}

function modulesPanel(s: DetailState): string {
  const mods = visibleModules(s.op);
  const mod = mods[Math.min(s.moduleIdx, mods.length - 1)];
  const phases = mod.data!.phases;
  const lvIdx = Math.min(s.moduleLevel, phases.length - 1);
  const code = [mod.info.typeName1, mod.info.typeName2].filter(Boolean).join('-');

  return `
    ${mods.length > 1 ? `
      <div class="ctl-row">
        <span class="ctl-label">Module</span>
        ${segmented('module', mods.map((m, i) => ({
          value: i,
          label: [m.info.typeName1, m.info.typeName2].filter(Boolean).join('-') || `${i + 1}`,
          on: i === Math.min(s.moduleIdx, mods.length - 1),
        })))}
      </div>
    ` : ''}
    <div class="ctl-row">
      <span class="ctl-label">Stage</span>
      ${segmented('module-lv', phases.map((p, i) => ({ value: i, label: `${p.equipLevel}`, on: i === lvIdx })))}
    </div>
    <div class="mod-head">
      <div class="mod-name">${escHtml(mod.info.uniEquipName)}</div>
      ${code ? `<span class="mod-code">${escHtml(code)}</span>` : ''}
      <span class="mod-unlock">${escHtml(`${phaseLabel(mod.info.showEvolvePhase)} · Lv${mod.info.unlockLevel}`)}</span>
    </div>
    ${modulePhaseHtml(phases[lvIdx])}
  `;
}

function potentialPanel(s: DetailState): string {
  return (s.op.data.potentialRanks ?? [])
    .filter(r => r.description)
    .map((r, i) => `
      <div class="detail-pot">
        <span class="pot-rank">P${i + 2}</span>
        <span class="pot-desc">${cleanText(r.description)}</span>
      </div>
    `).join('');
}

function riicPanel(s: DetailState): string {
  return (s.op.bases ?? []).map(b => `
    <div class="detail-base">
      <div class="base-name">${escHtml(b.skill.buffName)}</div>
      <div class="base-unlock">${escHtml(unlockText(b.condition.cond))}</div>
      <div class="base-desc">${cleanText(b.skill.description)}</div>
    </div>
  `).join('');
}

function panelHtml(s: DetailState): string {
  switch (s.tab) {
    case 'attributes': return attributesPanel(s);
    case 'skills':     return skillsPanel(s);
    case 'talents':    return talentsPanel(s);
    case 'modules':    return modulesPanel(s);
    case 'potential':  return potentialPanel(s);
    case 'riic':       return riicPanel(s);
  }
}

// ── Shell ────────────────────────────────────────────────────────────────────

function headerHtml(op: Operator): string {
  const d = op.data;
  const n = rarityNum(d.rarity);
  const faction = op.factions
    ?.map(f => f.nationPower ?? f.groupPower ?? f.teamPower)
    .find(p => p != null)?.powerName;

  return `
    <div class="detail-header">
      <img class="detail-avatar" src="${operatorAvatarUrl(op.id)}" alt="${escHtml(d.name)}"
           onerror="this.outerHTML='<div class=\\'op-avatar-placeholder\\'>?</div>'">
      <div class="detail-info">
        <div class="detail-name">${escHtml(d.name)}</div>
        <div class="detail-meta">
          <span class="op-class ${PROFESSION_CSS[d.profession]}">
            <img class="op-class-icon" src="${classIconUrl(PROFESSION_CSS[d.profession])}" alt="">
            ${PROFESSION_LABEL[d.profession]}
          </span>
          <span class="op-rarity r${n}">${'★'.repeat(n)}</span>
        </div>
        <div class="detail-sub">
          ${escHtml(op.archetype ?? d.subProfessionId)} · ${escHtml(d.position)}${faction ? ` · ${escHtml(faction)}` : ''}
        </div>
      </div>
    </div>
  `;
}

function loreHtml(op: Operator): string {
  const d = op.data;
  const tags = (d.tagList ?? []).map(t => `<span class="op-tag">${escHtml(t)}</span>`).join('');
  const trait = d.trait ?? d.description;
  const bits: string[] = [];
  if (trait)                bits.push(`<p><span class="label-inline">Trait:</span> ${cleanText(trait)}</p>`);
  if (d.itemUsage)          bits.push(`<p>${cleanText(d.itemUsage)}</p>`);
  if (d.itemObtainApproach) bits.push(`<p><span class="label-inline">Obtain:</span> ${cleanText(d.itemObtainApproach)}</p>`);
  if (!tags && !bits.length) return '';
  return `
    <div class="detail-lore">
      ${tags ? `<div class="detail-tags">${tags}</div>` : ''}
      ${bits.join('')}
    </div>
  `;
}

function artsHtml(op: Operator): string {
  const arts = op.arts ?? [];
  if (!arts.length) return '';
  return `
    <div class="detail-arts">
      <div class="detail-arts-label">Arts</div>
      <div class="detail-arts-row">
        ${arts.map(a => `
          <a class="detail-art" href="${a.url}" target="_blank" rel="noopener" title="${escHtml(a.label)}">
            <img src="${a.url}" alt="${escHtml(a.label)}" loading="lazy">
            <span class="detail-art-label">${escHtml(a.label)}</span>
          </a>
        `).join('')}
      </div>
    </div>
  `;
}

function shellHtml(s: DetailState): string {
  const tabs = tabsFor(s.op);
  return `
    <div class="detail">
      <nav class="crumbs">
        <a href="#/">All operators</a>
        <span class="crumb-sep">/</span>
        <span class="crumb-current">${escHtml(s.op.data.name)}</span>
      </nav>
      ${headerHtml(s.op)}
      ${loreHtml(s.op)}
      ${artsHtml(s.op)}
      <div class="tabs" role="tablist">
        ${tabs.map(t => `
          <button class="tab${t.id === s.tab ? ' on' : ''}" role="tab"
                  aria-selected="${t.id === s.tab}" data-act="tab" data-value="${t.id}">${t.label}</button>
        `).join('')}
      </div>
      <div class="tab-panel" id="panel">${panelHtml(s)}</div>
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

// The level slider re-renders on every input event, so touch only the numbers —
// re-rendering the panel would destroy the input mid-drag.
function updateStatsOnly(container: HTMLElement): void {
  if (!state) return;
  const stats = computeStats(
    state.op, state.phaseIdx, state.level, state.trust, state.potential, activeModulePhase(state),
  );
  container.querySelectorAll<HTMLElement>('[data-stat]').forEach(el => {
    const key = el.dataset.stat as StatKey;
    el.textContent = fmtStat(key, stats[key]);
  });
  const out = container.querySelector<HTMLElement>('#lvl-out');
  if (out) out.textContent = String(state.level);
}

function errorHtml(id: string, label: string): string {
  return `
    <div class="detail">
      <nav class="crumbs"><a href="#/">All operators</a></nav>
      <div class="state-msg"><div class="label">${label}</div>No dossier found for <code>${escHtml(id)}</code>.</div>
    </div>
  `;
}

export async function mountDetail(container: HTMLElement, id: string): Promise<void> {
  const seq = ++mountSeq;
  (document.getElementById('search') as HTMLInputElement).style.display = 'none';
  (document.getElementById('sort') as HTMLSelectElement).style.display = 'none';
  document.getElementById('chips')!.style.display = 'none';
  document.getElementById('more-filters')!.style.display = 'none';
  document.getElementById('count')!.textContent = '';

  container.innerHTML = `
    <div class="detail">
      <nav class="crumbs"><a href="#/">All operators</a></nav>
      <div class="state-msg"><span class="spinner"></span></div>
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

  // Pull every phase's range up front so switching Elite stays synchronous.
  const rangeIds = [...new Set(op.data.phases.map(p => p.rangeId).filter((x): x is string => !!x))];
  const ranges = new Map<string, AttackRange>();
  await Promise.all(rangeIds.map(async rid => {
    try { ranges.set(rid, await getRange(rid)); } catch { /* range is non-essential */ }
  }));
  if (seq !== mountSeq) return;

  const lastPhase = op.data.phases.length - 1;
  state = {
    op, ranges,
    tab: 'attributes',
    phaseIdx: lastPhase,
    level: op.data.phases[lastPhase].maxLevel,
    trust: true,
    potential: 0,
    skillIdx: 0,
    skillLevel: Math.max(0, (visibleSkills(op)[0]?.excel.levels.length ?? 1) - 1),
    moduleIdx: 0,
    moduleLevel: Math.max(0, (visibleModules(op)[0]?.data?.phases.length ?? 1) - 1),
    moduleEquipped: false,
  };
  renderAll(container);

  container.onclick = (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!btn || !state) return;
    const value = btn.dataset.value!;
    switch (btn.dataset.act) {
      case 'tab': state.tab = value as TabId; renderAll(container); return;
      case 'phase': {
        state.phaseIdx = Number(value);
        state.level = state.op.data.phases[state.phaseIdx].maxLevel;
        break;
      }
      case 'trust':     state.trust = value === '1'; break;
      case 'pot':       state.potential = Number(value); break;
      case 'skill':     state.skillIdx = Number(value);
                        state.skillLevel = Math.max(0, visibleSkills(state.op)[state.skillIdx].excel.levels.length - 1);
                        break;
      case 'skill-lv':  state.skillLevel = Number(value); break;
      case 'module':    state.moduleIdx = Number(value); state.moduleLevel = 0; break;
      case 'module-lv': state.moduleLevel = Number(value); break;
      case 'mod-equip': {
        const i = Number(value);
        state.moduleEquipped = i >= 0;
        if (i >= 0) {
          state.moduleIdx = i;
          // Default to the fully upgraded stage — that's the number people want.
          state.moduleLevel = Math.max(0, (visibleModules(state.op)[i]?.data?.phases.length ?? 1) - 1);
        }
        break;
      }
      case 'mod-stage': state.moduleLevel = Number(value); break;
      default: return;
    }
    renderPanel(container);
  };

  container.oninput = (ev) => {
    const el = ev.target as HTMLInputElement;
    if (el.id !== 'lvl' || !state) return;
    state.level = Number(el.value);
    updateStatsOnly(container);
  };
}
