/**
 * Client+server shared validation constants (ACM-059).
 *
 * `build-schema.ts` and `comp-schema.ts` are `import "server-only"` and
 * therefore CANNOT be imported by client code (decision-013) — that
 * boundary is intentional and stays in place. This module exists solely to
 * stop the numeric/regex *values* enforced there from drifting out of sync
 * with client-side mirrors (`build-store.ts`'s `MAX_SWAPS`, form
 * `maxLength`s, etc.), a problem that has already surfaced three times
 * (ACM-049/MAX_SWAPS, ACM-054/accent regex, ACM-056/name+role limits).
 *
 * Rules for this file, enforced by review:
 * - Values only: numbers and regexes. No validation logic, no schemas.
 * - No `import "server-only"`.
 * - No `zod` (or any other) dependency — this module is imported by client
 *   components and must not inflate the client bundle (ACM-043).
 */

/** Mirrors `buildStateSchema.swaps.max(...)` in `src/lib/build-schema.ts`. */
export const MAX_SWAPS = 20;

/** Mirrors `buildStateSchema.name.max(...)` in `src/lib/build-schema.ts`. */
export const BUILD_NAME_MAX_LENGTH = 100;

/** Mirrors `buildStateSchema.role.max(...)` in `src/lib/build-schema.ts`. */
export const BUILD_ROLE_MAX_LENGTH = 50;

/** Mirrors `swapSchema.label.max(...)` in `src/lib/build-schema.ts`. */
export const SWAP_LABEL_MAX_LENGTH = 60;

/**
 * Mirrors `accentSchema` in `src/lib/build-schema.ts` (6-digit hex only —
 * the *strict* write-side bound). Every `BuildState.accent` that reaches
 * storage/exchange (Zod parse, `POST`/`PATCH` payloads) must match this
 * exact pattern — there is never a persisted 3/4/8-digit value.
 *
 * ACM-054: also the sole pattern used by `resolveAccent()` in
 * `src/components/build-card/tokens.ts` — write and render share this one
 * regex so the two validators cannot drift apart again.
 */
export const ACCENT_HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** Mirrors `compNameSchema.max(...)` in `src/lib/comp-schema.ts`. */
export const COMP_NAME_MAX_LENGTH = 100;

/** Mirrors `compBuildLabelSchema.max(...)` in `src/lib/comp-schema.ts`. */
export const COMP_BUILD_LABEL_MAX_LENGTH = 200;
