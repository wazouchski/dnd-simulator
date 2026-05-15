import type { CombatCharacter } from "@/types/combat";

export const sampleCharacter: CombatCharacter = {
  id: "sample-fighter",
  name: "Kael Ironstep",
  className: "Fighter",
  level: 5,
  proficiencyBonus: 3,
  abilityScores: {
    str: 18,
    dex: 12,
    con: 16,
    int: 10,
    wis: 11,
    cha: 9
  },
  ac: 18,
  maxHp: 49,
  speed: 30,
  initiativeBonus: 1,
  attacks: [
    {
      id: "longsword",
      name: "Longsword",
      toHit: 7,
      damage: [{ count: 1, sides: 8, bonus: 4 }],
      damageType: "slashing",
      attacksPerAction: 2
    }
  ],
  actions: [
    {
      kind: "weapon",
      id: "longsword",
      name: "Longsword",
      toHit: 7,
      damage: [{ count: 1, sides: 8, bonus: 4 }],
      damageType: "slashing",
      attacksPerAction: 2,
      ability: "str",
      range: "Melee"
    },
    {
      kind: "weapon",
      id: "handaxe",
      name: "Handaxe",
      toHit: 7,
      damage: [{ count: 1, sides: 6, bonus: 4 }],
      damageType: "slashing",
      ability: "str",
      range: "Melee or thrown"
    },
    {
      kind: "skill",
      id: "athletics",
      name: "Athletics",
      ability: "str",
      modifier: 7,
      effect: "pressure",
      description: "Drive the enemy off balance. On success, deal a small amount of pressure damage."
    },
    {
      kind: "skill",
      id: "perception",
      name: "Perception",
      ability: "wis",
      modifier: 3,
      effect: "setup",
      description: "Read the enemy's movement. On success, gain advantage-like accuracy for the exchange."
    },
    {
      kind: "skill",
      id: "survival",
      name: "Survival",
      ability: "wis",
      modifier: 3,
      effect: "defend",
      description: "Use terrain and footwork. On success, reduce the incoming pressure this exchange."
    }
  ],
  warnings: ["Sample character uses core attack actions only."]
};
