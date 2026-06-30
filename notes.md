# Audit Notes

**Auditor:** Felix Runye
**Date:** <!-- fill in -->
**Time started:** <!-- fill in -->
**Time ended:** <!-- fill in -->

---

## Architecture Overview

> _Spend the first 10–15 minutes here. Fill this in BEFORE touching any code._

- **Stack:** <!-- e.g. TanStack Start + gRPC + Drizzle + SQLite -->
- **Monorepo structure:** <!-- list apps/ and packages/ -->
- **Auth mechanism:** <!-- sessions / JWT / etc. -->
- **DB access layer:** <!-- ORM / raw queries / both -->
- **Test infrastructure:** <!-- vitest / playwright / jest -->
- **Build system:** <!-- turbo / nx / etc. -->

---

## Findings

### [SEC-1] <!-- Title -->

- **Severity:** Critical / High / Medium / Low
- **File:** `path/to/file.ts:line`
- **Root cause:** <!-- one sentence — the WHY, not just the what -->
- **Impact:** <!-- how it can be exploited or triggered at scale -->
- **Fix:** <!-- what you changed and why this approach is correct -->
- **Commit:** <!-- git short hash -->
- **Status:** ✅ Fixed / ⏳ Partial / ❌ Not fixed

---

### [SEC-2] <!-- Title -->

- **Severity:**
- **File:**
- **Root cause:**
- **Impact:**
- **Fix:**
- **Commit:**
- **Status:**

---

### [PERF-1] <!-- Title -->

- **Severity:**
- **File:**
- **Root cause:**
- **Impact:**
- **Fix:**
- **Commit:**
- **Status:**

---

### [PERF-2] <!-- Title -->

- **Severity:**
- **File:**
- **Root cause:**
- **Impact:**
- **Fix:**
- **Commit:**
- **Status:**

---

### [RELIABILITY-1] <!-- Title -->

- **Severity:**
- **File:**
- **Root cause:**
- **Impact:**
- **Fix:**
- **Commit:**
- **Status:**

---

### [TOOLING-1] <!-- Title -->

- **Severity:**
- **File:**
- **Root cause:**
- **Impact:**
- **Fix:**
- **Commit:**
- **Status:**

---

## Backlog — Found but not fixed

> Issues identified but not addressed due to time. Shows diagnostic depth.

### [BACKLOG-1] <!-- Title -->

- **Severity:**
- **File:**
- **Root cause:**
- **Why not fixed:** <!-- time / risk of regression / needs migration plan -->
- **Recommended fix:** <!-- what you would do with more time -->

---

### [BACKLOG-2] <!-- Title -->

- **Severity:**
- **File:**
- **Root cause:**
- **Why not fixed:**
- **Recommended fix:**

---

## Validation

| Check | Result |
|---|---|
| `pnpm audit --audit-level high` | ✅ / ❌ |
| `pnpm build` (full workspace) | ✅ / ❌ |
| `pnpm test` (all unit tests) | ✅ / ❌ |
| No unintended changes in `git diff` | ✅ / ❌ |

---

## Prioritization rationale

> _Why did you fix these issues in this order? Shows systems thinking._

<!-- 2–4 sentences. E.g.: "Started with pnpm audit to clear known CVEs quickly.
Prioritized the timing-safe comparison next as it directly affects auth.
Deferred the cache eviction issue because the fix carries regression risk
and the memory impact is bounded in the current usage pattern." -->
