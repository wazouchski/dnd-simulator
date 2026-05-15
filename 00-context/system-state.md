# System State

> **Last Updated:** 2026-05-10  
> **Environment:** MVP Vertical Slice  
> **Version:** 0.1.0

---

## Current Product

The project is a browser-based **D&D 5e Character Balance Tester**. It lets users load or import a character, configure an SRD encounter, run client-side combat simulations, and inspect aggregate performance results.

The active product direction is defined in:

- [Product Vision](./vision.md)
- [Product Requirements](../01-product/prd.md)
- [Assumptions and Risks](./assumptions.md)

---

## Current Implementation State

A first playable Next.js + TypeScript vertical slice exists.

Implemented:

1. Static-export-compatible Next.js App Router scaffold.
2. Two-step tactical workbench: character/loadout setup first, playable simulation second.
3. Sample level 5 fighter.
4. Manual normalized JSON import with defensive D&D Beyond parser support.
5. Bookmarklet handoff route at `/import/` with cross-tab update support.
6. SRD 5.1 seed monsters: Goblin, Skeleton, Wolf, Giant Spider, Ghoul.
7. Pure TypeScript combat engine with initiative, attack rolls, natural 1 misses, natural 20 crits, crit dice doubling, HP floor, seeded runs, aggregate results, and first-run log.
8. Loadout verification screen for parsed weapons, spells, and skills.
9. D&D Beyond loadout extraction for equipped weapon rows and attack-roll spell rows, including inferred ability modifier, proficiency, magic `+N` item bonuses, and martial Extra Attack counts.
10. Manual weapon/spell attack editor for D&D Beyond sheets whose JSON does not expose attack actions cleanly.
11. Playable encounter mode with narrated turns, target selection, Steady/Guarded/Reckless roleplay choices, and selectable character actions.
12. Character action model for weapons, skills, rollable attack spells, and non-damage/control/utility sheet spells.
13. Unit tests for dice, combat, parser, and playable encounter behavior.
14. Electron desktop wrapper that serves the static export in a native window.
15. Desktop import bridge at `/api/import` + `/api/import/events` so the D&D Beyond bookmarklet flow can relay into the Electron window.
16. Custom neon d20 desktop icon generated from `scripts/generate-icon.cjs` and applied to Windows builds during `afterPack`.
17. Self-signed local Windows signing scripts for internal/test distribution.
18. Dragonforge Oracle high-fantasy visual skin.
19. Priority 1 import foundation:
   - imported spells are kept as sheet actions even when they are control, utility, buff, defense, mobility, healing, summon, or non-damage spells
   - rollable attacks are separated from full sheet actions so the batch engine only receives valid attack actions
   - imported sheet summaries track race, background, classes, inventory, features, proficiencies, and spells where D&D Beyond exposes them
   - inventory summaries now categorize weapons, armor, shields, and equipment for review
   - imported inventory weapons can be checked/unchecked in Loadout Verification to control which weapons are active for simulation
   - the UI shows imported sheet facts and has a visible, plain-language copy-button bookmark import flow for non-technical testers
   - character review now uses D&D Beyond-like tabs for Actions, Spells, Inventory, Features & Traits, Background, Notes, and Extras
   - setup review includes manual correction fields for AC, HP, initiative, proficiency bonus, speed, and base ability scores
   - manual feats can be added to the character review so important sheet traits are not lost while feat rules are expanded
   - playable mode includes first-pass save-spell handling: save DC, save ability, monster save roll, and temporary response suppression for control spells such as Hold Person
   - playable mode now has a structured spell-effect runtime for active effects, concentration, control conditions, AC bonuses, and weapon riders

---

## Tech Stack

| Area | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16 | App Router, static export |
| Language | TypeScript 6 | Strict mode |
| Runtime Shape | Local-first browser app | No account system or backend for MVP |
| Styling | CSS Modules + global tokens | Dragonforge high-fantasy tactical window skin |
| Simulation | Client-side TypeScript engine | Independent from React UI |
| Data | Bundled SRD 5.1 seed data | Character data stays in browser session |
| Tests | Vitest | Unit tests for rules logic and parser |
| Hosting | Static subdomain deploy | Production build writes static output to `out/` |

---

## Current App Structure

```txt
app/
  layout.tsx
  page.tsx
  import/
    page.tsx

src/
  components/
    ImportReceiver.tsx
    SimulatorWorkbench.tsx
  data/
    sampleCharacter.ts
    srdMonsters.ts
  engine/
    combat.ts
    dice.ts
    playableEncounter.ts
    spellEffects.ts
  parsers/
    ddbCharacter.ts
  types/
    combat.ts
  utils/
    bookmarklet.ts
```

---

## Deployment Target

| Environment | URL | Status |
| --- | --- | --- |
| Local Dev | `localhost:3001` | Ready via `npm.cmd run dev` |
| Static Preview | `localhost:3001` | Preferred Windows preview via `npm.cmd run preview:static` |
| Desktop Dev | `localhost:3217` by default | Ready via `npm.cmd run desktop` |
| Static Build | `out/` | Ready via `npm.cmd run build` |
| Windows Executable | `release/` | Ready via `npm.cmd run desktop:dist` |
| Friend-Test Installer | `release-current/DND-Character-Balance-Tester-Friend-Test-Setup.exe` | Current easiest tester handoff |
| Friend-Test Visual Guide | `release-current/quickstart.pdf` | Two-page infographic quickstart with screenshots |
| Locally Signed Windows Executable | `release/` | Ready via `npm.cmd run desktop:dist:selfsigned:trust` |
| Production | Subdomain TBD | Not deployed |

The app is configured with `output: "export"` in `next.config.mjs`, so it can be deployed by uploading the `out/` directory to static hosting.
The Electron wrapper serves that same `out/` directory from a local-only HTTP server, usually `127.0.0.1:3217`, and opens it in a desktop window.

---

## Current UI Direction

The app should open like a high-fantasy tactical artifact named **Dragonforge Oracle**. Keep the simulator-first workflow, but frame the screens as separate arcane workbench spaces:

| Simulator Area | Skin Role |
| --- | --- |
| Header | Dragonforge oracle with d20 sigil, character rite display, and ability glyph row |
| Quick start | Sanctum prime |
| Character import | Hero dossier |
| Loadout verification | Arsenal altar |
| Encounter controls | Monster grimoire |
| Simulation instructions | Quest briefing |
| Playable encounter | Battle altar |
| Results | Oracle results |

Use rich but readable fantasy styling: obsidian panels, gold inlay, bloodstone/emerald/violet accents, spellbook-like inputs, arcane titlebars, and a dice/sigil visual asset. Keep controls dense and legible so the simulator remains practical rather than becoming a landing page or decorative splash screen.

---

## Active Risks

| ID | Risk | Mitigation |
| --- | --- | --- |
| R1 | D&D Beyond character payload shape may change | Parser is isolated and manual normalized JSON is supported |
| R2 | Combat rules edge cases can undermine trust | Rules logic is isolated and unit tested; approximations should stay visible |
| R3 | Large simulations can block the UI | Web Worker remains a future task for heavier runs |
| R4 | Spell-heavy characters may be poorly represented | Parser now imports non-damage/control spells as sheet actions and playable mode has a first structured `SpellEffect` runtime; spell slots, repeat saves, AoE, reactions, and class resources remain Priority 1 |
| R5 | Self-signed desktop executable is trusted only on machines that install the public cert | Acceptable for local MVP; choose Microsoft Store/MSIX, Azure Trusted Signing, or an OV/EV certificate before public distribution |

---

## Priority 1 Engineering Tasks

1. Collect more real D&D Beyond character payloads across weapon, caster, control, warlock, martial, and feature-heavy builds.
2. Split the UI into the guided product flow:
   - Character Sheet Upload / Import
   - Character Sheet Review / Modifications
   - Mode Select
   - Batch Results
   - Playable Encounter
3. Expand spell import coverage into a reliable spell catalog:
   - concentration
   - save DC and save ability
   - attack roll vs saving throw vs control-only
   - duration/range/area
   - pact magic and class resources
   - known/prepared/always-prepared flags
4. Expand equipment import into a reliable gear catalog:
   - equipped weapons
   - armor and shields
   - AC contributions and magic bonuses
   - attunement
   - consumables and limited-use items
5. Expand manual correction persistence so user-confirmed loadout/stat/feat adjustments survive re-imports cleanly instead of being merged directly into the active character object.
6. Expand the new `SpellEffect` runtime into richer tactical spell effects for common control and setup spells, starting with Darkness visibility, Bane, Shield, healing spells, temp HP, repeat saves, and spell duration cleanup.
7. Improve bookmarklet onboarding with browser-specific help and optional short video/GIF guidance. Assume friend-test users may not know what JSON, bookmarklets, or browser bookmark managers are.
8. Make playable mode replayable with varied encounter beats, terrain/position choices, movement, resource usage, conditions, and class-specific action prompts.

## Later Engineering Tasks

1. Add richer playable actions such as healing, disengage, bonus actions, reactions, and class features.
2. Add a Web Worker for 50 and 100 iteration batch runs.
3. Add more SRD 5.1 monsters and encounter presets.
4. Add side-by-side result comparison for up to 3 result sets.
5. Add browser/UI tests for the main workflow.
6. Choose and implement a code-signing path before sharing broadly.
