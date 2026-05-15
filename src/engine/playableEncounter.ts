import type {
  ActiveEffect,
  AttackAction,
  CharacterAction,
  CombatCharacter,
  DiceTerm,
  Monster,
  SkillAction,
  SpellAction,
  SpellEffect,
  WeaponAction
} from "@/types/combat";
import { createRng, rollDie, type Rng } from "@/engine/dice";
import { resolveAttack } from "@/engine/combat";
import { spellEffectFromAction } from "@/engine/spellEffects";

export type PlayStyle = "steady" | "guarded" | "reckless";

export interface PlayableMonsterState {
  id: string;
  name: string;
  ac: number;
  maxHp: number;
  hp: number;
}

export interface PlayLogEntry {
  id: string;
  round: number;
  tone: "scene" | "hero" | "monster" | "system" | "victory" | "defeat";
  text: string;
}

export interface PlayableEncounterState {
  id: string;
  seed: string;
  round: number;
  characterHp: number;
  monsters: PlayableMonsterState[];
  status: "active" | "victory" | "defeat";
  totalDamageDealt: number;
  totalDamageTaken: number;
  activeEffects: ActiveEffect[];
  concentration?: {
    sourceName: string;
    effectInstanceId: string;
  };
  log: PlayLogEntry[];
}

interface StyleProfile {
  label: string;
  intro: string;
  attackBonus: number;
  acBonus: number;
  suppressedMonsterIds?: string[];
}

interface AttackModifierProfile {
  label: string;
  requiresMelee?: boolean;
  attackBonus?: number;
  attackDie?: number;
  damageDice?: DiceTerm[];
  damageBonus?: number;
  appliesOnce?: boolean;
}

const styleProfiles: Record<PlayStyle, StyleProfile> = {
  steady: {
    label: "Steady Strike",
    intro: "You watch the opening and commit to a clean, measured attack.",
    attackBonus: 0,
    acBonus: 0
  },
  guarded: {
    label: "Guarded Advance",
    intro: "You keep your guard high, trading a little pressure for better protection.",
    attackBonus: -1,
    acBonus: 2
  },
  reckless: {
    label: "Reckless Push",
    intro: "You press hard, trusting momentum more than caution.",
    attackBonus: 2,
    acBonus: -2
  }
};

function entryId(state: PlayableEncounterState, suffix: string): string {
  return `${state.seed}-r${state.round}-${state.log.length + 1}-${suffix}`;
}

function livingMonsters(monsters: PlayableMonsterState[]): PlayableMonsterState[] {
  return monsters.filter((monster) => monster.hp > 0);
}

function cloneState(state: PlayableEncounterState): PlayableEncounterState {
  return {
    ...state,
    monsters: state.monsters.map((monster) => ({ ...monster })),
    activeEffects: state.activeEffects.map((effect) => ({ ...effect })),
    concentration: state.concentration ? { ...state.concentration } : undefined,
    log: [...state.log]
  };
}

function withAttackBonus(action: AttackAction, bonus: number): AttackAction {
  return {
    ...action,
    toHit: action.toHit + bonus
  };
}

function actionAsAttack(action: CharacterAction | undefined): AttackAction | undefined {
  if (!action || action.kind === "skill") {
    return undefined;
  }

  if (typeof action.toHit !== "number" || !Array.isArray(action.damage) || action.damage.length === 0) {
    return undefined;
  }

  return action as AttackAction;
}

function isSmiteSpell(action: CharacterAction | undefined): boolean {
  return action?.kind === "spell" && /\bsmite\b/i.test(action.name);
}

function attackModifierProfile(action: CharacterAction | undefined): AttackModifierProfile | undefined {
  if (action?.kind !== "spell") {
    return undefined;
  }

  const effect = spellEffectFromAction(action);
  if (effect?.attackModifier) {
    return {
      label: action.name,
      requiresMelee: effect.attackModifier.requiresMelee,
      attackBonus: effect.attackModifier.attackBonus,
      attackDie: effect.attackModifier.attackDie,
      damageDice: effect.attackModifier.damageDice,
      damageBonus: effect.attackModifier.damageBonus,
      appliesOnce: effect.attackModifier.appliesOnce
    };
  }

  return undefined;
}

function isLikelyRangedWeapon(action: WeaponAction): boolean {
  const text = `${action.name} ${action.range ?? ""}`.toLowerCase();
  return (
    /\b(longbow|shortbow|crossbow|sling|dart|blowgun|firearm|musket|pistol)\b/.test(text) ||
    /\branged\b/.test(text) ||
    /\brange\b/.test(text) ||
    /\b\d+\s*\//.test(text)
  );
}

function smiteWeaponFor(character: CombatCharacter): WeaponAction | undefined {
  return character.actions.find((action): action is WeaponAction => action.kind === "weapon" && !isLikelyRangedWeapon(action));
}

function monsterSaveBonus(monster: Monster, target: PlayableMonsterState, ability: SpellAction["saveAbility"]): number {
  if (ability === "dex") {
    return monster.initiativeBonus;
  }
  if (ability === "str" || ability === "con") {
    return Math.max(0, Math.floor((target.maxHp - 8) / 10));
  }
  return 0;
}

function effectTargetId(effect: SpellEffect, targetId: string): string | undefined {
  return effect.target === "self" ? "character" : targetId;
}

function activateSpellEffect(
  state: PlayableEncounterState,
  effect: SpellEffect,
  targetId: string,
  actorName: string,
  options: { quiet?: boolean } = {}
): ActiveEffect {
  if (effect.concentration) {
    const previous = state.concentration;
    if (previous) {
      state.activeEffects = state.activeEffects.filter((activeEffect) => activeEffect.instanceId !== previous.effectInstanceId);
      state.log.push({
        id: entryId(state, "concentration-shift"),
        round: state.round,
        tone: "system",
        text: `${actorName}'s concentration shifts from ${previous.sourceName} to ${effect.sourceName}.`
      });
    }
  }

  const activeEffect: ActiveEffect = {
    ...effect,
    instanceId: `${effect.id}-${state.round}-${state.log.length + 1}`,
    targetId: effectTargetId(effect, targetId),
    remainingRounds: effect.durationRounds,
    applied: false
  };

  state.activeEffects.push(activeEffect);

  if (effect.concentration) {
    state.concentration = {
      sourceName: effect.sourceName,
      effectInstanceId: activeEffect.instanceId
    };
  }

  if (!options.quiet) {
    state.log.push({
      id: entryId(state, "effect-active"),
      round: state.round,
      tone: "system",
      text: `${effect.sourceName} is now active: ${effect.note}`
    });
  }

  return activeEffect;
}

function removeActiveEffectsFromSpell(state: PlayableEncounterState, spellId: string) {
  const removed = state.activeEffects
    .filter((effect) => effect.sourceSpellId === spellId)
    .map((effect) => effect.instanceId);

  state.activeEffects = state.activeEffects.filter((effect) => effect.sourceSpellId !== spellId);

  if (state.concentration && removed.includes(state.concentration.effectInstanceId)) {
    state.concentration = undefined;
  }
}

function activeAcBonus(state: PlayableEncounterState): number {
  return state.activeEffects
    .filter((effect) => effect.targetId === "character")
    .reduce((total, effect) => total + (effect.acBonus ?? 0), 0);
}

function activeSuppressedMonsters(state: PlayableEncounterState): Set<string> {
  const conditions = new Set(["commanded", "paralyzed", "restrained", "frightened"]);
  return new Set(
    state.activeEffects
      .filter((effect) => effect.targetId && conditions.has(effect.condition ?? ""))
      .map((effect) => effect.targetId as string)
  );
}

function activeWeaponModifierProfile(state: PlayableEncounterState, targetId: string, weapon: AttackAction): AttackModifierProfile | undefined {
  const effects = state.activeEffects.filter((effect) => {
    if (!effect.attackModifier) {
      return false;
    }
    if (effect.targetId !== "character" && effect.targetId !== targetId) {
      return false;
    }
    if (effect.attackModifier.requiresMelee && "range" in weapon && isLikelyRangedWeapon(weapon as WeaponAction)) {
      return false;
    }
    return true;
  });

  if (effects.length === 0) {
    return undefined;
  }

  return {
    label: effects.map((effect) => effect.sourceName).join(" + "),
    attackBonus: effects.reduce((total, effect) => total + (effect.attackModifier?.attackBonus ?? 0), 0),
    attackDie: effects.find((effect) => effect.attackModifier?.attackDie)?.attackModifier?.attackDie,
    damageDice: effects.flatMap((effect) => effect.attackModifier?.damageDice ?? []),
    damageBonus: effects.reduce((total, effect) => total + (effect.attackModifier?.damageBonus ?? 0), 0),
    appliesOnce: effects.some((effect) => effect.attackModifier?.appliesOnce)
  };
}

function expireRoundEffects(state: PlayableEncounterState) {
  const expired: string[] = [];
  state.activeEffects = state.activeEffects
    .map((effect) => ({
      ...effect,
      remainingRounds: typeof effect.remainingRounds === "number" ? effect.remainingRounds - 1 : undefined
    }))
    .filter((effect) => {
      const isExpired = typeof effect.remainingRounds === "number" && effect.remainingRounds <= 0;
      if (isExpired) {
        expired.push(effect.instanceId);
      }
      return !isExpired;
    });

  if (state.concentration && expired.includes(state.concentration.effectInstanceId)) {
    state.concentration = undefined;
  }
}

function resolveSkillAction(
  state: PlayableEncounterState,
  character: CombatCharacter,
  skill: SkillAction,
  style: StyleProfile,
  rng: Rng
): StyleProfile {
  const d20 = rollDie(20, rng);
  const total = d20 + skill.modifier;
  const dc = 12 + Math.max(0, livingMonsters(state.monsters).length - 1);
  const success = d20 === 20 || (d20 !== 1 && total >= dc);

  state.log.push({
    id: entryId(state, "skill"),
    round: state.round,
    tone: "hero",
    text: `${character.name} uses ${skill.name}: d20 ${d20}, ${total} vs DC ${dc}. ${success ? skill.description : "The attempt does not shift the fight."}`
  });

  if (!success) {
    return style;
  }

  if (skill.effect === "defend") {
    return {
      ...style,
      acBonus: style.acBonus + 2,
      intro: `${style.intro} ${character.name}'s ${skill.name} check buys space.`
    };
  }

  if (skill.effect === "setup") {
    return {
      ...style,
      attackBonus: style.attackBonus + 2,
      intro: `${style.intro} ${character.name}'s ${skill.name} check exposes an opening.`
    };
  }

  const target = livingMonsters(state.monsters)[0];
  if (target) {
    const pressureDamage = Math.min(target.hp, Math.max(1, Math.floor(character.proficiencyBonus / 2) + 1));
    target.hp = Math.max(0, target.hp - pressureDamage);
    state.totalDamageDealt += pressureDamage;
    state.log.push({
      id: entryId(state, "pressure"),
      round: state.round,
      tone: "hero",
      text: `${skill.name} creates pressure on ${target.name}, costing it ${pressureDamage} HP before weapons come back into play.`
    });
  }

  return style;
}

function resolveSpellSetupAction(
  state: PlayableEncounterState,
  character: CombatCharacter,
  spell: SpellAction,
  style: StyleProfile,
  monsterTemplate: Monster,
  targetId: string,
  rng: Rng
): StyleProfile {
  const effect = spellEffectFromAction(spell);
  const detail = [
    spell.purpose,
    spell.concentration ? "concentration" : "",
    spell.duration ? spell.duration : "",
    typeof spell.saveDc === "number" ? `${spell.saveAbility ? `${spell.saveAbility.toUpperCase()} ` : ""}DC ${spell.saveDc}` : ""
  ].filter(Boolean).join(", ");

  state.log.push({
    id: entryId(state, "spell-setup"),
    round: state.round,
    tone: "hero",
    text: `${character.name} casts ${spell.name}${detail ? ` (${detail})` : ""}. ${effect ? "The spell resolves through the active effect model." : "The simulator treats it as a tactical setup spell until a structured effect is available."}`
  });

  const target = state.monsters.find((monster) => monster.id === targetId && monster.hp > 0) ?? livingMonsters(state.monsters)[0];
  if (target && effect?.save && (effect.kind === "control" || effect.kind === "condition" || effect.kind === "damage")) {
    const saveBonus = monsterSaveBonus(monsterTemplate, target, effect.save.ability);
    const d20 = rollDie(20, rng);
    const total = d20 + saveBonus;
    const failed = d20 === 1 || (d20 !== 20 && total < effect.save.dc);

    state.log.push({
      id: entryId(state, "spell-save"),
      round: state.round,
      tone: "hero",
      text: `${target.name} rolls ${effect.save.ability.toUpperCase()} save against ${spell.name}: d20 ${d20}${saveBonus ? ` + ${saveBonus}` : ""} = ${total} vs DC ${effect.save.dc}. ${failed ? "The spell takes hold." : "The target resists the worst of it."}`
    });

    if (failed) {
      activateSpellEffect(state, effect, target.id, character.name);
      return {
        ...style,
        attackBonus: style.attackBonus + (effect.kind === "damage" ? 1 : 2),
        intro: `${style.intro} ${spell.name} lands, forcing ${target.name} onto the back foot.`
      };
    }

    return {
      ...style,
      attackBonus: style.attackBonus + (spell.purpose === "control" ? 1 : 0),
      intro: `${style.intro} ${spell.name} only partially changes the angle.`
    };
  }

  if (effect && !effect.save) {
    activateSpellEffect(state, effect, effect.target === "target" && target ? target.id : targetId, character.name);

    if (effect.kind === "defense") {
      return {
        ...style,
        intro: `${style.intro} ${spell.name} raises the line of defense.`
      };
    }

    if (effect.kind === "buff" || effect.kind === "attack-modifier") {
      return {
        ...style,
        intro: `${style.intro} ${spell.name} settles into the next exchange.`
      };
    }
  }

  if (spell.purpose === "control" || spell.purpose === "debuff") {
    return {
      ...style,
      attackBonus: style.attackBonus + 1,
      acBonus: style.acBonus + 1,
      intro: `${style.intro} ${spell.name} warps the battlefield before the strike.`
    };
  }

  if (spell.purpose === "defense" || spell.purpose === "mobility") {
    return {
      ...style,
      acBonus: style.acBonus + 2,
      intro: `${style.intro} ${spell.name} helps control distance and danger.`
    };
  }

  if (spell.purpose === "buff") {
    return {
      ...style,
      attackBonus: style.attackBonus + 1,
      intro: `${style.intro} ${spell.name} strengthens the follow-through.`
    };
  }

  if (spell.purpose === "healing") {
    const recovered = Math.min(character.maxHp - state.characterHp, character.proficiencyBonus + 2);
    if (recovered > 0) {
      state.characterHp += recovered;
      state.log.push({
        id: entryId(state, "spell-heal"),
        round: state.round,
        tone: "hero",
        text: `${spell.name} restores ${recovered} HP as a provisional MVP healing effect.`
      });
    }
  }

  return style;
}

function resolveHeroAttack(
  state: PlayableEncounterState,
  character: CombatCharacter,
  targetId: string,
  selectedAction: CharacterAction | undefined,
  style: StyleProfile,
  rng: Rng
) {
  const target = state.monsters.find((monster) => monster.id === targetId && monster.hp > 0) ?? livingMonsters(state.monsters)[0];
  const selectedAttack = actionAsAttack(selectedAction);
  const selectedNonAttackSpell = selectedAction?.kind === "spell" && !selectedAttack;
  const action = selectedNonAttackSpell ? undefined : selectedAttack ?? character.attacks[0];

  state.log.push({
    id: entryId(state, "approach"),
    round: state.round,
    tone: "scene",
    text: style.intro
  });

  if (!target || !action) {
    state.log.push({
      id: entryId(state, "no-action"),
      round: state.round,
      tone: "system",
      text: selectedNonAttackSpell
        ? `${selectedAction.name} resolves as the action for this exchange. No weapon attack is added automatically.`
        : "There is no supported weapon or attack-roll spell to resolve after that choice."
    });
    return;
  }

  const attacksPerAction = action.attacksPerAction ?? 1;
  for (let index = 0; index < attacksPerAction; index += 1) {
    if (target.hp <= 0) {
      break;
    }

    const activeModifier = activeWeaponModifierProfile(state, target.id, action);
    const activeAttackRoll = activeModifier?.attackDie ? rollDie(activeModifier.attackDie, rng) : 0;
    const attack = withAttackBonus(action, style.attackBonus + (activeModifier?.attackBonus ?? 0) + activeAttackRoll);
    const resolution = resolveAttack(attack, target.ac, rng);
    const riderDamage = resolution.hit && activeModifier ? rollModifierDamage(activeModifier, rng) : 0;
    const rawDamage = resolution.damage + riderDamage;
    const damage = Math.min(target.hp, rawDamage);
    target.hp = Math.max(0, target.hp - rawDamage);
    state.totalDamageDealt += damage;

    const resultText = resolution.critical
      ? "a critical hit"
      : resolution.hit
        ? "a hit"
        : "a miss";

    state.log.push({
      id: entryId(state, `hero-${index}`),
      round: state.round,
      tone: "hero",
      text: `${character.name} uses ${selectedAttack ? selectedAction?.kind : "weapon"} ${attack.name}${activeModifier ? ` with ${activeModifier.label}` : ""} on ${target.name}: d20 ${resolution.d20}${activeAttackRoll ? ` + d${activeModifier?.attackDie} ${activeAttackRoll}` : ""}, ${resolution.totalToHit} to hit vs AC ${target.ac}, ${resultText}${damage ? ` for ${damage} damage${riderDamage ? `, including ${riderDamage} active effect damage` : ""}` : ""}.`
    });
  }
}

function resolveSmiteSpellAction(
  state: PlayableEncounterState,
  character: CombatCharacter,
  targetId: string,
  spell: SpellAction,
  style: StyleProfile,
  rng: Rng,
  weaponOverride?: WeaponAction
) {
  const target = state.monsters.find((monster) => monster.id === targetId && monster.hp > 0) ?? livingMonsters(state.monsters)[0];
  const weapon = weaponOverride
    ? isLikelyRangedWeapon(weaponOverride)
      ? undefined
      : weaponOverride
    : smiteWeaponFor(character);
  const smiteDice = Math.max(1, spell.level || 1);

  state.log.push({
    id: entryId(state, "smite-cast"),
    round: state.round,
    tone: "hero",
    text: `${character.name} casts ${spell.name}. The simulator treats it as a melee weapon rider: the next melee hit adds ${smiteDice}d6 damage.`
  });

  state.log.push({
    id: entryId(state, "approach"),
    round: state.round,
    tone: "scene",
    text: style.intro
  });

  if (!target || !weapon) {
    state.log.push({
      id: entryId(state, "smite-no-weapon"),
      round: state.round,
      tone: "system",
      text: `${spell.name} needs a melee weapon attack. No active melee weapon was available in the loadout.`
    });
    return;
  }

  let riderApplied = false;
  const attacksPerAction = weapon.attacksPerAction ?? 1;
  for (let index = 0; index < attacksPerAction; index += 1) {
    if (target.hp <= 0) {
      break;
    }

    const attack = withAttackBonus(weapon, style.attackBonus);
    const resolution = resolveAttack(attack, target.ac, rng);
    const smiteDamage = resolution.hit && !riderApplied
      ? Array.from({ length: smiteDice }, () => rollDie(6, rng)).reduce((sum, roll) => sum + roll, 0)
      : 0;
    const rawDamage = resolution.damage + smiteDamage;
    const damage = Math.min(target.hp, rawDamage);
    target.hp = Math.max(0, target.hp - rawDamage);
    state.totalDamageDealt += damage;

    if (smiteDamage > 0) {
      riderApplied = true;
    }

    const resultText = resolution.critical
      ? "a critical hit"
      : resolution.hit
        ? "a hit"
        : "a miss";

    state.log.push({
      id: entryId(state, `smite-attack-${index}`),
      round: state.round,
      tone: "hero",
      text: `${character.name} swings ${attack.name} with ${spell.name}: d20 ${resolution.d20}, ${resolution.totalToHit} to hit vs AC ${target.ac}, ${resultText}${damage ? ` for ${damage} damage${smiteDamage ? `, including ${smiteDamage} smite damage` : ""}` : ""}.`
    });
  }

  if (!riderApplied) {
    state.log.push({
      id: entryId(state, "smite-held"),
      round: state.round,
      tone: "system",
      text: `${spell.name} remains waiting for a melee hit in real rules; this MVP ends the exchange after the attempted action.`
    });
  } else {
    removeActiveEffectsFromSpell(state, spell.id);
  }
}

function rollModifierDamage(profile: AttackModifierProfile, rng: Rng): number {
  const diceDamage = (profile.damageDice ?? []).reduce(
    (total, dice) => total + Array.from({ length: dice.count }, () => rollDie(dice.sides, rng)).reduce((sum, roll) => sum + roll, 0),
    0
  );
  return diceDamage + (profile.damageBonus ?? 0);
}

function resolveModifiedWeaponAction(
  state: PlayableEncounterState,
  character: CombatCharacter,
  targetId: string,
  weapon: WeaponAction,
  modifier: AttackModifierProfile,
  style: StyleProfile,
  rng: Rng
) {
  const target = state.monsters.find((monster) => monster.id === targetId && monster.hp > 0) ?? livingMonsters(state.monsters)[0];

  state.log.push({
    id: entryId(state, "modifier-cast"),
    round: state.round,
    tone: "hero",
    text: `${character.name} uses ${modifier.label} to modify ${weapon.name}.`
  });

  state.log.push({
    id: entryId(state, "approach"),
    round: state.round,
    tone: "scene",
    text: style.intro
  });

  if (!target) {
    return;
  }

  const attacksPerAction = weapon.attacksPerAction ?? 1;
  for (let index = 0; index < attacksPerAction; index += 1) {
    if (target.hp <= 0) {
      break;
    }

    const rolledAttackBonus = modifier.attackDie ? rollDie(modifier.attackDie, rng) : 0;
    const attack = withAttackBonus(weapon, style.attackBonus + (modifier.attackBonus ?? 0) + rolledAttackBonus);
    const resolution = resolveAttack(attack, target.ac, rng);
    const riderDamage = resolution.hit ? rollModifierDamage(modifier, rng) : 0;
    const rawDamage = resolution.damage + riderDamage;
    const damage = Math.min(target.hp, rawDamage);
    target.hp = Math.max(0, target.hp - rawDamage);
    state.totalDamageDealt += damage;

    const resultText = resolution.critical
      ? "a critical hit"
      : resolution.hit
        ? "a hit"
        : "a miss";

    state.log.push({
      id: entryId(state, `modified-attack-${index}`),
      round: state.round,
      tone: "hero",
      text: `${character.name} attacks with ${weapon.name} plus ${modifier.label}: d20 ${resolution.d20}${rolledAttackBonus ? ` + d${modifier.attackDie} ${rolledAttackBonus}` : ""}, ${resolution.totalToHit} to hit vs AC ${target.ac}, ${resultText}${damage ? ` for ${damage} damage${riderDamage ? `, including ${riderDamage} modifier damage` : ""}` : ""}.`
    });
  }
}

function resolveMonsterResponse(
  state: PlayableEncounterState,
  character: CombatCharacter,
  monsterTemplate: Monster,
  style: StyleProfile,
  rng: Rng
) {
  const action = monsterTemplate.attacks[0];
  const targetAc = Math.max(1, character.ac + style.acBonus + activeAcBonus(state));
  const suppressed = new Set([...(style.suppressedMonsterIds ?? []), ...activeSuppressedMonsters(state)]);

  for (const monster of livingMonsters(state.monsters)) {
    if (state.characterHp <= 0 || !action) {
      break;
    }

    if (suppressed.has(monster.id)) {
      state.log.push({
        id: entryId(state, `monster-suppressed-${monster.id}`),
        round: state.round,
        tone: "monster",
        text: `${monster.name} loses its response this exchange.`
      });
      continue;
    }

    const resolution = resolveAttack(action, targetAc, rng);
    const damage = Math.min(state.characterHp, resolution.damage);
    state.characterHp = Math.max(0, state.characterHp - resolution.damage);
    state.totalDamageTaken += damage;

    const resultText = resolution.critical
      ? "a critical hit"
      : resolution.hit
        ? "a hit"
        : "a miss";

    state.log.push({
      id: entryId(state, `monster-${monster.id}`),
      round: state.round,
      tone: "monster",
      text: `${monster.name} answers with ${action.name}: d20 ${resolution.d20}, ${resolution.totalToHit} to hit vs AC ${targetAc}, ${resultText}${damage ? ` for ${damage} damage` : ""}.`
    });
  }
}

function updateStatus(state: PlayableEncounterState, characterName: string) {
  if (livingMonsters(state.monsters).length === 0) {
    state.status = "victory";
    state.log.push({
      id: entryId(state, "victory"),
      round: state.round,
      tone: "victory",
      text: `${characterName} wins the encounter. The last enemy drops and the field goes quiet.`
    });
    return;
  }

  if (state.characterHp <= 0) {
    state.status = "defeat";
    state.log.push({
      id: entryId(state, "defeat"),
      round: state.round,
      tone: "defeat",
      text: `${characterName} is overwhelmed and falls to 0 HP.`
    });
  }
}

export function createPlayableEncounter(
  character: CombatCharacter,
  monster: Monster,
  count: number,
  seed = "play-scene"
): PlayableEncounterState {
  return {
    id: `${character.id}-${monster.id}-${count}`,
    seed,
    round: 1,
    characterHp: character.maxHp,
    status: "active",
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    activeEffects: [],
    monsters: Array.from({ length: count }, (_, index) => ({
      id: `${monster.id}-${index + 1}`,
      name: `${monster.name} ${index + 1}`,
      ac: monster.ac,
      maxHp: monster.maxHp,
      hp: monster.maxHp
    })),
    log: [
      {
        id: `${seed}-intro`,
        round: 1,
        tone: "scene",
        text: `${character.name} squares up against ${count} ${monster.name}${count === 1 ? "" : "s"}. Choose how the opening exchange feels.`
      }
    ]
  };
}

export function playTurn(
  state: PlayableEncounterState,
  character: CombatCharacter,
  monster: Monster,
  targetId: string,
  actionId: string,
  style: PlayStyle,
  modifierActionId = ""
): PlayableEncounterState {
  if (state.status !== "active") {
    return state;
  }

  const next = cloneState(state);
  const profile = styleProfiles[style];
  const selectedAction =
    character.actions.find((action) => action.id === actionId) ??
    character.actions.find((action) => action.kind === "weapon" || action.kind === "spell");
  const selectedModifier = character.actions.find((action) => action.id === modifierActionId);
  const modifierProfile = attackModifierProfile(selectedModifier);
  const modifierEffect = selectedModifier?.kind === "spell" ? spellEffectFromAction(selectedModifier) : undefined;
  const rng = createRng(`${next.seed}-${next.round}-${next.log.length}-${style}-${actionId}-${modifierActionId}`);

  next.log.push({
    id: entryId(next, "choice"),
    round: next.round,
    tone: "system",
    text: `Round ${next.round}: ${profile.label}${selectedAction ? ` with ${selectedAction.name}` : ""}${selectedAction?.kind === "weapon" && modifierProfile ? ` plus ${modifierProfile.label}` : ""}.`
  });

  if (selectedAction?.kind === "weapon" && modifierProfile) {
    if (modifierProfile.requiresMelee && isLikelyRangedWeapon(selectedAction)) {
      next.log.push({
        id: entryId(next, "modifier-invalid"),
        round: next.round,
        tone: "system",
        text: `${modifierProfile.label} needs a melee weapon. Choose a melee weapon before applying this modifier.`
      });
      return next;
    }

    if (modifierEffect) {
      activateSpellEffect(next, modifierEffect, targetId, character.name);
    }

    if (selectedModifier?.kind === "spell" && isSmiteSpell(selectedModifier)) {
      resolveSmiteSpellAction(next, character, targetId, selectedModifier, profile, rng, selectedAction);
    } else {
      resolveModifiedWeaponAction(next, character, targetId, selectedAction, modifierProfile, profile, rng);
    }
    updateStatus(next, character.name);

    if (next.status === "active") {
      resolveMonsterResponse(next, character, monster, profile, rng);
      updateStatus(next, character.name);
    }

    if (next.status === "active") {
      expireRoundEffects(next);
      next.round += 1;
    }

    return next;
  }

  if (selectedAction?.kind === "spell" && isSmiteSpell(selectedAction)) {
    const effect = spellEffectFromAction(selectedAction);
    if (effect) {
      activateSpellEffect(next, effect, targetId, character.name);
    }
    resolveSmiteSpellAction(next, character, targetId, selectedAction, profile, rng);
    updateStatus(next, character.name);

    if (next.status === "active") {
      resolveMonsterResponse(next, character, monster, profile, rng);
      updateStatus(next, character.name);
    }

    if (next.status === "active") {
      expireRoundEffects(next);
      next.round += 1;
    }

    return next;
  }

  const adjustedProfile =
    selectedAction && "kind" in selectedAction && selectedAction.kind === "skill"
      ? resolveSkillAction(next, character, selectedAction, profile, rng)
      : selectedAction && selectedAction.kind === "spell" && !actionAsAttack(selectedAction)
        ? resolveSpellSetupAction(next, character, selectedAction, profile, monster, targetId, rng)
      : profile;

  resolveHeroAttack(next, character, targetId, selectedAction, adjustedProfile, rng);
  updateStatus(next, character.name);

  if (next.status === "active") {
    resolveMonsterResponse(next, character, monster, adjustedProfile, rng);
    updateStatus(next, character.name);
  }

  if (next.status === "active") {
    expireRoundEffects(next);
    next.round += 1;
  }

  return next;
}
