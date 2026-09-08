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

/**
 * ACM-014 theme/background upload constants. `POST /api/background`
 * (server) and `BackgroundDropzone`/`ThemePanel` (client) both read from
 * here so the 4 MB cap and slider ranges can never drift between the two
 * layers (same rule as the rest of this file — see header).
 */

/** Mirrors the `Content-Length`/`file.size` cap in `src/app/api/background/route.ts`. */
export const BG_MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Mirrors the `sharp().resize(...)` bound in `src/lib/uploads.ts`. */
export const BG_MAX_DIMENSION_PX = 2000;

/**
 * Explicit `sharp({ limitInputPixels })` cap (src/lib/uploads.ts) — guards
 * against decompression-bomb/pixel-flood uploads. ~50 megapixels: generous
 * for any real screenshot, but far short of what a malicious small file can
 * decompress to.
 */
export const BG_MAX_INPUT_PIXELS = 50_000_000;

/** Mirrors `BuildCardBackground.blur` bounds (decision-019). */
export const BG_BLUR_MIN = 0;
export const BG_BLUR_MAX = 20;

/** Mirrors `BuildCardBackground.darken` bounds (decision-019) — opacity fraction, not percent. */
export const BG_DARKEN_MIN = 0;
export const BG_DARKEN_MAX = 0.9;

/** Mirrors `BuildCardBackground.scale` bounds (decision-019). */
export const BG_SCALE_MIN = 1;
export const BG_SCALE_MAX = 2.5;

/**
 * Allowlist decided from **magic bytes**, never the declared multipart
 * `Content-Type` (see `src/lib/uploads.ts` `sniffImageMime`) — this constant
 * is the shared vocabulary between the sniffer and the client-side `accept`
 * attribute, not the authorization source itself.
 */
export const BG_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

/** Mirrors `BuildCardTheme.preset` (decision-019) — named presets only, excludes `"custom"`. */
export const THEME_PRESETS = ["dark-purple", "gold", "blood", "ice"] as const;

/** Mirrors `BuildCardTheme.aspectRatio` (decision-019). */
export const ASPECT_RATIOS = ["square", "wide", "auto"] as const;

/** Mirrors the size cap enforced by `src/lib/theme-schema.ts` on `builds.theme_json`. */
export const THEME_JSON_MAX_BYTES = 2048;
