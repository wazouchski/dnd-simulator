# Decisions Log

> **Project:** D&D Character Balance Tester  
> **Purpose:** Record architectural and product decisions with rationale  
> **Format:** ADR (Architecture Decision Record)

---

## Active Decisions

### ADR-001: Build as a Local-First Browser App

**Date:** 2026-04-08  
**Status:** Accepted

#### Context

The simulator handles user character data from D&D Beyond. The MVP does not require accounts, shared history, cloud sync, or server-side processing.

#### Decision

Run character parsing and combat simulation in the browser. Do not transmit character data to an application backend for MVP.

#### Rationale

- Preserves user privacy.
- Avoids server-side D&D Beyond scraping or authentication.
- Keeps hosting simple for a subdomain deployment.
- Fits the MVP requirement that simulation runs client-side.

#### Consequences

The app must be careful about browser performance, especially for 100-iteration runs. Heavy simulation should be moved to a Web Worker when needed.

---

### ADR-002: Use D&D Beyond Bookmarklet / JSON Import for MVP

**Date:** 2026-04-08  
**Status:** Accepted

#### Context

The app needs character data without requiring users to manually enter full stat blocks.

#### Decision

Use D&D Beyond character JSON as the primary import source. The app should support a bookmarklet handoff and can also support manual JSON upload for testing and fallback.

#### Rationale

- Fastest path to a useful character import.
- Keeps the app out of D&D Beyond authentication.
- Allows parser work to be developed against saved sample payloads.

#### Consequences

The parser must be isolated, defensive, and clear about unsupported payloads such as multiclass characters or heavily homebrewed features.

---

### ADR-003: Next.js Static App on a Subdomain

**Date:** 2026-05-06  
**Status:** Accepted

#### Context

The target deployment is a web host subdomain. The product benefits from a polished web app shell and future flexibility for static or server-capable hosting.

#### Decision

Use Next.js with TypeScript for the application scaffold and configure static export for subdomain hosting.

#### Rationale

- Good fit for a modern app-style UI.
- Easy to host as static files if needed.
- Leaves room for future API routes without committing to backend requirements now.

#### Consequences

Anything that depends on browser-only APIs must live in client components or browser-only utilities.

---

### ADR-004: Simulation Engine Runs in a Web Worker for Large Runs

**Status:** Proposed

Use normal client execution for small runs and a Web Worker for larger iteration counts so the UI remains responsive.

---

### ADR-005: Use Browser-Only Session State for Character Data

**Date:** 2026-05-07  
**Status:** Accepted

#### Context

The MVP needs to preserve the local-first privacy promise while supporting manual JSON import and bookmarklet handoff.

#### Decision

Keep raw character payloads out of persistent storage. Store only parsed character data in memory or browser session storage during the active session.

#### Rationale

- Preserves the no-backend privacy model.
- Keeps the bookmarklet route useful after a page transition.
- Avoids database, account, and retention policy scope.

#### Consequences

Users must re-import after the browser session ends.

---

### ADR-006: Use a DNDAMP Multi-Window Skin for the Simulator UI

**Date:** 2026-05-08  
**Status:** Accepted

#### Context

The product should feel more playable and distinctive while still acting as a simulator workspace. The user specifically wants the desktop/web app to open like a D&D-themed Winamp-era interface rather than a modern dashboard.

#### Decision

Adopt a DNDAMP visual model based on classic Winamp-style skinned windows. Map the app areas to familiar player concepts: main deck, character library, loadout equalizer, encounter playlist, minibrowser/readme, battle visualizer, and output scope.

#### Rationale

- Gives the app a memorable identity without changing the local-first architecture.
- Fits the desktop executable goal because it feels like a self-contained utility window.
- Preserves dense simulator controls while making setup, loadout, encounter, and results panels feel like separate purposeful modules.

#### Consequences

Future UI work should extend the skinned-window system instead of introducing generic SaaS cards or parchment fantasy styling.

---

### ADR-007: Replace DNDAMP With a Dragonforge High-Fantasy Skin

**Date:** 2026-05-09  
**Status:** Accepted

#### Context

The user wants the UI to push harder into fantasy rather than keeping the Winamp-inspired direction.

#### Decision

Use a Dragonforge Oracle visual model: an arcane tactical workbench with obsidian panels, gold inlay, bloodstone/emerald/violet accents, spellbook-like form controls, a d20 sigil visual asset, and panel roles named as fantasy workspaces.

#### Rationale

- Better matches the desired D&D-themed emotional tone.
- Keeps the simulator as the first screen and preserves the existing setup/simulation workflow.
- Still supports the desktop executable goal by feeling like a standalone fantasy utility.

#### Consequences

ADR-006 is superseded for visual direction. Future UI work should extend Dragonforge Oracle rather than reintroducing Winamp/player chrome.

---

### ADR-008: Model Spells As Structured Effects

**Date:** 2026-05-10  
**Status:** Accepted

#### Context

The playable simulator needs to support caster and hybrid characters without becoming a pile of spell-specific branches. The app can bundle SRD 5.1 content safely, but imported D&D Beyond characters may include non-SRD spells or features where the app should model mechanics without shipping proprietary spell text.

#### Decision

Represent modeled spell behavior as structured `SpellEffect` data. Runtime combat state tracks `ActiveEffect` records for concentration, duration, target, conditions, AC bonuses, saving throws, and attack modifiers. Specific spells map into this model in a pure engine layer, and the playable combat loop consumes active effects rather than hard-coding all spell behavior in React or the turn resolver.

#### Rationale

- Keeps spell logic testable and independent from the UI.
- Lets SRD spells and imported non-SRD mechanics share the same runtime shape.
- Supports future additions such as repeat saves, resources, class features, healing, temp HP, and area effects without rewriting playable combat each time.
- Makes approximations easier to expose in logs and UI details.

#### Consequences

The first model is intentionally partial. Future spell work should add rules by expanding `SpellEffect` mappings and runtime resolution, not by adding unrelated one-off UI or combat branches.
