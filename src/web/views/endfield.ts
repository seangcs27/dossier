import { endfieldPortraitUrl } from '../../shared/api/hella-api';
import { getEndfieldOperators, type EndfieldOperator } from '../endfield-index';
import { escHtml } from '../format';
import { mountCardSpin } from '../card-spin';

// The plate the Arknights grid deals (grid.ts has the reasoning behind each layer), with an
// Endfield operator's own lines on it: class where the class sits, element and weapon where
// the branch does, faction up the edge, tags on the back. It is not a link yet, since this
// game has no dossier page to open, and it has no glyphs, since the build bakes none for it.
function buildCard(op: EndfieldOperator): string {
  const portrait = endfieldPortraitUrl(op.id);
  // As many repeats as fill the strip, the same sum as the Arknights card's.
  const edgeText = Array(Math.max(2, Math.round(55 / (op.faction.length + 3))))
    .fill(op.faction).join(' · ');
  return `
    <div class="op-card r${op.rarity}">
      <div class="op-plate">
      <div class="op-card-body">
        <img class="op-avatar" src="${portrait}" alt="${escHtml(op.name)}" loading="lazy"
             onerror="this.outerHTML='<div class=\\'op-avatar-placeholder\\'>?</div>'">
        <div class="op-shade" aria-hidden="true"></div>
        <div class="op-overlay">
          <span class="visually-hidden">Rarity: ${op.rarity}</span>
          <div class="op-info">
            <div class="op-name">${escHtml(op.name)}</div>
            <div class="op-epithet">${op.variant ? escHtml(op.variant) : '&nbsp;'}</div>
            <div class="op-meta-row">
              <span class="op-class-label">${escHtml(op.class)}</span>
            </div>
            <div class="op-serial" data-tip="${escHtml(op.id)}">
              <span class="op-serial-text">${escHtml(op.element)} · ${escHtml(op.weapon)}</span>
            </div>
          </div>
        </div>
        <div class="op-edge" aria-hidden="true">${escHtml(edgeText)}</div>
        <div class="op-light" aria-hidden="true"></div>
      </div>
      <div class="op-card-back" aria-hidden="true">
        <img class="op-avatar op-avatar-ghost" data-src="${portrait}" alt="" onerror="this.remove()">
        <div class="op-shade"></div>
        <div class="op-back-frost"></div>
        <div class="op-back-print">
          <div class="bk-head"><span class="bk-serial">${escHtml(op.id)}</span></div>
          <div class="bk-mid"></div>
          <div class="bk-foot">
            <div class="bk-tags">${op.tags.map(t => `<span class="bk-tag">${escHtml(t)}</span>`).join('')}</div>
          </div>
        </div>
        <div class="op-edge op-edge-back">${escHtml(edgeText)}</div>
        <div class="op-light"></div>
      </div>
      <div class="op-side op-side-l" aria-hidden="true"></div>
      <div class="op-side op-side-r" aria-hidden="true"></div>
      <div class="op-stars r${op.rarity}" aria-hidden="true">
        <div class="op-tab-slice op-tab-front"></div>
        <div class="op-tab-slice op-tab-back"></div>
        <div class="op-tab-edge op-tab-edge-top"></div>
        <div class="op-tab-edge op-tab-edge-right"></div>
        <div class="op-tab-edge op-tab-edge-taper"></div>
        <div class="op-tab-edge op-tab-edge-bottom"></div>
        ${'<span>★</span>'.repeat(op.rarity)}
      </div>
      </div>
    </div>
  `;
}

export function mountEndfield(container: HTMLElement): void {
  // The search box and its filters are the Arknights grid's, the same as on a detail page.
  document.querySelector<HTMLElement>('.search-wrap')!.style.display = 'none';
  document.querySelector<HTMLElement>('.topbar-actions')!.style.display = 'none';
  document.getElementById('more-filters')!.hidden = true;

  const ops = getEndfieldOperators();
  document.getElementById('count')!.textContent = `${ops.length} operators`;
  if (ops.length === 0) {
    container.innerHTML = `<div class="state-msg"><div class="label">No operators</div>The last build could not reach the Endfield wiki.</div>`;
    return;
  }
  container.innerHTML = `<div id="grid">${ops.map(buildCard).join('')}</div>`;
  mountCardSpin(container);
}
