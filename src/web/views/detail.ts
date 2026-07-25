import { getOperator, getRange } from '../../shared/cache/operator-cache';
import { operatorAvatarUrl, skillIconUrl } from '../../shared/api/hella-api';
import type {
  AttackRange,
  Operator,
  OperatorAttributes,
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

const STAT_ROWS: { key: keyof OperatorAttributes; label: string; suffix?: string }[] = [
  { key: 'maxHp',           label: 'Max HP' },
  { key: 'atk',             label: 'ATK' },
  { key: 'def',             label: 'DEF' },
  { key: 'magicResistance', label: 'RES' },
  { key: 'cost',            label: 'DP Cost' },
  { key: 'blockCnt',        label: 'Block' },
  { key: 'respawnTime',     label: 'Redeploy',        suffix: 's' },
  { key: 'baseAttackTime',  label: 'Attack Interval', suffix: 's' },
];

function unlockText(cond: UnlockCondition, potRank?: number): string {
  let s = `Unlocks ${phaseLabel(cond.phase)}`;
  if (cond.level > 1) s += ` · Lv${cond.level}`;
  if (potRank && potRank > 0) s += ` · Potential ${potRank}`;
  return s;
}

function headerSection(op: Operator): string {
  const d      = op.data;
  const n      = rarityNum(d.rarity);
  const stars  = '★'.repeat(n);
  const cls    = PROFESSION_CSS[d.profession] ?? d.profession.toLowerCase();
  const label  = PROFESSION_LABEL[d.profession] ?? d.profession;
  const avatar = operatorAvatarUrl(op.id);
  const name   = escHtml(d.name);
  const faction = op.factions
    ?.map(f => f.nationPower ?? f.groupPower ?? f.teamPower)
    .find(p => p != null)?.powerName;

  return `
    <div class="detail-header">
      <img class="detail-avatar" src="${avatar}" alt="${name}"
           onerror="this.outerHTML='<div class=\\'op-avatar-placeholder\\'>?</div>'">
      <div class="detail-info">
        <div class="detail-name">${name}</div>
        <div class="detail-meta">
          <span class="op-class ${cls}">${label}</span>
          <span class="op-rarity r${n}">${stars}</span>
        </div>
        <div class="detail-sub">
          ${escHtml(d.subProfessionId)}${op.archetype ? ` · ${escHtml(op.archetype)}` : ''} · ${escHtml(d.position)}${faction ? ` · ${escHtml(faction)}` : ''}
        </div>
      </div>
    </div>
  `;
}

function loreSection(op: Operator): string {
  const d    = op.data;
  const tags = (d.tagList ?? []).map(t => `<span class="op-tag">${escHtml(t)}</span>`).join('');
  const trait = d.trait ?? d.description;
  const bits: string[] = [];
  if (d.itemUsage)          bits.push(`<p>${cleanText(d.itemUsage)}</p>`);
  if (d.itemDesc)           bits.push(`<p>${cleanText(d.itemDesc)}</p>`);
  if (trait)                bits.push(`<p><span class="label-inline">Trait:</span> ${cleanText(trait)}</p>`);
  if (d.itemObtainApproach) bits.push(`<p><span class="label-inline">Obtain:</span> ${cleanText(d.itemObtainApproach)}</p>`);
  if (!tags && bits.length === 0) return '';
  return `
    <div class="detail-section">
      ${tags ? `<div class="detail-tags">${tags}</div>` : ''}
      ${bits.join('')}
    </div>
  `;
}

function statsSection(op: Operator): string {
  const phases = op.data.phases;
  if (phases.length === 0) return '';
  const head = phases.map((p, i) => `<th>E${i} <span class="th-sub">Lv${p.maxLevel}</span></th>`).join('');
  const rows = STAT_ROWS.map(({ key, label, suffix }) => {
    const cells = phases.map(p => {
      const frames = p.attributesKeyFrames;
      if (!frames || frames.length === 0) return '<td>—</td>';
      const lo = frames[0].data[key];
      const hi = frames[frames.length - 1].data[key];
      const fmt = (v: number) => `${v}${suffix ?? ''}`;
      return `<td>${lo === hi ? fmt(lo) : `${fmt(lo)} → ${fmt(hi)}`}</td>`;
    }).join('');
    return `<tr><th>${label}</th>${cells}</tr>`;
  }).join('');
  return `
    <div class="detail-section">
      <div class="detail-section-title">Stats</div>
      <table class="stats-table">
        <thead><tr><th></th>${head}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function rangeGridHtml(range: AttackRange): string {
  const rows   = range.grids.map(g => g.row);
  const cols   = range.grids.map(g => g.col);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);
  const opCol  = minCol - 1;
  const filled = new Set(range.grids.map(g => `${g.row},${g.col}`));
  const cells: string[] = [];
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = opCol; c <= maxCol; c++) {
      if (r === 0 && c === opCol)        cells.push('<span class="range-cell range-op"></span>');
      else if (filled.has(`${r},${c}`))  cells.push('<span class="range-cell range-on"></span>');
      else                               cells.push('<span class="range-cell"></span>');
    }
  }
  const width = maxCol - opCol + 1;
  return `<div class="range-grid" style="grid-template-columns: repeat(${width}, 14px)">${cells.join('')}</div>`;
}

async function rangesSection(op: Operator): Promise<string> {
  const ids = [...new Set(op.data.phases.map(p => p.rangeId).filter((x): x is string => x != null))];
  if (ids.length === 0) return '';
  try {
    const ranges = await Promise.all(ids.map(id => getRange(id)));
    const blocks = ranges.map((r, i) => {
      const phaseIdx = op.data.phases.findIndex(p => p.rangeId === ids[i]);
      return `
        <div class="range-block">
          <div class="range-label">E${phaseIdx}</div>
          ${rangeGridHtml(r)}
        </div>
      `;
    }).join('');
    return `
      <div class="detail-section">
        <div class="detail-section-title">Attack Range</div>
        <div class="range-row">${blocks}</div>
      </div>
    `;
  } catch {
    return ''; // range fetch failure is non-fatal
  }
}

function spTypeLabel(spType: string): string {
  switch (spType) {
    case 'INCREASE_WITH_TIME':   return 'Auto';
    case 'INCREASE_WITH_ATTACK': return 'Offensive';
    case 'INCREASE_WHEN_HURT':   return 'Defensive';
    default: return spType.replace(/_/g, ' ').toLowerCase();
  }
}

function skillHtml(skill: OperatorSkillDetail): string {
  const levels = skill.excel.levels;
  if (levels.length === 0) return '';
  const lv   = levels[levels.length - 1];
  const icon = skillIconUrl(skill.excel.skillId);
  const name = escHtml(lv.name);
  const sp   = lv.spData;
  const meta = [
    sp ? `${spTypeLabel(sp.spType)} recovery` : '',
    sp ? `SP ${sp.initSp}/${sp.spCost}` : '',
    lv.duration > 0 ? `${lv.duration}s` : '',
  ].filter(Boolean).join(' · ');
  return `
    <div class="detail-skill">
      <img class="skill-icon" src="${icon}" alt="${name}" loading="lazy"
           onerror="this.outerHTML='<div class=\\'skill-icon skill-icon-placeholder\\'>?</div>'">
      <div class="skill-body">
        <div class="skill-name">${name}</div>
        <div class="skill-meta">${escHtml(meta)}</div>
        <div class="skill-desc">${cleanText(lv.description)}</div>
      </div>
    </div>
  `;
}

function skillsSection(op: Operator): string {
  const skills = (op.skills ?? []).filter(s => !s.excel.hidden);
  if (skills.length === 0) return '';
  return `
    <div class="detail-section">
      <div class="detail-section-title">Skills</div>
      ${skills.map(skillHtml).join('')}
    </div>
  `;
}

function talentHtml(talent: OperatorTalent): string {
  // Some operators carry hidden talent candidates with null name/description
  // (internal mechanics, e.g. SilverAsh the Reignfrost) — nothing to render.
  const cands = (talent.candidates ?? []).filter(c => c.name && c.description);
  if (cands.length === 0) return '';
  const rank = (c: TalentCandidate) =>
    parseInt(c.unlockCondition.phase.replace('PHASE_', ''), 10) * 100 + c.requiredPotentialRank;
  const best = [...cands].sort((a, b) => rank(b) - rank(a))[0];
  return `
    <div class="detail-talent">
      <div class="talent-name">${escHtml(best.name)}</div>
      <div class="talent-unlock">${escHtml(unlockText(best.unlockCondition, best.requiredPotentialRank))}</div>
      <div class="talent-desc">${cleanText(best.description)}</div>
    </div>
  `;
}

function talentsSection(op: Operator): string {
  const talents = (op.data.talents ?? []).filter(t => t.candidates && t.candidates.length > 0);
  if (talents.length === 0) return '';
  return `
    <div class="detail-section">
      <div class="detail-section-title">Talents</div>
      ${talents.map(talentHtml).join('')}
    </div>
  `;
}

function potentialsSection(op: Operator): string {
  const lines = (op.data.potentialRanks ?? []).filter(r => r.description);
  if (lines.length === 0) return '';
  return `
    <div class="detail-section">
      <div class="detail-section-title">Potential</div>
      ${lines.map((r, i) => `
        <div class="detail-pot">
          <span class="pot-rank">P${i + 2}</span>
          <span class="pot-desc">${cleanText(r.description)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function basesSection(op: Operator): string {
  const bases = op.bases ?? [];
  if (bases.length === 0) return '';
  return `
    <div class="detail-section">
      <div class="detail-section-title">Base Skills</div>
      ${bases.map(b => `
        <div class="detail-base">
          <div class="base-name">${escHtml(b.skill.buffName)}</div>
          <div class="base-unlock">${escHtml(unlockText(b.condition.cond))}</div>
          <div class="base-desc">${cleanText(b.skill.description)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

const BACK_LINK = `<a class="btn-back" href="#/">← All operators</a>`;

export async function mountDetail(container: HTMLElement, id: string): Promise<void> {
  const search = document.getElementById('search') as HTMLInputElement;
  const count  = document.getElementById('count')!;
  search.style.display = 'none';
  (document.getElementById('sort') as HTMLSelectElement).style.display = 'none';
  document.getElementById('chips')!.style.display = 'none';
  count.textContent = '';

  container.innerHTML = `<div class="detail">${BACK_LINK}<div class="state-msg"><span class="spinner"></span></div></div>`;

  let op: Operator;
  try {
    op = await getOperator(id);
  } catch (e) {
    const label = e instanceof Error && /404/.test(e.message) ? 'Unknown operator' : 'Failed to load';
    container.innerHTML = `
      <div class="detail">
        ${BACK_LINK}
        <div class="state-msg"><div class="label">${label}</div>No dossier found for <code>${escHtml(id)}</code>.</div>
      </div>
    `;
    return;
  }

  const ranges = await rangesSection(op);
  container.innerHTML = `
    <div class="detail">
      ${BACK_LINK}
      ${headerSection(op)}
      ${loreSection(op)}
      ${statsSection(op)}
      ${ranges}
      ${skillsSection(op)}
      ${talentsSection(op)}
      ${potentialsSection(op)}
      ${basesSection(op)}
    </div>
  `;
}
