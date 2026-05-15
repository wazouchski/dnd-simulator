# Definition of Done

> **Project:** D&D Character Balance Tester  
> **Purpose:** Define when work is truly "done"  
> **Version:** 1.0

---

## Overview

A clear definition of done prevents:
- Half-finished work lingering
- Quality inconsistencies
- "It works on my machine" problems
- Documentation and testing debt

Use these checklists before marking any work as complete.

---

## Task-Level Definition of Done

*Applied to each individual task in dev-tasks.md*

### Code Complete ✅

```markdown
□ All acceptance criteria met
□ Code compiles/runs without errors
□ No console warnings or errors
□ Code follows project conventions (see tech-design.md)
□ No hardcoded values that should be configurable
□ Proper error handling in place
```

### Tested ✅

```markdown
□ Developer has manually tested happy path
□ Edge cases from acceptance criteria verified
□ Unit tests written (if applicable to task)
□ No regressions in existing functionality
```

### Documented ✅

```markdown
□ Implementation logged in implementation-log.md
□ Task status updated in dev-tasks.md
□ Any decisions logged in decisions-log.md
□ Code comments for non-obvious logic
```

### Committed ✅

```markdown
□ Changes committed with meaningful message
□ Commit references task ID
□ Changes pushed to remote
```

---

## Feature-Level Definition of Done

*Applied when all tasks for a feature are complete*

### All Tasks Complete ✅

```markdown
□ All tasks in feature/dev-tasks.md marked complete
□ No open bugs blocking release (bug-log.md)
□ All acceptance criteria from feature-spec.md verified
```

### Quality Gates Passed ✅

```markdown
□ Test plan executed (test-plan.md)
  □ Unit tests passing
  □ Integration tests passing
  □ Manual test checklist complete
□ Cross-browser testing complete
□ Mobile testing complete
□ Accessibility audit passed (no critical issues)
```

### Performance Verified ✅

```markdown
□ Lighthouse performance score ≥ 90
□ No significant bundle size increase (< 10KB)
□ Key user flows under performance targets
```

### Documentation Updated ✅

```markdown
□ system-state.md reflects new feature
□ Any new patterns documented
□ API/component documentation complete
```

### Reviewed ✅

```markdown
□ Code reviewed by peer (or thorough self-review for solo)
□ PR approved (if using pull requests)
□ Demo/walkthrough with stakeholder (optional but recommended)
```

---

## Sprint/Milestone Definition of Done

*Applied at the end of each development cycle*

### Features Complete ✅

```markdown
□ All planned features meet Feature DoD
□ All P0 items complete
□ P1 items complete or consciously deferred
```

### Quality Verified ✅

```markdown
□ All tests passing (unit + integration)
□ E2E tests for critical paths passing
□ Accessibility audit complete
□ Performance benchmarks met
□ Security review complete (if applicable)
```

### Documentation Complete ✅

```markdown
□ system-state.md fully current
□ All decisions documented in decisions-log.md
□ Release notes drafted
□ User-facing documentation updated (if any)
```

### Ready for Release ✅

```markdown
□ Build succeeds in production mode
□ Deployed to staging/preview environment
□ Smoke test on staging passed
□ No critical bugs open
□ Stakeholder approval received
```

---

## Release Definition of Done

*Applied before pushing to production*

### Technical Readiness ✅

```markdown
□ All Sprint DoD criteria met
□ Production build tested
□ Rollback plan documented
□ Monitoring/alerting configured
□ Database migrations tested (if any)
```

### Business Readiness ✅

```markdown
□ Release notes finalized
□ User communication prepared (if needed)
□ Support team briefed (if applicable)
□ Analytics tracking verified
```

### Launch Checklist ✅

```markdown
□ Deploy to production
□ Verify deployment successful
□ Run smoke tests
□ Monitor error rates for 1 hour
□ Announce release (internal + external if appropriate)
□ Update version in system-state.md
```

---

## Component/Code Quality Standards

*Minimum quality for any code to be considered "done"*

### React Components

```markdown
□ Single responsibility
□ Props interface/types defined
□ Default props where appropriate
□ Error boundaries for failure-prone components
□ Loading states handled
□ Empty states handled
□ Accessibility: proper ARIA, keyboard nav
```

### Styles

```markdown
□ Uses CSS modules or designated styling system
□ No magic numbers (use variables/tokens)
□ Responsive design verified (mobile + desktop)
□ Dark mode compatible (if applicable)
□ No !important unless documented why
```

### State Management

```markdown
□ State lives at appropriate level
□ No unnecessary global state
□ Async actions handle loading/error states
□ State shape documented for complex stores
```

### Utilities/Helpers

```markdown
□ Pure functions where possible
□ Edge cases handled
□ Type definitions (JSDoc or TypeScript)
□ Unit tested if logic is non-trivial
```

---

## Testing Standards

### Unit Tests

```markdown
□ Test file naming: [Component].test.js
□ Tests are isolated (no shared state)
□ Meaningful test descriptions
□ Tests what, not how (implementation)
□ Edge cases covered
□ Assertions are specific
```

### Integration Tests

```markdown
□ Tests real user flows
□ Uses realistic test data
□ Cleans up after itself
□ Doesn't depend on execution order
```

### Manual Testing

```markdown
□ Follows test-plan.md checklist
□ Tested on target browsers
□ Tested on mobile devices
□ Tested with slow network (throttled)
□ Tested with screen reader (for a11y)
```

---

## Accessibility Standards

*Minimum accessibility for any UI code*

```markdown
□ Semantic HTML (button for buttons, not divs)
□ All images have alt text
□ All interactive elements keyboard accessible
□ Focus visible on all focusable elements
□ Color contrast meets WCAG AA (4.5:1 for text)
□ No color-only indicators
□ Forms have labels and error messages
□ Page has single h1, logical heading order
□ ARIA used correctly (or not at all)
```

**Automated Checks:**

```bash
# Run axe-core audit
npm run test:a11y

# Lighthouse accessibility score
npx lighthouse http://localhost:5173 --only-categories=accessibility
```

---

## Definition of NOT Done

*Work is NOT done if:*

❌ "It works on my machine" but no verification elsewhere  
❌ Manual testing skipped "because it's simple"  
❌ Logs not updated ("I'll do it later")  
❌ Commit message is "fix" or "update"  
❌ Known issues not logged in bug-log.md  
❌ System state outdated vs actual code  
❌ Accessibility not considered  
❌ Error states not handled  

---

## Quick Reference Checklist

Print this and check off for every task:

```
┌─────────────────────────────────────────────┐
│           TASK COMPLETE CHECKLIST           │
├─────────────────────────────────────────────┤
│                                             │
│  □ Acceptance criteria met                  │
│  □ Code runs without errors                 │
│  □ Basic testing done                       │
│  □ implementation-log.md updated            │
│  □ dev-tasks.md status updated              │
│  □ Committed with good message              │
│                                             │
│  ═══════════════════════════════════════    │
│           FEATURE COMPLETE BONUS            │
│  ═══════════════════════════════════════    │
│                                             │
│  □ system-state.md updated                  │
│  □ Test plan executed                       │
│  □ Accessibility verified                   │
│  □ Peer reviewed                            │
│  □ Demo'd to stakeholder                    │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 📎 Related Documents

- [Dev Workflow](./dev-workflow.md)
- [Test Plans](../02-features/)
- [Implementation Log](../03-logs/implementation-log.md)
