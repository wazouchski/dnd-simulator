# Implementation Log

> **Project:** D&D Character Balance Tester  
> **Purpose:** Track implementation sessions and important changes

---

## 2026-05-06 | Context Cleanup

**Task:** Remove stale non-D&D project context.

### What Changed

- Removed the obsolete non-D&D feature documentation folder.
- Replaced the system state with a D&D simulator pre-scaffold baseline.
- Replaced stale architecture decisions with D&D simulator decisions.

### Current State

The workspace is ready for a Next.js scaffold. No application code exists yet.

### Next Suggested Session

Create the Next.js TypeScript scaffold and build the first vertical slice:

1. Sample character.
2. SRD monster selection.
3. Basic attack-roll combat simulation.
4. Aggregate result display.

---

## 2026-05-07 | MVP Vertical Slice

**Task:** Implement first playable simulator workbench.

### What Changed

- Added a static-export-compatible Next.js + TypeScript app.
- Added a tactical workbench UI with sample character load, JSON import, encounter controls, simulation trigger, aggregate result cards, and expandable combat log.
- Added bookmarklet handoff route at `/import/`; raw D&D Beyond payloads are parsed locally and not persisted.
- Added SRD 5.1 seed monsters: Goblin, Skeleton, Wolf, Giant Spider, Ghoul.
- Added pure combat engine and dice utilities with seeded mode.
- Added parser support for normalized character JSON and defensive D&D Beyond-like payloads.
- Added Vitest unit tests for dice, combat, and parser behavior.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 3 files, 11 tests.
- `npm.cmd run build` passes and generates static output in `out/`.

### Notes

- Vitest and Next build needed elevated execution in this Windows sandbox because their worker processes hit `spawn EPERM`.
- npm reported 2 moderate dependency audit findings after installing current Next/React tooling. Do not run force fixes without checking compatibility.

---

## 2026-05-07 | Bookmarklet Handoff Fix

**Task:** Fix bookmarklet import not updating the simulator character.

### What Changed

- Fixed bookmarklet `postMessage` target origin to use only the app origin, not the `/import/` path.
- Added browser-only character handoff utility using `BroadcastChannel` with a transient `localStorage` fallback.
- Updated the simulator workbench to subscribe for imports from the `/import/` tab and refresh the visible character immediately.
- Added a regression test for the bookmarklet target-origin behavior.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 4 files, 12 tests.
- `npm.cmd run build` passes.

---

## 2026-05-07 | Outside User Instructions

**Task:** Add in-app instructions for new users.

### What Changed

- Added a Quick Start instruction panel to the simulator workspace.
- Added plain-language bookmarklet setup steps directly on the page.
- Added a visible privacy note explaining browser-only parsing and no server storage.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 4 files, 12 tests.
- `npm.cmd run build` passes.

---

## 2026-05-07 | D&D Beyond Fetch Fallback

**Task:** Improve bookmarklet failure path when D&D Beyond blocks automatic JSON fetches.

### What Changed

- Updated the bookmarklet to request `includeCustomItems=true`.
- Replaced the generic failure alert with a prompt that opens the raw character JSON URL.
- Added a Paste JSON fallback importer on the simulator page.
- Updated in-app instructions to explain the blocked-fetch fallback.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 4 files, 12 tests.
- `npm.cmd run build` passes.

---

## 2026-05-07 | Unauthorized D&D Beyond Payload Handling

**Task:** Handle D&D Beyond unauthorized JSON responses clearly.

### What Changed

- Parser now rejects `success: false` D&D Beyond responses instead of treating them as blank character payloads.
- Bookmarklet prompt now explains that `Unauthorized Access Attempt` means the character likely needs to be Public/shareable.
- In-app Paste JSON fallback instructions now call out unauthorized responses as unusable character data.
- Added parser regression coverage for unauthorized payloads.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 4 files, 13 tests.
- `npm.cmd run build` passes.

---

## 2026-05-07 | Public Character Quickstart Note

**Task:** Document D&D Beyond Public privacy requirement in the app.

### What Changed

- Added the Public character requirement to the Quick Start checklist.
- Added the Public character requirement as the first bookmarklet setup step.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 4 files, 13 tests.
- `npm.cmd run build` passes.

---

## 2026-05-07 | Playable Encounter Mode

**Task:** Make the simulator playable with light roleplay choices.

### What Changed

- Added a separate playable encounter engine for turn-by-turn scenes.
- Added target selection, character/monster HP tracking, and narrated exchange logs.
- Added three roleplay/tactical choices:
  - Steady Strike: normal attack.
  - Guarded Advance: -1 to hit, +2 AC for the exchange.
  - Reckless Push: +2 to hit, -2 AC for the exchange.
- Added a Playable Encounter panel to the workbench so users can play the fight instead of only reading batch results.
- Added unit tests for playable encounter creation, turn resolution, and terminal states.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 16 tests.
- `npm.cmd run build` passes.

---

## 2026-05-07 | Character Sheet Action Selection

**Task:** Let playable mode use weapons, skills, and spells from the character sheet action list.

### What Changed

- Added a `CharacterAction` model covering weapon, skill, and spell actions.
- Added sample character weapons and skills.
- Updated the D&D Beyond parser to populate weapon actions, fallback skill actions, and simple attack-roll spell actions where available.
- Updated playable encounter turns to use the selected character action.
- Skills now shape the exchange:
  - Defensive skills improve AC for the exchange.
  - Setup skills improve attack accuracy.
  - Pressure skills add small pre-attack pressure damage.
- Added action tabs and selectable action cards for weapons, spells, and skills in the playable encounter panel.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 18 tests.
- `npm.cmd run build` passes.

---

## 2026-05-07 | Parser Warning Cleanup And Inventory Weapons

**Task:** Reduce repeated parser warnings and find more real D&D Beyond actions.

### What Changed

- Deduplicated parser warnings so repeated "No supported attack" messages do not stack.
- Broadened D&D Beyond attack extraction to accept more loose action shapes.
- Added equipped inventory weapon extraction for sheets where D&D Beyond does not expose weapon attacks in the action buckets.
- Added dice-string parsing such as `1d8+3`.
- Updated the generic warning copy to explain that batch combat needs a weapon or attack-roll spell, while playable mode can still use skills.
- Added regression tests for inventory weapons and duplicate warnings.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 20 tests.
- `npm.cmd run build` passes.

---

## 2026-05-07 | Two-Step Loadout Verification Flow

**Task:** Separate character/loadout setup from playable simulation.

### What Changed

- Split the workbench into a setup screen and a simulation screen.
- Setup now focuses on import, character verification, loadout verification, and encounter settings.
- Added a loadout verification panel showing parsed weapons, attack-roll spells, and skills.
- Added a manual weapon/spell attack editor so users can fill gaps when D&D Beyond JSON does not expose attacks cleanly.
- Gated "Begin simulation" until at least one weapon or attack-roll spell is available.
- Simulation screen now focuses on playable encounter choices and batch odds results, with a Back to setup action.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 20 tests.
- `npm.cmd run build` passes.

---

## 2026-05-07 | D&D Beyond Calculated Loadout Parsing

**Task:** Parse visible D&D Beyond weapon and attack-spell rows more accurately.

### What Changed

- Added D&D Beyond-style equipped weapon calculation from inventory definitions when ready-made action rows are missing.
- Weapon parsing now infers STR/DEX attack ability, proficiency bonus, magic `+N` item names, damage bonus, range text, and martial Extra Attack counts.
- Spell parsing now reads D&D Beyond spell buckets such as `spells.class` and extracts simple attack-roll spells like Inflict Wounds.
- Added parser support for D&D Beyond `damage.damageDice` shapes.
- Added an Attacks/action field to the manual loadout editor for user-entered weapon rows.
- Added regression coverage for a Longbow +1, Warhammer +1, and Inflict Wounds payload shape.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 21 tests.
- `npm.cmd run build` passes.

---

## 2026-05-07 | Windows Desktop Executable

**Task:** Package the static simulator as a windowed executable while preserving character import.

### What Changed

- Added an Electron main process that serves the exported Next app from `out/` through a local-only HTTP server.
- Added a desktop import bridge:
  - `POST /api/import` receives parsed character handoffs.
  - `GET /api/import/events` streams imports to the desktop window.
- Updated the D&D Beyond import receiver to publish to the existing browser handoff and the desktop bridge.
- Updated the simulator to subscribe to desktop import events.
- Added Electron packaging scripts:
  - `npm.cmd run desktop` for local desktop launch.
  - `npm.cmd run desktop:dist` for Windows executable artifacts.
- Added `electron` and `electron-builder` dev dependencies.
- Added `release/` to `.gitignore`.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 21 tests.
- `npm.cmd run desktop:dist` passes and writes:
  - `release/D&D Character Balance Tester-0.1.0-x64-Setup.exe`
  - `release/D&D Character Balance Tester-0.1.0-x64-Portable.exe`
  - `release/win-unpacked/D&D Character Balance Tester.exe`
- Smoke-tested the unpacked executable:
  - `GET http://127.0.0.1:3217/` returned 200.
  - `POST http://127.0.0.1:3217/api/import` returned `{ ok: true }`.

### Notes

- The desktop MVP is unsigned and uses Electron's default icon.
- The desktop app uses port `3217` by default, with a small fallback range if that port is busy. Port `3000` remains unused.

---

## 2026-05-07 | Desktop Icon Branding

**Task:** Replace the default Electron icon with a dice-themed app icon.

### What Changed

- Added `scripts/generate-icon.cjs` to generate a neon d20 `build/icon.png` and multi-size `build/icon.ico`.
- Added `electron/after-pack.cjs` to apply the icon to the unpacked Windows executable with `rcedit`.
- Updated Electron Builder config to use `build/icon.ico` for Windows and NSIS installer icons.
- Updated `desktop:dist` so it regenerates the icon before packaging.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 21 tests.
- `npm.cmd run desktop:dist` passes and writes refreshed Setup/Portable executables.
- Extracted the associated icon from `release/win-unpacked/D&D Character Balance Tester.exe`; it shows the custom dice icon.
- Smoke-tested the rebuilt app at `GET http://127.0.0.1:3217/`, which returned 200.
- `Get-AuthenticodeSignature` still reports Setup, Portable, and unpacked EXEs as `NotSigned`.

### Notes

- Icon branding is solved for the MVP.
- Code signing remains a distribution decision requiring Microsoft Store/MSIX, Azure Trusted Signing, or a purchased signing certificate.

---

## 2026-05-07 | Self-Signed Local Code Signing

**Task:** Add a self-signed signing path for local/internal Windows executable distribution.

### What Changed

- Added `scripts/sign-self-signed.ps1`.
  - Creates or reuses a Current User code-signing certificate.
  - Exports the public certificate to `build/certs/dnd-character-balance-tester-local.cer`.
  - Signs Setup, Portable, and unpacked Windows EXEs with SHA-256.
  - Can install the public cert into Current User Trusted Root with `-TrustForCurrentUser`.
- Added `scripts/trust-self-signed.ps1` for trusting an exported public cert on another test machine.
- Added npm scripts:
  - `npm.cmd run desktop:sign:selfsigned`
  - `npm.cmd run desktop:sign:trust-local`
  - `npm.cmd run desktop:dist:selfsigned`
  - `npm.cmd run desktop:dist:selfsigned:trust`
  - `npm.cmd run desktop:trust:selfsigned`

### Verification

- `npm.cmd run desktop:sign:trust-local` passes.
- Unrestricted Windows `Get-AuthenticodeSignature` reports `Valid` for:
  - `release/D&D Character Balance Tester-0.1.0-x64-Setup.exe`
  - `release/D&D Character Balance Tester-0.1.0-x64-Portable.exe`
  - `release/win-unpacked/D&D Character Balance Tester.exe`
- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 21 tests.

### Notes

- The certificate is trusted for the current Windows user only.
- Other machines must trust `build/certs/dnd-character-balance-tester-local.cer` before the self-signed signature verifies as trusted there.
- This is appropriate for local/internal testing, not public distribution trust.

---

## 2026-05-07 | Winamp-Style UI Skin

**Task:** Restyle the simulator so it feels like opening Winamp in 2002.

### What Changed

- Replaced the tactical workbench skin with compact early-2000s desktop chrome.
- Added beveled metallic panels, title-bar gradients, dark LCD cards, scanline texture, analyzer-style accent bars, and hard-edged controls.
- Swapped the typography toward Tahoma/Verdana with Courier-style numeric readouts.
- Restyled the import handoff page to match the same skin.
- Preserved the existing setup/simulation flow, D&D Beyond import behavior, playable encounter controls, and desktop packaging.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 21 tests.
- `npm.cmd run build` passes.
- `npm.cmd run desktop:dist:selfsigned:trust` passes and signs the rebuilt desktop artifacts.
- Smoke-tested the rebuilt desktop app at `GET http://127.0.0.1:3217/`, which returned 200.

### Notes

- Dev server is running at `http://127.0.0.1:3001/`.
- Port `3000` remains unused.

---

## 2026-05-07 | Stable Static Preview Server

**Task:** Fix local preview hanging in the in-app browser.

### What Changed

- Added `scripts/serve-static.cjs`, a tiny static server for the exported `out/` folder.
- Added `npm.cmd run preview:static` to serve the built app at `http://127.0.0.1:3001/`.
- Updated the static preview server to send `Cache-Control: no-store` and return real 404s for missing `/_next/` assets.
- Gated the desktop EventSource import bridge so it only opens on the Electron local port range `3217-3236`, not during web/static preview on `3001`.
- Replaced the wedged Next dev server on `3001` with the stable static preview server.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 21 tests.
- `npm.cmd run build` passes.
- `GET http://127.0.0.1:3001/?fresh=1` returns 200 with `Cache-Control: no-store`.
- Static CSS asset requests return `text/css`, and missing asset requests return 404.

### Notes

- Use `npm.cmd run preview:static` for reliable local UI preview on Windows.
- Keep `npm.cmd run dev` available for active Next development, but it may wedge under this Windows sandbox.

---

## 2026-05-08 | DNDAMP Multi-Window Skin

**Task:** Research classic Winamp skins and redesign the simulator menus as a D&D-themed Winamp-style app shell.

### What Changed

- Added a DNDAMP main player header with character track readout, round counter, transport-style controls, and analyzer LEDs.
- Converted simulator panels into skinned-window roles: main/readme, character library, loadout EQ, encounter playlist, minibrowser/readme, battle visualizer, output scope, and import handoff.
- Added titlebar chrome, small window control lights, LCD/scanline panels, beveled buttons, equalizer-style loadout bars, and hard-edged compact controls.
- Updated project state and decisions docs so future UI work extends this DNDAMP direction.

### Research Notes

- Classic Winamp skins are built from small bitmap regions layered into titlebars, controls, sliders, number displays, and text displays.
- Winamp-style workflows naturally separate into main player, playlist, media library, equalizer, visualization, and minibrowser/readme areas.
- The simulator maps well to that model: character import as library, loadout as EQ, encounter as playlist, playable combat as visualizer, and results as output scope.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 21 tests.
- `npm.cmd run build` passes.
- Refreshed static preview at `http://127.0.0.1:3001/`; `GET /?fresh=dndamp` returns 200.
- `npm.cmd run desktop:dist:selfsigned:trust` passes and signs the rebuilt Windows artifacts.

---

## 2026-05-09 | Dragonforge Fantasy Skin And Portable Rebuild

**Task:** Replace the Winamp-inspired UI with a maximal high-fantasy D&D-style skin and update the portable executable.

### What Changed

- Reworked the app into a Dragonforge Oracle theme with obsidian panels, gold inlay, bloodstone/emerald/violet accents, spellbook inputs, arcane titlebars, and a d20 sigil asset.
- Renamed panel roles from player-window language to fantasy workspaces: Sanctum Prime, Hero Dossier, Arsenal Altar, Monster Grimoire, Quest Briefing, Battle Altar, Oracle Results, and Summoning Gate.
- Copied the generated d20 icon into `public/artifact-d20.png` so the web and desktop builds share the same visible sigil.
- Rebuilt the Windows release artifacts, including the portable executable.
- Updated state docs and decisions to make Dragonforge Oracle the active visual direction.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 21 tests.
- `npm.cmd run build` passes.
- `npm.cmd run desktop:dist` passes and rebuilds `release/D&D Character Balance Tester-0.1.0-x64-Portable.exe`.
- `GET http://127.0.0.1:3001/?fresh=fantasy-status` returns 200 and includes `Dragonforge Oracle`, `SANCTUM PRIME`, and `/artifact-d20.png`.

### Notes

- The safer `desktop:dist` path was used after `desktop:dist:selfsigned:trust` was blocked because it can modify the Current User Trusted Root store.
- The rebuilt portable executable is current but reports `NotSigned` unless a signing/trust step is explicitly approved.

---

## 2026-05-09 | Friend Test Quickstart

**Task:** Document how to send the portable executable to a personal tester.

### What Changed

- Added `FRIEND_TEST_QUICKSTART.md` with the current portable EXE path, size, SHA256, expected Windows warnings, import steps, privacy notes, and dependency/install behavior.
- Clarified that the portable EXE bundles Electron/Chromium/app assets and does not install Node, npm, Next.js, React, databases, services, or global dependencies.

### Verification

- Documentation-only change.

---

## 2026-05-09 | Priority 1 Import And Spell Foundation

**Task:** Promote reliable full character import and spell ingestion above generic battle simulation work.

### What Changed

- Split full sheet spells from rollable attack actions in the TypeScript model.
- Updated D&D Beyond parsing so non-damage/control/utility spells are imported as spell actions instead of being discarded.
- Added spell purpose classification for damage, control, defense, buff, debuff, healing, mobility, summon, and utility spells.
- Added imported sheet summary data for race, background, classes, inventory, features, proficiencies, and spells.
- Updated playable mode so non-attack spells can act as provisional tactical setup instead of producing "no attack spell" dead ends.
- Streamlined bookmarklet onboarding with a clear copy button and browser bookmark-manager guidance.
- Updated project state and AGENTS guidance so Priority 1 is full import plus spell coverage.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 22 tests.
- Added parser coverage for a Warlock-style Darkness/Hold Person control-spell import case.
- `npm.cmd run build` passes.
- Static preview at `http://127.0.0.1:3001/?fresh=import-priority` returns 200 and includes the new import copy button.
- `release/win-unpacked` rebuilt with the current app bundle.
- Created `release/D&D Character Balance Tester-0.1.0-current-win-unpacked.zip` as the current friend-test artifact.

### Notes

- Electron Builder hung on the portable EXE target during this pass. The older portable EXE still exists but is not the current import/spell-priority build.
- Use the current `win-unpacked` zip or Setup EXE until the portable target hang is fixed.

---

## 2026-05-09 | Sheet Review Flow Direction And Gear Foundation

**Task:** Capture the next UX division and add first-class weapons/armor/inventory review signals.

### What Changed

- Updated the PRD with the target flow: Character Sheet Upload / Import -> Character Sheet Review / Modifications -> Mode Select -> Batch Results or Playable Encounter.
- Added inventory categorization for imported D&D Beyond sheet items: weapon, armor, shield, and equipment.
- Added armor and weapon summary arrays to imported sheet data.
- Added UI review blocks for armor/AC and inventory signals in the loadout review area.
- Updated state and agent guidance so weapons, armor, shields, inventory, movement, resources, and replayable playable mode are part of Priority 1 direction.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 22 tests.

---

## 2026-05-09 | Non-Technical Tester Onboarding

**Task:** Make the app and friend handoff easier for testers who are not computer people.

### What Changed

- Promoted D&D Beyond import from an advanced details panel into a visible Hero Dossier guide with a plain copy button and three-step instructions.
- Reworded the quick start and bookmark help to emphasize that the import code goes into a bookmark URL field, not the browser address bar.
- Rewrote `FRIEND_TEST_QUICKSTART.md` as a plain-language tester guide with first-run sample steps, D&D Beyond import steps, expected Windows warnings, bundled dependencies, and focused feedback prompts.
- Added `READ_ME_FIRST.txt` directly inside the unpacked Windows app folder so the zip has first-run instructions even when sent by itself.
- Refreshed `release/D&D Character Balance Tester-0.1.0-current-win-unpacked.zip` with the current static build.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 22 tests.
- `npm.cmd run build` passes.
- Static preview at `http://127.0.0.1:3001/?fresh=easy-test2` returns 200 and contains the updated import guide text.

---

## 2026-05-10 | Friend-Test Installer EXE

**Task:** Provide a single installer EXE so non-technical testers can double-click one file instead of extracting an app folder.

### What Changed

- Built a current NSIS one-click installer from the latest `release/win-unpacked` app bundle.
- Added friend-friendly installer copy at `release-current/DND-Character-Balance-Tester-Friend-Test-Setup.exe`.
- Added `desktop:dist:setup` and `desktop:dist:setup:from-unpacked` scripts for focused setup installer builds.
- Updated the self-signing script to include the current installer output.
- Rewrote `FRIEND_TEST_QUICKSTART.md` to make the setup installer the primary file to send.

### Verification

- Installer artifact exists at `release-current/DND-Character-Balance-Tester-Friend-Test-Setup.exe`.
- Installer SHA256: `7EC082FF9D343D896CBDF2461EFDAF63C98508D8C219D4FF9FE9BB9D892B74F5`.
- Installer is self-signed with the local test certificate, but the certificate is not publicly trusted.
- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 22 tests.
- `package.json` parses successfully.

---

## 2026-05-10 | Infographic Quickstart PDF

**Task:** Turn the friend-test quickstart into a visual PDF handout with screenshots.

### What Changed

- Added `scripts/generate-quickstart-pdf.cjs` to capture real app screenshots and generate a two-page infographic-style quickstart PDF.
- Added `npm.cmd run quickstart:pdf` for repeatable PDF generation.
- Created `quickstart.pdf` at the repo root and copied it to `release-current/quickstart.pdf` beside the friend-test installer.
- Updated `FRIEND_TEST_QUICKSTART.md` to mention the PDF as the visual guide to send with the installer.

### Verification

- `npm.cmd run quickstart:pdf` completes successfully.
- Generated screenshots:
  - `quickstart-assets/01-app-home.png`
  - `quickstart-assets/02-import-box.png`
  - `quickstart-assets/03-play-screen.png`
- `quickstart.pdf` and `release-current/quickstart.pdf` are valid PDF files.
- PDF page count check reports 2 pages.
- `release-current/quickstart.pdf` SHA256: `86BD764754BA9E6C06F7FD9DDF35BEC4B63E9EBD5862835B468B16A6F2F5BDF5`.

---

## 2026-05-10 | Paladin Import And Weapon Equip Review

**Task:** Fix imported paladins showing no weapons or attack-roll spells, and let users choose which inventory weapons are active.

### What Changed

- Broadened D&D Beyond weapon parsing so inventory items labeled as generic equipment can still become weapon actions when their name/properties identify weapons.
- Added SRD weapon damage fallback profiles for common weapons when D&D Beyond omits explicit damage dice in the imported payload.
- Added deeper dice-string extraction for D&D Beyond snippets/nested damage fields.
- Added `classSpells` import support so prepared class spell attacks such as Inflict Wounds can appear even when the payload does not use the top-level `spells` bucket.
- Added weapon equip checkboxes to Loadout Verification. Checked weapons are available to playable mode and batch odds; unchecked weapons remain visible but are excluded from the active loadout.
- Rebuilt and self-signed the friend-test installer.
- Regenerated the infographic quickstart PDF with current screenshots and installer hash.

### Verification

- Added parser regression coverage for a level 6 paladin with generic-equipment Warhammer/Longbow entries and a `classSpells` attack spell.
- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 23 tests.
- `npm.cmd run build` passes.
- Rebuilt `release-current/DND-Character-Balance-Tester-Friend-Test-Setup.exe`.
- Installer SHA256: `0760494B76D8FB803D36904518DFBE78ED0D0A8F163C86E9DD5FD6C844A74850`.
- Regenerated `release-current/quickstart.pdf`; PDF SHA256: `1D8BAC9C9AA56E23F5EDCE17F54956B8D5181E82AF472F66C106081557DEBB06`.

---

## 2026-05-10 | External SRD Link Guard

**Task:** Prevent SRD/PDF links from replacing the simulator window.

### What Changed

- Updated SRD footer links to open in a new tab/window with `target="_blank"` and `rel="noreferrer"`.
- Hardened the Electron wrapper with a `will-navigate` guard so external same-window navigation is prevented and opened through the OS default browser instead.
- Rebuilt, self-signed, and refreshed the friend-test installer and quickstart PDF.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 23 tests.
- `npm.cmd run build` passes.
- Static output contains the updated external link attributes.
- Installer SHA256: `1291E8CBBB8019BAC48267646C61195F80721D761579D22C07754FF1D46C8772`.
- PDF SHA256: `B63239412C66352E19BE7316FF39B09E4B32ABAA5847A97435E81DF7E27C3741`.

---

## 2026-05-10 | Ability Scores And Armor AC Import

**Task:** Correct imported character stats, especially ability bonuses and armor-derived AC.

### What Changed

- Broadened ability score parsing for D&D Beyond stat IDs, bonus stats, override stats, direct ability-score objects, and ability-score modifier subtypes such as `charisma`.
- Prevented saving-throw modifiers from being applied as ability-score bonuses.
- Added armor-derived AC fallback when D&D Beyond does not provide a final `armorClass`; known SRD armor profiles now compute AC from equipped armor and shields.
- Added visible STR/DEX/CON/INT/WIS/CHA chips to the Hero Dossier so imported scores can be checked immediately.
- Rebuilt, self-signed, and refreshed the friend-test installer and quickstart PDF.

### Verification

- Added parser regression coverage for a level 6 paladin-like import with CHA bonus, Chain Mail AC, and an unequipped shield.
- `npm.cmd test -- src/parsers/ddbCharacter.test.ts` passes: 11 tests.
- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 24 tests.
- `npm.cmd run build` passes.
- Installer SHA256: `DBB3BDFD5596082A350BE437AAEB462A8098BB5BE6A4420E571DA12918A1DDD4`.
- PDF SHA256: `DE13A6D6F5167A71196497BE3B4DA19822FBE3B7D31081D8836C908813DB7E4F`.

---

## 2026-05-10 | Character Sheet Tabs, Corrections, Feats, And Save Spells

**Task:** Make the setup review easier for non-technical testers and add first support for save-based control spells in playable mode.

### What Changed

- Replaced the cluttered all-at-once loadout review with D&D Beyond-like tabs: Actions, Spells, Inventory, Features & Traits, Background, Notes, and Extras.
- Moved manual missing-attack entry into Extras so normal review starts with imported sheet data.
- Added Background-tab correction fields for AC, HP, initiative, proficiency bonus, speed, and base ability scores before entering the fight.
- Added a manual feat entry in Features & Traits so testers can record feats or important traits even before full feat rules are modeled.
- Added save ability metadata to imported spell summaries and spell actions.
- Added manual save-spell entry for spells such as Hold Person.
- Added playable save-spell handling: the target rolls against the spell DC; failed control/debuff saves can suppress that monster response for the current exchange and improve the follow-up attack angle.

### Verification

- Added parser coverage for inferred Hold Person WIS save metadata.
- Added playable encounter coverage for save-based control spells.
- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 25 tests.
- `npm.cmd run build` passes.
- Static preview server returns HTTP 200 on `127.0.0.1:3001`.
- Browser automation was not used for the final local visual check because this session blocked direct navigation to `127.0.0.1:3001`.

---

## 2026-05-10 | Save Spell Playable Action Fix

**Task:** Fix non-attack spells such as Command falling through into the first weapon attack in playable mode.

### What Changed

- Non-attack spells now resolve as their own playable action and no longer automatically add the character's first weapon attack afterward.
- `Command` is now classified as a control spell during D&D Beyond parsing so it can use save-based playable logic.
- Added regression coverage that selects a Command-style save spell and confirms it does not produce the fallback weapon attack.

### Verification

- `npm.cmd test -- src/engine/playableEncounter.test.ts src/parsers/ddbCharacter.test.ts` passes: 2 files, 16 tests.
- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 25 tests.
- `npm.cmd run build` passes.

---

## 2026-05-10 | Smite Spell Playable Rider Fix

**Task:** Fix Searing Smite being treated as a generic save/setup spell and pairing with ranged weapons.

### What Changed

- Added a playable smite branch for spells with `Smite` in the name.
- Smite spells now resolve as melee weapon riders instead of pre-attack save spells.
- The smite branch looks for an active melee weapon and avoids likely ranged weapons such as longbows, shortbows, crossbows, slings, darts, and range-tagged weapon actions.
- On hit, the selected smite adds provisional `d6` rider damage based on spell level.
- Save-style spell setup now only rolls a target save when a save ability is known, preventing generic `a save` rolls for spells that expose a DC but are not modeled as immediate save spells.

### Verification

- Added regression coverage for Searing Smite choosing Warhammer over Longbow, not rolling a pre-attack save, and adding smite damage.
- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 26 tests.
- `npm.cmd run build` passes.

---

## 2026-05-10 | Weapon Modifier Smite Selection

**Task:** Let users select a melee weapon first, then choose Searing Smite as a weapon modifier before taking an attack action.

### What Changed

- Added playable-mode weapon modifier state and UI.
- When the weapon tab is active and a melee weapon is selected, smite spells appear as optional weapon modifiers.
- Ranged weapons show that smites require a melee weapon instead of allowing an invalid rider choice.
- `playTurn` now accepts an optional modifier action id.
- The smite engine path can resolve the selected melee weapon plus selected smite rider directly, rather than auto-selecting a weapon.

### Verification

- Updated playable smite regression coverage for `Warhammer + Searing Smite`.
- `npm.cmd test -- src/engine/playableEncounter.test.ts` passes.
- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 26 tests.
- `npm.cmd run build` passes.

---

## 2026-05-10 | Playable Spell Details Panel

**Task:** Add a spell detail/reference window in the right-side simulation area.

### What Changed

- Converted the simulation right column into a stacked sidebar with Oracle Results on top and Spell Details underneath.
- Selecting a spell action now shows a Spell Details panel with level, purpose, range, duration, attack/save, damage, concentration/resource tags, imported sheet text, and a plain-language simulator resolution note.
- Selecting a smite as a weapon modifier shows the smite in the same details panel while the selected weapon remains the primary action.
- Empty state prompts the user to select a spell or smite modifier.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 26 tests.
- `npm.cmd run build` passes.
- Local browser tab reload on `127.0.0.1:3001` succeeds; screenshot capture timed out in the browser connector.

---

## 2026-05-10 | General Attack Modifier Flow

**Task:** Make Searing Smite selectable after choosing Warhammer and open the door for other class/spell attack modifiers.

### What Changed

- Replaced the smite-only playable modifier UI with a broader **Attack modifier** panel that appears whenever the weapon tab is active.
- Attack modifiers now include smites plus common rider/buff spell patterns such as Hex, Hunter's Mark, Divine Favor, Magic Weapon, Elemental Weapon, Holy Weapon, and Enlarge.
- Smites remain melee-only and are disabled when the selected weapon is likely ranged.
- Non-smite attack modifiers can apply to weapon attacks through a generic modifier engine path.
- Added engine support for damage riders, attack bonuses, and attack dice modifiers.

### Verification

- Added playable coverage for a ranged weapon plus Hex-style modifier.
- `npm.cmd run typecheck` passes.
- `npm.cmd test -- src/engine/playableEncounter.test.ts` passes: 7 tests.
- `npm.cmd test` passes: 5 files, 27 tests.
- `npm.cmd run build` passes.

---

## 2026-05-10 | Electron Dev Icon Alignment

**Task:** Make the PowerShell-launched Electron development window use the same D20 icon as the installer.

### What Changed

- Added an explicit `BrowserWindow` icon path for development and packaged Electron runs.
- Added `build/icon.ico` to Electron `extraResources` as `icon.ico` so packaged builds can reference the same D20 icon at runtime.
- Set the Windows AppUserModelID to match the app id for more consistent taskbar identity.

### Verification

- `npm.cmd run build` passes.

---

## 2026-05-10 | Spell Effect Rules Foundation

**Task:** Add the recommended `SpellEffect` rules model and wire it into playable combat.

### What Changed

- Added structured spell-effect types for active effects, spell saves, attack modifiers, concentration, conditions, AC bonuses, and future spell resources.
- Added `src/engine/spellEffects.ts`, a pure rules mapping layer for common MVP spells and riders:
  - smites
  - Hex / Hunter's Mark
  - Divine Favor / Enlarge
  - Magic Weapon / Elemental Weapon / Holy Weapon
  - Bless
  - Shield of Faith
  - Hold Person
  - Command
  - generic imported control, defense, and buff spells
- Updated playable combat state to track active effects and concentration.
- Control effects can now suppress monster responses from active effect state instead of only temporary style bonuses.
- Defensive concentration effects such as Shield of Faith now increase monster attack target AC while active.
- Active buffs such as Bless can influence later weapon attacks after being cast.
- Weapon riders now derive their attack/damage behavior from `SpellEffect` instead of separate regex-only handling.
- Added active-effect chips to the playable screen so concentration/conditions are visible during a fight.
- Updated the Spell Details panel to describe structured spell effect handling when available.

### Verification

- Added playable encounter regression tests for Shield of Faith, concentration replacement, and Bless carrying into a later weapon attack.
- `npm.cmd run typecheck` passes.
- `npm.cmd test` passes: 5 files, 29 tests.
- `npm.cmd run build` passes.
- Static preview at `http://127.0.0.1:3001/` returns 200, and in-app browser smoke check confirms the rebuilt app loads.

### Notes

- This is a foundation slice, not full RAW spell coverage. Next useful rules slices are spell slots/pact slots, action-vs-bonus-action enforcement, repeat saves, Darkness visibility, healing/temp HP, and class resources.
