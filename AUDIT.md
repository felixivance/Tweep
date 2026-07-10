# Security & Performance Audit

A pass through the codebase looking for exploitable bugs, performance
cliffs, and unpatched dependency vulnerabilities. Findings below are
grouped by where the fix lives: application-level issues first (these
involve actual code changes and tradeoffs), then a summary of
third-party dependency CVEs patched via `pnpm.overrides`.

Each entry names the commit so the fix can be inspected directly.

---

## Application-level findings

### [SEC-1] Timing side-channel in password verification

- **Severity:** High
- **File:** `apps/api/src/services/utils.ts` (verifyPassword)
- **Commit:** `aa20225`
- **Root cause:** Password verification compared hashes with `===`,
  which short-circuits at the first differing byte. An attacker who can
  measure login response times can recover the correct hash one byte at
  a time instead of brute-forcing the whole hash at once — a classic
  timing side-channel.
- **Fix:** Replaced `hash === hashedPassword` with
  `crypto.timingSafeEqual()` on the buffer representations of both
  hex-encoded hashes, so comparison time no longer depends on where the
  strings diverge.
- **Follow-up not fixed:** the underlying hash is SHA-256 with a
  hardcoded salt, which is too fast for password hashing (no
  work-factor). Should move to bcrypt/argon2; tracked separately rather
  than bundled into this fix.

### [SEC-2] LIKE-pattern injection in search and admin queries

- **Severity:** Medium
- **File:** `apps/api/src/services/search.service.ts`, `apps/api/src/services/admin.service.ts`
- **Commit:** `33ee69f`
- **Root cause:** User-supplied query strings were interpolated
  directly into SQL `LIKE` patterns without escaping. `%` and `_` are
  wildcards in `LIKE`, so an attacker-controlled query could match far
  more rows than intended (e.g. enumerate data via a bare `%`).
- **Fix:** Escape `\`, `%`, and `_` in the user input before wrapping it
  in the `%...%` pattern, so the input is matched literally.

### [SEC-3] Hardcoded session secret fallback

- **Severity:** Critical (in production)
- **File:** `apps/client-user/src/lib/session.server.ts`
- **Commit:** `99ba266`
- **Root cause:** The session secret had a hardcoded fallback string
  used silently whenever `SESSION_SECRET` was unset. Since the fallback
  string is public (it's in this repo), anyone could forge valid
  session cookies against a production deployment that forgot to set
  the env var.
- **Fix:** Throw at startup when `NODE_ENV=production` and
  `SESSION_SECRET` is unset, so a misconfigured deploy fails loudly
  instead of running with a known-public secret. Kept the fallback as a
  dev-only convenience, with a console warning so the gap stays visible
  locally.

### [PERF-1] N+1 query pattern in notifications feed

- **Severity:** Medium (scales with page size / traffic)
- **File:** `apps/api/src/services/notifications.service.ts` (getUserNotifications)
- **Commit:** `bd0628b`
- **Root cause:** Each notification was enriched with a content preview
  by firing one DB query per `postId` and one per `commentId` inside
  `Promise.all`. A page of 20 notifications meant up to 40 concurrent
  DB round-trips on every call.
- **Fix:** Collect all `postId`/`commentId`s from the result set up
  front, fetch each set in a single `inArray` query (2 queries total
  regardless of page size), index results into `Map`s for O(1) lookup,
  then join back to notification rows in JS.

### [PERF-2] Stale closures from missing memoization

- **Severity:** Low
- **File:** `BookmarkButton`, `RechirpButton`, `$username` components
- **Commit:** `a7be209`
- **Root cause:** `useEffect` dependencies referenced async load
  functions that were redefined on every render, creating stale-closure
  bugs and violating `exhaustive-deps` lint rules.
- **Fix:** Wrapped each load function in `useCallback` with correct
  dependencies, so the effect only re-runs when its actual inputs
  change.

---

## Dependency CVEs patched

The remaining fixes are third-party vulnerabilities caught by
`pnpm audit`, patched by bumping the direct dependency or adding a
`pnpm.overrides` entry so the fixed version is enforced across every
workspace in the monorepo without editing each package's
`package.json` individually.

| Package | Issue | Commit |
|---|---|---|
| `shell-quote` | Newline injection → shell command execution via dev-server tooling (`launch-editor`) | `51e49f6` |
| `protobufjs` | Arbitrary code execution via crafted `.proto` file (transitive via `@grpc/grpc-js`) | `456b52b` |
| `vitest` | Arbitrary file read/execute via UI server (not enabled here, but patched anyway) | `86d504e`, `5861113` |
| `rollup` | Arbitrary file write via path traversal in output filenames | `5f7f223` |
| `undici` | Fatal crash from malformed WebSocket frame length | `33e8d7a` |
| `vite` | Dev-server file-access-deny bypass on Windows (NTFS ADS / 8.3 short names) | `980525f` |
| `kysely` | Incomplete CVE fix — JSON-path traversal still possible via unescaped metacharacters | `10e72c6` |
| `picomatch` | ReDoS via crafted extglob patterns (catastrophic backtracking) | `33766a3` |
| `form-data` | CRLF injection via unescaped multipart field/file names | `2af652b` |
| `h3` | Middleware bypass via `FastURL` gadget | `e182adf` |
| `ws` | Memory-exhaustion DoS via many tiny fragments | `67a1e65` |
| `@grpc/grpc-js` | Crash on malformed incoming compressed message | `9c89456` |
| `drizzle-orm` | SQL injection via improperly escaped identifiers | `c974599` |
| `elysia` | ReDoS in URL-format string validation | `75398d7` |

---

## Validation

| Check | Result |
|---|---|
| `pnpm audit --audit-level high` | Passing (0 critical) |
| `pnpm typecheck` (full workspace) | Passing |

## Prioritization rationale

Application-level findings were prioritized over the dependency sweep:
a timing side-channel or a forgeable session cookie is directly
exploitable against this app's own logic, whereas most of the
dependency CVEs required either an unusual attack surface (Windows-only
NTFS quirks, a disabled UI server) or attacker control over an input
this app doesn't expose (e.g. crafted `.proto` files). The dependency
overrides were still applied in full, since `pnpm audit` makes them
nearly free to fix once identified — but they weren't where the actual
engineering judgment was.
