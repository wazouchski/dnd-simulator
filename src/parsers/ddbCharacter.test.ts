import { describe, expect, it } from "vitest";
import { sampleCharacter } from "@/data/sampleCharacter";
import { parseDdbCharacterJson } from "@/parsers/ddbCharacter";

describe("D&D Beyond character parser", () => {
  it("accepts normalized character JSON", () => {
    const parsed = parseDdbCharacterJson(sampleCharacter);

    expect(parsed.errors).toEqual([]);
    expect(parsed.character?.name).toBe(sampleCharacter.name);
    expect(parsed.character?.actions.some((action) => action.kind === "skill")).toBe(true);
  });

  it("rejects multiclass D&D Beyond payloads", () => {
    const parsed = parseDdbCharacterJson({
      data: {
        name: "Split Build",
        classes: [
          { level: 2, definition: { name: "Fighter" } },
          { level: 1, definition: { name: "Rogue" } }
        ]
      }
    });

    expect(parsed.errors[0]).toMatch(/Multiclass/);
  });

  it("warns when no attacks are available", () => {
    const parsed = parseDdbCharacterJson({
      name: "No Attacks",
      className: "Wizard",
      level: 5,
      proficiencyBonus: 3,
      abilityScores: { str: 8, dex: 14, con: 12, int: 18, wis: 10, cha: 10 },
      ac: 12,
      maxHp: 28,
      speed: 30,
      initiativeBonus: 2,
      attacks: [],
      warnings: []
    });

    expect(parsed.warnings.some((warning) => warning.includes("No supported attack"))).toBe(true);
  });

  it("rejects unauthorized D&D Beyond error payloads", () => {
    const parsed = parseDdbCharacterJson({
      id: 0,
      success: false,
      message: "An unexpected error has occurred",
      data: {
        serverMessage: "Unauthorized Access Attempt.",
        errorCode: "1770d15"
      }
    });

    expect(parsed.character).toBeUndefined();
    expect(parsed.errors[0]).toMatch(/Unauthorized Access Attempt/);
    expect(parsed.errors[0]).toMatch(/Public/);
  });

  it("adds fallback skill actions to D&D Beyond-like characters", () => {
    const parsed = parseDdbCharacterJson({
      data: {
        id: 123,
        name: "Skill Tester",
        armorClass: 14,
        baseHitPoints: 20,
        stats: [
          { id: 1, value: 14 },
          { id: 2, value: 14 },
          { id: 3, value: 12 },
          { id: 4, value: 10 },
          { id: 5, value: 12 },
          { id: 6, value: 10 }
        ],
        classes: [{ level: 3, definition: { name: "Ranger" } }],
        actions: {
          attack: [
            {
              id: "bow",
              name: "Longbow",
              toHit: 5,
              damage: { diceCount: 1, diceValue: 8 },
              damageBonus: 3
            }
          ]
        }
      }
    });

    expect(parsed.character?.actions.some((action) => action.kind === "weapon")).toBe(true);
    expect(parsed.character?.actions.some((action) => action.kind === "skill")).toBe(true);
  });

  it("extracts equipped inventory weapons when action buckets are empty", () => {
    const parsed = parseDdbCharacterJson({
      data: {
        id: 456,
        name: "Inventory Fighter",
        armorClass: 16,
        baseHitPoints: 24,
        stats: [
          { id: 1, value: 16 },
          { id: 2, value: 12 },
          { id: 3, value: 14 }
        ],
        classes: [{ level: 4, definition: { name: "Fighter" } }],
        inventory: [
          {
            equipped: true,
            definition: {
              id: "battleaxe",
              name: "Battleaxe",
              type: "Weapon",
              attackBonus: 5,
              damage: { diceString: "1d8+3" },
              damageType: "slashing"
            }
          }
        ]
      }
    });

    expect(parsed.character?.attacks[0]?.name).toBe("Battleaxe");
    expect(parsed.character?.actions.some((action) => action.kind === "weapon" && action.name === "Battleaxe")).toBe(true);
  });

  it("computes D&D Beyond weapon and attack spell rows from sheet source data", () => {
    const parsed = parseDdbCharacterJson({
      data: {
        id: 789,
        name: "Rok Titanclaw",
        armorClass: 11,
        baseHitPoints: 52,
        stats: [
          { id: 1, value: 14 },
          { id: 2, value: 14 },
          { id: 3, value: 14 },
          { id: 4, value: 10 },
          { id: 5, value: 10 },
          { id: 6, value: 14 }
        ],
        classes: [{ level: 5, definition: { name: "Paladin", spellCastingAbilityId: 6 } }],
        inventory: [
          {
            id: "longbow-plus-one",
            equipped: true,
            definition: {
              name: "Longbow, +1",
              type: "Weapon",
              filterType: "Weapon",
              subType: "Martial, Ranged",
              attackType: 2,
              range: 150,
              longRange: 600,
              damage: { diceString: "1d8" },
              damageType: "piercing"
            }
          },
          {
            id: "warhammer-plus-one",
            equipped: true,
            definition: {
              name: "Warhammer, +1",
              type: "Weapon",
              filterType: "Weapon",
              subType: "Martial, Melee",
              attackType: 1,
              damage: { diceString: "1d8" },
              damageType: "bludgeoning"
            }
          }
        ],
        spells: {
          class: [
            {
              id: "inflict-wounds",
              spellCastingAbilityId: 6,
              definition: {
                name: "Inflict Wounds",
                level: 1,
                attackType: 1,
                requiresAttackRoll: true,
                damage: {
                  damageDice: { diceString: "3d10", diceCount: 3, diceValue: 10 },
                  damageType: "necrotic"
                }
              }
            }
          ]
        }
      }
    });

    const longbow = parsed.character?.actions.find((action) => action.kind === "weapon" && action.name === "Longbow, +1");
    const warhammer = parsed.character?.actions.find((action) => action.kind === "weapon" && action.name === "Warhammer, +1");
    const inflictWounds = parsed.character?.actions.find((action) => action.kind === "spell" && action.name === "Inflict Wounds");

    expect(longbow).toMatchObject({
      toHit: 6,
      attacksPerAction: 2,
      damage: [{ count: 1, sides: 8, bonus: 3 }]
    });
    expect(warhammer).toMatchObject({
      toHit: 6,
      attacksPerAction: 2,
      damage: [{ count: 1, sides: 8, bonus: 3 }]
    });
    expect(inflictWounds).toMatchObject({
      toHit: 5,
      damage: [{ count: 3, sides: 10, bonus: 0 }]
    });
    expect(parsed.character?.attacks).toHaveLength(3);
    expect(parsed.character?.sheet?.weapons.map((item) => item.name)).toEqual(["Longbow, +1", "Warhammer, +1"]);
  });

  it("recovers level 6 paladin weapons and attack spells from generic D&D Beyond buckets", () => {
    const parsed = parseDdbCharacterJson({
      data: {
        id: 790,
        name: "Level Six Paladin",
        armorClass: 18,
        baseHitPoints: 54,
        stats: [
          { id: 1, value: 16 },
          { id: 2, value: 10 },
          { id: 3, value: 14 },
          { id: 4, value: 8 },
          { id: 5, value: 12 },
          { id: 6, value: 16 }
        ],
        classes: [{ level: 6, definition: { name: "Paladin", spellCastingAbilityId: 6 } }],
        inventory: [
          {
            id: "ddb-warhammer-plus-one",
            equipped: true,
            definition: {
              id: "ddb-warhammer-plus-one-def",
              name: "Warhammer, +1",
              type: "Equipment",
              filterType: "Equipment",
              subType: "Martial, Melee",
              attackType: 1,
              properties: [{ name: "Versatile" }]
            }
          },
          {
            id: "ddb-longbow-plus-one",
            equipped: true,
            definition: {
              id: "ddb-longbow-plus-one-def",
              name: "Longbow, +1",
              type: "Equipment",
              filterType: "Equipment",
              subType: "Martial, Ranged",
              attackType: 2,
              range: 150,
              longRange: 600,
              properties: [{ name: "Ammunition" }, { name: "Two-Handed" }]
            }
          }
        ],
        classSpells: [
          {
            characterClassId: 1,
            spells: [
              {
                id: "ddb-inflict-wounds",
                prepared: true,
                spellCastingAbilityId: 6,
                definition: {
                  id: "inflict-wounds",
                  name: "Inflict Wounds",
                  level: 1,
                  attackType: 1,
                  snippet: "Make a melee spell attack. On a hit, the target takes 3d10 necrotic damage.",
                  damageType: "necrotic"
                }
              }
            ]
          }
        ]
      }
    });

    const attacks = parsed.character?.attacks ?? [];
    expect(attacks.map((attack) => attack.name)).toEqual(["Warhammer, +1", "Longbow, +1", "Inflict Wounds"]);
    expect(attacks.find((attack) => attack.name === "Warhammer, +1")).toMatchObject({
      toHit: 7,
      damage: [{ count: 1, sides: 8, bonus: 4 }],
      attacksPerAction: 2
    });
    expect(attacks.find((attack) => attack.name === "Longbow, +1")).toMatchObject({
      toHit: 4,
      damage: [{ count: 1, sides: 8, bonus: 1 }],
      attacksPerAction: 2
    });
    expect(attacks.find((attack) => attack.name === "Inflict Wounds")).toMatchObject({
      toHit: 6,
      damage: [{ count: 3, sides: 10, bonus: 0 }]
    });
    expect(parsed.character?.sheet?.weapons.map((item) => item.name)).toEqual(["Warhammer, +1", "Longbow, +1"]);
  });

  it("applies D&D Beyond stat bonuses and derives armor AC when final AC is missing", () => {
    const parsed = parseDdbCharacterJson({
      data: {
        id: 791,
        name: "Armored Paladin",
        baseHitPoints: 52,
        stats: [
          { id: 1, value: 14 },
          { id: 2, value: 14 },
          { id: 3, value: 14 },
          { id: 4, value: 8 },
          { id: 5, value: 10 },
          { id: 6, value: 14 }
        ],
        modifiers: {
          race: [
            { type: "bonus", subType: "charisma", value: 1 },
            { type: "bonus", subType: "strength-saving-throws", value: 2 }
          ]
        },
        classes: [{ level: 6, definition: { name: "Paladin", spellCastingAbilityId: 6 } }],
        inventory: [
          {
            id: "chain-mail",
            equipped: true,
            definition: {
              name: "Chain Mail",
              type: "Equipment",
              filterType: "Equipment",
              subType: "Heavy Armor"
            }
          },
          {
            id: "shield",
            equipped: false,
            definition: {
              name: "Shield",
              type: "Equipment"
            }
          }
        ]
      }
    });

    expect(parsed.character?.abilityScores).toMatchObject({
      str: 14,
      dex: 14,
      con: 14,
      int: 8,
      wis: 10,
      cha: 15
    });
    expect(parsed.character?.ac).toBe(16);
    expect(parsed.character?.initiativeBonus).toBe(2);
    expect(parsed.character?.sheet?.armor.map((item) => item.name)).toEqual(["Chain Mail", "Shield"]);
  });

  it("imports non-damage control spells without treating them as batch attacks", () => {
    const parsed = parseDdbCharacterJson({
      data: {
        id: 999,
        name: "Void Warlock",
        armorClass: 14,
        baseHitPoints: 35,
        race: { fullName: "Tiefling" },
        background: { definition: { name: "Criminal" } },
        stats: [
          { id: 1, value: 10 },
          { id: 2, value: 14 },
          { id: 3, value: 14 },
          { id: 4, value: 10 },
          { id: 5, value: 12 },
          { id: 6, value: 18 }
        ],
        classes: [{ level: 5, definition: { name: "Warlock", spellCastingAbilityId: 6 } }],
        inventory: [
          {
            id: "studded-leather",
            equipped: true,
            definition: {
              name: "Studded Leather Armor",
              type: "Armor",
              armorClass: 12
            }
          },
          {
            id: "shield",
            equipped: true,
            definition: {
              name: "Shield",
              type: "Shield"
            }
          },
          {
            id: "glaive",
            equipped: true,
            definition: {
              name: "Glaive",
              type: "Weapon",
              filterType: "Weapon",
              subType: "Martial, Melee, Heavy, Reach",
              attackType: 1,
              damage: { diceString: "1d10" },
              damageType: "slashing"
            }
          }
        ],
        spells: {
          class: [
            {
              id: "darkness",
              spellCastingAbilityId: 6,
              definition: {
                name: "Darkness",
                level: 2,
                school: "Evocation",
                concentration: true,
                duration: { durationInterval: 10, durationUnit: "minute" },
                range: { rangeValue: { amount: 60 }, aoeType: "sphere" },
                snippet: "Magical darkness spreads from a point you choose."
              }
            },
            {
              id: "hold-person",
              spellCastingAbilityId: 6,
              definition: {
                name: "Hold Person",
                level: 2,
                school: "Enchantment",
                concentration: true,
                duration: { durationInterval: 1, durationUnit: "minute" },
                snippet: "Choose a humanoid. The target must succeed or be paralyzed."
              }
            }
          ]
        }
      }
    });

    const darkness = parsed.character?.actions.find((action) => action.kind === "spell" && action.name === "Darkness");
    const holdPerson = parsed.character?.actions.find((action) => action.kind === "spell" && action.name === "Hold Person");

    expect(darkness).toMatchObject({
      kind: "spell",
      purpose: "control",
      concentration: true,
      damage: undefined
    });
    expect(holdPerson).toMatchObject({
      purpose: "control",
      saveDc: 15,
      saveAbility: "wis"
    });
    expect(parsed.character?.attacks.map((attack) => attack.name)).toEqual(["Glaive"]);
    expect(parsed.character?.sheet?.spells).toHaveLength(2);
    expect(parsed.character?.sheet?.race).toBe("Tiefling");
    expect(parsed.character?.sheet?.armor.map((item) => item.name)).toEqual(["Studded Leather Armor", "Shield"]);
  });

  it("deduplicates repeated parser warnings", () => {
    const parsed = parseDdbCharacterJson({
      name: "Repeated Warning",
      className: "Wizard",
      level: 5,
      proficiencyBonus: 3,
      abilityScores: { str: 8, dex: 14, con: 12, int: 18, wis: 10, cha: 10 },
      ac: 12,
      maxHp: 28,
      speed: 30,
      initiativeBonus: 2,
      attacks: [],
      warnings: [
        "No supported attack actions were found. Simulation accuracy will be limited.",
        "No supported attack actions were found. Simulation accuracy will be limited."
      ]
    });

    const repeats = parsed.warnings.filter((warning) => warning.includes("No supported attack actions"));
    expect(repeats).toHaveLength(1);
  });
});
