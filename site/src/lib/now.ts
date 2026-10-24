/**
 * The clock a page is drawn at: the build's, unless DOSSIER_NOW (an ISO time) pins it, which
 * is how a page is compared with the SPA's screenshots, taken at a fixed time. What the
 * reader's clock decides is set again in their browser (src/web/fresh.ts).
 */
export const buildNow = (): number => (process.env.DOSSIER_NOW ? Date.parse(process.env.DOSSIER_NOW) : Date.now());
