export function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Game descriptions embed markup like <@ba.kw>keyword</> — strip the tags, keep the
// text, then escape. Mirrors cleanText() in src/web/format.ts (duplicated the same way
// escHtml already is, rather than shared, since the popup keeps its own tiny util set).
// Without this the popup renders the raw "<@ba.kw>" wrappers as visible text.
export function cleanText(str: string): string {
  return escHtml(str.replace(/<[^>]*>/g, ''));
}
