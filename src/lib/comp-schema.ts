import "server-only";

import { z } from "zod";

/**
 * Size bounds for the free-form text columns on `comps`/`comp_builds`
 * (ACM-057, MEDIUM finding from the ACM-019 security audit).
 *
 * Unlike `builds.content` (see `build-schema.ts`), neither `comps.name` nor
 * `comp_builds.label` carries JSON — they are plain scalar text columns, so
 * there is no *shape* to validate (ACM-049's `validateBuildContentForWrite`
 * does not apply here). What was missing was a *size bound*: today an
 * unbounded value is a storage-abuse vector; once a comp can be rendered
 * publicly (ACM-021) it becomes unbounded untrusted text served to third
 * parties.
 *
 * Both limits are counted in UTF-16 code units (`string.length`, what
 * `z.string().max()` measures), the same unit `build-schema.ts` already
 * uses for `name`/`role`/swap `label` (decision-013 / ACM-049). This is a
 * deliberate, existing precedent, not a new choice: these are short
 * display labels, never persisted as bytes on the wire the way
 * `builds.content` is, so a UTF-16-length cap keeps this module consistent
 * with the rest of the codebase rather than inventing a byte-counting rule
 * for two short strings.
 *
 * Both schemas trim surrounding whitespace before measuring length and
 * before persisting, so `"  ok  "` and `"ok"` cost the same against the
 * limit and the DB never stores a leading/trailing-whitespace-only
 * difference. `comps.name` additionally rejects an empty-after-trim value
 * (a comp always needs a real display name, e.g. for `generateSlug`, which
 * already falls back to a random slug for an all-whitespace name — silently
 * accepting one here would be confusing product behavior). `comp_builds
 * .label` has no such requirement: it is optional free text used to
 * annotate a slot (e.g. "Main tank"), so an empty string after trimming is
 * valid and simply means "no label".
 */

export const COMP_NAME_MAX_LENGTH = 100;
export const COMP_BUILD_LABEL_MAX_LENGTH = 200;

export const compNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(COMP_NAME_MAX_LENGTH, `Name must be at most ${COMP_NAME_MAX_LENGTH} characters`);

export const compBuildLabelSchema = z
  .string()
  .trim()
  .max(COMP_BUILD_LABEL_MAX_LENGTH, `Label must be at most ${COMP_BUILD_LABEL_MAX_LENGTH} characters`);
