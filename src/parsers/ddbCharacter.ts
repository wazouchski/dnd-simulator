import type {
  AbilityKey,
  AttackAction,
  CharacterAction,
  CombatCharacter,
  ImportedCharacterSheet,
  ImportedFeatureSummary,
  ImportedSpellSummary,
  ParseResult,
  SkillAction,
  SpellAction,
  SpellPurpose
} from "@/types/combat";

const abilityIds: Record<number, AbilityKey> = {
  1: "str",
  2: "dex",
  3: "con",
  4: "int",
  5: "wis",
  6: "cha"
};

const supportedDamageTypes = new Set([
  "acid",
  "bludgeoning",
  "cold",
  "fire",
  "force",
  "lightning",
  "necrotic",
  "piercing",
  "poison",
  "psychic",
  "radiant",
  "slashing",
  "thunder"
]);

const abilityScoreSubtypes: Record<string, AbilityKey> = {
  "strength-score": "str",
  "strength": "str",
  "str": "str",
  "str-score": "str",
  "dexterity-score": "dex",
  "dexterity": "dex",
  "dex": "dex",
  "dex-score": "dex",
  "constitution-score": "con",
  "constitution": "con",
  "con": "con",
  "con-score": "con",
  "intelligence-score": "int",
  "intelligence": "int",
  "int": "int",
  "int-score": "int",
  "wisdom-score": "wis",
  "wisdom": "wis",
  "wis": "wis",
  "wis-score": "wis",
  "charisma-score": "cha",
  "charisma": "cha",
  "cha": "cha",
  "cha-score": "cha"
};

const abilityKeys: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

const weaponDamageProfiles: Array<{ aliases: string[]; count: number; sides: number; damageType: string }> = [
  { aliases: ["club"], count: 1, sides: 4, damageType: "bludgeoning" },
  { aliases: ["dagger"], count: 1, sides: 4, damageType: "piercing" },
  { aliases: ["greatclub"], count: 1, sides: 8, damageType: "bludgeoning" },
  { aliases: ["handaxe", "hand axe"], count: 1, sides: 6, damageType: "slashing" },
  { aliases: ["javelin"], count: 1, sides: 6, damageType: "piercing" },
  { aliases: ["light hammer"], count: 1, sides: 4, damageType: "bludgeoning" },
  { aliases: ["mace"], count: 1, sides: 6, damageType: "bludgeoning" },
  { aliases: ["quarterstaff"], count: 1, sides: 6, damageType: "bludgeoning" },
  { aliases: ["sickle"], count: 1, sides: 4, damageType: "slashing" },
  { aliases: ["spear"], count: 1, sides: 6, damageType: "piercing" },
  { aliases: ["light crossbow", "crossbow, light"], count: 1, sides: 8, damageType: "piercing" },
  { aliases: ["dart"], count: 1, sides: 4, damageType: "piercing" },
  { aliases: ["shortbow", "short bow"], count: 1, sides: 6, damageType: "piercing" },
  { aliases: ["sling"], count: 1, sides: 4, damageType: "bludgeoning" },
  { aliases: ["battleaxe", "battle axe"], count: 1, sides: 8, damageType: "slashing" },
  { aliases: ["flail"], count: 1, sides: 8, damageType: "bludgeoning" },
  { aliases: ["glaive"], count: 1, sides: 10, damageType: "slashing" },
  { aliases: ["greataxe", "great axe"], count: 1, sides: 12, damageType: "slashing" },
  { aliases: ["greatsword", "great sword"], count: 2, sides: 6, damageType: "slashing" },
  { aliases: ["halberd"], count: 1, sides: 10, damageType: "slashing" },
  { aliases: ["lance"], count: 1, sides: 12, damageType: "piercing" },
  { aliases: ["longsword", "long sword"], count: 1, sides: 8, damageType: "slashing" },
  { aliases: ["maul"], count: 2, sides: 6, damageType: "bludgeoning" },
  { aliases: ["morningstar", "morning star"], count: 1, sides: 8, damageType: "piercing" },
  { aliases: ["pike"], count: 1, sides: 10, damageType: "piercing" },
  { aliases: ["rapier"], count: 1, sides: 8, damageType: "piercing" },
  { aliases: ["scimitar"], count: 1, sides: 6, damageType: "slashing" },
  { aliases: ["shortsword", "short sword"], count: 1, sides: 6, damageType: "piercing" },
  { aliases: ["trident"], count: 1, sides: 6, damageType: "piercing" },
  { aliases: ["war pick", "warpick"], count: 1, sides: 8, damageType: "piercing" },
  { aliases: ["warhammer", "war hammer"], count: 1, sides: 8, damageType: "bludgeoning" },
  { aliases: ["whip"], count: 1, sides: 4, damageType: "slashing" },
  { aliases: ["hand crossbow", "crossbow, hand"], count: 1, sides: 6, damageType: "piercing" },
  { aliases: ["heavy crossbow", "crossbow, heavy"], count: 1, sides: 10, damageType: "piercing" },
  { aliases: ["longbow", "long bow"], count: 1, sides: 8, damageType: "piercing" }
];

const armorProfiles: Array<{ aliases: string[]; baseAc: number; dex: "full" | "max2" | "none" }> = [
  { aliases: ["padded armor", "padded"], baseAc: 11, dex: "full" },
  { aliases: ["leather armor", "leather"], baseAc: 11, dex: "full" },
  { aliases: ["studded leather armor", "studded leather"], baseAc: 12, dex: "full" },
  { aliases: ["hide armor", "hide"], baseAc: 12, dex: "max2" },
  { aliases: ["chain shirt"], baseAc: 13, dex: "max2" },
  { aliases: ["scale mail"], baseAc: 14, dex: "max2" },
  { aliases: ["breastplate"], baseAc: 14, dex: "max2" },
  { aliases: ["half plate armor", "half plate"], baseAc: 15, dex: "max2" },
  { aliases: ["ring mail"], baseAc: 14, dex: "none" },
  { aliases: ["chain mail"], baseAc: 16, dex: "none" },
  { aliases: ["splint armor", "splint"], baseAc: 17, dex: "none" },
  { aliases: ["plate armor", "plate"], baseAc: 18, dex: "none" }
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function numberFrom(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function statValueFrom(value: unknown, fallback: number): number {
  if (!isRecord(value)) {
    return fallback;
  }
  return numberFrom(value.value, numberFrom(value.score, numberFrom(value.total, fallback)));
}

function stringFrom(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function idFrom(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
}

function uniqueMessages(messages: string[]): string[] {
  return [...new Set(messages.filter((message) => message.trim()))];
}

function recordsFromBuckets(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }

  if (!isRecord(value)) {
    return [];
  }

  return Object.values(value).flatMap((entry) => (Array.isArray(entry) ? entry.filter(isRecord) : []));
}

function modifierEntries(root: Record<string, unknown>): Record<string, unknown>[] {
  return recordsFromBuckets(root.modifiers);
}

function modifierType(modifier: Record<string, unknown>): string {
  return stringFrom(modifier.type, stringFrom(modifier.modifierType, "")).toLowerCase();
}

function modifierSubType(modifier: Record<string, unknown>): string {
  return stringFrom(modifier.subType, stringFrom(modifier.subtype, "")).toLowerCase();
}

function abilityFromModifierSubType(subType: string): AbilityKey | undefined {
  const normalized = subType
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  if (normalized.includes("saving") || normalized.includes("save") || normalized.includes("skill")) {
    return undefined;
  }

  const direct = abilityScoreSubtypes[normalized];
  if (direct) {
    return direct;
  }

  const compact = normalized.replace(/-/g, "");
  if (compact.includes("strengthscore") || compact === "strength" || compact === "str") {
    return "str";
  }
  if (compact.includes("dexterityscore") || compact === "dexterity" || compact === "dex") {
    return "dex";
  }
  if (compact.includes("constitutionscore") || compact === "constitution" || compact === "con") {
    return "con";
  }
  if (compact.includes("intelligencescore") || compact === "intelligence" || compact === "int") {
    return "int";
  }
  if (compact.includes("wisdomscore") || compact === "wisdom" || compact === "wis") {
    return "wis";
  }
  if (compact.includes("charismascore") || compact === "charisma" || compact === "cha") {
    return "cha";
  }

  return undefined;
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function proficiencyForLevel(level: number): number {
  return Math.floor((Math.max(level, 1) - 1) / 4) + 2;
}

function looksLikeCombatCharacter(value: unknown): value is CombatCharacter {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.name === "string" &&
    typeof value.className === "string" &&
    typeof value.level === "number" &&
    typeof value.ac === "number" &&
    typeof value.maxHp === "number" &&
    Array.isArray(value.attacks)
  );
}

function normalizeAttack(value: unknown, index: number): AttackAction | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const damage = Array.isArray(value.damage) ? value.damage : [];
  const normalizedDamage = damage
    .filter(isRecord)
    .map((term) => ({
      count: numberFrom(term.count, 1),
      sides: numberFrom(term.sides, 6),
      bonus: numberFrom(term.bonus, 0)
    }))
    .filter((term) => term.count > 0 && term.sides >= 2);

  if (!normalizedDamage.length) {
    return undefined;
  }

  return {
    id: stringFrom(value.id, `attack-${index + 1}`),
    name: stringFrom(value.name, `Attack ${index + 1}`),
    toHit: numberFrom(value.toHit, 0),
    damage: normalizedDamage,
    damageType: typeof value.damageType === "string" ? value.damageType : undefined,
    attacksPerAction: numberFrom(value.attacksPerAction, 1)
  };
}

function parseDiceString(value: unknown): { count: number; sides: number; bonus?: number } | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const match = value.match(/(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/i);
  if (!match) {
    return undefined;
  }

  const bonus = match[3] && match[4] ? Number(`${match[3]}${match[4]}`) : 0;
  return {
    count: Number(match[1]),
    sides: Number(match[2]),
    bonus
  };
}

function diceStringFromDeepValue(value: unknown, depth = 0): { count: number; sides: number; bonus?: number } | undefined {
  if (depth > 5) {
    return undefined;
  }

  const parsed = parseDiceString(value);
  if (parsed) {
    return parsed;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const nested = diceStringFromDeepValue(entry, depth + 1);
      if (nested) {
        return nested;
      }
    }
    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const preferredKeys = [
    "diceString",
    "damageDiceString",
    "snippet",
    "displayAs",
    "value",
    "damage",
    "dice",
    "damageDice",
    "fixedDamage"
  ];
  for (const key of preferredKeys) {
    const nested = diceStringFromDeepValue(value[key], depth + 1);
    if (nested) {
      return nested;
    }
  }

  for (const nestedValue of Object.values(value)) {
    const nested = diceStringFromDeepValue(nestedValue, depth + 1);
    if (nested) {
      return nested;
    }
  }

  return undefined;
}

function normalizedLookupText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\+\d+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function weaponDamageProfileFromText(value: string): { count: number; sides: number; damageType: string } | undefined {
  const text = normalizedLookupText(value);
  return weaponDamageProfiles.find((profile) =>
    profile.aliases.some((alias) => {
      const normalizedAlias = normalizedLookupText(alias);
      return text === normalizedAlias || text.includes(` ${normalizedAlias} `) || text.startsWith(`${normalizedAlias} `) || text.endsWith(` ${normalizedAlias}`);
    })
  );
}

function armorProfileFromText(value: string): { baseAc: number; dex: "full" | "max2" | "none" } | undefined {
  const text = normalizedLookupText(value);
  return armorProfiles.find((profile) =>
    profile.aliases.some((alias) => {
      const normalizedAlias = normalizedLookupText(alias);
      return text === normalizedAlias || text.includes(` ${normalizedAlias} `) || text.startsWith(`${normalizedAlias} `) || text.endsWith(` ${normalizedAlias}`);
    })
  );
}

function damageTermsFrom(value: Record<string, unknown>): AttackAction["damage"] {
  const damage = isRecord(value.damage) ? value.damage : {};
  const dice = isRecord(damage.dice)
    ? damage.dice
    : isRecord(damage.damageDice)
      ? damage.damageDice
    : isRecord(value.dice)
      ? value.dice
      : isRecord(value.damageDice)
        ? value.damageDice
        : damage;
  const diceString =
    parseDiceString(value.diceString) ??
    parseDiceString(damage.diceString) ??
    parseDiceString(isRecord(damage.damageDice) ? damage.damageDice.diceString : undefined) ??
    parseDiceString(value.damageDiceString) ??
    parseDiceString(isRecord(value.damageDice) ? value.damageDice.diceString : undefined) ??
    parseDiceString(value.snippet) ??
    diceStringFromDeepValue(value);

  if (diceString) {
    const bonus = numberFrom(value.damageBonus, numberFrom(damage.bonus, numberFrom(value.fixedDamage, diceString.bonus ?? 0)));
    return [{ ...diceString, bonus }];
  }

  const diceCount = numberFrom(dice.diceCount, numberFrom(dice.count, 0));
  const diceValue = numberFrom(dice.diceValue, numberFrom(dice.sides, numberFrom(dice.diceMultiplier, 0)));
  const fixedDamage = numberFrom(value.fixedDamage, numberFrom(damage.fixedValue, numberFrom(damage.fixedDamage, 0)));
  const bonus = numberFrom(value.damageBonus, numberFrom(damage.bonus, fixedDamage));

  if (diceCount > 0 && diceValue >= 2) {
    return [{ count: diceCount, sides: diceValue, bonus }];
  }

  return [];
}

function damageTypeFrom(value: Record<string, unknown>): string | undefined {
  const candidates = [
    value.damageType,
    isRecord(value.damageType) ? value.damageType.name : undefined,
    isRecord(value.damage) ? value.damage.damageType : undefined,
    isRecord(value.damage) && isRecord(value.damage.damageType) ? value.damage.damageType.name : undefined,
    isRecord(value.definition) ? value.definition.damageType : undefined,
    isRecord(value.definition) && isRecord(value.definition.damageType) ? value.definition.damageType.name : undefined,
    isRecord(value.definition) && isRecord(value.definition.damage) ? value.definition.damage.damageType : undefined,
    isRecord(value.definition) && isRecord(value.definition.damage) && isRecord(value.definition.damage.damageType)
      ? value.definition.damage.damageType.name
      : undefined
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && supportedDamageTypes.has(candidate.toLowerCase())) {
      return candidate.toLowerCase();
    }
  }

  return undefined;
}

function actionFromLooseObject(value: unknown, index: number, kind: "weapon" | "spell" = "weapon"): CharacterAction | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const definition = isRecord(value.definition) ? value.definition : value;
  const name = stringFrom(definition.name, stringFrom(value.name, ""));
  if (!name) {
    return undefined;
  }

  const damage = damageTermsFrom({ ...definition, ...value });
  const toHit = numberFrom(value.toHit, numberFrom(value.attackBonus, numberFrom(definition.toHit, numberFrom(definition.attackBonus, Number.NaN))));
  if (!damage.length || !Number.isFinite(toHit)) {
    return undefined;
  }

  const base = {
    id: idFrom(value.id, idFrom(definition.id, `${kind}-${index + 1}`)),
    name,
    toHit,
    damage,
    damageType: damageTypeFrom({ ...definition, ...value }),
    attacksPerAction: numberFrom(value.attacksPerAction, 1)
  };

  if (kind === "spell") {
    return {
      ...base,
      kind: "spell",
      level: numberFrom(definition.level, 0),
      school: typeof definition.school === "string" ? definition.school : undefined,
        saveDc: typeof value.saveDc === "number" ? value.saveDc : undefined,
        resourceCost: numberFrom(definition.level, 0) === 0 ? "Cantrip" : `Level ${numberFrom(definition.level, 0)} slot`,
        purpose: "damage"
      };
  }

  return {
    ...base,
    kind: "weapon",
    ability: undefined,
    range: typeof definition.range === "string" ? definition.range : undefined
  };
}

function attackToWeaponAction(attack: AttackAction, index: number): CharacterAction {
  return {
    ...attack,
    id: attack.id || `weapon-${index + 1}`,
    kind: "weapon"
  };
}

function isRollableAction(action: CharacterAction): action is CharacterAction & AttackAction {
  return (action.kind === "weapon" || action.kind === "spell") && typeof action.toHit === "number" && Array.isArray(action.damage) && action.damage.length > 0;
}

function normalizeActions(value: unknown, attacks: AttackAction[]): CharacterAction[] {
  if (Array.isArray(value)) {
    const actions = value
      .filter(isRecord)
      .map((action, index): CharacterAction | undefined => {
        if (action.kind === "skill") {
          return {
            kind: "skill",
            id: stringFrom(action.id, `skill-${index + 1}`),
            name: stringFrom(action.name, `Skill ${index + 1}`),
            ability: (typeof action.ability === "string" ? action.ability : "str") as AbilityKey,
            modifier: numberFrom(action.modifier, 0),
            effect:
              action.effect === "defend" || action.effect === "setup" || action.effect === "pressure"
                ? action.effect
                : "setup",
            description: stringFrom(action.description, "Use this skill to shape the exchange.")
          };
        }

        if (action.kind === "spell") {
          const damage = Array.isArray(action.damage)
            ? action.damage
                .filter(isRecord)
                .map((term) => ({
                  count: numberFrom(term.count, 1),
                  sides: numberFrom(term.sides, 6),
                  bonus: numberFrom(term.bonus, 0)
                }))
                .filter((term) => term.count > 0 && term.sides >= 2)
            : undefined;

          return {
            kind: "spell",
            id: stringFrom(action.id, `spell-${index + 1}`),
            name: stringFrom(action.name, `Spell ${index + 1}`),
            level: numberFrom(action.level, 0),
            school: typeof action.school === "string" ? action.school : undefined,
            toHit: typeof action.toHit === "number" ? action.toHit : undefined,
            damage: damage?.length ? damage : undefined,
            damageType: typeof action.damageType === "string" ? action.damageType : undefined,
            attacksPerAction: numberFrom(action.attacksPerAction, 1),
            saveDc: typeof action.saveDc === "number" ? action.saveDc : undefined,
            resourceCost: typeof action.resourceCost === "string" ? action.resourceCost : undefined,
            purpose: typeof action.purpose === "string" ? (action.purpose as SpellPurpose) : "utility",
            concentration: typeof action.concentration === "boolean" ? action.concentration : undefined,
            duration: typeof action.duration === "string" ? action.duration : undefined,
            range: typeof action.range === "string" ? action.range : undefined,
            activation: typeof action.activation === "string" ? action.activation : undefined,
            description: typeof action.description === "string" ? action.description : undefined,
            requiresAttackRoll: typeof action.requiresAttackRoll === "boolean" ? action.requiresAttackRoll : undefined
          };
        }

        const attack = normalizeAttack(action, index);
        if (!attack) {
          return undefined;
        }

        return {
          ...attack,
          kind: "weapon",
          ability: typeof action.ability === "string" ? (action.ability as AbilityKey) : undefined,
          range: typeof action.range === "string" ? action.range : undefined
        };
      })
      .filter((action): action is CharacterAction => Boolean(action));

    if (actions.length) {
      return actions;
    }
  }

  return attacks.map(attackToWeaponAction);
}

function parseNormalizedCharacter(value: CombatCharacter): ParseResult {
  const warnings = Array.isArray(value.warnings) ? value.warnings.filter((entry) => typeof entry === "string") : [];
  const attacks = value.attacks.map(normalizeAttack).filter((attack): attack is AttackAction => Boolean(attack));
  if (!attacks.length) {
    warnings.push("No supported attack actions were found. Simulation accuracy will be limited.");
  }

  return {
    warnings: uniqueMessages(warnings),
    errors: [],
    character: {
      id: stringFrom(value.id, "imported-character"),
      name: value.name,
      className: value.className,
      level: value.level,
      proficiencyBonus: value.proficiencyBonus,
      abilityScores: value.abilityScores,
      ac: value.ac,
      maxHp: value.maxHp,
      speed: value.speed,
      initiativeBonus: value.initiativeBonus,
      attacks,
      actions: normalizeActions(value.actions, attacks),
      sheet: value.sheet,
      warnings: uniqueMessages(warnings)
    }
  };
}

function parseAbilityScores(root: Record<string, unknown>): Record<AbilityKey, number> {
  const scores: Record<AbilityKey, number> = {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10
  };

  if (isRecord(root.abilityScores)) {
    for (const ability of abilityKeys) {
      scores[ability] = numberFrom(root.abilityScores[ability], scores[ability]);
    }
  }

  const stats = Array.isArray(root.stats) ? root.stats : [];
  const bonusStats = Array.isArray(root.bonusStats) ? root.bonusStats : [];
  const overrideStats = Array.isArray(root.overrideStats) ? root.overrideStats : [];

  for (const stat of stats) {
    if (!isRecord(stat)) {
      continue;
    }
    const id = numberFrom(stat.id, numberFrom(stat.statId, numberFrom(stat.abilityId, 0)));
    const ability = abilityIds[id];
    if (!ability) {
      continue;
    }
    const bonus = bonusStats.find((entry) => isRecord(entry) && numberFrom(entry.id, numberFrom(entry.statId, numberFrom(entry.abilityId, 0))) === id);
    const override = overrideStats.find((entry) => isRecord(entry) && numberFrom(entry.id, numberFrom(entry.statId, numberFrom(entry.abilityId, 0))) === id);
    const overrideValue = statValueFrom(override, 0);
    const bonusValue = statValueFrom(bonus, 0);
    const baseValue = statValueFrom(stat, scores[ability]);
    scores[ability] = overrideValue > 0 ? overrideValue : baseValue + bonusValue;
  }

  for (const modifier of modifierEntries(root)) {
    const ability = abilityFromModifierSubType(modifierSubType(modifier));
    if (!ability) {
      continue;
    }

    const value = numberFrom(modifier.value, 0);
    if (modifierType(modifier) === "bonus") {
      scores[ability] += value;
    }
    if (modifierType(modifier) === "set" && value > scores[ability]) {
      scores[ability] = value;
    }
  }

  return scores;
}

function parseDdbActions(root: Record<string, unknown>, warnings: string[]): AttackAction[] {
  const actionsRoot = isRecord(root.actions) ? root.actions : {};
  const rawActions = recordsFromBuckets(actionsRoot);

  const attacks = rawActions
    .filter(isRecord)
    .map((action, index): AttackAction | undefined => {
      const loose = actionFromLooseObject(action, index);
      if (loose && loose.kind === "weapon") {
        return loose;
      }

      const definition = isRecord(action.definition) ? action.definition : action;
      const name = stringFrom(definition.name, `Attack ${index + 1}`);
      const toHit = numberFrom(action.toHit, numberFrom(definition.toHit, 0));
      const fixedDamage = numberFrom(action.fixedDamage, numberFrom(definition.fixedDamage, 0));
      const dice = isRecord(action.damage) ? action.damage : isRecord(definition.damage) ? definition.damage : {};
      const diceCount = numberFrom(dice.diceCount, 1);
      const diceValue = numberFrom(dice.diceValue, fixedDamage > 0 ? 1 : 0);
      const bonus = numberFrom(action.damageBonus, numberFrom(definition.damageBonus, fixedDamage));
      const profile = weaponDamageProfileFromText(`${name} ${stringFrom(definition.type, "")} ${stringFrom(definition.subType, "")}`);

      if (diceValue < 2 && fixedDamage <= 0) {
        if (!profile) {
          return undefined;
        }
        return {
          id: stringFrom(definition.id, `ddb-attack-${index + 1}`),
          name,
          toHit,
          damage: [{ count: profile.count, sides: profile.sides, bonus }],
          damageType: damageTypeFrom({ ...definition, ...action }) ?? profile.damageType,
          attacksPerAction: 1
        } satisfies AttackAction;
      }

      return {
        id: stringFrom(definition.id, `ddb-attack-${index + 1}`),
        name,
        toHit,
        damage: [{ count: diceCount, sides: Math.max(diceValue, 2), bonus }],
        damageType: damageTypeFrom({ ...definition, ...action }) ?? profile?.damageType,
        attacksPerAction: 1
      } satisfies AttackAction;
    })
    .filter((attack): attack is AttackAction => Boolean(attack));

  return attacks;
}

function propertyNames(definition: Record<string, unknown>): string[] {
  const properties = Array.isArray(definition.properties) ? definition.properties : [];
  return [
    stringFrom(definition.subType, ""),
    stringFrom(definition.subtype, ""),
    ...properties.map((property) => (isRecord(property) ? stringFrom(property.name, "") : ""))
  ]
    .filter(Boolean)
    .map((entry) => entry.toLowerCase());
}

function itemDescriptor(item: Record<string, unknown>, definition: Record<string, unknown>): string {
  return [
    stringFrom(item.name, ""),
    stringFrom(definition.name, ""),
    stringFrom(definition.type, ""),
    stringFrom(definition.filterType, ""),
    stringFrom(definition.baseType, ""),
    stringFrom(definition.subType, ""),
    stringFrom(definition.subtype, ""),
    propertyNames(definition).join(" "),
    plainTextFrom(definition.snippet),
    plainTextFrom(definition.description)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function looksLikeWeaponItem(item: Record<string, unknown>, definition: Record<string, unknown>): boolean {
  const descriptor = itemDescriptor(item, definition);
  return (
    descriptor.includes("weapon") ||
    descriptor.includes("melee") ||
    descriptor.includes("ranged") ||
    numberFrom(definition.attackType, numberFrom(definition.attackTypeId, 0)) > 0 ||
    Boolean(weaponDamageProfileFromText(descriptor))
  );
}

function looksLikeShieldItem(item: Record<string, unknown>, definition: Record<string, unknown>): boolean {
  return itemDescriptor(item, definition).includes("shield");
}

function looksLikeArmorItem(item: Record<string, unknown>, definition: Record<string, unknown>): boolean {
  const descriptor = itemDescriptor(item, definition);
  return descriptor.includes("armor") || Boolean(armorProfileFromText(descriptor));
}

function magicBonusFromName(name: string): number {
  const match = name.match(/[,+]\s*\+(\d+)/) ?? name.match(/\+(\d+)/);
  return match ? Number(match[1]) : 0;
}

function magicBonusFromModifiers(item: Record<string, unknown>, definition: Record<string, unknown>): number {
  const granted = [...recordsFromBuckets(item.grantedModifiers), ...recordsFromBuckets(definition.grantedModifiers)];
  const modifierBonus = granted.reduce((highest, modifier) => {
    const type = modifierType(modifier);
    const subType = modifierSubType(modifier);
    if (type !== "bonus") {
      return highest;
    }
    if (!subType.includes("magic") && !subType.includes("weapon") && !subType.includes("attack")) {
      return highest;
    }
    return Math.max(highest, numberFrom(modifier.value, 0));
  }, 0);

  return Math.max(
    modifierBonus,
    magicBonusFromName(stringFrom(item.name, "")),
    magicBonusFromName(stringFrom(definition.name, ""))
  );
}

function weaponAbility(definition: Record<string, unknown>, abilityScores: Record<AbilityKey, number>): AbilityKey {
  const attackType = numberFrom(definition.attackType, numberFrom(definition.attackTypeId, 0));
  const names = propertyNames(definition);
  const description = `${stringFrom(definition.type, "")} ${stringFrom(definition.filterType, "")} ${names.join(" ")}`.toLowerCase();
  const isRanged = attackType === 2 || description.includes("ranged");
  const isFinesse = description.includes("finesse");

  if (isFinesse) {
    return abilityModifier(abilityScores.dex) > abilityModifier(abilityScores.str) ? "dex" : "str";
  }

  return isRanged ? "dex" : "str";
}

function attacksPerActionFor(root: Record<string, unknown>): number {
  const classes = Array.isArray(root.classes) ? root.classes.filter(isRecord) : [];
  return classes.reduce((highest, classEntry) => {
    const definition = isRecord(classEntry.definition) ? classEntry.definition : {};
    const name = stringFrom(definition.name, "").toLowerCase();
    const level = numberFrom(classEntry.level, 1);

    if (name === "fighter") {
      if (level >= 20) {
        return Math.max(highest, 4);
      }
      if (level >= 11) {
        return Math.max(highest, 3);
      }
      if (level >= 5) {
        return Math.max(highest, 2);
      }
    }

    if (["barbarian", "monk", "paladin", "ranger"].includes(name) && level >= 5) {
      return Math.max(highest, 2);
    }

    return highest;
  }, 1);
}

function computedInventoryWeaponAction(
  item: Record<string, unknown>,
  index: number,
  abilityScores: Record<AbilityKey, number>,
  proficiencyBonus: number,
  attacksPerAction: number
): CharacterAction | undefined {
  const definition = isRecord(item.definition) ? item.definition : item;
  const name = stringFrom(item.name, stringFrom(definition.name, ""));
  if (!name) {
    return undefined;
  }

  if (!looksLikeWeaponItem(item, definition)) {
    return undefined;
  }

  const descriptor = itemDescriptor(item, definition);
  const profile = weaponDamageProfileFromText(descriptor);
  const damage = damageTermsFrom({ ...definition, ...item });
  const fallbackDamage = profile ? [{ count: profile.count, sides: profile.sides, bonus: 0 }] : [];
  const resolvedDamage = damage.length ? damage : fallbackDamage;
  if (!damage.length) {
    if (!fallbackDamage.length) {
      return undefined;
    }
  }

  const ability = weaponAbility(definition, abilityScores);
  const abilityBonus = abilityModifier(abilityScores[ability]);
  const magicBonus = magicBonusFromModifiers(item, definition);
  const explicitToHit = numberFrom(item.toHit, numberFrom(definition.toHit, Number.NaN));
  const toHit = Number.isFinite(explicitToHit) ? explicitToHit : abilityBonus + proficiencyBonus + magicBonus;
  const damageBonus = abilityBonus + magicBonus;
  const range =
    typeof definition.range === "number"
      ? `${definition.range}${typeof definition.longRange === "number" ? `/${definition.longRange}` : ""} ft.`
      : typeof definition.range === "string"
        ? definition.range
        : stringFrom(definition.subType, "");

  return {
    kind: "weapon",
    id: idFrom(item.id, idFrom(definition.id, `inventory-weapon-${index + 1}`)),
    name,
    toHit,
    damage: resolvedDamage.map((term) => ({
      ...term,
      bonus: term.bonus || damageBonus
    })),
    damageType: damageTypeFrom({ ...definition, ...item }) ?? profile?.damageType,
    attacksPerAction,
    ability,
    range: range || undefined
  };
}

function parseInventoryWeapons(
  root: Record<string, unknown>,
  abilityScores: Record<AbilityKey, number>,
  proficiencyBonus: number
): CharacterAction[] {
  const inventory = Array.isArray(root.inventory) ? root.inventory : [];
  const attacksPerAction = attacksPerActionFor(root);
  return inventory
    .filter(isRecord)
    .filter((item) => item.equipped !== false)
    .map((item, index): CharacterAction | undefined => {
      const definition = isRecord(item.definition) ? item.definition : item;
      if (!looksLikeWeaponItem(item, definition)) {
        return undefined;
      }

      return (
        computedInventoryWeaponAction(item, index, abilityScores, proficiencyBonus, attacksPerAction) ??
        actionFromLooseObject(item, index, "weapon") ??
        actionFromLooseObject(definition, index, "weapon")
      );
    })
    .filter((action): action is CharacterAction => Boolean(action));
}

function armorBaseFrom(item: Record<string, unknown>, definition: Record<string, unknown>, profile?: { baseAc: number }): number {
  return numberFrom(
    definition.armorClass,
    numberFrom(
      definition.baseArmorClass,
      numberFrom(definition.armorClassBase, numberFrom(definition.ac, numberFrom(item.armorClass, profile?.baseAc ?? 0)))
    )
  );
}

function armorDexModeFrom(descriptor: string, profile?: { dex: "full" | "max2" | "none" }): "full" | "max2" | "none" {
  if (profile) {
    return profile.dex;
  }
  if (descriptor.includes("heavy")) {
    return "none";
  }
  if (descriptor.includes("medium")) {
    return "max2";
  }
  return "full";
}

function computeInventoryArmorClass(root: Record<string, unknown>, dexMod: number): number {
  const inventory = Array.isArray(root.inventory) ? root.inventory.filter(isRecord) : [];
  let armorAc = 10 + dexMod;
  let shieldBonus = 0;

  for (const item of inventory) {
    if (item.equipped === false) {
      continue;
    }

    const definition = isRecord(item.definition) ? item.definition : item;
    const descriptor = itemDescriptor(item, definition);
    if (looksLikeShieldItem(item, definition)) {
      const explicitBonus = numberFrom(definition.grantedArmorClass, numberFrom(definition.bonusArmorClass, numberFrom(definition.acBonus, 0)));
      shieldBonus += (explicitBonus || 2) + magicBonusFromName(stringFrom(item.name, stringFrom(definition.name, "")));
      continue;
    }

    if (!looksLikeArmorItem(item, definition)) {
      continue;
    }

    const profile = armorProfileFromText(descriptor);
    const baseAc = armorBaseFrom(item, definition, profile);
    if (baseAc < 10) {
      continue;
    }

    const dexMode = armorDexModeFrom(descriptor, profile);
    const dexBonus = dexMode === "none" ? 0 : dexMode === "max2" ? Math.min(dexMod, 2) : dexMod;
    const magicBonus = magicBonusFromName(stringFrom(item.name, stringFrom(definition.name, "")));
    armorAc = Math.max(armorAc, baseAc + dexBonus + magicBonus);
  }

  return armorAc + shieldBonus;
}

function parseArmorClass(root: Record<string, unknown>, dexMod: number): number {
  const explicitAc = numberFrom(root.armorClass, numberFrom(root.ac, numberFrom(root.overrideArmorClass, Number.NaN)));
  if (Number.isFinite(explicitAc) && explicitAc > 0) {
    return explicitAc;
  }

  return computeInventoryArmorClass(root, dexMod);
}

function spellcastingAbility(root: Record<string, unknown>, spell: Record<string, unknown>, definition: Record<string, unknown>): AbilityKey {
  const classEntry = (Array.isArray(root.classes) ? root.classes : []).find(isRecord);
  const classDefinition = classEntry && isRecord(classEntry.definition) ? classEntry.definition : {};
  const id = numberFrom(
    spell.spellCastingAbilityId,
    numberFrom(
      spell.spellcastingAbilityId,
      numberFrom(
        definition.spellCastingAbilityId,
        numberFrom(definition.spellcastingAbilityId, numberFrom(classEntry && isRecord(classEntry) ? classEntry.spellCastingAbilityId : undefined, numberFrom(classDefinition.spellCastingAbilityId, 0)))
      )
    )
  );

  return abilityIds[id] ?? "cha";
}

function plainTextFrom(value: unknown): string {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
}

function spellText(spell: Record<string, unknown>, definition: Record<string, unknown>): string {
  return [
    stringFrom(definition.name, stringFrom(spell.name, "")),
    plainTextFrom(definition.snippet),
    plainTextFrom(spell.snippet),
    plainTextFrom(definition.description),
    plainTextFrom(spell.description)
  ]
    .join(" ")
    .toLowerCase();
}

function spellPurposeFrom(
  spell: Record<string, unknown>,
  definition: Record<string, unknown>,
  damage: AttackAction["damage"]
): SpellPurpose {
  const text = spellText(spell, definition);

  if (/\b(heal|healing|regain|restores?|cure wounds|healing word|lay on hands)\b/.test(text)) {
    return "healing";
  }
  if (/\b(summon|conjure|animate dead|spiritual weapon|familiar)\b/.test(text)) {
    return "summon";
  }
  if (/\b(teleport|fly|flight|speed|movement|misty step|dimension door|levitate|jump)\b/.test(text)) {
    return "mobility";
  }
  if (/\b(armor|shield|protect|ward|resistance|temporary hit points|temp hp|sanctuary|blur)\b/.test(text)) {
    return "defense";
  }
  if (/\b(bless|haste|advantage|enhance ability|heroism|enlarge)\b/.test(text)) {
    return "buff";
  }
  if (/\b(hex|bane|curse|disadvantage|penalty|weaken)\b/.test(text)) {
    return "debuff";
  }
  if (/\b(control|command|charm|frighten|frightened|paraly[sz]e|restrain|stun|blind|darkness|silence|hold person|banish|slow|web|hypnotic|incapacitated|invisible|sphere|wall)\b/.test(text)) {
    return "control";
  }
  if (damage.length || damageTypeFrom({ ...definition, ...spell })) {
    return "damage";
  }

  return "utility";
}

function abilityFromUnknown(value: unknown): AbilityKey | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return abilityIds[value];
  }

  if (typeof value !== "string") {
    return undefined;
  }

  return abilityFromModifierSubType(value) ?? abilityKeys.find((key) => value.toLowerCase().includes(key));
}

function saveAbilityFrom(spell: Record<string, unknown>, definition: Record<string, unknown>): AbilityKey | undefined {
  const direct =
    abilityFromUnknown(spell.saveAbility) ??
    abilityFromUnknown(spell.saveAbilityId) ??
    abilityFromUnknown(spell.savingThrowAbilityId) ??
    abilityFromUnknown(definition.saveAbility) ??
    abilityFromUnknown(definition.saveAbilityId) ??
    abilityFromUnknown(definition.savingThrowAbilityId);
  if (direct) {
    return direct;
  }

  const text = spellText(spell, definition);
  if (/\b(wisdom|wis)\b/.test(text) || /\b(hold person|charm|frighten|frightened|command|bane)\b/.test(text)) {
    return "wis";
  }
  if (/\b(dexterity|dex)\b/.test(text) || /\b(dodge|dodge out|explosion|line|cone|sphere|fireball|lightning bolt|web)\b/.test(text)) {
    return "dex";
  }
  if (/\b(constitution|con)\b/.test(text) || /\b(poison|disease|thunder|cold|paraly[sz]e)\b/.test(text)) {
    return "con";
  }
  if (/\b(strength|str)\b/.test(text) || /\b(push|pull|restrain|grapple)\b/.test(text)) {
    return "str";
  }
  if (/\b(intelligence|int)\b/.test(text)) {
    return "int";
  }
  if (/\b(charisma|cha)\b/.test(text) || /\b(banish|banishment)\b/.test(text)) {
    return "cha";
  }

  return undefined;
}

function formatDistance(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value} ft.`;
  }
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return undefined;
}

function formatRange(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return formatDistance(value);
  }

  const origin = stringFrom(value.origin, stringFrom(value.rangeType, ""));
  const distance = isRecord(value.rangeValue)
    ? formatDistance(value.rangeValue.amount)
    : formatDistance(value.distance) ?? formatDistance(value.aoeValue) ?? formatDistance(value.amount);
  const aoe = stringFrom(value.aoeType, "");

  return [distance, origin, aoe].filter(Boolean).join(" ") || undefined;
}

function formatDuration(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return typeof value === "string" ? value : undefined;
  }

  const amount = numberFrom(value.durationInterval, numberFrom(value.amount, 0));
  const unit = stringFrom(value.durationUnit, stringFrom(value.unit, ""));
  const type = stringFrom(value.durationType, stringFrom(value.type, ""));
  if (amount && unit) {
    return `${amount} ${unit}${amount === 1 ? "" : "s"}`;
  }
  return type || undefined;
}

function formatActivation(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return typeof value === "string" ? value : undefined;
  }

  const amount = numberFrom(value.activationTime, numberFrom(value.amount, 0));
  const type = stringFrom(value.activationType, stringFrom(value.type, ""));
  return [amount || "", type].filter(Boolean).join(" ") || undefined;
}

function ddbSpellRecords(root: Record<string, unknown>): Record<string, unknown>[] {
  const spellsRoot = isRecord(root.spells) ? root.spells : {};
  const directSpells = recordsFromBuckets(spellsRoot);
  const classSpellGroups = Array.isArray(root.classSpells) ? root.classSpells.filter(isRecord) : [];
  const classSpells = classSpellGroups.flatMap((group) => {
    if (Array.isArray(group.spells)) {
      return group.spells.filter(isRecord);
    }
    return recordsFromBuckets(group.spells);
  });
  const customSpells = recordsFromBuckets(root.customSpells);

  return [...directSpells, ...classSpells, ...customSpells].filter(
    (spell, index, allSpells) =>
      allSpells.findIndex((candidate) => {
        const spellDefinition = isRecord(spell.definition) ? spell.definition : spell;
        const candidateDefinition = isRecord(candidate.definition) ? candidate.definition : candidate;
        return (
          idFrom(candidate.id, idFrom(candidateDefinition.id, "")) === idFrom(spell.id, idFrom(spellDefinition.id, "")) &&
          stringFrom(candidateDefinition.name, stringFrom(candidate.name, "")) === stringFrom(spellDefinition.name, stringFrom(spell.name, ""))
        );
      }) === index
  );
}

function parseDdbSpells(
  root: Record<string, unknown>,
  abilityScores: Record<AbilityKey, number>,
  proficiencyBonus: number
): CharacterAction[] {
  return ddbSpellRecords(root)
    .filter(isRecord)
    .map((spell, index): CharacterAction | undefined => {
      const definition = isRecord(spell.definition) ? spell.definition : spell;
      const name = stringFrom(definition.name, stringFrom(spell.name, ""));
      if (!name) {
        return undefined;
      }

      const activation = isRecord(definition.activation) ? definition.activation : {};
      const attackType = numberFrom(definition.attackType, numberFrom(spell.attackType, 0));
      const requiresAttackRoll = Boolean(definition.requiresAttackRoll) || Boolean(spell.requiresAttackRoll) || attackType > 0;
      const ability = spellcastingAbility(root, spell, definition);
      const computedToHit = abilityModifier(abilityScores[ability]) + proficiencyBonus;
      const computedSaveDc = 8 + computedToHit;
      const damage = damageTermsFrom({ ...definition, ...spell });
      const toHit = numberFrom(
        spell.toHit,
        numberFrom(definition.toHit, numberFrom(root.spellAttackBonus, numberFrom(root.spellAttack, computedToHit)))
      );
      const saveDc = numberFrom(spell.saveDc, numberFrom(definition.saveDc, numberFrom(root.spellSaveDc, computedSaveDc)));
      const purpose = spellPurposeFrom(spell, definition, damage);
      const concentration =
        Boolean(spell.concentration) ||
        Boolean(definition.concentration) ||
        Boolean(isRecord(definition.duration) ? definition.duration.concentration : false) ||
        spellText(spell, definition).includes("concentration");

      return {
        kind: "spell",
        id: idFrom(spell.id, idFrom(definition.id, `spell-${index + 1}`)),
        name,
        level: numberFrom(definition.level, numberFrom(spell.level, 0)),
        school: isRecord(definition.school) ? stringFrom(definition.school.name, "") : stringFrom(definition.school, ""),
        toHit: requiresAttackRoll ? toHit : undefined,
        damage: damage.length ? damage : undefined,
        damageType: damageTypeFrom({ ...definition, ...spell }),
        attacksPerAction: requiresAttackRoll ? 1 : undefined,
        saveDc,
        saveAbility: saveAbilityFrom(spell, definition),
        resourceCost: numberFrom(definition.level, numberFrom(spell.level, 0)) === 0 ? "Cantrip" : `Level ${numberFrom(definition.level, numberFrom(spell.level, 0))} slot`,
        purpose,
        concentration,
        duration: formatDuration(definition.duration ?? spell.duration),
        range: formatRange(definition.range ?? spell.range),
        activation: formatActivation(activation),
        description: plainTextFrom(definition.snippet) || plainTextFrom(definition.description),
        requiresAttackRoll
      } satisfies SpellAction;
    })
    .filter((action): action is CharacterAction => Boolean(action));
}

function skillModifier(score: number, proficiencyBonus: number, proficient: boolean): number {
  return abilityModifier(score) + (proficient ? proficiencyBonus : 0);
}

function parseDdbSkills(root: Record<string, unknown>, abilityScores: Record<AbilityKey, number>, proficiencyBonus: number): SkillAction[] {
  const allModifiers = modifierEntries(root);
  const proficientNames = new Set(
    allModifiers
      .filter(isRecord)
      .filter((modifier) => ["proficiency", "expertise"].includes(modifierType(modifier)))
      .map((modifier) => modifierSubType(modifier))
      .filter(Boolean)
  );

  const skillDefinitions: Array<Omit<SkillAction, "modifier"> & { proficientKey: string }> = [
    {
      kind: "skill",
      id: "athletics",
      name: "Athletics",
      ability: "str",
      effect: "pressure",
      description: "Drive the enemy off balance.",
      proficientKey: "athletics"
    },
    {
      kind: "skill",
      id: "acrobatics",
      name: "Acrobatics",
      ability: "dex",
      effect: "defend",
      description: "Slip away from the worst of the counterattack.",
      proficientKey: "acrobatics"
    },
    {
      kind: "skill",
      id: "perception",
      name: "Perception",
      ability: "wis",
      effect: "setup",
      description: "Read the enemy's stance and find an opening.",
      proficientKey: "perception"
    },
    {
      kind: "skill",
      id: "stealth",
      name: "Stealth",
      ability: "dex",
      effect: "setup",
      description: "Fade out of rhythm and strike from an unexpected angle.",
      proficientKey: "stealth"
    },
    {
      kind: "skill",
      id: "intimidation",
      name: "Intimidation",
      ability: "cha",
      effect: "pressure",
      description: "Break the enemy's nerve with a hard advance.",
      proficientKey: "intimidation"
    }
  ];

  return skillDefinitions.map((skill) => ({
    ...skill,
    modifier: skillModifier(abilityScores[skill.ability], proficiencyBonus, proficientNames.has(skill.proficientKey))
  }));
}

function parseSheetInventory(root: Record<string, unknown>): ImportedCharacterSheet["inventory"] {
  const inventory = Array.isArray(root.inventory) ? root.inventory.filter(isRecord) : [];
  return inventory.map((item, index) => {
    const definition = isRecord(item.definition) ? item.definition : item;
    const name = stringFrom(item.name, stringFrom(definition.name, `Item ${index + 1}`));
    const type = stringFrom(definition.type, stringFrom(definition.filterType, ""));
    const properties = propertyNames(definition);
    const descriptor = `${name} ${type} ${stringFrom(definition.filterType, "")} ${stringFrom(definition.subType, "")} ${properties.join(" ")}`.toLowerCase();
    const category = looksLikeShieldItem(item, definition)
      ? "shield"
      : looksLikeArmorItem(item, definition)
        ? "armor"
        : looksLikeWeaponItem(item, definition)
          ? "weapon"
          : "equipment";
    const armorClass = numberFrom(definition.armorClass, numberFrom(definition.ac, 0)) || undefined;
    const acBonus =
      category === "shield"
        ? numberFrom(definition.grantedArmorClass, numberFrom(definition.bonusArmorClass, numberFrom(definition.acBonus, 2)))
        : numberFrom(definition.grantedArmorClass, numberFrom(definition.bonusArmorClass, numberFrom(definition.acBonus, 0))) || undefined;

    return {
      id: idFrom(item.id, idFrom(definition.id, `inventory-${index + 1}`)),
      name,
      type: type || undefined,
      equipped: typeof item.equipped === "boolean" ? item.equipped : undefined,
      category,
      armorClass,
      acBonus
    };
  });
}

function parseSheetFeatures(root: Record<string, unknown>): ImportedCharacterSheet["features"] {
  const featureBuckets = [
    ...(Array.isArray(root.classFeatures) ? root.classFeatures.filter(isRecord) : []),
    ...(Array.isArray(root.feats) ? root.feats.filter(isRecord) : []),
    ...(Array.isArray(root.raceFeatures) ? root.raceFeatures.filter(isRecord) : []),
    ...recordsFromBuckets(root.features)
  ];

  return featureBuckets
    .map((feature, index): ImportedFeatureSummary | undefined => {
      const definition = isRecord(feature.definition) ? feature.definition : feature;
      const name = stringFrom(definition.name, stringFrom(feature.name, ""));
      if (!name) {
        return undefined;
      }
      return {
        id: idFrom(feature.id, idFrom(definition.id, `feature-${index + 1}`)),
        name,
        source: stringFrom(definition.source, stringFrom(feature.source, "")) || undefined
      };
    })
    .filter((feature): feature is ImportedFeatureSummary => Boolean(feature))
    .filter((feature, index, allFeatures) => allFeatures.findIndex((candidate) => candidate.name === feature.name) === index);
}

function parseSheetProficiencies(root: Record<string, unknown>): string[] {
  return uniqueMessages(
    modifierEntries(root)
      .filter((modifier) => ["proficiency", "expertise"].includes(modifierType(modifier)))
      .map((modifier) => modifierSubType(modifier).replace(/-/g, " "))
      .filter(Boolean)
  );
}

function parseSheetClasses(root: Record<string, unknown>): ImportedCharacterSheet["classes"] {
  const classes = Array.isArray(root.classes) ? root.classes.filter(isRecord) : [];
  return classes.map((classEntry) => {
    const definition = isRecord(classEntry.definition) ? classEntry.definition : {};
    const subclassDefinition = isRecord(classEntry.subclassDefinition) ? classEntry.subclassDefinition : {};
    return {
      name: stringFrom(definition.name, "Adventurer"),
      level: numberFrom(classEntry.level, 1),
      subclass: stringFrom(subclassDefinition.name, "") || undefined
    };
  });
}

function spellSummaryFromAction(action: CharacterAction): ImportedSpellSummary | undefined {
  if (action.kind !== "spell") {
    return undefined;
  }

  return {
    id: action.id,
    name: action.name,
    level: action.level,
    school: action.school,
    purpose: action.purpose,
    saveAbility: action.saveAbility,
    concentration: action.concentration,
    duration: action.duration,
    range: action.range
  };
}

function parseSheetData(root: Record<string, unknown>, spellActions: CharacterAction[]): ImportedCharacterSheet {
  const race = isRecord(root.race) ? root.race : {};
  const background = isRecord(root.background) ? root.background : {};
  const backgroundDefinition = isRecord(background.definition) ? background.definition : background;

  const inventory = parseSheetInventory(root);

  return {
    race: stringFrom(race.fullName, stringFrom(race.baseName, stringFrom(race.name, ""))) || undefined,
    background: stringFrom(backgroundDefinition.name, "") || undefined,
    classes: parseSheetClasses(root),
    inventory,
    weapons: inventory.filter((item) => item.category === "weapon"),
    armor: inventory.filter((item) => item.category === "armor" || item.category === "shield"),
    features: parseSheetFeatures(root),
    spells: spellActions.map(spellSummaryFromAction).filter((spell): spell is ImportedSpellSummary => Boolean(spell)),
    proficiencies: parseSheetProficiencies(root)
  };
}

export function parseDdbCharacterJson(input: unknown): ParseResult {
  if (looksLikeCombatCharacter(input)) {
    return parseNormalizedCharacter(input);
  }

  if (!isRecord(input)) {
    return {
      warnings: [],
      errors: ["Imported JSON must be an object."]
    };
  }

  if (input.success === false) {
    const data = isRecord(input.data) ? input.data : {};
    const serverMessage = stringFrom(data.serverMessage, stringFrom(input.message, "D&D Beyond did not return character data."));
    const errorCode = typeof data.errorCode === "string" ? ` Error code: ${data.errorCode}.` : "";
    return {
      warnings: [],
      errors: [
        `${serverMessage}.${errorCode} Set the D&D Beyond character privacy to Public, confirm you can view its share link, then try again.`
      ]
    };
  }

  const root = isRecord(input.data) ? input.data : input;
  if (typeof root.serverMessage === "string") {
    return {
      warnings: [],
      errors: [`D&D Beyond returned "${root.serverMessage}" instead of character data. Set the character privacy to Public and retry.`]
    };
  }

  if (looksLikeCombatCharacter(root)) {
    return parseNormalizedCharacter(root);
  }

  const warnings: string[] = [];
  const classes = Array.isArray(root.classes) ? root.classes.filter(isRecord) : [];
  if (classes.length > 1) {
    return {
      warnings,
      errors: ["Multiclass characters are not supported in v1.0."]
    };
  }

  const classEntry = classes[0];
  const classDefinition = classEntry && isRecord(classEntry.definition) ? classEntry.definition : {};
  const level = classEntry ? numberFrom(classEntry.level, 1) : numberFrom(root.level, 1);
  const abilityScores = parseAbilityScores(root);
  const conMod = abilityModifier(abilityScores.con);
  const dexMod = abilityModifier(abilityScores.dex);
  const armorClass = parseArmorClass(root, dexMod);
  const hpInfo = isRecord(root.hitPointInfo) ? root.hitPointInfo : {};
  const maxHp = numberFrom(hpInfo.maximum, numberFrom(root.maxHp, Math.max(1, numberFrom(root.baseHitPoints, 8) + conMod * level)));
  const attacks = parseDdbActions(root, warnings);
  const inventoryWeapons = parseInventoryWeapons(root, abilityScores, proficiencyForLevel(level));
  const spellActions = parseDdbSpells(root, abilityScores, proficiencyForLevel(level));
  const skillActions = parseDdbSkills(root, abilityScores, proficiencyForLevel(level));
  const actions = [...attacks.map(attackToWeaponAction), ...inventoryWeapons, ...spellActions, ...skillActions].filter(
    (action, index, allActions) => allActions.findIndex((candidate) => candidate.id === action.id && candidate.name === action.name) === index
  );
  const attackActions = actions
    .filter(isRollableAction)
    .map((action) => ({
      id: action.id,
      name: action.name,
      toHit: action.toHit,
      damage: action.damage,
      damageType: action.damageType,
      attacksPerAction: action.attacksPerAction
    }));

  if (attackActions.length === 0) {
    warnings.push("No weapon or attack-roll spell actions were parsed from D&D Beyond. Playable mode can still use skills, but batch combat needs an attack action.");
  }

  if (spellActions.some((action) => action.kind === "spell" && !isRollableAction(action))) {
    warnings.push("Control, utility, and non-damage spells are imported as sheet actions. Their tactical effects are approximated until full spell rules are modeled.");
  }

  warnings.push("D&D Beyond parser is defensive; exact weapon, spell, feature, and resource parsing may need refinement for some sheets.");

  const sheet = parseSheetData(root, spellActions);

  return {
    warnings: uniqueMessages(warnings),
    errors: [],
    character: {
      id: stringFrom(root.id, "ddb-character"),
      name: stringFrom(root.name, "Imported Character"),
      className: stringFrom(classDefinition.name, stringFrom(root.className, "Adventurer")),
      level,
      proficiencyBonus: proficiencyForLevel(level),
      abilityScores,
      ac: armorClass,
      maxHp,
      speed: numberFrom(root.speed, 30),
      initiativeBonus: dexMod,
      attacks: attackActions,
      actions,
      sheet,
      warnings: uniqueMessages(warnings)
    }
  };
}
