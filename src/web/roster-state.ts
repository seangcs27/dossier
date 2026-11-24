// A roster's state, apart from card.ts so that a page can hold one without loading the roster
// itself (a Sinner's dossier reads which picture the Path to Nowhere wall was showing).

import type { RosterState } from './card';
import { onGameChange } from './game-change';

export function newRosterState(): RosterState {
  const fresh = (): RosterState => ({ query: '', picks: {}, open: false, unfolded: new Set(), look: '', order: '' });
  const state = fresh();
  onGameChange(() => Object.assign(state, fresh()));
  return state;
}
