export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export interface DiceTerm {
  count: number;
  sides: number;
  bonus?: number;
}

export interface AttackAction {
  id: string;
  name: string;
  toHit: number;
  damage: DiceTerm[];
  damageType?: string;
  attacksPerAction?: number;
}

export interface WeaponAction extends AttackAction {
  kind: "weapon";
  ability?: AbilityKey;
  range?: string;
}

export type SpellPurpose =
  | "damage"
  | "control"
  | "defense"
  | "buff"
  | "debuff"
  | "healing"
  | "mobility"
  | "summon"
  | "utility";

export interface SpellAction {
  kind: "spell";
  id: string;
  name: string;
  level: number;
  school?: string;
  toHit?: number;
  damage?: DiceTerm[];
  damageType?: string;
  attacksPerAction?: number;
  saveDc?: number;
  saveAbility?: AbilityKey;
  resourceCost?: string;
  purpose: SpellPurpose;
  concentration?: boolean;
  duration?: string;
  range?: string;
  activation?: string;
  description?: string;
  requiresAttackRoll?: boolean;
}

export type SpellEffectKind =
  | "attack-modifier"
  | "control"
  | "condition"
  | "defense"
  | "buff"
  | "healing"
  | "damage";

export type SpellEffectTarget = "self" | "target" | "all-monsters";

export type SpellConditionName =
  | "blessed"
  | "commanded"
  | "frightened"
  | "hexed"
  | "paralyzed"
  | "restrained"
  | "shielded"
  | "smite-readied";

export interface SpellSaveRule {
  ability: AbilityKey;
  dc: number;
  repeat?: "none" | "end-of-turn";
}

export interface SpellAttackModifierRule {
  requiresMelee?: boolean;
  attackBonus?: number;
  attackDie?: number;
  damageDice?: DiceTerm[];
  damageBonus?: number;
  appliesOnce?: boolean;
}

export interface SpellEffect {
  id: string;
  sourceSpellId: string;
  sourceName: string;
  kind: SpellEffectKind;
  target: SpellEffectTarget;
  durationRounds?: number;
  concentration?: boolean;
  save?: SpellSaveRule;
  condition?: SpellConditionName;
  attackModifier?: SpellAttackModifierRule;
  acBonus?: number;
  healing?: DiceTerm[];
  note: string;
}

export interface ActiveEffect extends SpellEffect {
  instanceId: string;
  targetId?: string;
  remainingRounds?: number;
  applied?: boolean;
}

export interface SpellResourceState {
  spellSlots: Record<number, { used: number; max: number }>;
  pactSlots?: {
    level: number;
    used: number;
    max: number;
  };
}

export interface SkillAction {
  kind: "skill";
  id: string;
  name: string;
  ability: AbilityKey;
  modifier: number;
  effect: "defend" | "setup" | "pressure";
  description: string;
}

export type CharacterAction = WeaponAction | SpellAction | SkillAction;

export interface ImportedClassSummary {
  name: string;
  level: number;
  subclass?: string;
}

export interface ImportedInventoryItem {
  id: string;
  name: string;
  type?: string;
  equipped?: boolean;
  category: "weapon" | "armor" | "shield" | "equipment";
  armorClass?: number;
  acBonus?: number;
}

export interface ImportedFeatureSummary {
  id: string;
  name: string;
  source?: string;
}

export interface ImportedSpellSummary {
  id: string;
  name: string;
  level: number;
  school?: string;
  purpose: SpellPurpose;
  saveAbility?: AbilityKey;
  concentration?: boolean;
  duration?: string;
  range?: string;
}

export interface ImportedCharacterSheet {
  race?: string;
  background?: string;
  classes: ImportedClassSummary[];
  inventory: ImportedInventoryItem[];
  weapons: ImportedInventoryItem[];
  armor: ImportedInventoryItem[];
  features: ImportedFeatureSummary[];
  spells: ImportedSpellSummary[];
  proficiencies: string[];
}

export interface CombatCharacter {
  id: string;
  name: string;
  className: string;
  level: number;
  proficiencyBonus: number;
  abilityScores: Record<AbilityKey, number>;
  ac: number;
  maxHp: number;
  speed: number;
  initiativeBonus: number;
  attacks: AttackAction[];
  actions: CharacterAction[];
  sheet?: ImportedCharacterSheet;
  warnings: string[];
}

export interface Monster {
  id: string;
  name: string;
  cr: string;
  xp: number;
  ac: number;
  maxHp: number;
  initiativeBonus: number;
  attacks: AttackAction[];
  source: "SRD 5.1";
}

export interface EncounterConfig {
  monsterId: string;
  count: number;
  iterations: 10 | 20 | 50 | 100;
  seed?: string;
}

export interface InitiativeEntry {
  id: string;
  name: string;
  side: "character" | "monster";
  d20: number;
  total: number;
}

export interface CombatLogEvent {
  id: string;
  round: number;
  actor: string;
  target: string;
  action: string;
  d20?: number;
  totalToHit?: number;
  targetAc?: number;
  hit?: boolean;
  critical?: boolean;
  damage?: number;
  targetHpAfter?: number;
  note: string;
}

export interface CombatRunLog {
  id: string;
  seed: string;
  winner: "character" | "monsters";
  rounds: number;
  characterRemainingHp: number;
  monstersRemaining: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  initiative: InitiativeEntry[];
  events: CombatLogEvent[];
}

export interface SimulationResult {
  summary: {
    iterations: number;
    winRate: number;
    averageRounds: number;
    averageDamageDealtPerRound: number;
    averageDamageTakenPerRound: number;
  };
  runs: CombatRunLog[];
}

export interface ParseResult {
  character?: CombatCharacter;
  warnings: string[];
  errors: string[];
}
