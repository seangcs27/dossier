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

// ── The dossier's payload ──
// One file per Sinner, ptn/sinner-details/<id>.json, baked by the same script from the rest
// of the same page (scripts/lib/ptn-page.mjs). Every text in it is in the game markup that
// format.ts's descriptionToHtml renders: a number the wiki colours blue is a raised value,
// what it colours orange a reminder.

/** A skill: what it does at level 1, then what each level after changes. */
export interface PtnSkill {
  kind: 'Basic Attack' | 'Ultimate' | 'Passive';
  name: string;
  levels: string[];     // ten for most; one for a Sinner the wiki has only begun
}

/** The attributes at one level. */
export interface PtnStats {
  level: number;        // 1, 10, 20, … 90; a level the wiki has no numbers for is left out
  hp: number;
  atk: number;
  def: number;
  res: number;
}

/** A named entry with its text: a shackle, a document. */
export interface PtnEntry {
  name: string;
  text: string;
}

export interface PtnSinnerDetail {
  id: string;
  names: { cn: string; jp: string; kr: string };
  gender: string;
  birthday: string;     // 'March 17'
  height: string;       // '162cm'
  ability: string;
  case: string;         // the case the Sinner was taken in for
  voice: string[];      // 'Tang Yajing (CN)', one to a language
  bio: string;
  trait: string;
  // What Mania Intensify does. A few have no name of their own.
  mania: PtnEntry;
  // The exclusive crimebrand, and the skill it grants where the wiki has it written up.
  brand: { name: string; skill: { name: string; levels: string[] } | null };
  stats: PtnStats[];
  block: string;
  attackSpeed: string;
  skills: PtnSkill[];
  shackles: PtnEntry[];
  compliance: string[]; // what each tenth of compliance gives, from 10% to 50%
  sticker: string;      // the sticker full compliance gives
  materials: { phase: string[]; skill: string; disSea: string };
  // The documents, each under the wiki's own heading for it: 'Criminal Record', …
  file: { title: string; text: string }[];
}

// A change of hash reaches the router twice (TODO.md), so the page that asks is mounted
// twice: the second asks for what the first is already fetching.
const asked = new Map<string, Promise<PtnSinnerDetail>>();

export function fetchPtnSinner(id: string): Promise<PtnSinnerDetail> {
  let detail = asked.get(id);
  if (!detail) {
    detail = fetch(`ptn/sinner-details/${encodeURIComponent(id)}.json`).then((res) => {
      if (!res.ok) throw new Error(`no baked payload for ${id}`);
      return res.json() as Promise<PtnSinnerDetail>;
    });
    // A failure is not kept: the next visit asks again.
    detail.catch(() => asked.delete(id));
    asked.set(id, detail);
  }
  return detail;
}
