import type {
  AttackAction,
  CombatCharacter,
  CombatLogEvent,
  CombatRunLog,
  InitiativeEntry,
  Monster,
  SimulationResult
} from "@/types/combat";
import { createRng, rollDamage, rollDie, type Rng } from "@/engine/dice";

interface RuntimeCombatant {
  id: string;
  name: string;
  side: "character" | "monster";
  ac: number;
  maxHp: number;
  hp: number;
  initiativeBonus: number;
  attacks: AttackAction[];
}

export interface AttackResolution {
  d20: number;
  totalToHit: number;
  hit: boolean;
  critical: boolean;
  damage: number;
}

export function resolveAttack(action: AttackAction, targetAc: number, rng: Rng): AttackResolution {
  const d20 = rollDie(20, rng);
  const critical = d20 === 20;
  const hit = critical || (d20 !== 1 && d20 + action.toHit >= targetAc);
  const damage = hit ? rollDamage(action.damage, rng, critical).total : 0;
  return {
    d20,
    totalToHit: d20 + action.toHit,
    hit,
    critical,
    damage
  };
}

function createMonsterInstances(monster: Monster, count: number): RuntimeCombatant[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${monster.id}-${index + 1}`,
    name: `${monster.name} ${index + 1}`,
    side: "monster" as const,
    ac: monster.ac,
    maxHp: monster.maxHp,
    hp: monster.maxHp,
    initiativeBonus: monster.initiativeBonus,
    attacks: monster.attacks
  }));
}

function rollInitiative(combatants: RuntimeCombatant[], rng: Rng): InitiativeEntry[] {
  return combatants
    .map((combatant) => {
      const d20 = rollDie(20, rng);
      return {
        id: combatant.id,
        name: combatant.name,
        side: combatant.side,
        d20,
        total: d20 + combatant.initiativeBonus
      };
    })
    .sort((first, second) => second.total - first.total || second.d20 - first.d20);
}

function firstLivingMonster(monsters: RuntimeCombatant[]): RuntimeCombatant | undefined {
  return monsters.find((monster) => monster.hp > 0);
}

function makeEventId(runSeed: string, round: number, index: number): string {
  return `${runSeed}-r${round}-e${index}`;
}

export function simulateCombatRun(
  character: CombatCharacter,
  monster: Monster,
  count: number,
  seed: string
): CombatRunLog {
  const rng = createRng(seed);
  const hero: RuntimeCombatant = {
    id: character.id,
    name: character.name,
    side: "character",
    ac: character.ac,
    maxHp: character.maxHp,
    hp: character.maxHp,
    initiativeBonus: character.initiativeBonus,
    attacks: character.attacks
  };
  const monsters = createMonsterInstances(monster, count);
  const combatants = [hero, ...monsters];
  const initiative = rollInitiative(combatants, rng);
  const events: CombatLogEvent[] = [];
  let round = 0;
  let totalDamageDealt = 0;
  let totalDamageTaken = 0;
  const maxRounds = 50;

  while (hero.hp > 0 && monsters.some((entry) => entry.hp > 0) && round < maxRounds) {
    round += 1;

    for (const turn of initiative) {
      if (hero.hp <= 0 || !monsters.some((entry) => entry.hp > 0)) {
        break;
      }

      const actor =
        turn.side === "character"
          ? hero
          : monsters.find((entry) => entry.id === turn.id && entry.hp > 0);

      if (!actor || actor.hp <= 0) {
        continue;
      }

      const target = actor.side === "character" ? firstLivingMonster(monsters) : hero;
      if (!target || target.hp <= 0) {
        continue;
      }

      const action = actor.attacks[0];
      if (!action) {
        events.push({
          id: makeEventId(seed, round, events.length + 1),
          round,
          actor: actor.name,
          target: target.name,
          action: "No attack",
          note: `${actor.name} has no supported attack action.`
        });
        continue;
      }

      const attacksPerAction = action.attacksPerAction ?? 1;
      for (let attackIndex = 0; attackIndex < attacksPerAction; attackIndex += 1) {
        if (target.hp <= 0) {
          break;
        }

        const resolution = resolveAttack(action, target.ac, rng);
        const damage = Math.min(target.hp, resolution.damage);
        target.hp = Math.max(0, target.hp - resolution.damage);

        if (actor.side === "character") {
          totalDamageDealt += damage;
        } else {
          totalDamageTaken += damage;
        }

        const hitLabel = resolution.critical ? "critical hit" : resolution.hit ? "hit" : "miss";
        events.push({
          id: makeEventId(seed, round, events.length + 1),
          round,
          actor: actor.name,
          target: target.name,
          action: action.name,
          d20: resolution.d20,
          totalToHit: resolution.totalToHit,
          targetAc: target.ac,
          hit: resolution.hit,
          critical: resolution.critical,
          damage,
          targetHpAfter: target.hp,
          note: `${actor.name} rolls ${resolution.d20} (${resolution.totalToHit} to hit) against AC ${target.ac}: ${hitLabel}${damage > 0 ? ` for ${damage} damage` : ""}.`
        });
      }
    }
  }

  if (round >= maxRounds && hero.hp > 0 && monsters.some((entry) => entry.hp > 0)) {
    events.push({
      id: makeEventId(seed, round, events.length + 1),
      round,
      actor: "Simulator",
      target: "Encounter",
      action: "Round limit",
      note: "Combat reached the 50-round safety limit and is counted as a monster win."
    });
  }

  const monstersRemaining = monsters.filter((entry) => entry.hp > 0).length;
  return {
    id: seed,
    seed,
    winner: hero.hp > 0 && monstersRemaining === 0 ? "character" : "monsters",
    rounds: round,
    characterRemainingHp: hero.hp,
    monstersRemaining,
    totalDamageDealt,
    totalDamageTaken,
    initiative,
    events
  };
}

export function runSimulation(
  character: CombatCharacter,
  monster: Monster,
  count: number,
  iterations: number,
  seed?: string
): SimulationResult {
  const runs = Array.from({ length: iterations }, (_, index) => {
    const runSeed = seed ? `${seed}-${index + 1}` : `${Date.now()}-${index + 1}-${Math.random()}`;
    return simulateCombatRun(character, monster, count, runSeed);
  });

  const totalRounds = runs.reduce((sum, run) => sum + run.rounds, 0);
  const safeRounds = Math.max(totalRounds, 1);
  const wins = runs.filter((run) => run.winner === "character").length;
  const totalDamageDealt = runs.reduce((sum, run) => sum + run.totalDamageDealt, 0);
  const totalDamageTaken = runs.reduce((sum, run) => sum + run.totalDamageTaken, 0);

  return {
    summary: {
      iterations,
      winRate: Math.round((wins / iterations) * 100),
      averageRounds: Number((totalRounds / iterations).toFixed(1)),
      averageDamageDealtPerRound: Number((totalDamageDealt / safeRounds).toFixed(1)),
      averageDamageTakenPerRound: Number((totalDamageTaken / safeRounds).toFixed(1))
    },
    runs
  };
}
