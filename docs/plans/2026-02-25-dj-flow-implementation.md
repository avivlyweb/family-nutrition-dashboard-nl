# DJ Flow Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add switchable Simple-mode flow control (`Strict Pro` default + `Balanced`) with unified action scheduling for top-DJ-grade transition consistency.

**Architecture:** Introduce a small pure flow utility (`lib/dj/flow-mode.ts`) that maps flow mode and action type to quantization/lock behavior. Reuse existing `enqueueQuantizedAction` by extending it with blocked-action callback support, then route Simple-mode actions through a dedicated wrapper.

**Tech Stack:** Next.js (App Router), React state/hooks, TypeScript, Vitest.

---

### Task 1: Add failing tests for flow-mode behavior

**Files:**
- Create: `tests/dj-flow-mode.test.ts`
- Test target: `lib/dj/flow-mode.ts`

1. Write tests that define expected quantization and lock behavior for `Strict Pro` and `Balanced`.
2. Run `npm run test -- tests/dj-flow-mode.test.ts` and confirm failure (module missing).

### Task 2: Implement flow-mode utility

**Files:**
- Create: `lib/dj/flow-mode.ts`
- Test: `tests/dj-flow-mode.test.ts`

1. Implement typed flow mode/action constants and helper functions.
2. Run `npm run test -- tests/dj-flow-mode.test.ts` and confirm pass.

### Task 3: Wire flow engine into DJ Simple mode

**Files:**
- Modify: `app/dj/page.tsx`

1. Add `Flow Mode` UI switch in Simple page.
2. Add `flowMode` state defaulting to `Strict Pro`.
3. Add Simple-mode scheduler wrapper and queued-action behavior for lock conflicts.
4. Route Simple-mode target actions through wrapper.

### Task 4: Verify full test suite

**Files:**
- Verify project tests

1. Run `npm run test` and confirm all pass.
2. Run `npm run build` if feasible and report result.

### Task 5: Commit

1. Stage changed files.
2. Commit with message: `feat(dj): add strict/balanced simple-mode flow scheduler`
