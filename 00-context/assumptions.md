# Assumptions, Risks, and Unknowns

> **Last Updated:** 2026-04-08  
> **Review Cycle:** Weekly  
> **Owner:** Product Team

---

## 📋 Active Assumptions

Assumptions are things we believe to be true but haven't validated. Each assumption should be tracked until validated or invalidated.

### Product Assumptions

| ID | Assumption | Risk if Wrong | Validation Method | Status |
|----|------------|---------------|-------------------|--------|
| A1 | Players primarily want to test damage output and survivability, not roleplay simulation | Build wrong feature set | User interviews with players/DMs (n=10) | ⏳ Pending |
| A2 | The DDB character-service JSON (fetched via bookmarklet) contains enough data to reconstruct a full combat stat block for single-class characters | Core feature breaks | Spike against `character-service.dndbeyond.com/character/v5/character/[ID]` with 10+ single-class builds | ⏳ Pending |
| A3 | A single-character vs. encounter format is sufficient for MVP (no full party sim) | Feature gap for DM users | Feedback after beta | ⏳ Pending |
| A4 | Users are comfortable configuring enemy CR and count manually | Poor UX, users bounce | Usability test on encounter setup flow | ⏳ Pending |
| A5 | Running 10–20 simulation iterations is enough to show meaningful aggregate stats | Misleading results | Statistical validation against known average outcomes | ⏳ Pending |

### Technical Assumptions

| ID | Assumption | Risk if Wrong | Validation Method | Status |
|----|------------|---------------|-------------------|--------|
| T1 | The `character-service.dndbeyond.com/character/v5/character/[ID]` endpoint is stable enough to build a parser against | Parser breaks silently on DDB updates | Version-detect on parse; monitor DDB changelogs and community VTT tool reports | ⏳ Pending |
| T2 | Core 5e combat (attack rolls, saving throws, action economy) can be accurately modeled in JS | Rules bugs undermine trust | Cross-validate sim output against manual calculations | ⏳ Pending |
| T3 | Modern browsers (Chrome, Firefox, Safari) cover 95%+ of target users | Compatibility issues | Browser share research | ✅ Validated |
| T4 | No backend is needed for MVP — all simulation runs client-side | Architectural rework later | Scope review complete | ✅ Validated |
| T5 | Target users are comfortable installing and using a browser bookmarklet | Import step becomes a dealbreaker | Usability test with 5 non-technical players | ⏳ Pending |

### Business Assumptions

| ID | Assumption | Risk if Wrong | Validation Method | Status |
|----|------------|---------------|-------------------|--------|
| B1 | A meaningful audience of D&D players wants tooling beyond D&D Beyond's built-in features | No adoption | Landing page / Reddit interest check | ⏳ Pending |
| B2 | Free tool with optional donations or Patreon is viable | No sustainability | Monitor engagement and donation conversion | ⏳ Pending |

---

## ⚠️ Known Risks

### High Priority Risks

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|----|------|------------|--------|------------|-------|
| R1 | DDB changes or locks down the `character-service` endpoint, breaking the bookmarklet | Medium | High | Monitor community VTT tool health (Beyond20, ddb2alchemy) as canaries; build PDF fallback for v1.1 | Engineering |
| R2 | Combat simulation math diverges from RAW due to edge cases (reaction timing, concentration, multiattack order) | High | High | Document all known approximations openly; community issue tracker for rules bugs | Engineering |
| R3 | Users encounter CORS errors or auth failures when running the bookmarklet | Medium | High | Test bookmarklet against DDB auth flow across browsers; provide clear error messaging with fallback instructions | Engineering |
| R4 | Users import characters with heavily homebrew features the parser can't handle | High | Medium | Graceful fallback — warn user of unrecognized features, continue with base stats | Engineering |
| R5 | Simulation results are misleading for spell-heavy characters (casters) due to limited spell support in MVP | High | Medium | Clearly scope MVP as "martial and attack-roll focused"; show warning for caster-heavy builds | Product |
| R6 | Users attempt to import multiclass characters and receive confusing parse errors | High | Medium | Detect multiclass on import and show a clear "not supported in v1.0" message with post-MVP roadmap note | Engineering |

### Medium Priority Risks

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|----|------|------------|--------|------------|-------|
| R7 | Enemy stat block library is incomplete or inaccurate vs. Monster Manual | Medium | Medium | Use SRD-licensed stat blocks; flag non-SRD monsters as estimates | Engineering |
| R8 | Large simulation run counts (100+ iterations) cause browser performance issues | Low | Medium | Cap iterations with a configurable ceiling; async/worker thread execution | Engineering |
| R9 | Users interpret simulation win rates as absolute truth rather than probabilistic guidance | Medium | Low | Contextual copy in results UI emphasizing variance and approximation | Design |

---

## ❓ Open Questions (Unknowns)

Questions we need answered before or during development.

### Must Answer Before v1.0

| ID | Question | Decision Needed By | Owner | Status |
|----|----------|-------------------|-------|--------|
| Q1 | Which import method is primary for v1.0 — bookmarklet or PDF? | Before import work | Engineering | ✅ Resolved: bookmarklet (character-service JSON) primary; PDF deferred to v1.1 |
| Q2 | Do we model enemy tactics (e.g., focus fire, retreat) or use simple random targeting? | Before combat engine | Engineering | 🔴 Open |
| Q3 | How do we handle concentration spells — track them or ignore for MVP? | Before combat engine | Product | ✅ Resolved for modeled spells: track active concentration effects; full break-on-damage checks remain future work |
| Q4 | What is the canonical enemy stat block source? SRD only or full Monster Manual approximations? | Before enemy database | Engineering | 🔴 Open |
| Q5 | Do we simulate initiative order or assume player acts first for simplicity? | Before combat engine | Engineering | 🔴 Open |

### Can Answer During Development

| ID | Question | Notes | Status |
|----|----------|-------|--------|
| Q6 | How many simulation iterations should the default be? | 10 is fast, 100 is more meaningful — start at 20 and tune | 🟡 Parked |
| Q7 | Should round-by-round logs be expanded by default or collapsed? | Collapsed default keeps results readable | 🟡 Parked |
| Q8 | Chart library for results display: Chart.js vs. lightweight alternative? | Evaluate bundle size; lean toward lightweight for offline-first | 🟡 Parked |
| Q9 | Should users be able to manually override parsed stats (e.g., fix a bad parse)? | Probably yes — add to post-MVP if not MVP | 🟡 Parked |

---

## 🔄 Dependency Risks

External dependencies that could impact the project.

| Dependency | Risk | Alternative | Status |
|------------|------|-------------|--------|
| DDB Character Service Endpoint | Endpoint locked down or auth-gated beyond user session cookies | PDF fallback (v1.1); monitor community VTT tool health as canary | 🟡 Monitor |
| Bookmarklet Browser Compatibility | CORS or CSP policy changes block bookmarklet execution on DDB | Browser extension fallback (post-MVP) | 🟡 Monitor |
| SRD Monster Stat Block Data | Licensing or accuracy issues | Self-host parsed SRD data; document source | ✅ Stable |
| Service Worker API | Offline breaks if implementation changes | Graceful degradation to online-only | ✅ Stable |
| Browser JS Performance | Heavy simulations lag on low-end devices | Web Worker offloading for simulation loop | 🟡 Monitor |

---

## 📊 Assumption Validation Log

### Validated ✅

| ID | Assumption | Outcome | Date | Notes |
|----|------------|---------|------|-------|
| T3 | Modern browsers cover 95% of users | Validated | 2026-01-10 | StatCounter data confirms 96.2% |
| T4 | No backend needed for MVP | Validated | 2026-01-12 | Architecture review complete |

### Invalidated ❌

| ID | Assumption | Outcome | Date | Action Taken |
|----|------------|---------|------|--------------|
| - | - | - | - | - |

---

## 📅 Next Review

**Scheduled:** 2026-04-15  
**Focus Areas:**
- Spike T1 — test bookmarklet against `character-service.dndbeyond.com/character/v5/character/[ID]` with real characters and verify JSON structure
- Spike T2 — manually verify combat math against known outcomes
- Spike T5 — test bookmarklet installation UX with non-technical users
- Resolve Q2–Q5 before combat engine work begins
- Validate A2 with single-class character samples across a range of classes and levels

---

## 📎 Related Documents

- [Vision](./vision.md)
- [System State](./system-state.md)
- [Decisions Log](../03-logs/decisions-log.md)
