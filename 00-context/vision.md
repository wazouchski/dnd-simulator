# Product Vision: D&D Character Balance Tester

> **Last Updated:** 2026-04-08  
> **Status:** Active Development  
> **Owner:** Product Team

---

## 🎯 Purpose

Build a **browser-based D&D 5e combat simulation tool** that lets players upload their D&D Beyond character sheets and run combat stress-tests to evaluate character balance, survivability, and damage output — without needing a DM or a full session.

### The Problem We're Solving

Players and DMs want to evaluate character builds before the table, but:
- Actual playtesting requires scheduling a full session
- D&D Beyond has no built-in simulation tools
- Theory-crafting in spreadsheets misses the randomness of real combat
- Feat and class feature interactions are hard to mentally model across multiple encounters

### Our Solution

A **local-first** combat simulator that:
- Imports character data via a one-click bookmarklet run from the user's D&D Beyond character page (single-class only for v1.0)
- Reconstructs the character's stat block, features, and resources from the DDB character service JSON
- Runs turn-by-turn combat against configurable enemy encounters
- Reports damage output, resource consumption, and survival rate across multiple runs

---

## 👤 Target Users

### Primary Persona: "The Optimizer"

- **Profile:** Player who enjoys mechanical theory-crafting and single-class builds
- **Pain Point:** Can't reliably predict how a build performs in actual combat without playing it out
- **Goal:** Validate that a build idea works before committing at the table
- **Tech Comfort:** Medium-High — comfortable with D&D Beyond exports and browser tools

### Secondary Persona: "The DM Balancer"

- **Profile:** Dungeon Master designing encounters or evaluating party power level
- **Pain Point:** Hard to gauge if a player's new build will trivialize or struggle with planned encounters
- **Goal:** Upload a character, throw encounters at it, and calibrate challenge rating
- **Tech Comfort:** Medium — wants results, not configuration complexity

---

## 🚫 Boundaries (What We're NOT Building)

| We Will NOT | Rationale |
|-------------|-----------|
| Build a full VTT | Scope creep; tools like Foundry and Roll20 exist |
| Support non-5e systems | Single ruleset keeps combat logic tractable for MVP |
| Support multiclass characters | Parser and combat engine complexity; post-MVP feature |
| Build a server-side DDB scraper | Auth wall + ToS violation; bookmarklet runs client-side in user's own session |
| Require user accounts | No server = no accounts needed |
| Simulate full campaigns | Single encounter session only for v1.0 |
| Implement every spell | Focus on attack actions and core class features for MVP |
| Build mobile-native apps | Web-first; bookmarklet + responsive layout handles desktop/mobile |

---

## ⭐ North Star Metrics

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Time to First Simulation** | < 60 seconds from upload | Must feel instant |
| **Character Parse Success Rate** | > 90% of DDB exports | Core feature must be reliable |
| **Simulation Accuracy vs. RAW** | Matches expected avg damage within 5% | Validates the math engine |
| **Session Return Rate** | 2+ simulation sessions per user per week | Indicates genuine utility |

---

## 🏛️ Core Principles

### 1. Rules Accuracy First
- Combat math must follow 5e RAW (Rules As Written)
- Advantage/disadvantage, concentration, reaction timing, and action economy handled correctly
- Known edge cases documented openly when approximated

### 2. Transparency Over Black Boxes
- Every simulation round is logged — players can see exactly what happened
- Dice rolls are visible and reproducible with a seed if desired
- No hidden modifiers

### 3. Offline-First
- Runs entirely in the browser after first load
- Character data never leaves the device
- No account, no backend, no telemetry

### 4. Configurable Encounters, Not Canned Demos
- Users pick enemy type, CR, count, and tactics
- Encounter presets available but never required
- Users define what "a real session" looks like for their table

---

## 🔮 Future Considerations (Post-MVP)

These are explicitly OUT of scope for v1.0 but inform architectural decisions:

- [ ] Multiclass character support
- [ ] PDF character sheet upload as fallback import method
- [ ] Browser extension (Chrome/Firefox) as a cleaner bookmarklet alternative
- [ ] Full party simulation (multiple uploaded characters vs. encounter)
- [ ] Spell simulation beyond cantrips and attack-roll spells
- [ ] Save/load simulation history
- [ ] Side-by-side build comparison mode
- [ ] Custom homebrew monster stat block entry
- [ ] AI-powered encounter difficulty recommendations

---

## 📏 Success Definition for v1.0

The MVP is successful when:

1. ✅ User can import their character via the DDB bookmarklet and have it parsed correctly
2. ✅ User can configure a combat encounter (enemy type, CR, count)
3. ✅ Simulation runs turn-by-turn combat with correct 5e action economy
4. ✅ Results display average damage dealt/taken, rounds survived, and resource usage
5. ✅ All character data stays local — nothing is transmitted or stored server-side
6. ✅ User can re-run the same encounter N times and see aggregate stats across runs

---

## 📎 Related Documents

- [Assumptions & Risks](./assumptions.md)
- [System State](./system-state.md)
- [Product Requirements](../01-product/prd.md)
