import type { Monster } from "@/types/combat";

export const srdMonsters: Monster[] = [
  {
    id: "goblin",
    name: "Goblin",
    cr: "1/4",
    xp: 50,
    ac: 15,
    maxHp: 7,
    initiativeBonus: 2,
    source: "SRD 5.1",
    attacks: [
      {
        id: "scimitar",
        name: "Scimitar",
        toHit: 4,
        damage: [{ count: 1, sides: 6, bonus: 2 }],
        damageType: "slashing"
      }
    ]
  },
  {
    id: "skeleton",
    name: "Skeleton",
    cr: "1/4",
    xp: 50,
    ac: 13,
    maxHp: 13,
    initiativeBonus: 2,
    source: "SRD 5.1",
    attacks: [
      {
        id: "shortsword",
        name: "Shortsword",
        toHit: 4,
        damage: [{ count: 1, sides: 6, bonus: 2 }],
        damageType: "piercing"
      }
    ]
  },
  {
    id: "wolf",
    name: "Wolf",
    cr: "1/4",
    xp: 50,
    ac: 13,
    maxHp: 11,
    initiativeBonus: 2,
    source: "SRD 5.1",
    attacks: [
      {
        id: "bite",
        name: "Bite",
        toHit: 4,
        damage: [{ count: 2, sides: 4, bonus: 2 }],
        damageType: "piercing"
      }
    ]
  },
  {
    id: "giant-spider",
    name: "Giant Spider",
    cr: "1",
    xp: 200,
    ac: 14,
    maxHp: 26,
    initiativeBonus: 3,
    source: "SRD 5.1",
    attacks: [
      {
        id: "bite",
        name: "Bite",
        toHit: 5,
        damage: [{ count: 1, sides: 8, bonus: 3 }],
        damageType: "piercing"
      }
    ]
  },
  {
    id: "ghoul",
    name: "Ghoul",
    cr: "1",
    xp: 200,
    ac: 12,
    maxHp: 22,
    initiativeBonus: 2,
    source: "SRD 5.1",
    attacks: [
      {
        id: "claws",
        name: "Claws",
        toHit: 4,
        damage: [{ count: 2, sides: 4, bonus: 2 }],
        damageType: "slashing"
      }
    ]
  }
];

export function getMonsterById(id: string): Monster | undefined {
  return srdMonsters.find((monster) => monster.id === id);
}
