"use server";

import { and, desc, eq } from "drizzle-orm";

import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { builds } from "@/db/schema";
import { checkWriteRateLimit } from "@/lib/rate-limit";
import { generateSlug } from "@/lib/slug";
import { BuildNotFoundError } from "./build-errors";

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
};

/** Creates a new build owned by the current user (ACM-018 AC#1). */
export async function saveBuild(input: SaveBuildInput): Promise<BuildRow> {
  const session = await requireSession();
  checkWriteRateLimit(session.user.id);

  const db = getDb();
  const [row] = await db
    .insert(builds)
    .values({
      userId: session.user.id,
      name: input.name,
      role: input.role ?? null,
      content: input.content,
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

  const db = getDb();
  const [row] = await db
    .update(builds)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
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

  const db = getDb();
  const [row] = await db
    .insert(builds)
    .values({
      userId: session.user.id,
      name: source.name,
      role: source.role,
      content: source.content,
      slug: generateSlug(source.name),
    })
    .returning();

  return row;
}

/**
 * Copies a build into the current user's library, regardless of who owns
 * the source, provided the source is public (ACM-018 AC#4). Sets
 * `forkedFrom` to the source id.
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

  const [row] = await db
    .insert(builds)
    .values({
      userId: session.user.id,
      name: source.name,
      role: source.role,
      content: source.content,
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
