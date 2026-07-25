export type OperatorId = string; // "char_002_amiya"

export type Rarity = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4' | 'TIER_5' | 'TIER_6';

// HellaAPI returns the game's internal enums: TANK = Defender, WARRIOR = Guard.
export type Profession =
  | 'CASTER' | 'MEDIC' | 'PIONEER' | 'SNIPER'
  | 'SPECIAL' | 'SUPPORT' | 'TANK' | 'WARRIOR';

export type Position = 'MELEE' | 'RANGED';

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

export interface OperatorPhase {
  characterPrefabKey: string;
  rangeId: string | null;
  maxLevel: number;
  attributesKeyFrames: AttributeKeyFrame[];
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
}

export interface OperatorTalent {
  candidates: TalentCandidate[];
}

export interface PotentialRank {
  type: string;
  description: string;
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
  trait?: string | null;
  maxPotentialLevel?: number;
  talents?: OperatorTalent[] | null;
  potentialRanks?: PotentialRank[];
}

export interface Operator {
  id: OperatorId;
  data: OperatorData;
  archetype?: string;
  skills?: OperatorSkillDetail[];
  range?: AttackRange;
  bases?: BaseSkill[];
  factions?: Faction[];
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

export interface OperatorIndexEntry extends OperatorSlim {
  releaseIndex: number; // bigger = newer; char-id number, see scripts/build-operator-index.mjs
}
