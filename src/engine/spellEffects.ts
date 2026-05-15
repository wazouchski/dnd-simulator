import type { AbilityKey, DiceTerm, SpellAction, SpellEffect } from "@/types/combat";

function normalizedName(spell: SpellAction): string {
  return spell.name.toLowerCase().replace(/[’']/g, "'");
}

function levelDice(spell: SpellAction, sides: number, minimum = 1): DiceTerm[] {
  return [{ count: Math.max(minimum, spell.level || minimum), sides }];
}

function saveRule(spell: SpellAction, ability: AbilityKey, repeat: "none" | "end-of-turn" = "none") {
  if (typeof spell.saveDc !== "number") {
    return undefined;
  }

  return {
    ability: spell.saveAbility ?? ability,
    dc: spell.saveDc,
    repeat
  };
}

function baseEffect(spell: SpellAction, kind: SpellEffect["kind"], note: string): Pick<SpellEffect, "id" | "sourceSpellId" | "sourceName" | "kind" | "note"> {
  return {
    id: `${spell.id}-effect`,
    sourceSpellId: spell.id,
    sourceName: spell.name,
    kind,
    note
  };
}

export function spellEffectFromAction(spell: SpellAction): SpellEffect | undefined {
  const name = normalizedName(spell);

  if (/\bsearing smite\b|\bwrathful smite\b|\bthunderous smite\b|\bbranding smite\b|\bblinding smite\b|\bstaggering smite\b|\bbanishing smite\b|\bsmite\b/.test(name)) {
    return {
      ...baseEffect(spell, "attack-modifier", "Readies extra damage for the next melee weapon hit."),
      target: "self",
      concentration: spell.concentration ?? true,
      durationRounds: 10,
      condition: "smite-readied",
      attackModifier: {
        requiresMelee: true,
        damageDice: levelDice(spell, 6),
        appliesOnce: true
      }
    };
  }

  if (/\bhex\b|\bhunter's mark\b/.test(name)) {
    return {
      ...baseEffect(spell, "attack-modifier", "Marks one target and adds rider damage when weapon attacks connect."),
      target: "target",
      concentration: spell.concentration ?? true,
      durationRounds: 10,
      condition: "hexed",
      attackModifier: {
        damageDice: [{ count: 1, sides: 6 }]
      }
    };
  }

  if (/\bdivine favor\b|\benlarge\b/.test(name)) {
    return {
      ...baseEffect(spell, "attack-modifier", "Adds a small damage die to weapon attacks while the spell lasts."),
      target: "self",
      concentration: spell.concentration ?? true,
      durationRounds: 10,
      attackModifier: {
        damageDice: [{ count: 1, sides: 4 }]
      }
    };
  }

  if (/\bmagic weapon\b|\belemental weapon\b|\bholy weapon\b/.test(name)) {
    return {
      ...baseEffect(spell, "attack-modifier", "Improves a weapon attack with provisional attack and damage bonuses."),
      target: "self",
      concentration: spell.concentration ?? true,
      durationRounds: 10,
      attackModifier: {
        attackBonus: 1,
        damageBonus: 1
      }
    };
  }

  if (/\bbless\b/.test(name)) {
    return {
      ...baseEffect(spell, "buff", "Adds d4 support to the character's attack rolls. Saving throw support is tracked for future rules expansion."),
      target: "self",
      concentration: spell.concentration ?? true,
      durationRounds: 10,
      condition: "blessed",
      attackModifier: {
        attackDie: 4
      }
    };
  }

  if (/\bshield of faith\b/.test(name)) {
    return {
      ...baseEffect(spell, "defense", "Raises AC while concentration holds."),
      target: "self",
      concentration: spell.concentration ?? true,
      durationRounds: 10,
      condition: "shielded",
      acBonus: 2
    };
  }

  if (/\bhold person\b/.test(name)) {
    return {
      ...baseEffect(spell, "control", "On a failed save, the target is held and loses its response until the effect ends."),
      target: "target",
      concentration: spell.concentration ?? true,
      durationRounds: 10,
      condition: "paralyzed",
      save: saveRule(spell, "wis", "end-of-turn")
    };
  }

  if (/\bcommand\b/.test(name)) {
    return {
      ...baseEffect(spell, "control", "On a failed save, the target loses its response for this exchange."),
      target: "target",
      concentration: false,
      durationRounds: 1,
      condition: "commanded",
      save: saveRule(spell, "wis", "none")
    };
  }

  if (spell.purpose === "control" || spell.purpose === "debuff") {
    return {
      ...baseEffect(spell, "control", "A provisional control effect from imported sheet data."),
      target: "target",
      concentration: spell.concentration,
      durationRounds: spell.concentration ? 10 : 1,
      condition: "restrained",
      save: saveRule(spell, spell.saveAbility ?? "wis", "none")
    };
  }

  if (spell.purpose === "defense" || spell.purpose === "mobility") {
    return {
      ...baseEffect(spell, "defense", "A provisional defensive or positioning effect from imported sheet data."),
      target: "self",
      concentration: spell.concentration,
      durationRounds: spell.concentration ? 10 : 1,
      acBonus: 2
    };
  }

  if (spell.purpose === "buff") {
    return {
      ...baseEffect(spell, "buff", "A provisional self-buff from imported sheet data."),
      target: "self",
      concentration: spell.concentration,
      durationRounds: spell.concentration ? 10 : 1,
      attackModifier: {
        attackBonus: 1
      }
    };
  }

  return undefined;
}

export function isAttackModifierSpell(spell: SpellAction): boolean {
  const effect = spellEffectFromAction(spell);
  return effect?.kind === "attack-modifier" && Boolean(effect.attackModifier);
}
