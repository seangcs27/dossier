// The Path to Nowhere roster's search and picks, kept across visits, and which of the two
// pictures its wall is showing. A Sinner's dossier reads the last, to open on the same
// picture; it is a module of its own so that the dossier does not load the roster page.

import { newRosterState } from './roster-state';

export const ptnRoster = newRosterState();
