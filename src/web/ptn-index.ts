import bundled from '../shared/generated/ptn/sinners.json';

/**
 * One Path to Nowhere Sinner, baked by scripts/build-ptn-index.mjs from the head of the
 * Sinner's page on the Path to Nowhere wiki. No required field is ever empty: the build
 * leaves out a page that is short of one.
 */
/** A Sinner whole, as the roster's wall stands them: the baked picture, cut to the figure. */
export interface PtnFigure {
  art: string;          // beside the page: 'ptn/figures/mugshot/hecate.webp'
  ratio: number;        // its width over its height, to hold its place before it has loaded
}

export interface PtnSinner {
  id: string;           // the wiki page's title as a slug: 'hecate', 'mr-fox', 'necresta-hella'
  name: string;         // the page's title: 'Hecate', 'Mr. Fox', '000'
  // From the game's Chinese wiki (scripts/lib/ptn-bili.mjs), all absent when the build
  // could not reach it: the Sinner's Chinese name and that wiki's tags for them; whether
  // they are limited or a collab's (neither is a field: they are an ordinary Sinner);
  // whether they deal core damage.
  nameCn?: string;
  tagsCn?: string[];
  limited?: 'limited' | 'collab';
  core?: boolean;
  // On the CN server alone: still to come to Global, or a collab's that will not. Their
  // file is the Chinese wiki's head of it, and `releasedCn` the day they came there.
  cnOnly?: boolean;
  releasedCn?: string;
  // A collab's own code for its Sinner ('FE40536'), where they have no MBCC number.
  code?: string;
  // What the Sinner's file prints after 'MBCC-S-': '019'. It does not tell two Sinners
  // apart: Hella and Necresta·Hella are both 098, and the three Cat's Eye sisters 'Unknown'.
  number: string;
  rank: 'S' | 'A' | 'B';
  tendency: string;     // the job: 'Endura', 'Fury', 'Umbra', 'Reticle', 'Arcane', 'Catalyst'
  libram: string;       // the sin the game files the Sinner under, in its capitals: 'LIMBO', 'LOVE', …
  birthplace: string;   // as the file has it, redactions and all: 'Eastside', 'Syndicate', '■■', 'Unknown'
  tags: string[];       // the game's own: 'Core DMG', 'Skill DMG', 'Magic DMG'; [] where the wiki lists none
  // In centimetres, which is what the wall scales a figure to. Every Sinner's file has one;
  // optional because nothing but the wiki's typing makes it so.
  height?: number;
  // The mugshot whole and the original illustration whole, the two pictures of a Sinner
  // that the roster's wall and their own page stand. Absent where the wiki has no such
  // file (Pine has neither, Kisugi Ai no original) or the build could not fetch it.
  figure?: PtnFigure;
  figureOriginal?: PtnFigure;
  // The day the Sinner was released on the Global server, '2026-10-08'; the day it opened,
  // '2022-10-27', for the 45 who were there. From a record kept by hand, since nothing the
  // build reads dates one (scripts/lib/ptn-record.mjs). Absent for a Sinner released since
  // the record was last added to, which makes them newer than everyone with a day.
  released?: string;
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

/**
 * One piece of a Sinner's art, as the game's own gallery has them: the original, the
 * phase-up art, the mugshot, a picture from the interrogation, or an attire.
 */
export interface PtnArt {
  kind: 'original' | 'phase' | 'mugshot' | 'interrogation' | 'attire';
  label: string;        // 'Original', 'Phase-up', 'Mugshot', or the picture's or attire's own name
  url: string;          // the file's address on the wiki: 1 to 9 MB, so shown through artUrl
  collection?: string;  // an attire's: 'Airy Fantasia'
  rarity?: number;      // an attire's stars
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
  // Only from the Chinese wiki's page for the Sinner: their title ('西区教母'), the other
  // effects that wiki gives them beside the trait, and their birthplace as it has it.
  title?: string;
  extras?: PtnEntry[];
  birthplace?: string;
  // That page's own text laid beside the English wiki's, for the Chinese side to read, on
  // every Sinner it has a page for but the CN-only ones (whose text it is already). Only the
  // fields it has text for: what it lacks is the English wiki's in either language.
  zh?: Partial<Omit<PtnSinnerDetail, 'id' | 'arts' | 'zh'>>;
  // The exclusive crimebrand, and the skill it grants where the wiki has it written up. The
  // Chinese wiki's names that skill, and what it makes, as terms explained apart (`terms`).
  brand: { name: string; skill: { name: string; levels: string[] } | null; terms?: PtnEntry[] };
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
  // In the order the gallery turns to them; only what the wiki really has a file for.
  arts: PtnArt[];
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
