import "server-only";

import { z } from "zod";

import { SLOT_ORDER } from "@/types/build";
import type { BuildState, EquippedItem, SpellGroup, Swap } from "@/types/build";

/**
 * Runtime schema for `BuildState` (see `src/types/build.ts`), the shape
 * persisted in `builds.content` (decision-013).
 *
 * "Write" path uses `buildStateSchema.parse()` directly: `.strict()` at
 * every object level, so unknown fields are **rejected**, not silently
 * stripped (ACM-049 AC#3 — a stripped-but-accepted unknown field would hide
 * a client bug). "Read" path goes through `parseBuildContent`, which never
 * throws — see the module doc there for the tolerant-read rationale.
 */

const MAX_CONTENT_BYTES = 131072; // 128 KiB (decision-013)

const uniquenameSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Z0-9_@#]+$/i, "must look like an Albion uniquename");

const spellIdSchema = uniquenameSchema;

const spellsSchema = z.strictObject({
  q: spellIdSchema.nullable(),
  w: spellIdSchema.nullable(),
  e: spellIdSchema.nullable(),
  passive: spellIdSchema.nullable(),
}) satisfies z.ZodType<Record<SpellGroup, string | null>>;

const equippedItemSchema = z.strictObject({
  itemId: uniquenameSchema,
  tier: z.int().min(1).max(8),
  enchant: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  spells: spellsSchema,
  twohanded: z.boolean(),
  maxEnchant: z.int().min(0).max(4),
}) satisfies z.ZodType<EquippedItem>;

const equippedItemOrNullSchema = equippedItemSchema.nullable();

/**
 * `SLOT_ORDER` is the source of truth for the 10 valid slots — the `Slot`
 * type in `src/data/ao-data.d.ts` widens to `| string` and is unusable as a
 * runtime constraint (decision-013).
 */
const slotsShape = Object.fromEntries(
  SLOT_ORDER.map((slot) => [slot, equippedItemOrNullSchema]),
) as Record<(typeof SLOT_ORDER)[number], typeof equippedItemOrNullSchema>;

const slotsSchema = z.strictObject(slotsShape);

const accentSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "accent must be a 6-digit hex color literal");

const swapSchema = z.strictObject({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(60),
  slots: z.partialRecord(z.enum(SLOT_ORDER), equippedItemOrNullSchema),
}) satisfies z.ZodType<Swap>;

export const buildStateSchema = z.strictObject({
  schemaVersion: z.literal(1),
  name: z.string().min(1).max(100),
  role: z.string().max(50),
  accent: accentSchema,
  slots: slotsSchema,
  swaps: z.array(swapSchema).max(20),
}) satisfies z.ZodType<BuildState>;

// Compile-time anti-drift check (decision-013): if `BuildState` gains or
// loses a field without a matching change here (or vice versa), this line
// fails `tsc --noEmit`.
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _buildSchemaMatchesType: Exact<z.infer<typeof buildStateSchema>, BuildState> = true;

export type ParseBuildContentResult =
  | { ok: true; data: BuildState }
  | { ok: false; reason: "too-large" | "invalid-json" | "invalid-shape" };

/**
 * Strict validation for the **write** path (`saveBuild`/`updateBuild`).
 * Throws on any violation — callers are expected to let this propagate as a
 * clear Server Action error.
 */
export function assertBuildContentSize(raw: string): void {
  if (Buffer.byteLength(raw, "utf8") > MAX_CONTENT_BYTES) {
    throw new Error(`Build content exceeds the ${MAX_CONTENT_BYTES}-byte limit`);
  }
}

/** Validates + re-serializes `raw` for persistence. Throws on any violation. */
export function validateBuildContentForWrite(raw: string): string {
  assertBuildContentSize(raw);
  const parsed: unknown = JSON.parse(raw);
  const data = buildStateSchema.parse(parsed);
  // Re-serialize from the validated object, never the original string
  // (decision-013): the DB always holds exactly what passed the schema.
  return JSON.stringify(data);
}

/**
 * Tolerant read: never throws. Rows persisted before this task (or produced
 * by a future incompatible client) may fail size, JSON, or shape checks —
 * callers decide what to do with a `{ ok: false }` result (owner page shows
 * a "corrupted / legacy" state; public SSR page 404s). See decision-013's
 * compatibility section.
 */
export function parseBuildContent(raw: string): ParseBuildContentResult {
  if (Buffer.byteLength(raw, "utf8") > MAX_CONTENT_BYTES) {
    return { ok: false, reason: "too-large" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }

  const result = buildStateSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, reason: "invalid-shape" };
  }

  return { ok: true, data: result.data };
}
