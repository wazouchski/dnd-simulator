# Product Requirements Document (PRD)

> **Product:** D&D Character Balance Tester  
> **Version:** 1.0 (MVP)  
> **Last Updated:** 2026-04-08  
> **Status:** In Development

---

## 📋 Overview

This PRD defines the requirements for version 1.0 of the D&D Character Balance Tester — a browser-based combat simulation tool that lets players upload a D&D Beyond character sheet (JSON) and run turn-by-turn 5e combat encounters to evaluate build performance, survivability, and damage output.

**Single-class characters only for v1.0.** Multiclass support is explicitly deferred to post-MVP.

**Reference:** [Product Vision](../00-context/vision.md) | [Assumptions & Risks](../00-context/assumptions.md)

---

## 🎯 Goals for v1.0

1. **Parse a D&D Beyond JSON export** and reconstruct a valid 5e combat stat block
2. **Configure and run a combat encounter** against SRD-sourced enemies
3. **Simulate turn-by-turn combat** following 5e RAW action economy
4. **Report aggregate results** across multiple simulation runs
5. **Keep all data local** — no backend, no accounts, no telemetry

---

## 👤 User Stories

### Epic 1: Character Import

#### US-101: Upload Character Sheet
> As a **player**, I want to **upload my D&D Beyond character export** so that **the simulator can load my character without manual data entry**.

**Acceptance Criteria:**
- [ ] User can upload a `.json` file via drag-and-drop or file picker
- [ ] Parser extracts: name, class, level, ability scores, proficiency bonus, AC, HP, speed, saving throws, attack actions, and class features relevant to combat
- [ ] Multiclass characters are detected and rejected with a clear, friendly error message explaining v1.0 scope
- [ ] Homebrew or unrecognized features are flagged with a warning but do not block import
- [ ] Successful parse shows a character summary card for user confirmation before proceeding
- [ ] User can re-upload to replace the current character

**Priority:** P0 (Must Have)  
**Story Points:** 8

---

#### US-102: Review Parsed Character
> As a **player**, I want to **see what the simulator parsed from my sheet** so that **I can confirm it loaded correctly before running a simulation**.

**Acceptance Criteria:**
- [ ] Summary card displays: name, class, level, HP, AC, speed, attack actions with to-hit and damage
- [ ] Warnings listed for any features that were skipped or approximated
- [ ] User can proceed to encounter setup or go back and re-upload
- [ ] Caster-heavy builds (spellcaster with no attack actions) show a prominent warning that simulation accuracy will be limited

**Priority:** P0 (Must Have)  
**Story Points:** 3

---

### Epic 2: Encounter Configuration

#### US-201: Configure Enemy Encounter
> As a **user**, I want to **choose what enemies my character fights** so that **I can test relevant combat scenarios**.

**Acceptance Criteria:**
- [ ] User selects enemy from a searchable list of SRD monsters
- [ ] Each enemy entry displays: name, CR, HP, AC, attack actions
- [ ] User sets enemy count (1–8)
- [ ] User selects enemy tactic: Random Targeting, Focus Fire (same target until downed), or Spread Damage
- [ ] Encounter CR total is calculated and displayed as a difficulty label (Easy / Medium / Hard / Deadly) based on the character's level
- [ ] User can save the encounter config to reuse across simulation runs

**Priority:** P0 (Must Have)  
**Story Points:** 5

---

#### US-202: Use Encounter Presets
> As a **user**, I want to **choose from preset encounters** so that **I can get started without manually configuring enemies**.

**Acceptance Criteria:**
- [ ] At least 5 presets available, spanning CR 1–10 across creature types
- [ ] Each preset displays name, enemy composition, and estimated difficulty for a level-appropriate character
- [ ] User can load a preset and then modify it before running
- [ ] Presets do not override a user's saved custom encounter

**Priority:** P1 (Should Have)  
**Story Points:** 3

---

### Epic 3: Combat Simulation

#### US-301: Run Simulation
> As a **user**, I want to **run the combat simulation** so that **I can see how my character performs**.

**Acceptance Criteria:**
- [ ] User sets number of iterations (default: 20, max: 100)
- [ ] Simulation runs all iterations client-side; UI shows a progress indicator
- [ ] Each iteration plays out full combat until character is downed or all enemies are defeated
- [ ] Initiative order is rolled each iteration
- [ ] Player character uses all available attack actions on their turn
- [ ] Bonus actions triggered by class features (e.g., Fighter Second Wind, Rogue Cunning Action) are applied correctly
- [ ] Short rest and long rest resource recovery is NOT simulated per iteration — each run starts fresh
- [ ] Simulation completes within 5 seconds for 20 iterations on a modern browser

**Priority:** P0 (Must Have)  
**Story Points:** 13

---

#### US-302: View Round-by-Round Log
> As a **user**, I want to **see what happened each round** so that **I can understand why the simulation went the way it did**.

**Acceptance Criteria:**
- [ ] Log available for any individual iteration
- [ ] Each round entry shows: initiative order, actions taken, attack rolls, damage dealt/received, HP totals after round
- [ ] Log is collapsed by default; user expands to inspect
- [ ] Critical hits and misses are clearly labeled
- [ ] Log is scrollable and does not block the results summary

**Priority:** P1 (Should Have)  
**Story Points:** 5

---

### Epic 4: Results & Insights

#### US-401: View Aggregate Results
> As a **user**, I want to **see summary statistics across all simulation runs** so that **I can evaluate my character's overall performance**.

**Acceptance Criteria:**
- [ ] Results display: win rate (%), average rounds to victory, average rounds survived when downed, average damage dealt per round, average damage taken per round
- [ ] Results update immediately after simulation completes
- [ ] Win/loss ratio shown as a clear visual (e.g., bar or progress arc)
- [ ] Results include a plain-language verdict: e.g., "Your character wins this encounter 85% of the time — well-matched."
- [ ] Contextual note shown reminding user that results are probabilistic, not guaranteed

**Priority:** P0 (Must Have)  
**Story Points:** 5

---

#### US-402: Compare Encounter Difficulty
> As a **user**, I want to **quickly re-run the same character against different encounters** so that **I can find the right challenge level**.

**Acceptance Criteria:**
- [ ] After results are shown, user can modify the encounter and re-run without re-uploading the character
- [ ] Previous run's results remain visible alongside new results for side-by-side comparison
- [ ] Up to 3 result sets can be compared at once
- [ ] User can clear all results and start fresh

**Priority:** P1 (Should Have)  
**Story Points:** 5

---

### Epic 5: App Settings & Housekeeping

#### US-501: Manage Simulation Preferences
> As a **user**, I want to **configure simulation defaults** so that **the tool behaves the way I expect**.

**Acceptance Criteria:**
- [ ] Default iteration count is configurable (10 / 20 / 50 / 100)
- [ ] Option to show/hide round-by-round logs by default
- [ ] Option to enable a seeded dice mode for reproducible rolls (debugging/verification use)
- [ ] Preferences persist across browser sessions via localStorage

**Priority:** P2 (Nice to Have)  
**Story Points:** 2

---

#### US-502: Clear Session Data
> As a **user**, I want to **reset the app** so that **I can start fresh with a new character or encounter**.

**Acceptance Criteria:**
- [ ] "Start Over" action clears the loaded character, encounter config, and all results
- [ ] Confirmation prompt before clearing
- [ ] Preferences and saved encounter presets are NOT cleared by this action

**Priority:** P1 (Should Have)  
**Story Points:** 1

---

## 🚫 Out of Scope for v1.0

| Feature | Reason |
|---------|--------|
| Multiclass character support | Parser and combat engine complexity; post-MVP |
| PDF character sheet parsing | Fragile format; JSON only for v1.0 |
| Full spell simulation | Targeting, area effects, saves, concentration — too complex for MVP |
| Full party simulation | Single character vs. encounter only |
| Homebrew monster entry | SRD monsters only for v1.0 |
| Save/load simulation history | No backend; session memory only |
| Cloud sync or accounts | Local-first, no server |
| Non-5e rulesets | Single ruleset keeps engine tractable |

---

## 🐉 SRD Enemy List (Minimum for v1.0)

The following creature types must be included at launch to cover common encounter scenarios across CR 1–10:

| CR Range | Examples |
|----------|----------|
| CR 1–2 | Goblin, Kobold, Skeleton, Zombie, Wolf, Giant Spider |
| CR 3–5 | Owlbear, Ghoul, Werewolf, Manticore, Basilisk |
| CR 6–8 | Chimera, Troll, Wyvern, Young Dragon (White) |
| CR 9–10 | Young Dragon (Red), Abominable Yeti, Stone Giant |

All stat blocks sourced from the 5e SRD. Non-SRD monsters are out of scope for v1.0.

---

## 📐 Non-Functional Requirements

### Performance

| Metric | Requirement |
|--------|-------------|
| Time to Interactive | < 2 seconds on a modern browser |
| Character Parse Time | < 1 second for any valid DDB JSON export |
| 20-Iteration Simulation | Completes in < 5 seconds client-side |
| 100-Iteration Simulation | Completes in < 20 seconds; runs in Web Worker to avoid UI block |

### Rules Accuracy

| Requirement | Notes |
|-------------|-------|
| Attack rolls follow RAW | d20 + ability mod + proficiency vs. target AC |
| Damage rolls follow RAW | Weapon dice + ability modifier; crits double dice |
| Action economy enforced | One action, one bonus action, one reaction per turn |
| HP floor at 0 | Character is downed at 0 HP; death saves not simulated in MVP |
| Known approximations documented | Visible in app and in codebase comments |

### Browser Support

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

### Privacy & Security

| Requirement | Implementation |
|-------------|----------------|
| No Data Transmission | All parsing and simulation runs locally |
| No Tracking | No analytics, no cookies, no telemetry |
| HTTPS Only | Required for PWA service worker |
| Character Data | Never persisted beyond the current session (unless user explicitly saves) |

---

## 📅 Release Plan

### MVP (v1.0) — Target: June 2026

| Phase | Stories | Duration |
|-------|---------|----------|
| Sprint 1 | US-101, US-102 — Character import and parse | 2 weeks |
| Sprint 2 | US-201, US-301 — Encounter config and core combat engine | 3 weeks |
| Sprint 3 | US-401, US-302 — Results display and round log | 2 weeks |
| Sprint 4 | US-202, US-402, US-502, Polish, Testing | 2 weeks |

### Post-MVP Roadmap

| Version | Planned Features |
|---------|------------------|
| v1.1 | Multiclass character support, manual stat override |
| v1.2 | Full spell simulation (concentration, saves, area effects) |
| v1.3 | Full party simulation (multiple characters vs. encounter) |
| v2.0 | Homebrew monster entry, save/load history, build comparison mode |

---

## 📎 Related Documents

- [Vision](../00-context/vision.md)
- [Assumptions & Risks](../00-context/assumptions.md)
- [Feature Designs](../02-features/)
