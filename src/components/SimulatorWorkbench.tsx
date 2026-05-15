"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { sampleCharacter } from "@/data/sampleCharacter";
import { getMonsterById, srdMonsters } from "@/data/srdMonsters";
import { runSimulation } from "@/engine/combat";
import {
  createPlayableEncounter,
  playTurn,
  type PlayStyle,
  type PlayableEncounterState
} from "@/engine/playableEncounter";
import { parseDdbCharacterJson } from "@/parsers/ddbCharacter";
import { isAttackModifierSpell, spellEffectFromAction } from "@/engine/spellEffects";
import type { AbilityKey, AttackAction, CharacterAction, CombatCharacter, EncounterConfig, ImportedCharacterSheet, SimulationResult, SpellAction } from "@/types/combat";
import { buildBookmarklet } from "@/utils/bookmarklet";
import {
  clearSessionCharacter,
  readSessionCharacter,
  saveSessionCharacter,
  subscribeToCharacterImports,
  subscribeToDesktopImports
} from "@/utils/characterHandoff";
import styles from "./SimulatorWorkbench.module.css";

const iterationOptions: EncounterConfig["iterations"][] = [10, 20, 50, 100];
const actionKinds: CharacterAction["kind"][] = ["weapon", "spell", "skill"];
const reviewTabs: Array<{ id: ReviewTab; label: string }> = [
  { id: "actions", label: "Actions" },
  { id: "spells", label: "Spells" },
  { id: "inventory", label: "Inventory" },
  { id: "features", label: "Features & Traits" },
  { id: "background", label: "Background" },
  { id: "notes", label: "Notes" },
  { id: "extras", label: "Extras" }
];
const abilityOrder: Array<{ key: AbilityKey; label: string }> = [
  { key: "str", label: "STR" },
  { key: "dex", label: "DEX" },
  { key: "con", label: "CON" },
  { key: "int", label: "INT" },
  { key: "wis", label: "WIS" },
  { key: "cha", label: "CHA" }
];

type AppScreen = "setup" | "simulation";
type ManualActionKind = "weapon" | "spell" | "save-spell";
type ReviewTab = "actions" | "spells" | "inventory" | "features" | "background" | "notes" | "extras";

function isRollableAction(action: CharacterAction): action is CharacterAction & AttackAction {
  return (action.kind === "weapon" || action.kind === "spell") && typeof action.toHit === "number" && Array.isArray(action.damage) && action.damage.length > 0;
}

function verdictFor(result: SimulationResult | undefined): string {
  if (!result) {
    return "Run a simulation to get a performance read.";
  }
  const winRate = result.summary.winRate;
  if (winRate >= 80) {
    return "This character is strongly favored in this encounter.";
  }
  if (winRate >= 55) {
    return "This encounter looks well-matched with a slight edge to the character.";
  }
  if (winRate >= 35) {
    return "This encounter is volatile and could swing either way.";
  }
  return "This encounter is dangerous for the current character.";
}

function dedupeMessages(messages: string[]): string[] {
  return [...new Set(messages.filter(Boolean))];
}

function attackActionsFrom(characterActions: CharacterAction[]) {
  return characterActions
    .filter(isRollableAction)
    .map((action) => ({
      id: action.id,
      name: action.name,
      toHit: action.toHit,
      damage: action.damage,
      damageType: action.damageType,
      attacksPerAction: action.attacksPerAction
    }));
}

function weaponActionIds(characterActions: CharacterAction[]): string[] {
  return characterActions.filter((action) => action.kind === "weapon").map((action) => action.id);
}

function actionLabel(action: CharacterAction): string {
  if (action.kind === "skill") {
    return `+${action.modifier} ${action.ability.toUpperCase()} | ${action.effect}`;
  }

  const damage = action.damage?.map((term) => `${term.count}d${term.sides}${term.bonus ? `+${term.bonus}` : ""}`).join(" + ");
  if (action.kind === "spell") {
    const castBits = [
      action.purpose,
      action.concentration ? "concentration" : "",
      typeof action.saveDc === "number" ? `${action.saveAbility ? action.saveAbility.toUpperCase() : ""} DC ${action.saveDc}`.trim() : "",
      damage ? `${typeof action.toHit === "number" ? `+${action.toHit} to hit | ` : ""}${damage}` : ""
    ].filter(Boolean);
    return castBits.join(" | ") || action.resourceCost || "Spell";
  }

  return `+${action.toHit} to hit | ${damage ?? "no damage"}`;
}

function diceLabel(terms: AttackAction["damage"] | undefined): string | undefined {
  return terms?.map((term) => `${term.count}d${term.sides}${term.bonus ? `+${term.bonus}` : ""}`).join(" + ");
}

function spellRulesSummary(spell: SpellAction): string {
  const damage = diceLabel(spell.damage);
  const effect = spellEffectFromAction(spell);
  if (isSmiteAction(spell)) {
    return "Choose this as a weapon modifier before a melee weapon attack. On the next melee hit, the simulator adds smite rider damage to that weapon hit.";
  }
  if (effect?.condition === "shielded" && effect.acBonus) {
    return `Resolve as a concentration effect: while active, your AC increases by ${effect.acBonus}.`;
  }
  if (effect?.condition === "blessed" && effect.attackModifier?.attackDie) {
    return `Resolve as a concentration effect: later weapon attacks add d${effect.attackModifier.attackDie} to the attack roll while it lasts.`;
  }
  if (effect?.attackModifier?.damageDice?.length) {
    const rider = diceLabel(effect.attackModifier.damageDice);
    return `Resolve as an active weapon rider: weapon hits add ${rider} while the effect is active.`;
  }
  if (typeof spell.toHit === "number" && damage) {
    return `Resolve as a spell attack: roll d20 + ${spell.toHit} against target AC, then deal ${damage} on a hit.`;
  }
  if (effect?.save) {
    return `Resolve as a saving throw: the target rolls ${effect.save.ability.toUpperCase()} against DC ${effect.save.dc}. On a failed control save, the effect is tracked on that target.`;
  }
  if (typeof spell.saveDc === "number" && spell.saveAbility) {
    return `Resolve as a saving throw: the target rolls ${spell.saveAbility.toUpperCase()} against DC ${spell.saveDc}. On a failed control/debuff save, the simulator suppresses that target's response for the exchange.`;
  }
  if (spell.purpose === "defense" || spell.purpose === "mobility") {
    return "Resolve as tactical positioning: the simulator improves your defense for the exchange while full movement rules are still being built.";
  }
  if (spell.purpose === "buff") {
    return "Resolve as tactical support: the simulator improves the follow-up action for the exchange while full spell rules are still being built.";
  }
  if (spell.purpose === "healing") {
    return "Resolve as provisional healing using a simple MVP recovery amount. Full healing/resource rules are still being built.";
  }
  return "Imported as a playable spell action. The simulator shows the sheet text here and applies an approximate tactical effect when possible.";
}

function shouldUseDesktopImportBridge(location: Location): boolean {
  const port = Number(location.port);
  return location.hostname === "127.0.0.1" && port >= 3217 && port <= 3236;
}

function formatAttack(character: CombatCharacter): string {
  const attack = character.attacks[0];
  if (!attack) {
    return "No supported attack";
  }
  const damage = attack.damage
    .map((term) => `${term.count}d${term.sides}${term.bonus ? `+${term.bonus}` : ""}`)
    .join(" + ");
  const attacks = attack.attacksPerAction && attack.attacksPerAction > 1 ? `${attack.attacksPerAction}x ` : "";
  return `${attacks}${attack.name} +${attack.toHit}, ${damage}`;
}

function formatArmorLine(character: CombatCharacter): string {
  const armor = character.sheet?.armor.filter((item) => item.equipped !== false) ?? [];
  if (!armor.length) {
    return `AC ${character.ac}`;
  }

  return `${armor.map((item) => item.name).join(" + ")} | AC ${character.ac}`;
}

function abilityScoreModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function formatModifier(value: number): string {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function isSmiteAction(action: CharacterAction): boolean {
  return action.kind === "spell" && /\bsmite\b/i.test(action.name);
}

function isAttackModifierAction(action: CharacterAction): boolean {
  return action.kind === "spell" && isAttackModifierSpell(action);
}

function attackModifierHint(action: CharacterAction): string {
  if (action.kind !== "spell") {
    return "Attack modifier";
  }
  const effect = spellEffectFromAction(action);
  if (isSmiteAction(action)) {
    return "Melee weapon rider. Choose before the attack.";
  }
  if (effect?.condition === "hexed") {
    return "Marked-target damage rider. Uses active effect tracking.";
  }
  if (effect?.attackModifier) {
    return "Weapon attack buff. Uses active effect tracking.";
  }
  return actionLabel(action);
}

function isLikelyRangedWeaponAction(action: CharacterAction | undefined): boolean {
  if (action?.kind !== "weapon") {
    return false;
  }

  const text = `${action.name} ${action.range ?? ""}`.toLowerCase();
  return (
    /\b(longbow|shortbow|crossbow|sling|dart|blowgun|firearm|musket|pistol)\b/.test(text) ||
    /\branged\b/.test(text) ||
    /\brange\b/.test(text) ||
    /\b\d+\s*\//.test(text)
  );
}

function fallbackSheetFor(character: CombatCharacter): ImportedCharacterSheet {
  return {
    race: undefined,
    background: undefined,
    classes: [{ name: character.className, level: character.level }],
    inventory: [],
    weapons: [],
    armor: [],
    features: [],
    spells: [],
    proficiencies: []
  };
}

export function SimulatorWorkbench() {
  const [screen, setScreen] = useState<AppScreen>("setup");
  const [character, setCharacter] = useState<CombatCharacter>(sampleCharacter);
  const [monsterId, setMonsterId] = useState("goblin");
  const [count, setCount] = useState(3);
  const [iterations, setIterations] = useState<EncounterConfig["iterations"]>(20);
  const [seed, setSeed] = useState("alpha-test");
  const [result, setResult] = useState<SimulationResult>();
  const [messages, setMessages] = useState<string[]>(sampleCharacter.warnings);
  const [bookmarklet, setBookmarklet] = useState("");
  const [bookmarkletCopyStatus, setBookmarkletCopyStatus] = useState("");
  const [pastedJson, setPastedJson] = useState("");
  const [playScene, setPlayScene] = useState<PlayableEncounterState>();
  const [playTargetId, setPlayTargetId] = useState("");
  const [selectedActionId, setSelectedActionId] = useState(sampleCharacter.actions[0]?.id ?? "");
  const [selectedModifierId, setSelectedModifierId] = useState("");
  const [equippedWeaponIds, setEquippedWeaponIds] = useState<Set<string>>(() => new Set(weaponActionIds(sampleCharacter.actions)));
  const [actionKind, setActionKind] = useState<CharacterAction["kind"]>("weapon");
  const [manualKind, setManualKind] = useState<ManualActionKind>("weapon");
  const [manualName, setManualName] = useState("");
  const [manualToHit, setManualToHit] = useState("5");
  const [manualDiceCount, setManualDiceCount] = useState("1");
  const [manualDiceSides, setManualDiceSides] = useState("8");
  const [manualDamageBonus, setManualDamageBonus] = useState("3");
  const [manualAttacksPerAction, setManualAttacksPerAction] = useState("1");
  const [manualSpellLevel, setManualSpellLevel] = useState("0");
  const [manualSaveDc, setManualSaveDc] = useState("13");
  const [manualSaveAbility, setManualSaveAbility] = useState<AbilityKey>("wis");
  const [manualFeatName, setManualFeatName] = useState("");
  const [reviewTab, setReviewTab] = useState<ReviewTab>("actions");

  const selectedMonster = useMemo(() => getMonsterById(monsterId) ?? srdMonsters[0], [monsterId]);

  function applyCharacter(nextCharacter: CombatCharacter, nextMessages: string[]) {
    setCharacter(nextCharacter);
    setMessages(dedupeMessages(nextMessages));
    setResult(undefined);
    setPlayScene(undefined);
    setScreen("setup");
    setReviewTab("actions");
    setEquippedWeaponIds(new Set(weaponActionIds(nextCharacter.actions)));
    setSelectedActionId(nextCharacter.actions[0]?.id ?? nextCharacter.attacks[0]?.id ?? "");
    setSelectedModifierId("");
    setActionKind(nextCharacter.actions.find((action) => action.kind === "weapon")?.kind ?? nextCharacter.actions[0]?.kind ?? "weapon");
    saveSessionCharacter(nextCharacter);
  }

  async function copyBookmarklet() {
    if (!bookmarklet) {
      return;
    }

    try {
      await navigator.clipboard.writeText(bookmarklet);
      setBookmarkletCopyStatus("Copied. Add a new bookmark and paste this as the URL.");
    } catch {
      setBookmarkletCopyStatus("Copy failed. Select the code box, copy all text, then paste it as the bookmark URL.");
    }
  }

  useEffect(() => {
    function applyImportedCharacter(importedCharacter: CombatCharacter) {
      const parsed = parseDdbCharacterJson(importedCharacter);
      if (parsed.character) {
        applyCharacter(parsed.character, parsed.warnings);
      }
    }

    const imported = readSessionCharacter();
    if (imported) {
      applyImportedCharacter(imported);
    }

    const unsubscribeBrowserImports = subscribeToCharacterImports(applyImportedCharacter);
    const unsubscribeDesktopImports = shouldUseDesktopImportBridge(window.location)
      ? subscribeToDesktopImports(applyImportedCharacter)
      : () => {};
    setBookmarklet(buildBookmarklet(window.location.origin));

    return () => {
      unsubscribeBrowserImports();
      unsubscribeDesktopImports();
    };
  }, []);

  function loadSample() {
    setCharacter(sampleCharacter);
    setMessages(sampleCharacter.warnings);
    setResult(undefined);
    setPlayScene(undefined);
    setScreen("setup");
    setEquippedWeaponIds(new Set(weaponActionIds(sampleCharacter.actions)));
    setSelectedActionId(sampleCharacter.actions[0]?.id ?? "");
    setSelectedModifierId("");
    setActionKind("weapon");
    clearSessionCharacter();
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    try {
      const payload = JSON.parse(text);
      const parsed = parseDdbCharacterJson(payload);
      if (parsed.character) {
        applyCharacter(parsed.character, parsed.warnings);
      } else {
        setMessages(parsed.errors);
      }
    } catch {
      setMessages(["The selected file is not valid JSON."]);
    } finally {
      event.target.value = "";
    }
  }

  function importJsonText(text: string) {
    try {
      const payload = JSON.parse(text);
      const parsed = parseDdbCharacterJson(payload);
      if (parsed.character) {
        applyCharacter(parsed.character, parsed.warnings);
        setPastedJson("");
      } else {
        setMessages(parsed.errors);
      }
    } catch {
      setMessages(["The pasted character data is not valid JSON."]);
    }
  }

  function runCurrentSimulation() {
    const simulation = runSimulation(activeCharacter, selectedMonster, count, iterations, seed.trim() || undefined);
    setResult(simulation);
  }

  function startPlayableEncounter() {
    const scene = createPlayableEncounter(activeCharacter, selectedMonster, count, seed.trim() || "play-scene");
    setPlayScene(scene);
    setPlayTargetId(scene.monsters.find((monster) => monster.hp > 0)?.id ?? "");
    setSelectedActionId((activeCharacter.actions.find((action) => action.kind === actionKind) ?? activeCharacter.actions[0])?.id ?? "");
    setSelectedModifierId("");
  }

  function beginSimulation() {
    setScreen("simulation");
    setResult(undefined);
    startPlayableEncounter();
  }

  function backToSetup() {
    setScreen("setup");
    setPlayScene(undefined);
    setResult(undefined);
  }

  function takePlayTurn(style: PlayStyle) {
    if (!playScene) {
      return;
    }

    const targetId = playTargetId || playScene.monsters.find((monster) => monster.hp > 0)?.id || "";
    const nextScene = playTurn(playScene, activeCharacter, selectedMonster, targetId, selectedActionId, style, selectedModifierId);
    setPlayScene(nextScene);
    setPlayTargetId(nextScene.monsters.find((monster) => monster.hp > 0)?.id ?? "");
  }

  function toggleWeaponAction(actionId: string, equipped: boolean) {
    setEquippedWeaponIds((current) => {
      const next = new Set(current);
      if (equipped) {
        next.add(actionId);
      } else {
        next.delete(actionId);
      }
      return next;
    });
    setResult(undefined);
    setPlayScene(undefined);
    setSelectedModifierId("");
  }

  function applyCharacterCorrection(nextCharacter: CombatCharacter) {
    setCharacter(nextCharacter);
    setResult(undefined);
    setPlayScene(undefined);
    saveSessionCharacter(nextCharacter);
  }

  function updateCharacterNumber(field: "ac" | "maxHp" | "initiativeBonus" | "proficiencyBonus" | "speed", value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }

    const minimum = field === "initiativeBonus" ? -10 : 1;
    applyCharacterCorrection({
      ...character,
      [field]: Math.max(minimum, Math.round(parsed)),
      warnings: dedupeMessages([...character.warnings, "Manual stat correction applied before simulation."])
    });
  }

  function updateAbilityScore(ability: AbilityKey, value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }

    applyCharacterCorrection({
      ...character,
      abilityScores: {
        ...character.abilityScores,
        [ability]: Math.max(1, Math.min(30, Math.round(parsed)))
      },
      warnings: dedupeMessages([...character.warnings, "Manual stat correction applied before simulation."])
    });
  }

  function addManualFeat() {
    const name = manualFeatName.trim();
    if (!name) {
      setMessages(dedupeMessages([...messages, "Enter a feat or feature name before adding it."]));
      return;
    }

    const sheet = character.sheet ?? fallbackSheetFor(character);
    const nextCharacter: CombatCharacter = {
      ...character,
      sheet: {
        ...sheet,
        features: [
          ...sheet.features,
          {
            id: `manual-feat-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
            name,
            source: "Manual feat"
          }
        ]
      },
      warnings: dedupeMessages([...character.warnings, "Manual feat added for review. Feat rules are not fully simulated yet."])
    };

    applyCharacterCorrection(nextCharacter);
    setManualFeatName("");
    setReviewTab("features");
  }

  function addManualAction() {
    const name = manualName.trim();
    if (!name) {
      setMessages(dedupeMessages([...messages, "Enter a name before adding a manual weapon or spell."]));
      return;
    }

    const id = `manual-${manualKind}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
    const level = Math.max(0, Number(manualSpellLevel) || 0);
    const attackBase = {
      id,
      name,
      toHit: Number(manualToHit) || 0,
      damage: [
        {
          count: Math.max(1, Number(manualDiceCount) || 1),
          sides: Math.max(2, Number(manualDiceSides) || 6),
          bonus: Number(manualDamageBonus) || 0
        }
      ],
      attacksPerAction: Math.max(1, Number(manualAttacksPerAction) || 1)
    };

    const action: CharacterAction =
      manualKind === "save-spell"
        ? {
            kind: "spell",
            id,
            name,
            level,
            saveDc: Math.max(1, Number(manualSaveDc) || 13),
            saveAbility: manualSaveAbility,
            resourceCost: level > 0 ? `Level ${level} slot` : "Cantrip",
            purpose: "control",
            requiresAttackRoll: false
          }
        : manualKind === "spell"
          ? {
              ...attackBase,
              kind: "spell",
              level,
              resourceCost: level > 0 ? `Level ${level} slot` : "Cantrip",
              purpose: "damage",
              requiresAttackRoll: true
            }
          : {
              ...attackBase,
              kind: "weapon",
              range: "Manual"
            };

    const nextActions = [...character.actions, action];
    const nextCharacter = {
      ...character,
      actions: nextActions,
      attacks: attackActionsFrom(nextActions),
      warnings: dedupeMessages([...character.warnings, "Manual loadout action added. Review accuracy against your D&D Beyond sheet."])
    };

    applyCharacter(nextCharacter, nextCharacter.warnings);
    setSelectedActionId(action.id);
    setActionKind(action.kind);
    setManualName("");
  }

  const firstRun = result?.runs[0];
  const livingPlayMonsters = playScene?.monsters.filter((monster) => monster.hp > 0) ?? [];
  const activeEffectCards =
    playScene?.activeEffects.map((effect) => {
      const targetName =
        effect.targetId === "character"
          ? character.name
          : playScene.monsters.find((monster) => monster.id === effect.targetId)?.name ?? "target";
      const detail = [
        effect.concentration ? "concentration" : "",
        effect.condition ? effect.condition.replace("-", " ") : "",
        typeof effect.remainingRounds === "number" ? `${effect.remainingRounds} round${effect.remainingRounds === 1 ? "" : "s"}` : ""
      ].filter(Boolean).join(" | ");

      return {
        id: effect.instanceId,
        name: effect.sourceName,
        targetName,
        detail
      };
    }) ?? [];
  const weaponActions = character.actions.filter((action) => action.kind === "weapon");
  const spellActions = character.actions.filter((action) => action.kind === "spell");
  const skillActions = character.actions.filter((action) => action.kind === "skill");
  const activeWeaponActions = weaponActions.filter((action) => equippedWeaponIds.has(action.id));
  const activeActions = [...activeWeaponActions, ...spellActions, ...skillActions];
  const activeCharacter: CombatCharacter = {
    ...character,
    actions: activeActions,
    attacks: attackActionsFrom(activeActions)
  };
  const groupedActions = actionKinds.map((kind) => ({
    kind,
    actions: activeActions.filter((action) => action.kind === kind)
  }));
  const visibleActions = activeActions.filter((action) => action.kind === actionKind);
  const selectedAction = activeActions.find((action) => action.id === selectedActionId);
  const attackModifierActions = activeActions.filter(isAttackModifierAction);
  const selectedModifier = attackModifierActions.find((action) => action.id === selectedModifierId);
  const selectedSpellDetails =
    selectedModifier && selectedModifier.kind === "spell"
      ? selectedModifier
      : selectedAction?.kind === "spell"
        ? selectedAction
        : undefined;
  const selectedSpellDamage = selectedSpellDetails ? diceLabel(selectedSpellDetails.damage) : undefined;
  const canUseWeaponModifier = selectedAction?.kind === "weapon" && !isLikelyRangedWeaponAction(selectedAction);
  const attackSpellActions = spellActions.filter(isRollableAction);
  const hasAttackAction = activeWeaponActions.some(isRollableAction) || attackSpellActions.length > 0;
  const sheetSummary = character.sheet;
  const inventoryItems = sheetSummary?.inventory ?? [];
  const armorItems = sheetSummary?.armor ?? [];
  const featureItems = sheetSummary?.features ?? [];
  const proficiencyItems = sheetSummary?.proficiencies ?? [];
  const noteItems = dedupeMessages([...messages, ...character.warnings]);
  const classSummary = sheetSummary?.classes.length
    ? sheetSummary.classes
        .map((entry) => `${entry.subclass ? `${entry.subclass} ` : ""}${entry.name} ${entry.level}`)
        .join(" / ")
    : `${character.className} ${character.level}`;

  useEffect(() => {
    if (activeActions.some((action) => action.id === selectedActionId)) {
      return;
    }
    setSelectedActionId(activeActions[0]?.id ?? "");
    setActionKind(activeActions[0]?.kind ?? "weapon");
  }, [activeActions, selectedActionId]);

  useEffect(() => {
    if (!selectedModifierId) {
      return;
    }
    if (!selectedModifier || selectedAction?.kind !== "weapon" || (isSmiteAction(selectedModifier) && isLikelyRangedWeaponAction(selectedAction))) {
      setSelectedModifierId("");
    }
  }, [selectedAction, selectedModifier, selectedModifierId]);

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <img className={styles.headerSigil} src="/artifact-d20.png" alt="" aria-hidden="true" />
        <div className={styles.brandBlock}>
          <p className={styles.eyebrow}>Dragonforge Oracle v0.2</p>
          <h1>Character Balance Tester</h1>
          <div className={styles.trackDisplay}>
            <span>{screen === "setup" ? "RITE" : "DUEL"}</span>
            <strong>{character.name}</strong>
          </div>
        </div>
        <div className={styles.transportDeck} aria-hidden="true">
          <span className={styles.counter}>{screen === "setup" ? "D20" : `R${playScene?.round ?? 1}`}</span>
          <div className={styles.transportButtons}>
            <span>STR</span>
            <span>DEX</span>
            <span>CON</span>
            <span>WIS</span>
            <span>CHA</span>
          </div>
          <div className={styles.ledStrip}>
            {Array.from({ length: 16 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
        </div>
        <div className={styles.status}>
          <span>{character.name}</span>
          <span>{selectedMonster.name} x{count}</span>
        </div>
      </header>

      {screen === "setup" ? (
      <section className={styles.grid} aria-label="Character setup workspace">
        <section className={`${styles.panel} ${styles.instructionsPanel}`} data-window-title="SANCTUM PRIME">
          <div>
            <p className={styles.eyebrow}>Quick start</p>
            <h2>Run your first combat check</h2>
          </div>
          <ol className={styles.instructionsList}>
            <li>For a first test, click Load sample and press Begin simulation.</li>
            <li>For your own character, set the D&D Beyond sheet to Public first.</li>
            <li>Use the visible D&D Beyond import box in Hero Dossier. Do not paste the import code into the address bar.</li>
            <li>After import, check weapons, spells, armor, and skills before simulating.</li>
          </ol>
          <details className={styles.details}>
            <summary>Extra help: add the D&D Beyond import bookmark</summary>
            <ol className={styles.bookmarkSteps}>
              <li>Click <strong>Copy import bookmark code</strong> in Hero Dossier.</li>
              <li>Open your browser's bookmark manager and choose Add new bookmark.</li>
              <li>Name it <strong>Send to D&D Simulator</strong>.</li>
              <li>Paste the copied <code>javascript:</code> code into the bookmark URL field. Do not paste it into the address bar.</li>
              <li>Open your Public D&D Beyond character sheet while logged in, then click that bookmark.</li>
            </ol>
            <p>
              If D&D Beyond blocks the automatic import, choose OK when prompted. If the raw page says Unauthorized Access Attempt, set the character's privacy to Public in D&D Beyond and try again. If actual character JSON appears, copy it and use Paste JSON fallback.
            </p>
          </details>
          <p className={styles.privacyNote}>
            Character data is parsed in your browser. This MVP has no accounts, server storage, or telemetry.
          </p>
        </section>

        <aside className={styles.panel} data-window-title="HERO DOSSIER">
          <div className={styles.panelHeader}>
            <p className={styles.eyebrow}>Character</p>
            <button type="button" className={styles.secondaryButton} onClick={loadSample}>
              Load sample
            </button>
          </div>

          <div className={styles.characterCard}>
            <h2>{character.name}</h2>
            <p>{character.className} level {character.level}</p>
            <dl className={styles.statGrid}>
              <div>
                <dt>AC</dt>
                <dd>{character.ac}</dd>
              </div>
              <div>
                <dt>HP</dt>
                <dd>{character.maxHp}</dd>
              </div>
              <div>
                <dt>Init</dt>
                <dd>{character.initiativeBonus >= 0 ? "+" : ""}{character.initiativeBonus}</dd>
              </div>
              <div>
                <dt>PB</dt>
                <dd>+{character.proficiencyBonus}</dd>
              </div>
            </dl>
            <div className={styles.abilityGrid} aria-label="Imported ability scores">
              {abilityOrder.map((ability) => {
                const score = character.abilityScores[ability.key];
                return (
                  <span key={ability.key}>
                    <strong>{ability.label}</strong>
                    {score}
                    <em>{formatModifier(abilityScoreModifier(score))}</em>
                  </span>
                );
              })}
            </div>
            <p className={styles.attackLine}>{formatAttack(activeCharacter)}</p>
          </div>

          <div className={styles.importGuide}>
            <h3>D&D Beyond import</h3>
            <ol>
              <li>Make the character Public on D&D Beyond.</li>
              <li>Click this button and add the copied code as a new bookmark URL.</li>
              <li>Open the character sheet, then click that bookmark.</li>
            </ol>
            <button type="button" className={styles.primaryButtonCompact} onClick={copyBookmarklet}>
              Copy import bookmark code
            </button>
            <p>{bookmarkletCopyStatus || "Important: paste the code into a bookmark URL field, not the browser address bar."}</p>
          </div>

          <label className={styles.fileDrop}>
            <span>Backup: import saved JSON file</span>
            <input type="file" accept="application/json,.json" onChange={handleUpload} />
          </label>

          <details className={styles.details}>
            <summary>Advanced: show import code</summary>
            <p>This is the code copied by the button above. It is not a normal web address.</p>
            <textarea readOnly value={bookmarklet} aria-label="Bookmarklet code" />
            <p>
              Brave, Chrome, and Edge shortcut: press Ctrl+Shift+O, add a new bookmark, then paste this code as the bookmark URL.
            </p>
            <p>
              In the desktop app, keep this window open and copy the bookmarklet from here. It points to the local desktop import bridge.
            </p>
          </details>

          {sheetSummary && (
            <div className={styles.sheetFacts}>
              <span>{sheetSummary.race ?? "Unknown ancestry"}</span>
              <span>{sheetSummary.background ?? "No background"}</span>
              <span>{sheetSummary.spells.length} spells imported</span>
              <span>{sheetSummary.weapons.length} weapons</span>
              <span>{sheetSummary.armor.length} armor/shields</span>
              <span>{sheetSummary.features.length} features</span>
            </div>
          )}

          <details className={styles.details}>
            <summary>Paste JSON fallback</summary>
            <p>Use this when the bookmarklet opens raw JSON instead of importing automatically.</p>
            <p>
              If the raw page says <strong>Unauthorized Access Attempt</strong>, it is not usable character data. Open the character builder, use the Home tab or character settings to set privacy to Public, then retry.
            </p>
            <textarea
              value={pastedJson}
              onChange={(event) => setPastedJson(event.target.value)}
              placeholder='Paste JSON here, starting with {"id":... or {"data":...'
              aria-label="Paste character JSON"
            />
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => importJsonText(pastedJson)}
              disabled={!pastedJson.trim()}
            >
              Import pasted JSON
            </button>
          </details>

          {messages.length > 0 && (
            <div className={styles.messages} aria-live="polite">
              {messages.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}
        </aside>

        <section className={`${styles.panel} ${styles.loadoutPanel}`} data-window-title="ARSENAL ALTAR">
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Loadout verification</p>
              <h2>Confirm playable actions</h2>
            </div>
            <button type="button" className={styles.primaryButtonCompact} onClick={beginSimulation} disabled={!hasAttackAction}>
              Begin simulation
            </button>
          </div>

          {!hasAttackAction && (
            <div className={styles.blockingNotice}>
              No weapon or attack-roll spell is available yet. Add one below so the playable encounter and batch simulator can resolve attacks.
            </div>
          )}

          <div className={styles.sheetTabs} role="tablist" aria-label="Character sheet review sections">
            {reviewTabs.map((tab) => (
              <button
                key={tab.id}
                id={`review-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={reviewTab === tab.id}
                aria-controls={`review-panel-${tab.id}`}
                className={reviewTab === tab.id ? styles.sheetTabActive : undefined}
                onClick={() => setReviewTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            id={`review-panel-${reviewTab}`}
            className={styles.sheetTabPanel}
            role="tabpanel"
            aria-labelledby={`review-tab-${reviewTab}`}
          >
            {reviewTab === "actions" && (
              <div className={styles.tabGrid}>
                <div className={styles.tabPaneCard}>
                  <div className={styles.sheetSectionHeader}>
                    <h3>Weapons <span>{activeWeaponActions.length}/{weaponActions.length}</span></h3>
                    <p>Checked weapons are available in play and batch odds.</p>
                  </div>
                  <div className={styles.reviewList}>
                    {weaponActions.length ? weaponActions.map((action) => (
                      <label key={action.id} className={styles.weaponToggle}>
                        <input
                          type="checkbox"
                          checked={equippedWeaponIds.has(action.id)}
                          onChange={(event) => toggleWeaponAction(action.id, event.target.checked)}
                        />
                        <span>
                          <strong>{action.name}</strong>
                          <span>{actionLabel(action)}</span>
                        </span>
                      </label>
                    )) : <p className={styles.emptyLine}>No weapons parsed.</p>}
                  </div>
                </div>

                <div className={styles.tabPaneCard}>
                  <div className={styles.sheetSectionHeader}>
                    <h3>Skills <span>{skillActions.length}</span></h3>
                    <p>Skill choices shape the playable encounter beat before an attack resolves.</p>
                  </div>
                  <div className={styles.reviewList}>
                    {skillActions.length ? skillActions.map((action) => (
                      <div key={action.id} className={styles.reviewRow}>
                        <strong>{action.name}</strong>
                        <span>{actionLabel(action)}</span>
                      </div>
                    )) : <p className={styles.emptyLine}>No skills parsed.</p>}
                  </div>
                </div>
              </div>
            )}

            {reviewTab === "spells" && (
              <div className={styles.tabGrid}>
                <div className={styles.tabPaneCard}>
                  <div className={styles.sheetSectionHeader}>
                    <h3>Playable spells <span>{spellActions.length}</span></h3>
                    <p>Damage, control, defense, and utility spells are kept visible for review.</p>
                  </div>
                  <div className={styles.reviewList}>
                    {spellActions.length ? spellActions.map((action) => (
                      <div key={action.id} className={styles.reviewRow}>
                        <strong>{action.name}</strong>
                        <span>{actionLabel(action)}</span>
                      </div>
                    )) : <p className={styles.emptyLine}>No spells parsed.</p>}
                  </div>
                </div>

                <div className={styles.tabPaneCard}>
                  <div className={styles.sheetSectionHeader}>
                    <h3>Imported spellbook <span>{sheetSummary?.spells.length ?? 0}</span></h3>
                    <p>Raw spell signals from the character sheet, including non-damage options.</p>
                  </div>
                  <div className={styles.reviewList}>
                    {sheetSummary?.spells.length ? sheetSummary.spells.map((spell) => (
                      <div key={spell.id} className={styles.reviewRow}>
                        <strong>{spell.name}</strong>
                        <span>
                          Level {spell.level} | {spell.purpose}
                          {spell.saveAbility ? ` | ${spell.saveAbility.toUpperCase()} save` : ""}
                          {spell.concentration ? " | concentration" : ""}
                          {spell.range ? ` | ${spell.range}` : ""}
                        </span>
                      </div>
                    )) : <p className={styles.emptyLine}>No imported spellbook data.</p>}
                  </div>
                </div>
              </div>
            )}

            {reviewTab === "inventory" && (
              <div className={styles.tabGrid}>
                <div className={styles.tabPaneCard}>
                  <div className={styles.sheetSectionHeader}>
                    <h3>Armor & AC <span>{armorItems.length}</span></h3>
                    <p>{formatArmorLine(character)}</p>
                  </div>
                  <div className={styles.reviewList}>
                    {armorItems.length ? armorItems.map((item) => (
                      <div key={item.id} className={styles.reviewRow}>
                        <strong>{item.name}</strong>
                        <span>
                          {item.category}
                          {typeof item.armorClass === "number" ? ` | AC ${item.armorClass}` : ""}
                          {typeof item.acBonus === "number" ? ` | +${item.acBonus} AC` : ""}
                          {item.equipped === false ? " | not equipped" : item.equipped === true ? " | equipped" : ""}
                        </span>
                      </div>
                    )) : <p className={styles.emptyLine}>No armor or shield items imported.</p>}
                  </div>
                </div>

                <div className={styles.tabPaneCard}>
                  <div className={styles.sheetSectionHeader}>
                    <h3>Inventory <span>{inventoryItems.length}</span></h3>
                    <p>Imported equipment is shown here so missing weapons are easier to spot.</p>
                  </div>
                  <div className={`${styles.reviewList} ${styles.inventoryList}`}>
                    {inventoryItems.length ? inventoryItems.map((item) => (
                      <div key={item.id} className={styles.reviewRow}>
                        <strong>{item.name}</strong>
                        <span>
                          {item.type ?? item.category}
                          {item.equipped === false ? " | not equipped" : item.equipped === true ? " | equipped" : ""}
                        </span>
                      </div>
                    )) : <p className={styles.emptyLine}>No imported inventory data.</p>}
                  </div>
                </div>
              </div>
            )}

            {reviewTab === "features" && (
              <div className={styles.tabGrid}>
                <div className={styles.tabPaneCard}>
                  <div className={styles.sheetSectionHeader}>
                    <h3>Features, feats & traits <span>{featureItems.length}</span></h3>
                    <p>Class, race, feat, and custom signals imported for later rule expansion.</p>
                  </div>
                  <div className={styles.reviewList}>
                    {featureItems.length ? featureItems.map((feature) => (
                      <div key={feature.id} className={styles.reviewRow}>
                        <strong>{feature.name}</strong>
                        <span>{feature.source ?? "feature"}</span>
                      </div>
                    )) : <p className={styles.emptyLine}>No feature summaries imported.</p>}
                  </div>
                  <div className={styles.inlineAddForm}>
                    <label>
                      Add feat
                      <input value={manualFeatName} onChange={(event) => setManualFeatName(event.target.value)} placeholder="War Caster, Sentinel..." />
                    </label>
                    <button type="button" className={styles.secondaryButton} onClick={addManualFeat}>
                      Add feat
                    </button>
                  </div>
                </div>

                <div className={styles.tabPaneCard}>
                  <div className={styles.sheetSectionHeader}>
                    <h3>Proficiencies <span>{proficiencyItems.length}</span></h3>
                    <p>Used to confirm armor, weapon, tool, language, and save signals.</p>
                  </div>
                  <div className={styles.tagCloud}>
                    {proficiencyItems.length ? proficiencyItems.map((item) => (
                      <span key={item}>{item}</span>
                    )) : <p className={styles.emptyLine}>No proficiencies imported.</p>}
                  </div>
                </div>
              </div>
            )}

            {reviewTab === "background" && (
              <div className={styles.tabGrid}>
                <div className={styles.tabPaneCard}>
                  <div className={styles.sheetSectionHeader}>
                    <h3>Identity</h3>
                    <p>Core D&D Beyond sheet identity signals.</p>
                  </div>
                  <dl className={styles.detailList}>
                    <div>
                      <dt>Name</dt>
                      <dd>{character.name}</dd>
                    </div>
                    <div>
                      <dt>Class</dt>
                      <dd>{classSummary}</dd>
                    </div>
                    <div>
                      <dt>Ancestry</dt>
                      <dd>{sheetSummary?.race ?? "Unknown ancestry"}</dd>
                    </div>
                    <div>
                      <dt>Background</dt>
                      <dd>{sheetSummary?.background ?? "No background imported"}</dd>
                    </div>
                  </dl>
                </div>

                <div className={styles.tabPaneCard}>
                  <div className={styles.sheetSectionHeader}>
                    <h3>Combat frame</h3>
                    <p>Numbers the simulator uses immediately.</p>
                  </div>
                  <dl className={styles.detailList}>
                    <div>
                      <dt>AC</dt>
                      <dd>{character.ac}</dd>
                    </div>
                    <div>
                      <dt>HP</dt>
                      <dd>{character.maxHp}</dd>
                    </div>
                    <div>
                      <dt>Speed</dt>
                      <dd>{character.speed} ft.</dd>
                    </div>
                    <div>
                      <dt>Initiative</dt>
                      <dd>{formatModifier(character.initiativeBonus)}</dd>
                    </div>
                  </dl>
                </div>

                <div className={styles.tabPaneCard}>
                  <div className={styles.sheetSectionHeader}>
                    <h3>Correct imported stats</h3>
                    <p>Use this when D&D Beyond import misses AC, HP, initiative, or base scores.</p>
                  </div>
                  <div className={styles.correctionGrid}>
                    <label>
                      AC
                      <input type="number" min="1" value={character.ac} onChange={(event) => updateCharacterNumber("ac", event.target.value)} />
                    </label>
                    <label>
                      HP
                      <input type="number" min="1" value={character.maxHp} onChange={(event) => updateCharacterNumber("maxHp", event.target.value)} />
                    </label>
                    <label>
                      Init
                      <input type="number" value={character.initiativeBonus} onChange={(event) => updateCharacterNumber("initiativeBonus", event.target.value)} />
                    </label>
                    <label>
                      PB
                      <input type="number" min="1" value={character.proficiencyBonus} onChange={(event) => updateCharacterNumber("proficiencyBonus", event.target.value)} />
                    </label>
                    <label>
                      Speed
                      <input type="number" min="1" value={character.speed} onChange={(event) => updateCharacterNumber("speed", event.target.value)} />
                    </label>
                    {abilityOrder.map((ability) => (
                      <label key={ability.key}>
                        {ability.label}
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={character.abilityScores[ability.key]}
                          onChange={(event) => updateAbilityScore(ability.key, event.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {reviewTab === "notes" && (
              <div className={styles.tabPaneCard}>
                <div className={styles.sheetSectionHeader}>
                  <h3>Import notes <span>{noteItems.length}</span></h3>
                  <p>Warnings and parser notes stay here instead of crowding the action setup.</p>
                </div>
                <div className={styles.reviewList}>
                  {noteItems.length ? noteItems.map((message) => (
                    <div key={message} className={styles.reviewRow}>
                      <strong>Note</strong>
                      <span>{message}</span>
                    </div>
                  )) : <p className={styles.emptyLine}>No import notes for this character.</p>}
                </div>
              </div>
            )}

            {reviewTab === "extras" && (
              <div className={styles.manualEditor}>
                <h3>Add missing attack</h3>
                <p className={styles.emptyLine}>Use this only when the import missed a weapon or attack-roll spell.</p>
                <div className={styles.formGrid}>
                  <label>
                    Type
                    <select value={manualKind} onChange={(event) => setManualKind(event.target.value as ManualActionKind)}>
                      <option value="weapon">Weapon</option>
                      <option value="spell">Attack spell</option>
                      <option value="save-spell">Save spell</option>
                    </select>
                  </label>
                  <label>
                    Name
                    <input value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="Longsword, Eldritch Blast, Hold Person..." />
                  </label>
                  {manualKind !== "save-spell" && (
                    <>
                      <label>
                        To hit
                        <input type="number" value={manualToHit} onChange={(event) => setManualToHit(event.target.value)} />
                      </label>
                      <label>
                        Dice count
                        <input type="number" min="1" value={manualDiceCount} onChange={(event) => setManualDiceCount(event.target.value)} />
                      </label>
                      <label>
                        Dice sides
                        <input type="number" min="2" value={manualDiceSides} onChange={(event) => setManualDiceSides(event.target.value)} />
                      </label>
                      <label>
                        Damage bonus
                        <input type="number" value={manualDamageBonus} onChange={(event) => setManualDamageBonus(event.target.value)} />
                      </label>
                      <label>
                        Attacks/action
                        <input type="number" min="1" max="4" value={manualAttacksPerAction} onChange={(event) => setManualAttacksPerAction(event.target.value)} />
                      </label>
                    </>
                  )}
                  {manualKind !== "weapon" && (
                    <label>
                      Spell level
                      <input type="number" min="0" max="9" value={manualSpellLevel} onChange={(event) => setManualSpellLevel(event.target.value)} />
                    </label>
                  )}
                  {manualKind === "save-spell" && (
                    <>
                      <label>
                        Save ability
                        <select value={manualSaveAbility} onChange={(event) => setManualSaveAbility(event.target.value as AbilityKey)}>
                          {abilityOrder.map((ability) => (
                            <option key={ability.key} value={ability.key}>{ability.label}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Save DC
                        <input type="number" min="1" value={manualSaveDc} onChange={(event) => setManualSaveDc(event.target.value)} />
                      </label>
                    </>
                  )}
                </div>
                <button type="button" className={styles.secondaryButton} onClick={addManualAction}>
                  Add to loadout
                </button>
              </div>
            )}
          </div>
        </section>

        <section className={styles.panel} data-window-title="MONSTER GRIMOIRE">
          <p className={styles.eyebrow}>Encounter</p>
          <div className={styles.formGrid}>
            <label>
              Monster
              <select value={monsterId} onChange={(event) => setMonsterId(event.target.value)}>
                {srdMonsters.map((monster) => (
                  <option key={monster.id} value={monster.id}>
                    {monster.name} CR {monster.cr}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Count
              <input
                type="number"
                min="1"
                max="8"
                value={count}
                onChange={(event) => setCount(Math.max(1, Math.min(8, Number(event.target.value))))}
              />
            </label>
            <label>
              Iterations
              <select
                value={iterations}
                onChange={(event) => setIterations(Number(event.target.value) as EncounterConfig["iterations"])}
              >
                {iterationOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Seed
              <input value={seed} onChange={(event) => setSeed(event.target.value)} placeholder="Optional" />
            </label>
          </div>

          <div className={styles.monsterCard}>
            <h2>{selectedMonster.name}</h2>
            <p>CR {selectedMonster.cr} | AC {selectedMonster.ac} | HP {selectedMonster.maxHp}</p>
            <p>{selectedMonster.attacks[0].name} +{selectedMonster.attacks[0].toHit}</p>
          </div>

          <button type="button" className={styles.primaryButton} onClick={beginSimulation} disabled={!hasAttackAction}>
            Begin simulation
          </button>
        </section>
      </section>
      ) : (
      <section className={styles.grid} aria-label="Playable simulation workspace">
        <section className={`${styles.panel} ${styles.instructionsPanel}`} data-window-title="QUEST BRIEFING">
          <div>
            <p className={styles.eyebrow}>Simulation</p>
            <h2>{character.name} vs {selectedMonster.name} x{count}</h2>
          </div>
          <p className={styles.privacyNote}>
            Play the encounter turn by turn, or run the batch odds in the results panel. Return to setup to edit character loadout or encounter settings.
          </p>
          <button type="button" className={styles.secondaryButton} onClick={backToSetup}>
            Back to character setup
          </button>
        </section>

        <section className={`${styles.panel} ${styles.playPanel}`} data-window-title="BATTLE ALTAR">
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Playable encounter</p>
              <h2>Step into the fight</h2>
            </div>
            <button type="button" className={styles.secondaryButton} onClick={startPlayableEncounter}>
              Start scene
            </button>
          </div>

          {!playScene ? (
            <p className={styles.emptyState}>
              Start a scene to play one encounter exchange at a time. Your choices add a small tactical twist and a little story texture.
            </p>
          ) : (
            <>
              <div className={styles.playStatus}>
                <div>
                  <span>{character.name}</span>
                  <strong>{playScene.characterHp}/{character.maxHp} HP</strong>
                  <meter min="0" max={character.maxHp} value={playScene.characterHp} />
                </div>
                <div>
                  <span>Round</span>
                  <strong>{playScene.round}</strong>
                  <p>{playScene.status === "active" ? "Choose your next beat." : playScene.status === "victory" ? "Victory" : "Defeat"}</p>
                </div>
              </div>

              {activeEffectCards.length > 0 && (
                <div className={styles.activeEffects} aria-label="Active spell effects">
                  {activeEffectCards.map((effect) => (
                    <div key={effect.id}>
                      <span>{effect.targetName}</span>
                      <strong>{effect.name}</strong>
                      <small>{effect.detail}</small>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.targetGrid}>
                {playScene.monsters.map((monster) => (
                  <button
                    key={monster.id}
                    type="button"
                    className={monster.id === playTargetId ? styles.targetSelected : ""}
                    onClick={() => setPlayTargetId(monster.id)}
                    disabled={monster.hp <= 0 || playScene.status !== "active"}
                  >
                    <span>{monster.name}</span>
                    <strong>{monster.hp}/{monster.maxHp} HP</strong>
                    <meter min="0" max={monster.maxHp} value={monster.hp} />
                  </button>
                ))}
              </div>

              <div className={styles.actionPicker}>
                <div className={styles.actionTabs} role="tablist" aria-label="Character action groups">
                  {groupedActions.map((group) => (
                    <button
                      key={group.kind}
                      type="button"
                      className={group.kind === actionKind ? styles.actionTabActive : ""}
                      onClick={() => {
                        setActionKind(group.kind);
                        setSelectedActionId(group.actions[0]?.id ?? character.actions[0]?.id ?? "");
                        setSelectedModifierId("");
                      }}
                      disabled={!group.actions.length}
                    >
                      {group.kind}s <span>{group.actions.length}</span>
                    </button>
                  ))}
                </div>

                {visibleActions.length > 0 ? (
                  <div className={styles.actionGrid}>
                    {visibleActions.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        className={action.id === selectedActionId ? styles.actionSelected : ""}
                        onClick={() => {
                          setSelectedActionId(action.id);
                          if (action.kind !== "weapon" || isLikelyRangedWeaponAction(action)) {
                            setSelectedModifierId("");
                          }
                        }}
                        disabled={playScene.status !== "active"}
                      >
                        <strong>{action.name}</strong>
                        {action.kind === "skill" ? (
                          <span>{actionLabel(action)}</span>
                        ) : (
                          <span>{actionLabel(action)}</span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyState}>No {actionKind} actions were parsed for this character yet.</p>
                )}

                {actionKind === "weapon" && (
                  <div className={styles.modifierPicker}>
                    <div className={styles.sheetSectionHeader}>
                      <h3>Attack modifier</h3>
                      <p>
                        {canUseWeaponModifier
                          ? "Choose a rider or buff before taking the weapon attack."
                          : "Melee-only modifiers need Warhammer or another melee attack first."}
                      </p>
                    </div>
                    <div className={styles.modifierGrid}>
                      <button
                        type="button"
                        className={!selectedModifierId ? styles.modifierSelected : ""}
                        onClick={() => setSelectedModifierId("")}
                        disabled={playScene.status !== "active"}
                      >
                        <strong>No modifier</strong>
                        <span>Make the weapon attack normally.</span>
                      </button>
                      {attackModifierActions.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          className={action.id === selectedModifierId ? styles.modifierSelected : ""}
                          onClick={() => setSelectedModifierId(action.id)}
                          disabled={(isSmiteAction(action) && !canUseWeaponModifier) || playScene.status !== "active"}
                        >
                          <strong>{action.name}</strong>
                          <span>{attackModifierHint(action)}</span>
                        </button>
                      ))}
                      {!attackModifierActions.length && (
                        <p className={styles.emptyState}>No attack modifiers were imported for this character yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.playChoices} aria-label="Roleplay combat choices">
                <button type="button" onClick={() => takePlayTurn("steady")} disabled={!livingPlayMonsters.length || playScene.status !== "active"}>
                  <strong>Steady Strike</strong>
                  <span>Use {selectedAction?.name ?? "your action"} cleanly{selectedModifier ? ` with ${selectedModifier.name}` : ""}.</span>
                </button>
                <button type="button" onClick={() => takePlayTurn("guarded")} disabled={!livingPlayMonsters.length || playScene.status !== "active"}>
                  <strong>Guarded Advance</strong>
                  <span>-1 to attack actions, +2 AC this exchange.</span>
                </button>
                <button type="button" onClick={() => takePlayTurn("reckless")} disabled={!livingPlayMonsters.length || playScene.status !== "active"}>
                  <strong>Reckless Push</strong>
                  <span>+2 to attack actions, -2 AC this exchange.</span>
                </button>
              </div>

              <ol className={styles.storyLog}>
                {playScene.log.slice(-10).map((entry) => (
                  <li key={entry.id} className={styles[`tone-${entry.tone}`]}>
                    <span>R{entry.round}</span>
                    {entry.text}
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>

        <aside className={styles.sideStack}>
          <section className={styles.panel} data-window-title="ORACLE RESULTS">
            <p className={styles.eyebrow}>Results</p>
            <button type="button" className={styles.secondaryButton} onClick={runCurrentSimulation} disabled={!hasAttackAction}>
              Run batch odds
            </button>
            <h2>{verdictFor(result)}</h2>
            <div className={styles.winBar} aria-label={`Win rate ${result?.summary.winRate ?? 0}%`}>
              <span style={{ width: `${result?.summary.winRate ?? 0}%` }} />
            </div>

            <dl className={styles.resultGrid}>
              <div>
                <dt>Win rate</dt>
                <dd>{result ? `${result.summary.winRate}%` : "--"}</dd>
              </div>
              <div>
                <dt>Avg rounds</dt>
                <dd>{result ? result.summary.averageRounds : "--"}</dd>
              </div>
              <div>
                <dt>DPR</dt>
                <dd>{result ? result.summary.averageDamageDealtPerRound : "--"}</dd>
              </div>
              <div>
                <dt>Taken/round</dt>
                <dd>{result ? result.summary.averageDamageTakenPerRound : "--"}</dd>
              </div>
            </dl>

            {firstRun && (
              <details className={styles.log} open>
                <summary>First run log: {firstRun.winner === "character" ? "Victory" : "Defeat"} in {firstRun.rounds} rounds</summary>
                <ol>
                  {firstRun.events.map((event) => (
                    <li key={event.id}>
                      <span>R{event.round}</span>
                      {event.note} Target HP: {event.targetHpAfter ?? "--"}
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </section>

          <section className={`${styles.panel} ${styles.spellDetailsPanel}`} data-window-title="SPELL DETAILS">
            <p className={styles.eyebrow}>Spell reference</p>
            {selectedSpellDetails ? (
              <>
                <h2>{selectedSpellDetails.name}</h2>
                <dl className={styles.spellMetaGrid}>
                  <div>
                    <dt>Level</dt>
                    <dd>{selectedSpellDetails.level === 0 ? "Cantrip" : selectedSpellDetails.level}</dd>
                  </div>
                  <div>
                    <dt>Purpose</dt>
                    <dd>{selectedSpellDetails.purpose}</dd>
                  </div>
                  <div>
                    <dt>Range</dt>
                    <dd>{selectedSpellDetails.range ?? "--"}</dd>
                  </div>
                  <div>
                    <dt>Duration</dt>
                    <dd>{selectedSpellDetails.duration ?? "--"}</dd>
                  </div>
                  <div>
                    <dt>Check</dt>
                    <dd>
                      {typeof selectedSpellDetails.toHit === "number"
                        ? `+${selectedSpellDetails.toHit} to hit`
                        : typeof selectedSpellDetails.saveDc === "number"
                          ? `${selectedSpellDetails.saveAbility ? `${selectedSpellDetails.saveAbility.toUpperCase()} ` : ""}DC ${selectedSpellDetails.saveDc}`
                          : "--"}
                    </dd>
                  </div>
                  <div>
                    <dt>Damage</dt>
                    <dd>{selectedSpellDamage ?? "--"}</dd>
                  </div>
                </dl>

                <div className={styles.spellRuleBox}>
                  <h3>How this resolves</h3>
                  <p>{spellRulesSummary(selectedSpellDetails)}</p>
                </div>

                <div className={styles.spellRuleBox}>
                  <h3>Imported sheet text</h3>
                  <p>{selectedSpellDetails.description || "No description text was included in the imported character data."}</p>
                </div>

                <div className={styles.spellTags}>
                  {selectedSpellDetails.school && <span>{selectedSpellDetails.school}</span>}
                  {selectedSpellDetails.resourceCost && <span>{selectedSpellDetails.resourceCost}</span>}
                  {selectedSpellDetails.concentration && <span>Concentration</span>}
                  {selectedSpellDetails.activation && <span>{selectedSpellDetails.activation}</span>}
                </div>
              </>
            ) : (
              <div className={styles.spellEmptyState}>
                <h2>Select a spell</h2>
                <p>Choose a spell card or a smite weapon modifier to see its imported rules text and how the simulator will resolve it.</p>
              </div>
            )}
          </section>
        </aside>
      </section>
      )}

      <footer className={styles.footer}>
        <p>
          This work includes material from the SRD 5.1 by Wizards of the Coast LLC, available under CC BY 4.0.
        </p>
        <p>
          <a href="https://www.dndbeyond.com/srd" target="_blank" rel="noreferrer">D&D Beyond SRD</a>
          {" | "}
          <a href="https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf" target="_blank" rel="noreferrer">SRD 5.1 PDF</a>
        </p>
      </footer>
    </main>
  );
}
