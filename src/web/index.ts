import { getAllOperators } from '../shared/cache/operator-cache';
import { operatorAvatarUrl } from '../shared/api/hella-api';
import type { Operator, Rarity, Profession } from '../shared/types';

const grid    = document.getElementById('grid')!;
const search  = document.getElementById('search') as HTMLInputElement;
const countEl = document.getElementById('count')!;

let allOps: Operator[] = [];

const PROFESSION_LABEL: Record<Profession, string> = {
  CASTER:   'Caster',
  DEFENDER: 'Defender',
  GUARD:    'Guard',
  MEDIC:    'Medic',
  PIONEER:  'Vanguard',
  SNIPER:   'Sniper',
  SPECIAL:  'Specialist',
  SUPPORT:  'Supporter',
};

const PROFESSION_CSS: Record<Profession, string> = {
  CASTER:   'caster',
  DEFENDER: 'defender',
  GUARD:    'guard',
  MEDIC:    'medic',
  PIONEER:  'vanguard',
  SNIPER:   'sniper',
  SPECIAL:  'specialist',
  SUPPORT:  'supporter',
};

function rarityNum(r: Rarity): number {
  return parseInt(r.replace('TIER_', ''), 10);
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildCard(op: Operator): string {
  const n       = rarityNum(op.data.rarity);
  const stars   = '★'.repeat(n);
  const cls     = PROFESSION_CSS[op.data.profession] ?? op.data.profession.toLowerCase();
  const label   = PROFESSION_LABEL[op.data.profession] ?? op.data.profession;
  const avatar  = operatorAvatarUrl(op.id);
  const name    = escHtml(op.data.name);

  return `
    <div class="op-card" data-id="${op.id}">
      <img class="op-avatar" src="${avatar}" alt="${name}" loading="lazy"
           onerror="this.outerHTML='<div class=\\'op-avatar-placeholder\\'>?</div>'">
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

function render(ops: Operator[]): void {
  countEl.textContent = `${ops.length} operators`;
  if (ops.length === 0) {
    grid.innerHTML = `<div class="state-msg"><div class="label">No results</div>Try a different name.</div>`;
    return;
  }
  grid.innerHTML = ops.map(buildCard).join('');
}

async function init(): Promise<void> {
  grid.innerHTML = `<div class="state-msg"><span class="spinner"></span></div>`;
  try {
    allOps = await getAllOperators();
    // Sort: rarity desc, then name asc
    allOps.sort((a, b) => {
      const rd = rarityNum(b.data.rarity) - rarityNum(a.data.rarity);
      return rd !== 0 ? rd : a.data.name.localeCompare(b.data.name);
    });
    render(allOps);
  } catch {
    grid.innerHTML = `<div class="state-msg"><div class="label">Failed to load</div>Check your connection and reload.</div>`;
  }
}

search.addEventListener('input', () => {
  const q = search.value.toLowerCase().trim();
  if (!q) { render(allOps); return; }
  render(allOps.filter(op =>
    op.data.name.toLowerCase().includes(q) ||
    op.data.appellation.toLowerCase().includes(q),
  ));
});

init();
