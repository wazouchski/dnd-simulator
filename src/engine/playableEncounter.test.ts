import { describe, expect, it } from "vitest";
import { sampleCharacter } from "@/data/sampleCharacter";
import { srdMonsters } from "@/data/srdMonsters";
import { createPlayableEncounter, playTurn } from "@/engine/playableEncounter";

describe("playable encounter", () => {
  it("creates an active encounter scene", () => {
    const state = createPlayableEncounter(sampleCharacter, srdMonsters[0], 2, "scene");

    expect(state.status).toBe("active");
    expect(state.monsters).toHaveLength(2);
    expect(state.log[0].text).toContain(sampleCharacter.name);
  });

  it("resolves a player turn with narrative log entries", () => {
    const state = createPlayableEncounter(sampleCharacter, srdMonsters[0], 1, "turn");
    const next = playTurn(state, sampleCharacter, srdMonsters[0], state.monsters[0].id, "longsword", "steady");

    expect(next.log.length).toBeGreaterThan(state.log.length);
    expect(next.totalDamageDealt + next.totalDamageTaken).toBeGreaterThanOrEqual(0);
    expect(next.status === "active" || next.status === "victory" || next.status === "defeat").toBe(true);
  });

  it("uses selected skills to shape the turn", () => {
    const state = createPlayableEncounter(sampleCharacter, srdMonsters[0], 1, "skill");
    const next = playTurn(state, sampleCharacter, srdMonsters[0], state.monsters[0].id, "athletics", "steady");

    expect(next.log.some((entry) => entry.text.includes("uses Athletics"))).toBe(true);
  });

  it("includes save-based spells in playable turns without falling through to weapon attacks", () => {
    const character = {
      ...sampleCharacter,
      attacks: [
        {
          id: "tap",
          name: "Training Blade",
          toHit: 0,
          damage: [{ count: 1, sides: 2, bonus: 0 }]
        }
      ],
      actions: [
        {
          kind: "weapon" as const,
          id: "tap",
          name: "Training Blade",
          toHit: 0,
          damage: [{ count: 1, sides: 2, bonus: 0 }]
        },
        {
          kind: "spell" as const,
          id: "command",
          name: "Command",
          level: 2,
          saveDc: 30,
          saveAbility: "wis" as const,
          purpose: "control" as const,
          concentration: true,
          requiresAttackRoll: false
        }
      ]
    };
    const monster = srdMonsters.find((entry) => entry.id === "giant-spider") ?? srdMonsters[0];
    const state = createPlayableEncounter(character, monster, 1, "save-spell");
    const next = playTurn(state, character, monster, state.monsters[0].id, "command", "steady");

    expect(next.log.some((entry) => entry.text.includes("save against Command"))).toBe(true);
    expect(next.log.some((entry) => entry.text.includes("Training Blade"))).toBe(false);
    expect(next.log.some((entry) => entry.text.includes("loses its response"))).toBe(true);
  });

  it("tracks concentration defense effects in playable turns", () => {
    const character = {
      ...sampleCharacter,
      actions: [
        ...sampleCharacter.actions,
        {
          kind: "spell" as const,
          id: "shield-of-faith",
          name: "Shield of Faith",
          level: 1,
          purpose: "defense" as const,
          concentration: true,
          duration: "10 minutes",
          requiresAttackRoll: false
        }
      ]
    };
    const state = createPlayableEncounter(character, srdMonsters[0], 1, "shield-faith");
    const next = playTurn(state, character, srdMonsters[0], state.monsters[0].id, "shield-of-faith", "steady");
    const text = next.log.map((entry) => entry.text).join("\n");

    expect(next.activeEffects.some((effect) => effect.sourceName === "Shield of Faith")).toBe(true);
    expect(next.concentration?.sourceName).toBe("Shield of Faith");
    expect(text).toContain("vs AC 20");
  });

  it("replaces concentration effects and applies active buffs to later weapon attacks", () => {
    const character = {
      ...sampleCharacter,
      actions: [
        ...sampleCharacter.actions,
        {
          kind: "spell" as const,
          id: "shield-of-faith",
          name: "Shield of Faith",
          level: 1,
          purpose: "defense" as const,
          concentration: true,
          duration: "10 minutes",
          requiresAttackRoll: false
        },
        {
          kind: "spell" as const,
          id: "bless",
          name: "Bless",
          level: 1,
          purpose: "buff" as const,
          concentration: true,
          duration: "1 minute",
          requiresAttackRoll: false
        }
      ]
    };
    const state = createPlayableEncounter(character, srdMonsters[0], 1, "bless");
    const afterShield = playTurn(state, character, srdMonsters[0], state.monsters[0].id, "shield-of-faith", "steady");
    const afterBless = playTurn(afterShield, character, srdMonsters[0], afterShield.monsters[0].id, "bless", "steady");
    const afterAttack = playTurn(afterBless, character, srdMonsters[0], afterBless.monsters[0].id, "longsword", "steady");
    const text = afterAttack.log.map((entry) => entry.text).join("\n");

    expect(afterBless.activeEffects.some((effect) => effect.sourceName === "Shield of Faith")).toBe(false);
    expect(afterBless.activeEffects.some((effect) => effect.sourceName === "Bless")).toBe(true);
    expect(afterBless.concentration?.sourceName).toBe("Bless");
    expect(text).toContain("with Bless");
  });

  it("resolves selected smite modifiers through the selected melee weapon", () => {
    const character = {
      ...sampleCharacter,
      attacks: [
        {
          id: "longbow",
          name: "Longbow, +1",
          toHit: 6,
          damage: [{ count: 1, sides: 8, bonus: 3 }]
        },
        {
          id: "warhammer",
          name: "Warhammer, +1",
          toHit: 6,
          damage: [{ count: 1, sides: 8, bonus: 3 }]
        }
      ],
      actions: [
        {
          kind: "weapon" as const,
          id: "longbow",
          name: "Longbow, +1",
          toHit: 6,
          damage: [{ count: 1, sides: 8, bonus: 3 }],
          range: "Ranged, 150/600"
        },
        {
          kind: "weapon" as const,
          id: "warhammer",
          name: "Warhammer, +1",
          toHit: 30,
          damage: [{ count: 1, sides: 8, bonus: 3 }],
          range: "Melee"
        },
        {
          kind: "spell" as const,
          id: "searing-smite",
          name: "Searing Smite",
          level: 1,
          saveDc: 13,
          purpose: "damage" as const,
          concentration: true,
          duration: "1 Minute",
          requiresAttackRoll: false
        }
      ]
    };
    const state = createPlayableEncounter(character, srdMonsters[4], 1, "smite");
    const next = playTurn(state, character, srdMonsters[4], state.monsters[0].id, "warhammer", "steady", "searing-smite");
    const text = next.log.map((entry) => entry.text).join("\n");

    expect(text).toContain("with Warhammer, +1 plus Searing Smite");
    expect(text).toContain("casts Searing Smite");
    expect(text).toContain("Warhammer, +1");
    expect(text).not.toContain("Longbow, +1");
    expect(text).not.toContain("save against Searing Smite");
    expect(text).toContain("smite damage");
  });

  it("resolves non-smite attack modifiers as weapon riders", () => {
    const character = {
      ...sampleCharacter,
      attacks: [
        {
          id: "shortbow",
          name: "Shortbow",
          toHit: 30,
          damage: [{ count: 1, sides: 6, bonus: 3 }]
        }
      ],
      actions: [
        {
          kind: "weapon" as const,
          id: "shortbow",
          name: "Shortbow",
          toHit: 30,
          damage: [{ count: 1, sides: 6, bonus: 3 }],
          range: "Ranged, 80/320"
        },
        {
          kind: "spell" as const,
          id: "hex",
          name: "Hex",
          level: 1,
          purpose: "debuff" as const,
          concentration: true,
          requiresAttackRoll: false
        }
      ]
    };
    const state = createPlayableEncounter(character, srdMonsters[0], 1, "hex-rider");
    const next = playTurn(state, character, srdMonsters[0], state.monsters[0].id, "shortbow", "steady", "hex");
    const text = next.log.map((entry) => entry.text).join("\n");

    expect(text).toContain("with Shortbow plus Hex");
    expect(text).toContain("attacks with Shortbow plus Hex");
    expect(text).toContain("modifier damage");
  });

  it("does not continue after victory or defeat", () => {
    const state = createPlayableEncounter(sampleCharacter, srdMonsters[0], 1, "done");
    const done = { ...state, status: "victory" as const };

    expect(playTurn(done, sampleCharacter, srdMonsters[0], state.monsters[0].id, "longsword", "reckless")).toBe(done);
  });
});
