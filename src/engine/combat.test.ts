import { describe, expect, it } from "vitest";
import { sampleCharacter } from "@/data/sampleCharacter";
import { srdMonsters } from "@/data/srdMonsters";
import { resolveAttack, runSimulation, simulateCombatRun } from "@/engine/combat";

describe("combat engine", () => {
  it("treats natural 1 as a miss", () => {
    const attack = sampleCharacter.attacks[0];
    const result = resolveAttack(attack, 1, () => 0);

    expect(result.d20).toBe(1);
    expect(result.hit).toBe(false);
    expect(result.damage).toBe(0);
  });

  it("treats natural 20 as a critical hit", () => {
    const attack = sampleCharacter.attacks[0];
    const rolls = [0.999, 0, 0];
    const result = resolveAttack(attack, 99, () => rolls.shift() ?? 0);

    expect(result.d20).toBe(20);
    expect(result.hit).toBe(true);
    expect(result.critical).toBe(true);
    expect(result.damage).toBe(6);
  });

  it("keeps HP from dropping below zero in logs", () => {
    const run = simulateCombatRun(sampleCharacter, srdMonsters[0], 1, "hp-floor");

    expect(run.events.every((event) => event.targetHpAfter === undefined || event.targetHpAfter >= 0)).toBe(true);
  });

  it("stops when one side is defeated", () => {
    const run = simulateCombatRun(sampleCharacter, srdMonsters[0], 1, "stop-check");

    expect(run.winner === "character" || run.characterRemainingHp === 0).toBe(true);
  });

  it("returns aggregate shape for 20 iterations", () => {
    const result = runSimulation(sampleCharacter, srdMonsters[0], 3, 20, "aggregate");

    expect(result.summary.iterations).toBe(20);
    expect(result.runs).toHaveLength(20);
    expect(result.summary.winRate).toBeGreaterThanOrEqual(0);
    expect(result.summary.winRate).toBeLessThanOrEqual(100);
  });
});
