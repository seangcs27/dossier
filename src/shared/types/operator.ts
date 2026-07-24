export type OperatorId = string; // "char_002_amiya"

export type Rarity = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4' | 'TIER_5' | 'TIER_6';

export type Profession =
  | 'CASTER' | 'DEFENDER' | 'GUARD' | 'MEDIC'
  | 'PIONEER' | 'SNIPER' | 'SPECIAL' | 'SUPPORT';

export type Position = 'MELEE' | 'RANGED';

export interface OperatorPhase {
  maxLevel: number;
}

export interface OperatorSkillRef {
  skillId: string;
  overridePrefabKey: string | null;
  overrideTokenKey: string | null;
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
}

export interface Operator {
  id: OperatorId;
  data: OperatorData;
}

export interface OperatorSummary {
  id: OperatorId;
  name: string;
  displayNumber: string | null;
  rarity: Rarity;
  profession: Profession;
  subProfessionId: string;
}
