export type OperatorId = string; // "char_002_amiya"

export type Rarity = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4' | 'TIER_5' | 'TIER_6';

// HellaAPI returns the game's internal enums: TANK = Defender, WARRIOR = Guard.
export type Profession =
  | 'CASTER' | 'MEDIC' | 'PIONEER' | 'SNIPER'
  | 'SPECIAL' | 'SUPPORT' | 'TANK' | 'WARRIOR';

export type Position = 'MELEE' | 'RANGED';

// Interpolation values carried alongside a description string. See descriptionToHtml.
export interface Blackboard {
  key: string;
  value: number;
}

export interface OperatorAttributes {
  maxHp: number;
  atk: number;
  def: number;
  magicResistance: number;
  cost: number;
  blockCnt: number;
  attackSpeed: number;
  baseAttackTime: number;
  respawnTime: number;
}

export interface AttributeKeyFrame {
  level: number;
  data: OperatorAttributes;
}

export interface ItemCost {
  id: string;
  count: number;
  type: string;
}

export interface OperatorPhase {
  characterPrefabKey: string;
  rangeId: string | null;
  maxLevel: number;
  attributesKeyFrames: AttributeKeyFrame[];
  evolveCost?: ItemCost[] | null;
}

export interface OperatorSkillRef {
  skillId: string;
  overridePrefabKey: string | null;
  overrideTokenKey: string | null;
}

export interface UnlockCondition {
  phase: string; // "PHASE_0" | "PHASE_1" | "PHASE_2"
  level: number;
}

export interface TalentCandidate {
  unlockCondition: UnlockCondition;
  requiredPotentialRank: number;
  name: string;
  description: string;
  isHideTalent: boolean;
  // Values the description's {placeholders} interpolate from. See descriptionToHtml.
  blackboard?: Blackboard[] | null;
}

export interface OperatorTalent {
  candidates: TalentCandidate[];
}

// Potentials mostly just describe themselves, but some carry a real stat change.
export interface AttributeModifier {
  attributeType: string; // "ATK" | "MAX_HP" | "COST" | "RESPAWN_TIME" | ...
  formulaItem: string;   // "ADDITION" for everything we render
  value: number;
}

export interface PotentialRank {
  type: string;
  description: string;
  buff?: {
    attributes: { attributeModifiers: AttributeModifier[] | null };
  } | null;
}

export interface SkillSpData {
  spType: string; // "INCREASE_WITH_TIME" | "INCREASE_WITH_ATTACK" | ...
  spCost: number;
  initSp: number;
  maxChargeTime: number;
  increment: number;
}

export interface SkillLevel {
  name: string;
  rangeId: string | null;
  description: string;
  blackboard?: Blackboard[] | null;
  skillType: string; // "MANUAL" | "AUTO" | ...
  durationType: string;
  duration: number;
  spData: SkillSpData;
}

export interface OperatorSkillDetail {
  deploy: {
    skillId: string;
    unlockCond: UnlockCondition;
  };
  excel: {
    skillId: string;
    iconId: string | null;
    hidden: boolean;
    levels: SkillLevel[];
  };
}

export interface AttackRange {
  id: string;
  direction: number;
  grids: { row: number; col: number }[];
}

export interface BaseSkill {
  condition: { cond: UnlockCondition };
  skill: {
    buffName: string;
    skillIcon: string;
    roomType: string;
    description: string;
  };
}

export interface FactionPower {
  powerName: string;
}

export interface Faction {
  nationPower: FactionPower | null;
  groupPower: FactionPower | null;
  teamPower: FactionPower | null;
}

export interface ModuleBlackboard {
  key: string; // "max_hp" | "atk" | "def" | "attack_speed" | ...
  value: number;
}

export interface ModuleTraitCandidate {
  additionalDescription: string | null;
  overrideDescripton: string | null; // [sic] — the game data misspells it
  unlockCondition: UnlockCondition;
  blackboard?: Blackboard[] | null;
}

export interface ModulePhase {
  equipLevel: number;
  attributeBlackboard: ModuleBlackboard[];
  parts: {
    target: string;
    overrideTraitDataBundle?: { candidates: ModuleTraitCandidate[] | null } | null;
  }[];
}

export interface OperatorModule {
  info: {
    uniEquipId: string;
    uniEquipName: string;
    uniEquipDesc: string | null;
    typeName1: string | null; // "GUA"
    typeName2: string | null; // "Y"  -> displayed as GUA-Y
    unlockLevel: number;
    showEvolvePhase: string;
  };
  data: { phases: ModulePhase[] } | null;
}

export interface OperatorData {
  name: string;
  description: string | null;
  displayNumber: string | null;
  appellation: string;
  position: Position;
  tagList: string[] | null;
  rarity: Rarity;
  profession: Profession;
  subProfessionId: string;
  phases: OperatorPhase[];
  skills: OperatorSkillRef[];
  nationId: string | null;
  groupId: string | null;
  teamId: string | null;
  isNotObtainable: boolean;
  itemUsage?: string | null;
  itemDesc?: string | null;
  itemObtainApproach?: string | null;
  // Usually a plain string (or null, most common — the class's generic trait text is
  // used instead, via `description`). For ~150 of 427 operators it's instead an
  // evolving-candidate object shaped just like a talent (unlockCondition/blackboard/
  // overrideDescripton per phase+potential tier) — same misspelled field name as
  // ModuleTraitCandidate. Discovered via a full-roster audit: every one of those ~150
  // operators' detail pages was crashing (`d.trait ?? d.description` treats the object
  // as truthy and passes it straight into cleanText(), which calls .replace() on it).
  trait?: string | { candidates: ModuleTraitCandidate[] | null } | null;
  maxPotentialLevel?: number;
  talents?: OperatorTalent[] | null;
  potentialRanks?: PotentialRank[];
  // Trust bonus. Two frames: level 0 (all zeroes) and the maximum at full trust.
  favorKeyFrames?: AttributeKeyFrame[] | null;
}

export interface OperatorArt {
  suffix: string;   // '1' (base), '1+' (Elite 1), '2' (Elite 2), or a skin code like 'sale#14'
  label: string;    // 'Elite 0/1' | 'Elite 1' | 'Elite 2' | the outfit's own name
  artist: string | null; // illustrator, from the matching skin's drawerList
  url: string;
}

export interface Operator {
  id: OperatorId;
  data: OperatorData;
  archetype?: string;
  skills?: OperatorSkillDetail[];
  range?: AttackRange;
  bases?: BaseSkill[];
  factions?: Faction[];
  modules?: OperatorModule[];
  // Baked at build time by build-operator-index.mjs from the asset repo's own file
  // listing — every characters/<id>_<suffix>.png that actually exists for this
  // operator. Not present on data fetched via the live HellaAPI fallback path (only
  // the static per-operator bundle has it), so always optional.
  arts?: OperatorArt[];
}

export interface OperatorSummary {
  id: OperatorId;
  name: string;
  displayNumber: string | null;
  rarity: Rarity;
  profession: Profession;
  subProfessionId: string;
}

export interface OperatorSlim {
  id: OperatorId;
  name: string;
  appellation: string;
  rarity: Rarity;
  profession: Profession;
  subProfessionId: string;
}

// Everything the extension popup's detail view renders, and nothing else. Generated as one
// bundled map by build-operator-index.mjs rather than as per-operator files: the whole set
// is ~200KB against 30.5MB of full payloads, small enough to ship inside popup.js, which
// makes the popup work with no requests at all.
//
// The shape is defined by what renderDetail draws today. Growing the popup — a talents
// section, say — means growing the build script's projection too, or the field is silently
// absent at runtime.
export interface PopupOperatorData {
  name: string;
  description: string | null;
  rarity: Rarity;
  profession: Profession;
  subProfessionId: string;
  position: Position;
  tagList: string[] | null;
  phases: { maxLevel: number }[];
  skills: { skillId: string }[];
}

export interface PopupOperator {
  id: OperatorId;
  data: PopupOperatorData;
}

export interface OperatorIndexEntry extends OperatorSlim {
  // Home nation's display name ('Kjerag', 'Columbia', 'Lungmen'). '' where the payload
  // states none — 403 of 427 have one, and the rest genuinely have no stated origin
  // rather than a missing lookup. Lives only in the full payload upstream, so
  // build-operator-index.mjs harvests it while writing the detail files.
  nation: string;
  // CN release date, 'YYYY-MM-DD'. null for operators with no dateable event (some
  // Integrated Strategies exclusives, a few event operators the wiki never dated).
  // '9999-12-31' is a sentinel for CN-supplement operators — known to be newer than
  // anything HellaAPI has, exact date unavailable — so they sort first, not last.
  // See scripts/build-operator-index.mjs.
  releaseDate: string | null;
  // Sanity Gone's own PRTS-scraped release ordinal (higher = newer), fetched live from
  // their site at build time. Near-universal coverage (~1700/1704 of their own roster)
  // and verified against a user-supplied reference order with an exact match, including
  // for operators our own wiki pipeline can't date at all — so this is the PREFERRED
  // sort signal when present; releaseDate is the fallback, not the other way around.
  // null if Sanity Gone doesn't have this operator either (rare — usually only for an
  // operator so new even they haven't ingested it) or their site was unreachable at
  // build time. See scripts/build-operator-index.mjs.
  releaseOrder: number | null;
  archetype: string;  // display name for subProfessionId, e.g. 'Splash Caster'
  tags: string[];     // recruitment tags, e.g. ['DPS', 'AoE']
}
