// A roster's search, picks and choices are kept while the reader stays in one game (its roster,
// a dossier, back), and dropped when they go to another (17 November 2026; they were kept for
// good until then, and a class picked on FGO was still picked a game later). Each roster
// registers how to put its state back; showShell (shell.ts) calls them on a change of game.
// A module of its own so that a roster need not import the shell.

const resets: (() => void)[] = [];

/** Runs `reset` each time the page goes to another game. */
export function onGameChange(reset: () => void): void {
  resets.push(reset);
}

/** For showShell: the game shown has changed. */
export function gameChanged(): void {
  for (const reset of resets) reset();
}
