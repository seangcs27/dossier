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
import { openArtViewer } from '../art-viewer';
import {
  operatorAvatarUrl, operatorSkinAvatarUrl, skillIconUrl, classIconUrl, archetypeIconUrl, artUrl,
  itemIconUrl, potentialIconUrl, factionLogoUrl, moduleTypeIconUrl, moduleImageUrl, riicSkillIconUrl,
} from '../../shared/api/hella-api';
import itemIndex from '../../shared/generated/items.json';
import gameConsts from '../../shared/generated/game-consts.json';
import type {
  AttackRange,
  ItemCost,
  ModulePhase,
  Operator,
  OperatorAttributes,
  OperatorData,
  OperatorModule,
  OperatorSkillDetail,
  OperatorTalent,
  TalentCandidate,
  UnlockCondition,
} from '../../shared/types';
import {
  MODE_LABEL,
  PROFESSION_LABEL,
  PROFESSION_CSS,
  rarityNum,
  escHtml,
  cleanText,
  descriptionToHtml,
  markChanges,
  traitInfo,
  splitAlterName,
} from '../format';
import {
  ICON_HP, ICON_ATK, ICON_DEF, ICON_RES, ICON_ASPD, ICON_BLOCK, ICON_DP, ICON_REDEPLOY,
  ICON_SP_COST, ICON_SP_INIT, ICON_DURATION, ICON_MELEE, ICON_RANGED, ICON_MELEE_AND_RANGED, ICON_BRUSH,
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

  // Attack speed has no row of its own: potentials and modules grant it as a flat bonus on
  // a base of 100, and it shortens the attack interval instead (below).
  let aspd = 0;

  // potentialRanks[0] is Potential 2, so `potential` is how many ranks are unlocked.
  for (const rank of (op.data.potentialRanks ?? []).slice(0, potential)) {
    for (const mod of rank.buff?.attributes?.attributeModifiers ?? []) {
      if (mod.attributeType === 'ATTACK_SPEED') aspd += mod.value;
      const key = POTENTIAL_ATTR[mod.attributeType];
      if (key) out[key] += mod.value;
    }
  }

  for (const b of modulePhase?.attributeBlackboard ?? []) {
    if (b.key === 'attack_speed') aspd += b.value;
    const key = MODULE_ATTR[b.key];
    if (key) out[key] += b.value;
  }

  // The game's rule, interval × 100 / (100 + ASPD). The reference also rounds the result to
  // a 30 fps frame; this doesn't, so an operator with no bonus still reads its base interval.
  out.baseAttackTime = out.baseAttackTime * 100 / (100 + aspd);
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
  // What a module's marked changes are a change from: the operator without the module, or
  // the stage before the selected one.
  moduleDiff: 'base' | 'stage';
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

// The potential control: the game's rank badges alone, no words. As in the reference, it
// offers Potential 1 plus only the `ranks` that change something on the panel it sits in —
// on Attributes Makoto Yuki gets 1, 2, 4 and 6, on Talents 1, 3 and 5 — since picking any
// other would change nothing. Potential is shared between the two tabs, so the current rank
// may be one this panel's list omits; the trigger shows the real rank either way, so the
// tabs never disagree about the state.
//
// A native <select> can't show an image in its options, hence a small menu button.
function potentialMenu(s: DetailState, ranks: number[]): string {
  if (!maxPotential(s.op)) return '';
  const values = [...new Set([0, ...ranks])].sort((a, b) => a - b);
  const badge = (v: number) => `<img class="pot-icon" src="${potentialIconUrl(v + 1)}" alt="">`;
  return `
    <div class="pot-menu">
      <button class="pot-trigger" data-act="pot-toggle" aria-haspopup="menu" aria-expanded="false"
              aria-label="Potential ${s.potential + 1}" data-tip="Potential ${s.potential + 1}"${values.length < 2 ? ' disabled' : ''}>
        ${badge(s.potential)}<span class="pot-caret" aria-hidden="true"></span>
      </button>
      <div class="pot-options" role="menu" hidden>
        ${values.map(v => `
          <button role="menuitemradio" aria-checked="${v === s.potential}" data-act="pot-pick" data-value="${v}"
                  aria-label="Potential ${v + 1}" data-tip="Potential ${v + 1}">${badge(v)}</button>
        `).join('')}
      </div>
    </div>
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

// ── Costs ────────────────────────────────────────────────────────────────────

// Only the ~90 materials a payload references, baked by the build from item_table. An id
// missing here (the item source was down at build time) still shows its count, unnamed,
// rather than the cost silently looking cheaper than it is.
const ITEMS: Record<string, { name: string; iconId: string; rarity: string } | undefined> = itemIndex;

// Promotion LMD, [rarity - 1][elite - 1]; -1 where that rarity can't reach that elite.
// The game keeps it here rather than in the phase's own evolveCost.
const PROMOTION_GOLD: number[][] = gameConsts.evolveGoldCost;

// "180K", "12.5K", "4" — the reference's own formatting, and what fits a badge on a 52px disc.
const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 });

// Each material as its icon in a disc ringed by the item's rarity, with the count in a
// badge — the reference's layout — named in the tooltip and for screen readers.
function costListHtml(costs: ItemCost[]): string {
  return `<ul class="cost-list">${costs.map(c => {
    const item = ITEMS[c.id];
    const name = item?.name ?? c.id;
    const count = COMPACT.format(c.count);
    const tier = item ? ` cost-r${item.rarity.replace('TIER_', '')}` : '';
    return `
      <li class="cost${tier}" data-tip="${escHtml(`${name} ×${c.count.toLocaleString('en-US')}`)}">
        ${item ? `<img class="cost-icon" src="${itemIconUrl(item.iconId)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
        <span class="cost-count">${count}</span>
        <span class="visually-hidden">${escHtml(name)}</span>
      </li>
    `;
  }).join('')}</ul>`;
}

// A labelled cost under a rule: "To reach Elite 2", "To reach Mastery 3", "To unlock".
function upgradeRowHtml(label: string, extra: string, costs: ItemCost[]): string {
  if (!extra && !costs.length) return '';
  return `
    <div class="upgrade-row">
      <span class="section-label">${escHtml(label)}</span>
      ${extra}
      ${costs.length ? costListHtml(costs) : ''}
    </div>
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
        ${potentialMenu(s, (op.data.potentialRanks ?? []).flatMap((rank, i) =>
          (rank.buff?.attributes?.attributeModifiers ?? [])
            .some(m => POTENTIAL_ATTR[m.attributeType] || m.attributeType === 'ATTACK_SPEED') ? [i + 1] : []))}
      </div>
    </div>
  `;

  const statList = STAT_ROWS.map(({ key, label, icon }) => `
    <div class="stat-row">
      <dt>${icon}<span>${label}</span></dt>
      <dd data-stat="${key}">${fmtStat(key, stats[key])}</dd>
    </div>
  `).join('');

  return `
    <div class="panel-controls">${controls}</div>
    <dl class="stat-list">${statList}</dl>
    ${rangeBlock(operatorRange(s))}
    ${promotionHtml(s)}
  `;
}

// What promoting into the selected elite costs, as the reference lists it: the LMD first,
// then the phase's own materials. Elite 0 has nothing to promote from.
//
// An empty evolveCost and a null one mean different things. `[]` is a 3-star's Elite 1,
// which costs LMD and nothing else. `null` is an operator who promotes for free — only
// Raidian, an Integrated Strategies unit — and pricing that at the rarity's LMD would
// invent a cost the game doesn't charge.
function promotionHtml(s: DetailState): string {
  const materials = s.op.data.phases[s.phaseIdx].evolveCost;
  if (s.phaseIdx === 0 || materials == null) return '';
  const gold = PROMOTION_GOLD[rarityNum(s.op.data.rarity) - 1]?.[s.phaseIdx - 1] ?? -1;
  const costs: ItemCost[] = [
    ...(gold > 0 ? [{ id: '4001', count: gold, type: 'GOLD' }] : []),
    ...materials,
  ];
  return upgradeRowHtml(`To reach Elite ${s.phaseIdx}`, '', costs);
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
    ? shown.map(c => {
        // "yes some talents have ranges. Tomimi why do you exist" — the reference. Drawn
        // over the operator's own range only when the talent replaces it; otherwise it is
        // the reach of the talent's effect, and a diff against the attack range means nothing.
        const overrides = (c.blackboard ?? []).some(b => b.key === 'talent_override_rangeid_flag' && b.value === 1);
        return `
        <section class="entry">
          <header class="entry-head">
            ${eliteIcon(phaseNum(c.unlockCondition.phase))}
            <h2 class="entry-name">${escHtml(c.name)}</h2>
          </header>
          <p class="rich">${descriptionToHtml(c.description, c.blackboard ?? [])}</p>
          ${rangeBlock(rangeFor(s, c.rangeId), overrides ? operatorRange(s) : null)}
        </section>
      `;
      }).join('')
    : `<p class="empty-msg">No talents at this elite level and potential.</p>`;

  // The ranks that can change a talent shown at this elite. The reference lists only those
  // of candidates unlocking AT the elite, which drops a potential upgrade for any talent
  // that isn't restated there; "at or below" keeps it selectable.
  const ranks = talents.flatMap(t => (t.candidates ?? [])
    .filter(c => c.name && c.description && !c.isHideTalent && phaseNum(c.unlockCondition.phase) <= s.phaseIdx)
    .map(c => c.requiredPotentialRank));

  return `
    <div class="panel-controls panel-controls-inline">
      ${eliteGroup('phase', s.op.data.phases.map((_, i) => i), s.phaseIdx)}
      ${potentialMenu(s, ranks)}
    </div>
    <div class="entry-list">${body}</div>
  `;
}

// ── Skills ───────────────────────────────────────────────────────────────────

const SP_TYPE: Record<string, { label: string; cls: string }> = {
  INCREASE_WITH_TIME:   { label: 'Auto',      cls: 'sp-auto' },
  INCREASE_WHEN_ATTACK: { label: 'Offensive', cls: 'sp-offensive' },
  INCREASE_WITH_ATTACK: { label: 'Offensive', cls: 'sp-offensive' },
  INCREASE_WHEN_TAKEN_DAMAGE: { label: 'Defensive', cls: 'sp-defensive' },
};

const SKILL_TYPE: Record<string, string> = {
  PASSIVE: 'Passive',
  MANUAL: 'Manual Trigger',
  AUTO: 'Auto Trigger',
};

const skillLevelLabel = (i: number): string => (i < 7 ? `${i + 1}` : `M${i - 6}`);

// What reaching the selected rank takes. Ranks 2-7 share one table per operator; M1-M3
// are priced per skill and carry a training time. Rank 1 is where every skill starts.
interface RankStep {
  cond: UnlockCondition;
  hours: number | null;
  costs: ItemCost[];
}

function rankStep(s: DetailState, skill: OperatorSkillDetail, idx: number): RankStep | null {
  if (idx >= 7) {
    const m = skill.deploy.levelUpCostCond?.[idx - 7];
    return m ? { cond: m.unlockCond, hours: m.lvlUpTime / 3600, costs: m.levelUpCost ?? [] } : null;
  }
  const r = idx > 0 ? s.op.data.allSkillLvlup?.[idx - 1] : undefined;
  return r ? { cond: r.unlockCond, hours: null, costs: r.lvlUpCost ?? [] } : null;
}

function rankUpHtml(s: DetailState, skill: OperatorSkillDetail, idx: number): string {
  const step = rankStep(s, skill, idx);
  if (!step) return '';
  const target = idx >= 7 ? `Mastery ${idx - 6}` : `Rank ${idx + 1}`;
  // As in the reference, no badge for Elite 0 Lv1 (ranks 2-4): every operator starts there.
  const gated = phaseNum(step.cond.phase) > 0 || step.cond.level > 1;
  const requires = [
    gated ? `<span class="unlock-badge">${eliteIcon(phaseNum(step.cond.phase))}Lv${step.cond.level}</span>` : '',
    step.hours ? `<span class="upgrade-time">${ICON_DURATION}${step.hours}h training</span>` : '',
  ].join('');
  return upgradeRowHtml(`To reach ${target}`, requires, step.costs);
}

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
          <input type="text" id="skill-lvl-num" class="num-round num-round-skill" maxlength="2"
                 autocomplete="off" value="${skillLevelLabel(idx)}" aria-label="Skill rank, 1 to 7 or M1 to M3">
        </div>
      </div>
    </div>
    <div id="skill-body">${skillBodyHtml(s, skill, idx)}</div>
  `;
}

function skillBodyHtml(s: DetailState, skill: OperatorSkillDetail, idx: number): string {
  const lv = skill.excel.levels[idx];
  const sp = lv.spData;
  const spType = SP_TYPE[sp?.spType ?? ''] ?? { label: 'Always Active', cls: 'sp-passive' };
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
        <span class="${spType.cls}">${spType.label} Recovery</span>
      </div>
    </div>
    <dl class="skill-meta">
      <div><dt>${ICON_SP_COST}<span>SP Cost</span></dt><dd>${sp?.spCost ?? '—'}</dd></div>
      <div><dt>${ICON_SP_INIT}<span>Initial SP</span></dt><dd>${sp?.initSp ?? '—'}</dd></div>
      <div><dt>${ICON_DURATION}<span>Duration</span></dt><dd>${escHtml(duration)}</dd></div>
    </dl>
    <p class="rich">${descriptionToHtml(lv.description, lv.blackboard ?? [])}</p>
    ${range ? rangeBlock(range, operatorRange(s)) : ''}
    ${rankUpHtml(s, skill, idx)}
  `;
}

// ── Modules ──────────────────────────────────────────────────────────────────

// One part of a module stage at the selected potential: the strongest candidate it unlocks.
// A rank the module doesn't restate keeps the lower rank's effect, as in game.
function moduleCandidate<T extends { requiredPotentialRank: number }>(
  candidates: T[] | null | undefined, potential: number,
): T | null {
  return (candidates ?? [])
    .filter(c => c.requiredPotentialRank <= potential)
    .sort((a, b) => b.requiredPotentialRank - a.requiredPotentialRank)[0] ?? null;
}

// One thing a module stage does: `key` names what it touches ('trait', 'talent:0') so the
// same effect can be found on another stage, `html` is its rendered text, and `base` the
// operator's own text it replaces — null where it replaces nothing.
interface ModuleEffect {
  key: string;
  label: string;
  html: string;
  base: string | null;
}

// What a stage does to the trait and the talents, labelled as the reference labels it: a
// trait gains a line ("Added") or is rewritten ("Updated"); a talent is rewritten, or a new
// one is added. `base` is the operator's own trait, or the talent at the module's elite and
// the selected potential.
function moduleEffects(s: DetailState, mod: OperatorModule, phase: ModulePhase): ModuleEffect[] {
  const d = s.op.data;
  const ownTrait = traitInfo(d) ?? (d.description ? { text: d.description, blackboard: [] } : null);
  return phase.parts.flatMap(p => {
    const trait = moduleCandidate(p.overrideTraitDataBundle?.candidates, s.potential);
    const traitText = trait?.additionalDescription || trait?.overrideDescripton;
    if (trait && traitText) {
      const added = !!trait.additionalDescription;
      return [{
        key: 'trait',
        label: `Trait (${added ? 'Added' : 'Updated'})`,
        html: descriptionToHtml(traitText, trait.blackboard ?? []),
        base: !added && ownTrait ? descriptionToHtml(ownTrait.text, ownTrait.blackboard) : null,
      }];
    }
    const talent = moduleCandidate(p.addOrOverrideTalentDataBundle?.candidates, s.potential);
    if (talent?.upgradeDescription) {
      const ownTalent = talent.talentIndex < 0 ? undefined : d.talents?.[talent.talentIndex];
      const own = ownTalent ? activeCandidate(ownTalent, phaseNum(mod.info.showEvolvePhase), s.potential) : null;
      return [{
        key: `talent:${talent.talentIndex}`,
        label: talent.talentIndex < 0 ? 'New Talent (Added)' : `Talent ${talent.talentIndex + 1} (Updated)`,
        html: descriptionToHtml(talent.upgradeDescription, talent.blackboard ?? []),
        base: own ? descriptionToHtml(own.description, own.blackboard ?? []) : null,
      }];
    }
    return [];
  });
}

function modulesPanel(s: DetailState): string {
  const mods = visibleModules(s.op);
  const modIdx = Math.min(s.moduleIdx, mods.length - 1);
  const mod = mods[modIdx];
  const phases = mod.data!.phases;
  const lvIdx = Math.min(s.moduleLevel, phases.length - 1);
  const phase = phases[lvIdx];
  const code = [mod.info.typeName1, mod.info.typeName2].filter(Boolean).join('-');

  // The reference's stat row: glyph, name, signed value, a rule between. Attack speed has no
  // row in the attribute table, so it is named here rather than looked up there.
  const stats = phase.attributeBlackboard.map(b => {
    const row = b.key === 'attack_speed'
      ? { label: 'Attack Speed', icon: ICON_ASPD }
      : STAT_ROWS.find(r => r.key === MODULE_ATTR[b.key]);
    const sign = b.value > 0 ? '+' : '';
    return `<div><dt>${row?.icon ?? ''}<span>${escHtml(row?.label ?? b.key)}</span></dt><dd>${sign}${b.value}</dd></div>`;
  });
  const cols = stats.length === 3 ? 3 : Math.min(stats.length, 2);

  // The changed words are marked against one of two things, the reader's choice: the
  // operator without the module, or the stage before this one. An effect the previous stage
  // doesn't have (a talent first touched at stage 2) still falls back to the operator's own
  // text, and stage 1 has no previous stage, so there the two are the same thing.
  const perStage = s.moduleDiff === 'stage' && lvIdx > 0;
  const previous = perStage ? moduleEffects(s, mod, phases[lvIdx - 1]) : [];
  const effects = moduleEffects(s, mod, phase).map(e => ({
    ...e,
    base: previous.find(prev => prev.key === e.key)?.html ?? e.base,
  }));

  // The ranks this stage's trait and talent changes are written for.
  const ranks = phase.parts.flatMap(p => [
    ...(p.overrideTraitDataBundle?.candidates ?? []),
    ...(p.addOrOverrideTalentDataBundle?.candidates ?? []),
  ].map(c => c.requiredPotentialRank));

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
        <div class="ctl-cluster ctl-cluster-end">${potentialMenu(s, ranks)}</div>
      </div>
    </div>
    <section class="entry">
      <header class="entry-head">
        <img class="mod-type-icon" src="${moduleTypeIconUrl(mod.info.typeIcon)}" alt="" loading="lazy" onerror="this.remove()">
        <h2 class="entry-name">${escHtml(mod.info.uniEquipName)}</h2>
        ${code ? `<span class="mod-code">${escHtml(code)}</span>` : ''}
        <div class="mod-compare" data-tip="What the blue text is a change from">
          <span class="visually-hidden">Mark changes against</span>
          ${buttonGroup('module-diff', [
            { value: 'base', label: 'vs no module', on: !perStage },
            { value: 'stage', label: 'vs prev. stage', on: perStage },
          ], 'pill', lvIdx === 0)}
        </div>
      </header>
      ${stats.length ? `<dl class="mod-stats mod-stats-${cols}">${stats.join('')}</dl>` : ''}
      ${effects.map(e => `
        <div class="mod-effect">
          <span class="section-label">${e.label}</span>
          <p class="rich">${markChanges(e.html, e.base)}</p>
        </div>
      `).join('')}
      <div class="mod-image">
        <img src="${artUrl(moduleImageUrl(mod.info.uniEquipId), 364)}" alt="" loading="lazy"
             onerror="this.parentElement.remove()">
      </div>
      ${upgradeRowHtml(
        phase.equipLevel === 1 ? 'To unlock' : `To reach stage ${phase.equipLevel}`,
        `<span class="unlock-badge">${eliteIcon(phaseNum(mod.info.showEvolvePhase))}Lv${mod.info.unlockLevel}</span>`,
        mod.info.itemCost?.[String(phase.equipLevel)] ?? [],
      )}
      ${mod.missions?.length ? `
        <div class="mod-missions">
          <span class="section-label">Unlock missions</span>
          <ol class="mission-list">${mod.missions.map(m => `<li>${cleanText(m)}</li>`).join('')}</ol>
        </div>
      ` : ''}
      ${mod.info.uniEquipDesc ? `
        <details class="mod-desc">
          <summary>Description <span class="muted-text">(possible story spoilers)</span></summary>
          <p class="rich muted-text">${cleanText(mod.info.uniEquipDesc)}</p>
        </details>
      ` : ''}
    </section>
  `;
}

// ── RIIC ─────────────────────────────────────────────────────────────────────

// A stand-in for `slot` on a payload baked before the build recorded it: a base skill's
// upgrades often differ only by a trailing rank glyph ("Wisdom" / "Wisdom α"), so
// normalising that away groups most of them. It misses any upgrade that is renamed
// outright ("Penguin Logistics α" into "Logistics Expert"), which is why the slot exists.
const riicKey = (b: { skill: { buffName: string; roomType: string } }): string =>
  `${b.skill.roomType}|${b.skill.buffName.replace(/[\s·]*(α|β|γ|δ|Ⅰ|Ⅱ|Ⅲ|\+)+$/, '').trim()}`;

function riicPanel(s: DetailState): string {
  const bases = s.op.bases ?? [];
  const elites = [...new Set(bases.map(b => phaseNum(b.condition.cond.phase)))].sort();
  const elite = Math.min(s.phaseIdx, elites[elites.length - 1] ?? 0);

  // One stage per skill: the last one the selected elite unlocks, like the reference.
  const bySkill = new Map<number | string, typeof bases[number]>();
  for (const b of bases) {
    if (phaseNum(b.condition.cond.phase) > elite) continue;
    const key = b.slot ?? riicKey(b);
    const prev = bySkill.get(key);
    if (!prev || phaseNum(prev.condition.cond.phase) <= phaseNum(b.condition.cond.phase)) {
      bySkill.set(key, b);
    }
  }
  const shown = [...bySkill.values()];

  const body = shown.length
    ? shown.map(b => `
        <section class="entry">
          <header class="entry-head">
            <img class="riic-icon" src="${riicSkillIconUrl(b.skill.skillIcon)}" alt="" loading="lazy" onerror="this.remove()">
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

// The operator's own art rail labels each outfit but says nothing about it. The skin
// records in the payload carry the rest — series, tagline, flavour text, how it's
// obtained, who drew it — so they get their own section here. Default elite outfits have
// no skinName and generic text, and are left out.
function outfitsHtml(op: Operator): string {
  const arts = op.arts ?? [];
  const outfits = (op.skins ?? []).filter(skin => skin.displaySkin?.skinName);
  if (!outfits.length) return '';

  const items = outfits.map(skin => {
    const d = skin.displaySkin!;
    // Same join buildArtsList uses to credit each art piece, so a name here can switch the
    // viewer to its outfit. An outfit with no art upstream still gets its entry, unlinked.
    const artIdx = arts.findIndex(a => `${op.id}_${a.suffix}` === skin.portraitId);
    const name = escHtml(d.skinName!);
    const text = d.dialog ?? d.content;
    const facts: [string, string][] = [];
    if (d.obtainApproach) facts.push(['Obtained from', d.obtainApproach]);
    const artists = (d.drawerList ?? []).filter(Boolean).join(', ');
    if (artists) facts.push(['Illustrator', artists]);
    const designers = (d.designerList ?? []).filter(Boolean).join(', ');
    if (designers) facts.push(['Designer', designers]);

    return `
      <article class="outfit">
        ${d.skinGroupName ? `<span class="section-label">${escHtml(d.skinGroupName)}</span>` : ''}
        ${artIdx >= 0
          ? `<button class="outfit-name" data-act="art" data-value="${artIdx}">${name}</button>`
          : `<span class="outfit-name">${name}</span>`}
        ${d.description ? `<p class="outfit-quote">${cleanText(d.description)}</p>` : ''}
        ${text ? `<p class="rich muted-text">${cleanText(text)}</p>` : ''}
        ${facts.length ? `<dl class="outfit-facts">${facts.map(([label, value]) =>
          `<div><dt>${escHtml(label)}</dt><dd>${escHtml(value)}</dd></div>`).join('')}</dl>` : ''}
      </article>
    `;
  }).join('');

  return `<section class="entry"><h2 class="entry-name">Outfits</h2><div class="outfit-list">${items}</div></section>`;
}

// A handbook file written as "[Key] value" lines — Basic Info, the Physical Exam — as its
// pairs. A line with no key continues the value above it ("[Infection Status]" puts its
// answer on the next line). The CN table writes the same thing with 【】.
function handbookFields(text: string): [string, string][] {
  const fields: [string, string][] = [];
  for (const line of text.split('\n')) {
    const m = /^\[([^\]]+)\]\s*(.*)$/.exec(line) ?? /^【([^【】]+)】\s*(.*)$/.exec(line);
    if (m) fields.push([m[1].trim(), m[2]]);
    else if (fields.length) fields[fields.length - 1][1] += `\n${line}`;
  }
  return fields.map(([key, value]) => [key, value.trim()]);
}

// Pulled out of Basic Info into the box beside the clinical analysis, as the reference does.
// The second of each pair is what a robot has instead; the last two are the CN table's.
const INFECTION_KEYS = new Set(['Infection Status', 'Inspection Report', '矿石病感染情况', '维护检测报告']);

// The files the layout places itself; every other one ("Archive File 1", "Promotion
// Record", a collab's own) follows as a collapsed section under its own title.
const PLACED_FILES = new Set(['Basic Info', 'Physical Exam', 'Performance Review', 'Profile', 'Clinical Analysis']);

// The reference's Misc tab, built on the operator's handbook: profile, basic info beside
// the physical exam (a robot's performance review), infection status with the clinical
// analysis, then the archive files and promotion record, collapsed. Under those, what has no
// home in the other tabs: the class trait, how the operator is obtained, the potential
// ladder — which the reference leaves to its potential dropdown's tooltips — the outfits
// and a fact list.
function handbookHtml(op: Operator): string {
  const files = op.handbook ?? [];
  const file = (title: string): string | undefined => files.find(f => f.title === title)?.text;
  const basic = handbookFields(file('Basic Info') ?? '');
  const exam = files.find(f => f.title === 'Physical Exam' || f.title === 'Performance Review');
  const infection = basic.find(([key]) => INFECTION_KEYS.has(key));
  const profile = file('Profile');
  const clinical = file('Clinical Analysis');

  const factList = (fields: [string, string][]): string => `
    <dl class="file-facts">
      ${fields.map(([key, value]) => `<div><dt>${escHtml(key)}</dt><dd>${cleanText(value)}</dd></div>`).join('')}
    </dl>
  `;

  return `
    ${profile ? `<section class="entry"><h2 class="entry-name">Profile</h2><p class="rich file-text">${cleanText(profile)}</p></section>` : ''}
    ${basic.length || exam ? `
      <section class="entry file-columns">
        ${basic.length ? `<div><h2 class="entry-name">Basic Info</h2>${factList(basic.filter(f => f !== infection))}</div>` : ''}
        ${exam ? `<div><h2 class="entry-name">${escHtml(exam.title)}</h2>${factList(handbookFields(exam.text))}</div>` : ''}
      </section>
    ` : ''}
    ${infection || clinical ? `
      <div class="file-box">
        ${infection ? `<div><span class="section-label">${escHtml(infection[0])}</span><p class="rich file-text">${cleanText(infection[1])}</p></div>` : ''}
        ${clinical ? `<div><span class="section-label">Clinical Analysis</span><p class="rich file-text">${cleanText(clinical)}</p></div>` : ''}
      </div>
    ` : ''}
    ${files.filter(f => !PLACED_FILES.has(f.title)).map(f => `
      <details class="file-entry">
        <summary>${escHtml(f.title)}</summary>
        <p class="rich file-text">${cleanText(f.text)}</p>
      </details>
    `).join('')}
  `;
}

function miscPanel(s: DetailState): string {
  const d = s.op.data;
  const tags = (d.tagList ?? []).map(t => `<span class="op-tag">${escHtml(t)}</span>`).join('');
  const faction = s.op.factions
    ?.map(f => f.nationPower ?? f.groupPower ?? f.teamPower)
    .find(p => p != null)?.powerName;

  const facts: [string, string][] = [];
  if (s.op.archetype ?? d.subProfessionId) facts.push(['Branch', s.op.archetype ?? d.subProfessionId]);
  facts.push(['Position', positionOf(d).label]);
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
    ${handbookHtml(s.op)}
    ${d.itemUsage || d.itemDesc ? `
      <div class="token-row">
        <img class="token-avatar" src="${operatorAvatarUrl(s.op.id)}" alt="" loading="lazy" onerror="this.remove()">
        <div>
          ${d.itemUsage ? `<p class="rich">${cleanText(d.itemUsage)}</p>` : ''}
          ${d.itemDesc ? `<p class="rich muted-text token-quote">${cleanText(d.itemDesc)}</p>` : ''}
        </div>
      </div>
    ` : ''}
    ${trait ? `<section class="entry"><h2 class="entry-name">Trait</h2><p class="rich">${descriptionToHtml(trait.text, trait.blackboard)}</p></section>` : ''}
    ${d.itemObtainApproach ? `<section class="entry"><h2 class="entry-name">Obtained from</h2><p class="rich">${escHtml(d.itemObtainApproach)}</p></section>` : ''}
    ${pots ? `<section class="entry"><h2 class="entry-name">Potentials</h2>${pots}</section>` : ''}
    ${outfitsHtml(s.op)}
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

// The reference's rule: a trait that lets the operator deploy on ranged tiles makes them
// both, whatever `position` says. Shared by the header and the Misc tab's facts, so the
// page never calls one operator two things.
function positionOf(d: OperatorData): { icon: string; label: string } {
  const both = (traitInfo(d)?.text ?? d.description ?? '').toLowerCase().includes('can be deployed on ranged');
  if (both) return { icon: ICON_MELEE_AND_RANGED, label: 'Melee & Ranged' };
  return d.position === 'MELEE' ? { icon: ICON_MELEE, label: 'Melee' } : { icon: ICON_RANGED, label: 'Ranged' };
}

function headerHtml(s: DetailState): string {
  const d = s.op.data;
  const n = rarityNum(d.rarity);
  const { base, epithet } = splitAlterName(d.name);
  const cls = PROFESSION_CSS[d.profession];
  const info = traitInfo(d);
  const traitTip = cleanText(info?.text ?? d.description ?? '').replace(/<br>/g, ' ');
  const branch = s.op.archetype ?? d.subProfessionId;
  const position = positionOf(d);
  // The most specific faction the operator belongs to, as the game's own profile shows it:
  // S.E.E.S. rather than nothing for a collab operator, Penguin Logistics rather than Lungmen.
  const mainPower = s.op.factions?.[0];
  const faction = mainPower?.teamPower ?? mainPower?.groupPower ?? mainPower?.nationPower;

  return `
    <div class="op-rarity-strip r${n}">
      <span class="visually-hidden">Rarity: ${n}</span>
      ${'<span class="strip-star">★</span>'.repeat(n)}
    </div>
    <div class="op-header">
      ${faction
        // A mask, as on the back of a card, so the stylesheet supplies the colour.
        ? `<span class="op-header-faction" role="img" style="--logo: url(${factionLogoUrl(faction.powerId)})" aria-label="${escHtml(faction.powerName)}" tabindex="0" data-tip="${escHtml(faction.powerName)}"></span>`
        : ''}
      <h1 class="op-header-name">${escHtml(base)}${epithet ? `<span class="alter"> The ${escHtml(epithet)}</span>` : ''}</h1>
      <div class="op-header-classes">
        <span class="hdr-item">
          <img class="hdr-icon" src="${classIconUrl(cls)}" alt="">
          ${PROFESSION_LABEL[d.profession]}
        </span>
        <span class="hdr-item">
          <img class="hdr-icon" src="${archetypeIconUrl(d.subProfessionId)}" alt="" onerror="this.remove()">
          <span class="hdr-branch"${traitTip ? ` tabindex="0" data-tip="${traitTip}"` : ''}>${escHtml(branch)}</span>
        </span>
        <span class="hdr-spacer"></span>
        <span class="hdr-item hdr-position">
          ${position.icon}
          ${position.label}
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
// LIMITED and Upcoming, pinned to the art's top-right corner. They sat beside the name,
// where on a phone they squeezed it and dropped to a line of their own. Upcoming is an
// operator the global server doesn't have yet; why that matters is its tooltip.
function splashTagsHtml(op: Operator): string {
  if (!op.limited && !op.cnOnly && !op.welfare && !op.mode) return '';
  return `
    <div class="splash-tags r${rarityNum(op.data.rarity)}">
      ${op.cnOnly ? '<span class="splash-tag splash-tag-upcoming" tabindex="0" data-tip="On the CN server only, not on Global yet. The English here is the wiki\'s unofficial translation, and some text may still be in Chinese.">Upcoming</span>' : ''}
      ${op.mode ? `<span class="splash-tag splash-tag-mode" tabindex="0" data-tip="${MODE_LABEL[op.mode]} only. The mode lends this operator for a run, and nothing gives it to you to keep.">${op.mode}</span>` : ''}
      ${op.limited ? '<span class="splash-tag splash-tag-limited">Limited</span>' : ''}
      ${op.welfare ? `<span class="splash-tag splash-tag-welfare" tabindex="0" data-tip="Free to obtain: ${escHtml(op.data.itemObtainApproach ?? '')}.">Welfare</span>` : ''}
    </div>
  `;
}

function splashHtml(op: Operator, artIdx: number): string {
  const arts = op.arts ?? [];
  if (!arts.length) {
    return `<div class="splash splash-empty">${splashTagsHtml(op)}<img class="splash-img" src="${operatorAvatarUrl(op.id)}" alt=""></div>`;
  }
  const i = Math.min(artIdx, arts.length - 1);
  const active = arts[i];
  // An outfit's series ("EPOQUE/V") over its name; the default elite arts have no skinName
  // and so no series worth naming.
  const skin = op.skins?.find(k => k.portraitId === `${op.id}_${active.suffix}`)?.displaySkin;
  const series = skin?.skinName ? skin.skinGroupName : null;
  return `
    <div class="splash">
      ${arts.length > 1 ? `
        <div class="splash-rail" role="tablist" aria-label="Artwork">
          ${arts.map((a, j) => `
            <button class="splash-thumb${j === i ? ' on' : ''}" data-act="art" data-value="${j}"
                    role="tab" aria-selected="${j === i}" data-tip="${escHtml(a.label)}">
              <img src="${operatorSkinAvatarUrl(op.id, a.suffix)}" alt="${escHtml(a.label)}"
                   loading="lazy" decoding="async"
                   onerror="this.onerror=null;this.src='${a.url.replace(/'/g, '%27')}'">
            </button>
          `).join('')}
        </div>
      ` : ''}
      ${splashTagsHtml(op)}
      <img class="splash-img" src="${artUrl(active.url, 1024)}" alt="${escHtml(active.label)}"
           fetchpriority="high" decoding="async"
           data-act="art-open" role="button" tabindex="0" aria-label="Open ${escHtml(active.label)} at full size"
           onerror="this.onerror=null;this.src='${active.url.replace(/'/g, '%27')}'">
      <div class="splash-caption">
        ${series ? `<span class="section-label">${escHtml(series)}</span>` : ''}
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
      ${bgUrl
        // The backdrop is the same art at 7.5% opacity behind the whole page, so it never
        // needs the detail the splash does: 640px is 34 KB against the source's megabytes.
        ? `<div class="detail-bg" style="background-image:url('${artUrl(bgUrl, 640, 70).replace(/'/g, '%27')}')"></div>`
        : ''}
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
  const out = container.querySelector<HTMLInputElement>('#skill-lvl-num');
  if (body) body.innerHTML = skillBodyHtml(state, skill, idx);
  if (out) out.value = skillLevelLabel(idx);
}

// The potential menu opens and closes in place: re-rendering the panel just to show it would
// rebuild the controls under the pointer for nothing. Opening moves focus to the current
// rank; closing with Escape returns it to the trigger.
function setPotentialMenu(open: boolean, focusTrigger = false): void {
  const trigger = document.querySelector<HTMLButtonElement>('.pot-trigger');
  const options = document.querySelector<HTMLElement>('.pot-options');
  if (!trigger || !options) return;
  options.hidden = !open;
  trigger.setAttribute('aria-expanded', String(open));
  if (open) options.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
  else if (focusTrigger) trigger.focus();
}

const potentialMenuOpen = (): boolean => !!document.querySelector('.pot-trigger[aria-expanded="true"]');

// Closing is the document's job, not the view's: the menu can lose focus to, or be clicked
// away from, the sticky topbar, which sits outside main#view where the view's own handlers
// never hear about it. Registered once for the page's life; with no menu on the page they
// find nothing and do nothing.
document.addEventListener('pointerdown', ev => {
  if (potentialMenuOpen() && !(ev.target as Element).closest?.('.pot-menu')) setPotentialMenu(false);
});
document.addEventListener('focusin', ev => {
  if (potentialMenuOpen() && !(ev.target as Element).closest?.('.pot-menu')) setPotentialMenu(false);
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && potentialMenuOpen()) setPotentialMenu(false, true);
});

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
  // The grid's controls have no meaning on a detail page — hide the search + Filters
  // cluster and blank the count, but leave the logo bar standing so the header stays put
  // across routes instead of the page visibly restructuring.
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
  // and talent's — so switching Elite or dragging the skill slider stays synchronous.
  const rangeIds = [...new Set([
    ...op.data.phases.map(p => p.rangeId),
    ...(op.skills ?? []).flatMap(s => (s.excel?.levels ?? []).map(l => l.rangeId)),
    ...(op.data.talents ?? []).flatMap(t => (t.candidates ?? []).map(c => c.rangeId)),
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
    moduleDiff: 'base',
    artIdx: e2Idx >= 0 ? e2Idx : 0,
  };
  renderAll(container);

  container.onclick = (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el || !state) return;
    // Checkboxes report through oninput instead.
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) return;
    const value = el.dataset.value!;
    switch (el.dataset.act) {
      case 'tab': state.tab = value as TabId; renderAll(container); return;
      // The artwork viewer lives in the shell, not the tab panel, so it needs the full
      // re-render — renderPanel() below would leave it untouched. An outfit picked from the
      // Misc tab is below the viewer on a one-column layout, so the viewer is brought into
      // view; picked from the rail, it is already there and nothing moves.
      case 'art':
        state.artIdx = Number(value);
        renderAll(container);
        container.querySelector('.splash')?.scrollIntoView({ block: 'nearest' });
        return;
      // The page follows the viewer: whichever piece was showing when it closed becomes the
      // page's own, and focus goes back to the art it was opened from.
      case 'art-open':
        openArtViewer(state.op.id, state.op.arts ?? [], state.artIdx, (index) => {
          if (!state) return;
          if (index !== state.artIdx) { state.artIdx = index; renderAll(container); }
          container.querySelector<HTMLElement>('.splash-img')?.focus();
        });
        return;
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
      case 'module-diff': state.moduleDiff = value as DetailState['moduleDiff']; break;
      case 'pot-toggle':
        setPotentialMenu(el.getAttribute('aria-expanded') !== 'true');
        return;
      case 'pot-pick':
        state.potential = Number(value);
        renderPanel(container);
        // The re-render replaced the focused option; without this, focus falls to <body>.
        container.querySelector<HTMLElement>('.pot-trigger')?.focus();
        return;
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
      // Typed, as in the reference: "5", or "M2" in either case. Anything else is left in
      // the field untouched until it parses, and onchange below restores the real rank.
      case 'skill-lvl-num': {
        const slider = container.querySelector<HTMLInputElement>('#skill-lvl');
        const mastery = /^m([123])$/i.exec(el.value.trim());
        const rank = mastery ? Number(mastery[1]) + 7 : Number(el.value);
        if (!slider || !Number.isInteger(rank) || rank < 1 || rank > Number(slider.max)) return;
        state.skillLevel = rank - 1;
        slider.value = String(rank);
        updateSkillBody(container);
        return;
      }
      case 'trust-num': {
        const v = Number((el as HTMLInputElement).value);
        if (!Number.isFinite(v) || v < 0 || v > 200) return;
        state.trust = v;
        updateStatsOnly(container);
        return;
      }
      case 'trust-on':  state.trustOn = (el as HTMLInputElement).checked; break;
      case 'mod-on':    state.moduleOn = (el as HTMLInputElement).checked; break;
      default: return;
    }
    renderPanel(container);
  };

  // Leaving the rank field with something unparseable in it puts the real rank back.
  container.onchange = (ev) => {
    if ((ev.target as HTMLElement).id === 'skill-lvl-num') updateSkillBody(container);
  };

  // The art is an <img> acting as a button, so Enter and Space have to be given to it.
  container.onkeydown = (ev) => {
    const el = ev.target as HTMLElement;
    if ((ev.key !== 'Enter' && ev.key !== ' ') || el.dataset.act !== 'art-open') return;
    ev.preventDefault();
    el.click();
  };
}
