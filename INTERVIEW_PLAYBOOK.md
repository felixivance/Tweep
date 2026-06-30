# Interview Playbook — 90 Minutes

> Work through this with Claude step by step.
> Paste findings directly into Claude and say "analyze this" or "fix this."
> One commit per fix. No exceptions.

---

## PHASE 0 — Cold Read (0:00 – 0:15)

**Do NOT touch any code yet. Just read and map.**

### Commands to run first
```bash
# Understand the monorepo shape
ls apps/ packages/

# Check what each app is
cat apps/*/package.json | grep '"name"'

# Understand the build system
cat turbo.json        # or nx.json
cat package.json      # root scripts + overrides

# Find the test setup
find . -name "vitest.config*" -not -path "*/node_modules/*"
find . -name "playwright.config*" -not -path "*/node_modules/*"

# Find the auth layer
grep -r "session\|jwt\|token\|cookie" apps/*/src --include="*.ts" -l

# Find the DB layer
grep -r "drizzle\|prisma\|knex\|typeorm\|sequelize" apps/*/src --include="*.ts" -l

# Find env variable usage
grep -r "process.env" apps/ --include="*.ts" -l

# Find all server-side entry points
find apps/ -name "*.server.ts" -not -path "*/node_modules/*"
```

### What to write in notes.md
- Stack (framework, DB, auth, build tool)
- Monorepo structure (list each app and its role)
- Test infrastructure (unit / integration / e2e, which app has which)
- Any immediate red flags you noticed while reading

### Hand off to Claude
Paste your notes.md Architecture section and say:
> "Here is my architecture overview. What attack surfaces or risk areas should I prioritize given this stack?"

---

## PHASE 1 — Dependency Vulnerabilities (0:15 – 0:25)

### Commands
```bash
pnpm audit --audit-level high

# If findings appear, check what package is affected
pnpm audit --audit-level high --json | jq '.advisories | to_entries[] | {id: .key, module: .value.module_name, severity: .value.severity, title: .value.title}'
```

### What to look for
- **Critical / High** — fix immediately
- **Moderate** — fix if time allows
- **Low** — document in backlog

### Fix pattern
```json
// root package.json — force a safe version across all workspaces
"pnpm": {
  "overrides": {
    "vulnerable-package": "^safe.version.here"
  }
}
```
```bash
pnpm install
pnpm audit --audit-level high   # must come back clean
```

### Commit message format
```
fix(security): patch <package-name> CVE-YYYY-XXXXX

<package-name> < X.Y.Z allows [attack type]. Forced to ^X.Y.Z
via pnpm.overrides to resolve across all workspaces.
```

### Hand off to Claude
Paste the raw `pnpm audit` output and say:
> "Here is my audit output. Which ones should I fix first and what is the fix for each?"

---

## PHASE 2 — Backend Security (0:25 – 0:40)

### 2a. Raw query / injection vulnerabilities

```bash
# Find raw SQL string interpolation
grep -rn "LIKE\|WHERE\|SELECT\|INSERT\|UPDATE\|DELETE" apps/*/src --include="*.ts" | grep -v "node_modules" | grep '\${'

# Find ORM LIKE patterns with raw input
grep -rn "like(" apps/*/src --include="*.ts"

# Find any template literal SQL
grep -rn "sql\`\|query\`" apps/*/src --include="*.ts"
```

**Red flag:** `LIKE \`%${userInput}%\`` — user input not escaped before interpolation.

**Fix:** Escape `\`, `%`, `_` before building the pattern:
```ts
function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
const pattern = `%${escapeLike(query)}%`;
```

---

### 2b. Timing-safe comparisons

```bash
# Find unsafe string equality on secrets/tokens/hashes
grep -rn "=== \|!== " apps/*/src --include="*.ts" | grep -i "token\|secret\|hash\|password\|key\|sig"

# Find crypto imports — check if timingSafeEqual is used
grep -rn "from ['\"]crypto['\"]" apps/*/src --include="*.ts"
```

**Red flag:** `if (token === userToken)` — allows timing attacks to enumerate valid tokens.

**Fix:**
```ts
import { timingSafeEqual } from "crypto";
return timingSafeEqual(Buffer.from(a), Buffer.from(b));
```

---

### 2c. Secrets / environment variables

```bash
# Find hardcoded fallback secrets
grep -rn "SESSION_SECRET\|JWT_SECRET\|API_KEY\|SECRET" apps/*/src --include="*.ts" | grep -v "process.env"

# Find env vars with unsafe fallbacks
grep -rn 'process\.env\.' apps/*/src --include="*.ts" | grep '\?\?'
```

**Red flag:** `const secret = process.env.SECRET ?? "hardcoded-fallback"` in production.

**Fix:** Fail fast in production:
```ts
if (!process.env.SECRET && process.env.NODE_ENV === "production") {
  throw new Error("SECRET environment variable is required in production");
}
```

---

### 2d. Missing authorization checks

```bash
# Find endpoints that read userId from params (not session)
grep -rn "params\.\|req\.params" apps/*/src --include="*.ts"

# Find delete/update endpoints
grep -rn "\.delete\|\.update" apps/*/src --include="*.ts" | grep -v "node_modules"
```

**Red flag:** Update/delete endpoint uses `id` from request body without verifying the caller owns that resource.

---

### Hand off to Claude
Paste grep output and say:
> "Here are my grep results for backend security. Identify which ones are genuine vulnerabilities and give me the minimal fix for each."

---

## PHASE 3 — Backend Performance (0:40 – 0:55)

### 3a. N+1 queries

```bash
# Find async inside map/forEach
grep -rn "\.map(async\|\.forEach(async\|for.*await" apps/*/src --include="*.ts" | grep -v "node_modules"

# Find Promise.all wrapping map — check if each item queries the DB
grep -rn "Promise\.all" apps/*/src --include="*.ts" | grep -v "node_modules"
```

**Red flag:** `await Promise.all(items.map(item => db.query(item.id)))` — still N+1 (N queries in parallel).

**Fix:** Batch with `inArray`:
```ts
import { inArray } from "drizzle-orm";
const ids = items.map(i => i.id);
const rows = await db.select().from(table).where(inArray(table.id, ids));
const map = new Map(rows.map(r => [r.id, r]));
```

---

### 3b. Unbounded in-memory caches

```bash
# Find module-level Maps or objects used as caches
grep -rn "new Map\|= {}" apps/*/src --include="*.ts" | grep -v "node_modules" | grep -v "test\|spec"

# Check if .set() is called without any eviction
grep -rn "\.set(" apps/*/src --include="*.ts" | grep -v "node_modules"
```

**Red flag:** `const cache = new Map()` at module level with `.set()` called on every request but nothing ever calling `.delete()` or `.clear()`.

**Fix options (pick one):**
- Add a max-size check: `if (cache.size > 500) cache.clear()`
- TTL-based eviction: store `{ value, expiresAt }` and check on read
- Use a proper LRU (if a dep already exists)

---

### 3c. Unoptimized queries

```bash
# Find select * patterns
grep -rn "\.select()" apps/*/src --include="*.ts" | grep -v "node_modules"

# Find missing pagination
grep -rn "\.findMany\|\.select()" apps/*/src --include="*.ts" | grep -v "limit\|take" | grep -v "node_modules"
```

---

### Hand off to Claude
Paste grep output and say:
> "Here are potential N+1 patterns. Which are genuine N+1 vs acceptable Promise.all parallelism? Give me the fix for genuine ones."

---

## PHASE 4 — Frontend Performance & State (0:55 – 1:05)

### 4a. Unstable list keys

```bash
# Find key={index} in JSX
grep -rn "key={index}\|key={i}" apps/*/src --include="*.tsx" | grep -v "node_modules"

# Find .map( without a key prop at all
grep -rn "\.map(" apps/*/src --include="*.tsx" | grep -v "node_modules" | grep -v "key="
```

**Red flag:** `key={index}` on a list that can be reordered, filtered, or deleted.

**Fix:** Use a stable unique ID: `key={item.id}`

---

### 4b. useEffect missing / incorrect deps

```bash
# Find useEffect with empty or missing deps
grep -rn "useEffect" apps/*/src --include="*.tsx" | grep -v "node_modules"

# Find functions called inside useEffect that aren't in deps
grep -rn "useEffect" apps/*/src --include="*.tsx" -A 5 | grep -v "node_modules"
```

**Red flag:** Function defined outside useEffect, called inside it, but not listed in deps.

**Fix:** Wrap the function in `useCallback` with its own deps, then add it to `useEffect` deps:
```ts
const loadData = useCallback(async () => {
  // ...
}, [dep1, dep2]);

useEffect(() => {
  loadData();
}, [loadData]);
```

---

### 4c. Missing loading / error states

```bash
grep -rn "useState(false)\|useState(true)\|useState(null)" apps/*/src --include="*.tsx" | grep -v "node_modules"
```

Look for components that fire async calls with no loading indicator and no error handling.

---

### Hand off to Claude
Paste component code and say:
> "Audit this component for stale closures, missing deps, and unnecessary re-fetches. Give me the minimal fix."

---

## PHASE 5 — Reliability (1:05 – 1:12)

```bash
# Find unhandled async errors
grep -rn "async\|await\|\.then(" apps/*/src --include="*.ts" | grep -v "\.catch\|try" | grep -v "node_modules" | head -30

# Find missing input validation at API boundaries
grep -rn "req\.body\|req\.params\|req\.query" apps/*/src --include="*.ts" | grep -v "node_modules"

# Find swallowed errors (catch with no body or just a log)
grep -rn "catch" apps/*/src --include="*.ts" -A 1 | grep -v "node_modules" | grep -E "catch.*\{\s*\}|catch.*console"
```

**Red flags:**
- `catch (e) {}` — silently swallows errors
- No validation on user-supplied request body fields
- Missing null checks after DB queries that return `undefined`

---

## PHASE 6 — Developer Tooling (1:12 – 1:17)

```bash
# Check TypeScript strictness
cat apps/*/tsconfig.json | grep -E "strict|noImplicit|skipLib"

# Check if lint runs in CI
find . -name "*.yml" -path "*/.github/*" | xargs grep -l "lint\|typecheck" 2>/dev/null

# Check for missing test scripts
cat apps/*/package.json | grep -A 10 '"scripts"'

# Check for any broken turbo pipeline steps
cat turbo.json
```

**Red flags:**
- `"strict": false` in tsconfig
- No typecheck step in CI
- `pnpm test` not wired up in one of the apps
- turbo pipeline has wrong dependencies between tasks

---

## PHASE 7 — Validation Gate (1:17 – 1:25)

**Do this after every fix, not just at the end.**

```bash
# Full workspace build — catches type errors across all apps
pnpm build

# All unit tests
pnpm test:unit

# Check your diff is clean
git diff --stat
git diff          # read every line — no console.log, no commented code, no unrelated changes
```

**If build fails:** paste the error to Claude and say:
> "My build is failing with this error after my last change. What did I break and what is the minimal fix?"

**If tests fail:** paste the failure to Claude and say:
> "This test is failing after my change. Is this a pre-existing failure or did I break it? If I broke it, what is the fix?"

---

## PHASE 8 — notes.md + Commit Polish (1:25 – 1:30)

### Final commit message audit
```bash
git log --oneline
```
Each commit should answer: **what** was wrong, **why** it mattered, **what** you changed.

Bad: `fix auth bug`
Good: `fix(security): use timingSafeEqual for password verification — string equality leaks hash length via timing`

### notes.md — last 5 minutes
Fill in:
1. Every finding with severity + root cause (even unfixed ones)
2. Backlog section — issues found but not fixed, with recommended fix
3. Prioritization rationale — 3–4 sentences on your triage logic
4. Validation table — mark build and test results

---

## Claude Prompts to Use During the Interview

| Situation | What to say to Claude |
|---|---|
| Just cloned the repo | "Here is the output of `ls apps/ packages/` and the root `package.json`. What is the architecture and what are the highest-risk areas?" |
| pnpm audit output | "Here is my audit output. Rank these by severity and give me the atomic fix for each." |
| Found a suspicious grep result | "Here is this code. Is this a genuine vulnerability? If so, what is the root cause and minimal fix?" |
| Build is failing | "My build failed with this error after changing X. What broke and how do I fix it minimally?" |
| Test is failing | "This test failed after my change. Did I break it or was it pre-existing? What is the fix?" |
| Running out of time | "I have 10 minutes left. Here is my git log and notes.md backlog. What should I prioritize?" |
| Writing commit message | "Here is the diff for my last change. Write a one-line atomic commit message that explains the problem and the fix." |
| Writing backlog entry | "I found this issue but didn't have time to fix it. Write a 3-sentence notes.md backlog entry for it." |

---

## Time Budget Summary

| Phase | Time | Goal |
|---|---|---|
| 0. Cold read | 0:00 – 0:15 | Understand the system before touching anything |
| 1. Dependency audit | 0:15 – 0:25 | Clear all high/critical CVEs |
| 2. Backend security | 0:25 – 0:40 | Injection, timing, secrets, authz |
| 3. Backend performance | 0:40 – 0:55 | N+1, unbounded caches |
| 4. Frontend state | 0:55 – 1:05 | Keys, useEffect deps |
| 5. Reliability | 1:05 – 1:12 | Unhandled errors, missing validation |
| 6. Developer tooling | 1:12 – 1:17 | TS strict, CI, scripts |
| 7. Validation gate | 1:17 – 1:25 | pnpm build + pnpm test + git diff |
| 8. Documentation | 1:25 – 1:30 | notes.md backlog + commit polish |

**If you're falling behind:** skip Phase 6, compress Phase 5, and protect Phase 8.
A well-documented partial audit beats an undocumented complete one.
