import bundled from '../shared/generated/endfield/operators.json';

/**
 * One Arknights: Endfield operator, baked by scripts/build-endfield-index.mjs from the
 * Endfield wiki's Operators table.
 */
export interface EndfieldOperator {
  id: string;         // the game's own id, 'chr_0025_ardelia'; it names the portrait file
  name: string;
  // Set where two operators share a name: the Endministrator's 'Male' and 'Female' forms.
  variant?: string;
  rarity: number;     // 4 to 6
  class: string;      // 'Guard', 'Caster', 'Striker', …
  element: string;    // 'Physical', 'Heat', 'Cryo', 'Electric', 'Nature'
  weapon: string;     // 'Sword', 'Great Sword', 'Polearm', 'Handcannon', 'Arts Unit'
  faction: string;
  tags: string[];
  // The operator's profile, for the dossier page. '' or [] where the wiki's table has none.
  gender: string;       // 'Male', 'Female'
  birthday: string;     // as the wiki writes it, 'October 18'; '■■' for the Endministrator
  quote: string;        // the line the operator introduces themself with
  expertise: string[];  // up to two
  hobbies: string[];    // up to two
  gift: string;         // the kind of gift they prefer
  mainAttr: string;     // 'Strength', 'Agility', 'Intellect', 'Will'
  subAttr: string;
  headhunting: string;  // 'standard', 'chartered', 'welfare', or '' (the Endministrator)
}

// Baked in at build time, highest rarity first — no runtime fetch. Empty when the build
// could not reach the wiki and had no earlier file to keep.
const operators = bundled as unknown as EndfieldOperator[];

export function getEndfieldOperators(): EndfieldOperator[] {
  return operators;
}

/** An expertise or a hobby as the operator's file writes it up. */
export interface EndfieldInterest {
  title: string;  // 'Natural Lore: Geological Surveyor'; it opens with the name the index has
  text: string;   // the line under it
}

/** The file's Integrated Physical Exam. '' where the file has no rating. */
export interface EndfieldExam {
  strength: string;     // Physiological Strength: 'Normal', 'Standard', 'Excellent', 'Outstanding'
  combatSkill: string;  // Combat Skill
  tactical: string;     // Tactical Acumen
  originium: string;    // Originium Arts Assimilation; '■■' for Last Rite
}

/** An operator's attributes at one level. */
export interface EndfieldAttributes {
  level: number;      // 1, 20, 40, 60, 80, 90: the first, the four promotions', and the cap
  hp: number;
  atk: number;
  // These four with their decimals (9.793), which the game keeps and does not show; the
  // wiki's own table cuts them off.
  strength: number;
  agility: number;
  intellect: number;
  will: number;
}

export interface EndfieldPotential {
  rank: number;         // 1 to 5
  name: string;
  description: string;
}

/** One row of a skill's table: what it measures, and the value at each rank. */
export interface EndfieldSkillStat {
  label: string;      // 'DMG Multiplier', 'SP Cost', 'Cooldown'
  values: string[];   // twelve, ranks 1 to 9 and then the three masteries: '142%', '100', '4.5'
}

export interface EndfieldSkill {
  type: string;         // 'Basic Attack', 'Battle Skill', 'Combo Skill', 'Ultimate'
  name: string;
  // Set where an operator has two sets of skills, on every skill of both: Arcane's
  // 'Array Arcana: INT' and 'Array Arcana: WILL'.
  form?: string;
  description: string;
  stats: EndfieldSkillStat[];
}

/** One stage of a talent or a base skill: the promotion it opens at, and its text there. */
export interface EndfieldStage {
  elite: number;        // 0 to 4
  description: string;
}

export interface EndfieldTalent {
  // 'attribute' raises the main attribute, 'combat' is one of the operator's own two, and
  // 'outfitting' unlocks a quality of gear and reads the same for every operator.
  kind: string;
  name: string;
  stages: EndfieldStage[];
}

export interface EndfieldBaseSkillStage extends EndfieldStage {
  tier: string;         // 'α', 'β' or 'γ', the letter written after the skill's name
}

export interface EndfieldBaseSkill {
  name: string;
  facility: string;     // 'Control Nexus', 'Manufacturing Cabin', 'Growth Chamber', 'Reception Room'
  stages: EndfieldBaseSkillStage[];
}

/**
 * What the dossier page has of one operator beyond its index entry, baked by
 * scripts/build-endfield-index.mjs from the operator's own page on the Endfield wiki. Every
 * text is plain: no markup, '\n' between lines, the numbers already in it.
 */
export interface EndfieldOperatorDetail {
  id: string;
  // The operator's file. '' or [] where it has none; the Endministrator's is mostly blank.
  fullName: string;         // 'Ruy van Catcher'; '' for most
  race: string;             // 'Caprinae'; '■■' for the Endministrator
  authentication: string;   // the file's Authentication line: 'Rhodes Island', 'The Pack'
  infection: string;        // its Oripathy line: 'Oripathy negative, based on medical examination reports.'
  exam: EndfieldExam;
  expertiseDetails: EndfieldInterest[];   // one for each of the index entry's `expertise`
  hobbyDetails: EndfieldInterest[];       // and of its `hobbies`
  profile: string;          // a few paragraphs, most opening and closing on a line of the operator's
  attributes: EndfieldAttributes[];   // six, lowest level first
  critRate: number;         // 0.05
  attackSpeed: number;      // 1
  attackRange: string;      // '10 Meters'
  potentials: EndfieldPotential[];    // five; three for the Endministrator, the rest not yet known
  skills: EndfieldSkill[];            // four, in the order of `type`; Arcane's eight, a set at a time
  talents: EndfieldTalent[];          // four: attribute, combat, combat, outfitting
  baseSkills: EndfieldBaseSkill[];    // two; none for the Endministrator
}

// One static file per operator beside the page, as the Arknights payloads are. Nothing sits
// behind it, so an operator the last build baked no payload for throws.
export async function fetchEndfieldOperator(id: string): Promise<EndfieldOperatorDetail> {
  const res = await fetch(`endfield/operator-details/${encodeURIComponent(id)}.json`);
  if (!res.ok) throw new Error(`no baked payload for ${id}`);
  return res.json() as Promise<EndfieldOperatorDetail>;
}
