import { describe, expect, it } from "vitest";
import { createSeededRng, rollDamage, rollDie } from "@/engine/dice";

describe("dice utilities", () => {
  it("produces reproducible seeded rolls", () => {
    const first = createSeededRng("same-seed");
    const second = createSeededRng("same-seed");

    expect(Array.from({ length: 5 }, () => rollDie(20, first))).toEqual(
      Array.from({ length: 5 }, () => rollDie(20, second))
    );
  });

  it("keeps rolls inside the die range", () => {
    const rng = createSeededRng("range-check");
    const rolls = Array.from({ length: 100 }, () => rollDie(6, rng));

    expect(rolls.every((roll) => roll >= 1 && roll <= 6)).toBe(true);
  });

  it("doubles dice on crits without doubling flat bonus", () => {
    const rolls = [0, 0];
    const damage = rollDamage([{ count: 1, sides: 8, bonus: 4 }], () => rolls.shift() ?? 0, true);

    expect(damage.total).toBe(6);
  });
});
