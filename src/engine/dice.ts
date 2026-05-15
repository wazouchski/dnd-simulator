import type { DiceTerm } from "@/types/combat";

export type Rng = () => number;

export interface RolledTerm {
  term: DiceTerm;
  rolls: number[];
  bonus: number;
  total: number;
}

export interface DamageRoll {
  terms: RolledTerm[];
  total: number;
}

function hashSeed(seed: string): number {
  let hash = 1779033703 ^ seed.length;
  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return hash >>> 0;
}

export function createSeededRng(seed: string): Rng {
  let state = hashSeed(seed) || 1;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed?: string): Rng {
  return seed ? createSeededRng(seed) : Math.random;
}

export function rollDie(sides: number, rng: Rng): number {
  if (!Number.isInteger(sides) || sides < 2) {
    throw new Error(`Invalid die sides: ${sides}`);
  }
  return Math.floor(rng() * sides) + 1;
}

export function rollDiceTerm(term: DiceTerm, rng: Rng, critical = false): RolledTerm {
  const diceCount = critical ? term.count * 2 : term.count;
  const rolls = Array.from({ length: diceCount }, () => rollDie(term.sides, rng));
  const bonus = term.bonus ?? 0;
  const total = rolls.reduce((sum, roll) => sum + roll, 0) + bonus;
  return {
    term,
    rolls,
    bonus,
    total
  };
}

export function rollDamage(terms: DiceTerm[], rng: Rng, critical = false): DamageRoll {
  const rolledTerms = terms.map((term) => rollDiceTerm(term, rng, critical));
  return {
    terms: rolledTerms,
    total: rolledTerms.reduce((sum, term) => sum + term.total, 0)
  };
}
