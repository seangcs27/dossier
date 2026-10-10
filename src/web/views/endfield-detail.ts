// An Endfield operator's dossier, the page a card on the roster opens. It is the Arknights
// dossier's page (detail.ts has the reasoning behind the layout) cut down to what the
// roster's index says about one operator: the art on the left under the breadcrumb, and on
// the right one panel with no tabs, since there is one panel's worth to show. Nothing is
// fetched but the images.
//
// The panel's body is a function per section, so that another is added by writing it and
// naming it in the page, without reshaping the rest.

import { endfieldIconUrl, endfieldPortraitUrl, endfieldSplashUrl } from '../../shared/api/hella-api';
import { getEndfieldOperators, type EndfieldOperator } from '../endfield-index';
import { crumbsHtml, escHtml } from '../format';

// The Arknights header without its faction badge, which the build bakes none of for this
// game: the rarity strip, the serif name, and class, element and weapon in the row that
// holds class and branch there, each beside its glyph where the build has one. A form's
// name ('Male') stands where an alter's epithet does.
function headerHtml(op: EndfieldOperator): string {
  return `
    <div class="op-rarity-strip r${op.rarity}">
      <span class="visually-hidden">Rarity: ${op.rarity}</span>
      ${'<span class="strip-star">★</span>'.repeat(op.rarity)}
    </div>
    <div class="op-header ef-header">
      <h1 class="op-header-name">${escHtml(op.name)}${op.variant ? `<span class="alter"> ${escHtml(op.variant)}</span>` : ''}</h1>
      <div class="op-header-classes">
        ${(['class', 'element', 'weapon'] as const).map(kind => `
          <span class="hdr-item">
            <img class="hdr-icon" src="${endfieldIconUrl(kind, op[kind])}" alt="" onerror="this.remove()">
            ${escHtml(op[kind])}
          </span>
        `).join('')}
      </div>
    </div>
  `;
}

// The line the operator introduces themself with, in the voice an outfit's tagline has.
function quoteHtml(op: EndfieldOperator): string {
  return op.quote ? `<blockquote class="outfit-quote">${escHtml(op.quote)}</blockquote>` : '';
}

// The profile, as the Misc tab's fact list. A value the wiki's table leaves blank gets no
// row. Nor does one the roster file has no field for at all: a file kept from a build older
// than the profile has none of them, so the two lists are read as though they might be
// missing, whatever the type says.
function factsHtml(op: EndfieldOperator): string {
  const facts: [string, string][] = [
    ['Faction', op.faction],
    ['Gender', op.gender],
    ['Birthday', op.birthday],
    ['Main attribute', op.mainAttr],
    ['Secondary attribute', op.subAttr],
    // The table names the pool in lower case ('chartered').
    ['Headhunting', op.headhunting && op.headhunting[0].toUpperCase() + op.headhunting.slice(1)],
    ['Expertise', op.expertise?.join(', ')],
    ['Hobbies', op.hobbies?.join(', ')],
    ['Gift preference', op.gift],
  ];
  return `
    <dl class="fact-list">
      ${facts.filter(([, value]) => value).map(([label, value]) =>
        `<div><dt>${escHtml(label)}</dt><dd>${escHtml(value)}</dd></div>`).join('')}
    </dl>
  `;
}

function tagsHtml(op: EndfieldOperator): string {
  const tags = op.tags.map(t => `<span class="op-tag">${escHtml(t)}</span>`).join('');
  return tags ? `<div class="detail-tags">${tags}</div>` : '';
}

export function mountEndfieldDetail(container: HTMLElement, id: string): void {
  // The search box, its filters and the count are a roster's: put away here as they are on
  // the Arknights dossier.
  document.querySelector<HTMLElement>('.search-wrap')!.style.display = 'none';
  document.querySelector<HTMLElement>('.topbar-actions')!.style.display = 'none';
  document.getElementById('more-filters')!.hidden = true;
  document.getElementById('count')!.textContent = '';

  const op = getEndfieldOperators().find(o => o.id === id);
  if (!op) {
    container.innerHTML = `
      <div class="detail">
        <div class="detail-body detail-body-error">
          ${crumbsHtml(undefined, '#/endfield')}
          <div class="state-msg"><div class="label">Unknown operator</div>No dossier found for <code>${escHtml(id)}</code>.</div>
        </div>
      </div>
    `;
    return;
  }

  // One file, shown as the art and painted again, faded, behind the whole page, as the
  // Arknights dossier does with its own. Where the build has no illustration for an
  // operator, the card's bust stands in for the art.
  const splash = endfieldSplashUrl(op.id);
  container.innerHTML = `
    <div class="detail">
      <div class="detail-bg" style="background-image:url('${splash}')"></div>
      <div class="detail-body">
        <div class="detail-art-col">
          ${crumbsHtml(op.name, '#/endfield')}
          <div class="splash">
            <img class="splash-img" src="${splash}" data-portrait="${endfieldPortraitUrl(op.id)}" alt="${escHtml(op.name)}"
                 fetchpriority="high" decoding="async"
                 onerror="this.onerror=null;this.src=this.dataset.portrait">
          </div>
        </div>
        <div class="detail-data-col">
          <section class="op-panel">
            ${headerHtml(op)}
            <div class="op-tabpanel">
              ${quoteHtml(op)}
              ${factsHtml(op)}
              ${tagsHtml(op)}
            </div>
          </section>
        </div>
      </div>
    </div>
  `;

  // A card is pressed from anywhere down the roster, and this page is built in one go, with
  // no loading state between the two to shorten the page, so the window would stay as far
  // down as it was.
  window.scrollTo(0, 0);
}
