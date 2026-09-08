import "server-only";

import { z } from "zod";

import {
  ASPECT_RATIOS,
  BG_BLUR_MAX,
  BG_BLUR_MIN,
  BG_DARKEN_MAX,
  BG_DARKEN_MIN,
  BG_SCALE_MAX,
  BG_SCALE_MIN,
  THEME_JSON_MAX_BYTES,
  THEME_PRESETS,
} from "@/lib/validation-constants";
import { DEFAULT_BUILD_CARD_THEME } from "@/components/build-card/types";
import type { BuildCardTheme } from "@/components/build-card/types";

/**
 * Runtime schema for `builds.theme_json` (ACM-014, decision-019). Same
 * write-strict / read-tolerant split as `build-schema.ts` (decision-013):
 * the write side (`themeSchema`, used by the Server Action that saves a
 * theme) rejects anything malformed or out of range; the read side
 * (`parseThemeJson`) NEVER throws — a corrupt or legacy theme degrades to
 * `DEFAULT_BUILD_CARD_THEME` rather than breaking the build page.
 */

const backgroundSchema = z
  .strictObject({
    imageId: z.string().min(1).max(64),
    blur: z.number().min(BG_BLUR_MIN).max(BG_BLUR_MAX),
    darken: z.number().min(BG_DARKEN_MIN).max(BG_DARKEN_MAX),
    scale: z.number().min(BG_SCALE_MIN).max(BG_SCALE_MAX),
  })
  .nullable();

export const themeSchema = z.strictObject({
  preset: z.enum([...THEME_PRESETS, "custom"]),
  aspectRatio: z.enum(ASPECT_RATIOS),
  fontFamily: z.enum(["sans", "mono", "serif"]),
  showItemNames: z.boolean(),
  showSpellNames: z.boolean(),
  background: backgroundSchema,
}) satisfies z.ZodType<BuildCardTheme>;

// Compile-time anti-drift check (mirrors build-schema.ts's `_buildSchemaMatchesType`).
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _themeSchemaMatchesType: Exact<z.infer<typeof themeSchema>, BuildCardTheme> = true;

/** Throws on any violation — the shape/size checks a write path must enforce. */
export function validateThemeJsonForWrite(raw: string): string {
  if (Buffer.byteLength(raw, "utf8") > THEME_JSON_MAX_BYTES) {
    throw new Error(`theme_json exceeds the ${THEME_JSON_MAX_BYTES}-byte limit`);
  }
  const parsed: unknown = JSON.parse(raw);
  const data = themeSchema.parse(parsed);
  return JSON.stringify(data);
}

/**
 * Tolerant read: never throws. `null`/`undefined` (no theme saved yet),
 * invalid JSON, an oversized payload, or a shape/range violation all fall
 * back to `DEFAULT_BUILD_CARD_THEME` — a build must never fail to render
 * because of a bad theme (decision-019).
 */
export function parseThemeJson(raw: string | null | undefined): BuildCardTheme {
  if (!raw) return DEFAULT_BUILD_CARD_THEME;
  if (Buffer.byteLength(raw, "utf8") > THEME_JSON_MAX_BYTES) return DEFAULT_BUILD_CARD_THEME;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_BUILD_CARD_THEME;
  }

  const result = themeSchema.safeParse(parsed);
  if (!result.success) return DEFAULT_BUILD_CARD_THEME;
  return result.data;
}

/** Extracts `background.imageId` from a raw `theme_json` string, tolerating any malformed input. */
export function extractBackgroundImageId(raw: string | null | undefined): string | null {
  return parseThemeJson(raw).background?.imageId ?? null;
}
