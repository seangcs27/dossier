import type { Operator, OperatorIndexEntry, Rarity, Profession } from '../../shared/types';
import { operatorAvatarUrl } from '../../shared/api/hella-api';
import { escHtml } from '../utils/html';

const PROFESSION_LABEL: Record<Profession, string> = {
  CASTER:   'Caster',
  MEDIC:    'Medic',
  PIONEER:  'Vanguard',
  SNIPER:   'Sniper',
  SPECIAL:  'Specialist',
  SUPPORT:  'Supporter',
  TANK:     'Defender',
  WARRIOR:  'Guard',
};

const PROFESSION_CSS: Record<Profession, string> = {
  CASTER:   'caster',
  MEDIC:    'medic',
  PIONEER:  'vanguard',
  SNIPER:   'sniper',
  SPECIAL:  'specialist',
  SUPPORT:  'supporter',
  TANK:     'defender',
  WARRIOR:  'guard',
};

function rarityNum(r: Rarity): number {
  return parseInt(r.replace('TIER_', ''), 10);
}

export function renderLoading(container: HTMLElement): void {
  container.innerHTML = `<div class="state-msg"><span class="spinner"></span></div>`;
}

export function renderError(container: HTMLElement, message: string): void {
  container.innerHTML = `
    <div class="state-msg">
      <div class="label">Failed to load</div>
      ${escHtml(message)}
    </div>
  `;
}

export function renderGrid(container: HTMLElement, ops: OperatorIndexEntry[]): void {
  if (ops.length === 0) {
    container.innerHTML = `<div class="state-msg"><div class="label">No results</div>Try a different name.</div>`;
    return;
  }
  container.innerHTML = `<div id="grid">${ops.map(buildCard).join('')}</div>`;
  bindAvatarFallbacks(container);
}

export function bindAvatarFallbacks(container: HTMLElement): void {
  container.querySelectorAll<HTMLImageElement>('.op-avatar, .detail-avatar').forEach(img => {
    img.addEventListener('error', () => {
      const placeholder = document.createElement('div');
      placeholder.className = 'op-avatar-placeholder';
      placeholder.textContent = '?';
      img.replaceWith(placeholder);
    });
  });
}

function buildCard(op: OperatorIndexEntry): string {
  const n      = rarityNum(op.rarity);
  const stars  = '★'.repeat(n);
  const cls    = PROFESSION_CSS[op.profession] ?? op.profession.toLowerCase();
  const label  = PROFESSION_LABEL[op.profession] ?? op.profession;
  const avatar = operatorAvatarUrl(op.id);
  const name   = escHtml(op.name);

  return `
    <div class="op-card" data-id="${op.id}">
      <img class="op-avatar" src="${avatar}" alt="${name}" loading="lazy">
      <div class="op-info">
        <div class="op-name" title="${name}">${name}</div>
        <div class="op-meta">
          <span class="op-class ${cls}">${label}</span>
          <span class="op-rarity r${n}">${stars}</span>
        </div>
      </div>
    </div>
  `;
}

export function renderDetail(container: HTMLElement, op: Operator): void {
  const d      = op.data;
  const n      = rarityNum(d.rarity);
  const stars  = '★'.repeat(n);
  const cls    = PROFESSION_CSS[d.profession] ?? d.profession.toLowerCase();
  const label  = PROFESSION_LABEL[d.profession] ?? d.profession;
  const avatar = operatorAvatarUrl(op.id);
  const name   = escHtml(d.name);
  const maxLevels = d.phases.map((p, i) => `E${i} · Lv${p.maxLevel}`).join('  ·  ');
  const tags   = (d.tagList ?? []).map(t => `<span class="op-tag">${escHtml(t)}</span>`).join('');

  container.innerHTML = `
    <div class="detail">
      <button class="btn-back" id="btnBack">&larr; Back</button>
      <div class="detail-header">
        <img class="detail-avatar" src="${avatar}" alt="${name}">
        <div class="detail-info">
          <div class="detail-name">${name}</div>
          <div class="detail-meta">
            <span class="op-class ${cls}">${label}</span>
            <span class="op-rarity r${n}">${stars}</span>
          </div>
          <div class="detail-sub">${escHtml(d.subProfessionId)} &middot; ${escHtml(d.position)}</div>
        </div>
      </div>
      ${tags ? `<div class="detail-tags">${tags}</div>` : ''}
      ${d.description ? `<div class="detail-desc">${escHtml(d.description)}</div>` : ''}
      <div class="detail-levels">${escHtml(maxLevels)}</div>
      ${d.skills.length > 0 ? `
        <div class="detail-section-title">Skills</div>
        <div class="detail-skills">${d.skills.map(s => `<div class="detail-skill">${escHtml(s.skillId)}</div>`).join('')}</div>
      ` : ''}
    </div>
  `;
  bindAvatarFallbacks(container);
}
