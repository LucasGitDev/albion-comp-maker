"use server";

import { and, eq, desc } from "drizzle-orm";

import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { backgroundImages, builds } from "@/db/schema";
import { parseBuildContent, validateBuildContentForWrite } from "@/lib/build-schema";
import { checkWriteRateLimit } from "@/lib/rate-limit";
import { generateSlug } from "@/lib/slug";
import { parseThemeJson, validateThemeJsonForWrite } from "@/lib/theme-schema";
import { BuildContentInvalidError, BuildNotFoundError, ThemeBackgroundNotOwnedError } from "./build-errors";

/**
 * Validates `theme` for the write path (ACM-014, decision-019 §8) and
 * confirms `background.imageId`, if present, is owned by `userId` — never
 * trusts that a background id embedded in an incoming theme actually
 * belongs to the caller.
 */
async function validateThemeForWrite(userId: string, theme: string): Promise<string> {
  const validated = validateThemeJsonForWrite(theme);
  const imageId = parseThemeJson(validated).background?.imageId;
  if (!imageId) return validated;

  const db = getDb();
  const [row] = await db
    .select({ userId: backgroundImages.userId })
    .from(backgroundImages)
    .where(eq(backgroundImages.id, imageId))
    .limit(1);

  if (!row || row.userId !== userId) {
    throw new ThemeBackgroundNotOwnedError();
  }
  return validated;
}

/**
 * Re-validates a source row's `content` before it is copied into a new row
 * (ACM-049 AC#7). Uses the tolerant `parseBuildContent` because the source
 * may legitimately be a legacy payload, then re-serializes through
 * `validateBuildContentForWrite` so the copy is normalized on write like
 * any other write path. Refuses (throws) rather than guessing at a
 * malformed/legacy source — see `BuildContentInvalidError`.
 */
function revalidateContentForCopy(content: string): string {
  const result = parseBuildContent(content);
  if (!result.ok) {
    throw new BuildContentInvalidError();
  }
  return validateBuildContentForWrite(JSON.stringify(result.data));
}

/**
 * All mutations here call `requireSession()` themselves, first thing, and
 * every subsequent query filters by `userId: session.user.id`. This is
 * intentional defense-in-depth, not an optimization: `src/proxy.ts`'s
 * matcher is UX-only and must never be the sole authorization boundary
 * (ACM-016/ACM-017/ACM-032 security audits). Never accept a `userId`
 * argument from the caller — the only trusted actor id is the one on the
 * session.
 */

export type BuildRow = typeof builds.$inferSelect;

/** Loads a build scoped to the current user's ownership, or throws. */
async function loadOwnedBuild(userId: string, buildId: string): Promise<BuildRow> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(builds)
    .where(and(eq(builds.id, buildId), eq(builds.userId, userId)))
    .limit(1);

  if (!row) {
    // Deliberately the same error whether the row does not exist at all or
    // belongs to another user — never leak which case it is (IDOR).
    throw new BuildNotFoundError();
  }
  return row;
}

/** Loads a single build owned by the current user, for share/slug management UI (ACM-067). */
export async function getBuild(id: string): Promise<BuildRow> {
  const session = await requireSession();
  return loadOwnedBuild(session.user.id, id);
}

/** Lists every build owned by the current user, most recently updated first. */
export async function listMyBuilds(): Promise<BuildRow[]> {
  const session = await requireSession();
  const db = getDb();
  return db
    .select()
    .from(builds)
    .where(eq(builds.userId, session.user.id))
    .orderBy(desc(builds.updatedAt));
}

export type SaveBuildInput = {
  name: string;
  role?: string | null;
  content: string;
  /** Raw JSON string, validated by `validateThemeForWrite` (ACM-014). Omitted = no theme saved yet. */
  theme?: string;
};

/** Creates a new build owned by the current user (ACM-018 AC#1). */
export async function saveBuild(input: SaveBuildInput): Promise<BuildRow> {
  const session = await requireSession();
  checkWriteRateLimit(session.user.id);

  // Strict write validation (decision-013 / ACM-049): size cap, JSON parse,
  // then shape via a shared Zod schema. Persists the re-serialized, validated
  // object, never the caller's raw string.
  const content = validateBuildContentForWrite(input.content);
  const themeJson =
    input.theme !== undefined ? await validateThemeForWrite(session.user.id, input.theme) : undefined;

  const db = getDb();
  const [row] = await db
    .insert(builds)
    .values({
      userId: session.user.id,
      name: input.name,
      role: input.role ?? null,
      content,
      themeJson,
      slug: generateSlug(input.name),
    })
    .returning();

  return row;
}

export type UpdateBuildInput = {
  id: string;
  name?: string;
  role?: string | null;
  content?: string;
  /** Raw JSON string, validated by `validateThemeForWrite` (ACM-014). */
  theme?: string;
};

/**
 * Updates an existing build. Ownership is re-checked here even though
 * `loadOwnedBuild` already scopes the read — the update statement itself
 * also filters by `userId` so a TOCTOU between the two queries can never
 * write to a row the caller does not own (ACM-018 AC#2).
 */
export async function updateBuild(input: UpdateBuildInput): Promise<BuildRow> {
  const session = await requireSession();
  checkWriteRateLimit(session.user.id);

  await loadOwnedBuild(session.user.id, input.id);

  // Strict write validation (decision-013 / ACM-049) — same rules as
  // `saveBuild`. Only runs when `content` is actually being updated.
  const content = input.content !== undefined ? validateBuildContentForWrite(input.content) : undefined;
  const themeJson =
    input.theme !== undefined ? await validateThemeForWrite(session.user.id, input.theme) : undefined;

  const db = getDb();
  const [row] = await db
    .update(builds)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(themeJson !== undefined ? { themeJson } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(builds.id, input.id), eq(builds.userId, session.user.id)))
    .returning();

  if (!row) {
    throw new BuildNotFoundError();
  }
  return row;
}

/**
 * Copies an owned build's content into a brand-new row with a fresh slug
 * (ACM-018 AC#3). The duplicate stays private and un-forked regardless of
 * the source's flags.
 */
export async function duplicateBuild(id: string): Promise<BuildRow> {
  const session = await requireSession();
  checkWriteRateLimit(session.user.id);

  const source = await loadOwnedBuild(session.user.id, id);
  const content = revalidateContentForCopy(source.content);

  const db = getDb();
  const [row] = await db
    .insert(builds)
    .values({
      userId: session.user.id,
      name: source.name,
      role: source.role,
      content,
      // Same owner as the source, so any referenced background image is
      // still owned by this user — safe to carry over verbatim.
      themeJson: source.themeJson,
      slug: generateSlug(source.name),
    })
    .returning();

  return row;
}

/**
 * Copies a build into the current user's library, regardless of who owns
 * the source, provided the source is public (ACM-018 AC#4). Sets
 * `forkedFrom` to the source id.
 *
 * Deliberately does NOT carry over `theme_json` (ACM-014): a background
 * image referenced there belongs to the original owner, not the forker, and
 * `validateThemeForWrite`'s ownership check would reject it anyway on the
 * next save. Dropping it here means the fork starts on
 * `DEFAULT_BUILD_CARD_THEME` instead of a theme that would silently lose its
 * background the first time the forker touches it.
 */
export async function forkBuild(id: string): Promise<BuildRow> {
  const session = await requireSession();
  checkWriteRateLimit(session.user.id);

  const db = getDb();
  const [source] = await db.select().from(builds).where(eq(builds.id, id)).limit(1);

  if (!source || (!source.isPublic && source.userId !== session.user.id)) {
    // Same "not found" shape for missing / private-not-owned — do not leak
    // existence of private builds belonging to other users.
    throw new BuildNotFoundError();
  }

  const content = revalidateContentForCopy(source.content);

  const [row] = await db
    .insert(builds)
    .values({
      userId: session.user.id,
      name: source.name,
      role: source.role,
      content,
      slug: generateSlug(source.name),
      forkedFrom: source.id,
    })
    .returning();

  return row;
}

/** Flips `isPublic` on an owned build (ACM-018 AC#5). */
export async function toggleBuildPublic(id: string): Promise<BuildRow> {
  const session = await requireSession();
  checkWriteRateLimit(session.user.id);

  const current = await loadOwnedBuild(session.user.id, id);

  const db = getDb();
  const [row] = await db
    .update(builds)
    .set({ isPublic: !current.isPublic, updatedAt: new Date() })
    .where(and(eq(builds.id, id), eq(builds.userId, session.user.id)))
    .returning();

  if (!row) {
    throw new BuildNotFoundError();
  }
  return row;
}

/**
 * Regenerates an owned build's slug (ACM-067 AC#2/AC#4/AC#5): the old slug
 * stops resolving immediately since `slug` is overwritten in place, not
 * appended alongside — there is no redirect/alias kept for it. Reuses
 * `checkWriteRateLimit`, the same fixed-window limiter every other
 * mutation here goes through, so regeneration cannot be hammered to
 * enumerate slugs or thrash the unique index.
 */
export async function regenerateBuildSlug(id: string): Promise<BuildRow> {
  const session = await requireSession();
  checkWriteRateLimit(session.user.id);

  const current = await loadOwnedBuild(session.user.id, id);

  const db = getDb();
  const [row] = await db
    .update(builds)
    .set({ slug: generateSlug(current.name), updatedAt: new Date() })
    .where(and(eq(builds.id, id), eq(builds.userId, session.user.id)))
    .returning();

  if (!row) {
    throw new BuildNotFoundError();
  }
  return row;
}

/** Hard-deletes a build. Only the owner may do this (ACM-018 AC#6). */
export async function deleteBuild(id: string): Promise<void> {
  const session = await requireSession();
  checkWriteRateLimit(session.user.id);

  await loadOwnedBuild(session.user.id, id);

  const db = getDb();
  const result = await db
    .delete(builds)
    .where(and(eq(builds.id, id), eq(builds.userId, session.user.id)))
    .returning({ id: builds.id });

  if (result.length === 0) {
    throw new BuildNotFoundError();
  }
}
