import type { PopupOperator, OperatorIndexEntry, Rarity, Profession } from '../../shared/types';
import {
  operatorAvatarUrl, operatorPortraitUrl, classIconUrl, archetypeIconUrl,
} from '../../shared/api/hella-api';
import { escHtml, cleanText } from '../utils/html';

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

// The web grid does this with an inline `onerror` attribute; the popup can't, because
// MV3's content security policy forbids inline handlers. Same chain, bound properly:
// each failure shifts the next candidate off `data-fallback` and retries, and only an
// exhausted list becomes the `?` placeholder.
export function bindAvatarFallbacks(container: HTMLElement): void {
  container.querySelectorAll<HTMLImageElement>('.op-avatar, .detail-avatar').forEach(img => {
    img.addEventListener('error', () => {
      const rest = (img.dataset.fallback ?? '').split('|').filter(Boolean);
      const next = rest.shift();
      if (next) {
        img.dataset.fallback = rest.join('|');
        img.src = next;
        return;
      }
      const placeholder = document.createElement('div');
      placeholder.className = 'op-avatar-placeholder';
      placeholder.textContent = '?';
      img.replaceWith(placeholder);
    });
  });

  // Branch glyph coverage is 71 of 72 — "Supportive Ranger" is newer than the wiki's icon
  // set — so the one that has no icon removes itself rather than showing a broken image.
  container.querySelectorAll<HTMLImageElement>('.op-meta-icon-sub').forEach(img => {
    img.addEventListener('error', () => img.remove());
  });
}

function buildCard(op: OperatorIndexEntry): string {
  const n     = rarityNum(op.rarity);
  const cls   = PROFESSION_CSS[op.profession] ?? op.profession.toLowerCase();
  const label = PROFESSION_LABEL[op.profession] ?? op.profession;
  const name  = escHtml(op.name);

  // The web card, at popup scale. Same structure and the same parts — portrait art under
  // a gradient, an acrylic rim, the nation up the left edge, the rarity as a bevelled tab
  // hanging off the right — because the extension is meant to be the same product in a
  // smaller window, not a stripped version of it.
  //
  // Two parts don't survive the trip. The alter epithet and the branch line both want
  // horizontal room a ~100px column doesn't have; the branch stays as the glyph's tooltip
  // and the epithet is already in the name's. And the hover CTA doesn't grow — a 32px bar
  // is a sixth of this card's height, where on the web it's a fifteenth.
  const portrait  = operatorPortraitUrl(op.id, '1');
  const fallbacks = [operatorPortraitUrl(op.id, '2'), operatorAvatarUrl(op.id)].join('|');
  const edgeWord  = op.nation || 'Dossier';
  const edgeText  = Array(Math.max(2, Math.round(32 / (edgeWord.length + 3))))
    .fill(edgeWord).join(' · ');

  return `
    <div class="op-card r${n}" data-id="${op.id}">
      <div class="op-card-body">
        <img class="op-avatar" src="${portrait}" data-fallback="${fallbacks}"
             alt="${name}" loading="lazy">
        <div class="op-overlay">
          <div class="op-info">
            <div class="op-name" title="${name}">${name}</div>
            <div class="op-meta-row">
              <img class="op-meta-icon" src="${classIconUrl(cls)}" alt="" title="${label}" loading="lazy">
              <img class="op-meta-icon op-meta-icon-sub" src="${archetypeIconUrl(op.subProfessionId)}"
                   alt="" title="${escHtml(op.archetype)}" loading="lazy">
              <span class="op-class-label" title="${label} · ${escHtml(op.archetype)}">${label}</span>
            </div>
          </div>
          <span class="op-cta"></span>
        </div>
        <div class="op-edge" aria-hidden="true">${escHtml(edgeText)}</div>
      </div>
      <div class="op-stars r${n}" aria-hidden="true">${'<span>★</span>'.repeat(n)}</div>
    </div>
  `;
}

export function renderDetail(container: HTMLElement, op: PopupOperator): void {
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
            <span class="op-class ${cls}">
              <img class="op-class-icon" src="${classIconUrl(cls)}" alt="">
              ${label}
            </span>
            <span class="op-rarity r${n}">${stars}</span>
          </div>
          <div class="detail-sub">${escHtml(d.subProfessionId)} &middot; ${escHtml(d.position)}</div>
        </div>
      </div>
      ${tags ? `<div class="detail-tags">${tags}</div>` : ''}
      ${d.description ? `<div class="detail-desc">${cleanText(d.description)}</div>` : ''}
      <div class="detail-levels">${escHtml(maxLevels)}</div>
      ${d.skills.length > 0 ? `
        <div class="detail-section-title">Skills</div>
        <div class="detail-skills">${d.skills.map(s => `<div class="detail-skill">${escHtml(s.skillId)}</div>`).join('')}</div>
      ` : ''}
    </div>
  `;
  bindAvatarFallbacks(container);
}
