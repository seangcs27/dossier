import { getAllOperators } from '../../shared/cache/operator-cache';
import { operatorAvatarUrl } from '../../shared/api/hella-api';
import type { Operator } from '../../shared/types';
import { PROFESSION_LABEL, PROFESSION_CSS, rarityNum, escHtml } from '../format';

let allOps: Operator[] = [];
let loadPromise: Promise<void> | null = null;

function buildCard(op: Operator): string {
  const n      = rarityNum(op.data.rarity);
  const stars  = '★'.repeat(n);
  const cls    = PROFESSION_CSS[op.data.profession] ?? op.data.profession.toLowerCase();
  const label  = PROFESSION_LABEL[op.data.profession] ?? op.data.profession;
  const avatar = operatorAvatarUrl(op.id);
  const name   = escHtml(op.data.name);

  return `
    <a class="op-card" href="#/op/${encodeURIComponent(op.id)}">
      <img class="op-avatar" src="${avatar}" alt="${name}" loading="lazy"
           onerror="this.outerHTML='<div class=\\'op-avatar-placeholder\\'>?</div>'">
      <div class="op-info">
        <div class="op-name" title="${name}">${name}</div>
        <div class="op-meta">
          <span class="op-class ${cls}">${label}</span>
          <span class="op-rarity r${n}">${stars}</span>
        </div>
      </div>
    </a>
  `;
}

function filtered(query: string): Operator[] {
  const q = query.toLowerCase().trim();
  if (!q) return allOps;
  return allOps.filter(op =>
    op.data.name.toLowerCase().includes(q) ||
    op.data.appellation.toLowerCase().includes(q),
  );
}

function render(container: HTMLElement, ops: Operator[]): void {
  const countEl = document.getElementById('count')!;
  countEl.textContent = `${ops.length} operators`;
  if (ops.length === 0) {
    container.innerHTML = `<div class="state-msg"><div class="label">No results</div>Try a different name.</div>`;
    return;
  }
  container.innerHTML = `<div id="grid">${ops.map(buildCard).join('')}</div>`;
}

async function ensureLoaded(container: HTMLElement): Promise<boolean> {
  if (allOps.length > 0) return true;
  if (!loadPromise) {
    loadPromise = getAllOperators().then(ops => {
      ops.sort((a, b) => {
        const rd = rarityNum(b.data.rarity) - rarityNum(a.data.rarity);
        return rd !== 0 ? rd : a.data.name.localeCompare(b.data.name);
      });
      allOps = ops;
    });
  }
  container.innerHTML = `<div class="state-msg"><span class="spinner"></span></div>`;
  try {
    await loadPromise;
    return true;
  } catch {
    container.innerHTML = `<div class="state-msg"><div class="label">Failed to load</div>Check your connection and reload.</div>`;
    return false;
  }
}

export async function mountGrid(container: HTMLElement): Promise<void> {
  const search = document.getElementById('search') as HTMLInputElement;
  search.style.display = '';
  if (!(await ensureLoaded(container))) return;
  render(container, filtered(search.value));
  search.oninput = () => render(container, filtered(search.value));
}
