import bundled from '../shared/generated/ptn/sinners.json';

/**
 * One Path to Nowhere Sinner, baked by scripts/build-ptn-index.mjs from the head of the
 * Sinner's page on the Path to Nowhere wiki. No field is ever empty: the build leaves out a
 * page that is short of one.
 */
export interface PtnSinner {
  id: string;           // the wiki page's title as a slug: 'hecate', 'mr-fox', 'necresta-hella'
  name: string;         // the page's title: 'Hecate', 'Mr. Fox', '000'
  // What the Sinner's file prints after 'MBCC-S-': '019'. It does not tell two Sinners
  // apart: Hella and Necresta·Hella are both 098, and the three Cat's Eye sisters 'Unknown'.
  number: string;
  rank: 'S' | 'A' | 'B';
  tendency: string;     // the job: 'Endura', 'Fury', 'Umbra', 'Reticle', 'Arcane', 'Catalyst'
  libram: string;       // the sin the game files the Sinner under, in its capitals: 'LIMBO', 'LOVE', …
  birthplace: string;   // as the file has it, redactions and all: 'Eastside', 'Syndicate', '■■', 'Unknown'
  tags: string[];       // the game's own: 'Core DMG', 'Skill DMG', 'Magic DMG'; [] where the wiki lists none
  // The mugshot, a standing figure on transparency: the baked file beside the page
  // ('ptn/mugshots/hecate.webp', 360 wide and cut at two widths), or its original's address
  // on the wiki where the build could not fetch it. Absent where the wiki has no such file.
  art?: string;
}

// Baked in at build time, highest rank first and then by name: no runtime fetch. Empty when
// the build could not reach the wiki and had no earlier file to keep.
const sinners = bundled as unknown as PtnSinner[];

export function getPtnSinners(): PtnSinner[] {
  return sinners;
}
