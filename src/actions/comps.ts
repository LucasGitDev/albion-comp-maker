"use server";

import { and, eq, max, sql } from "drizzle-orm";

import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { builds, compBuilds, comps } from "@/db/schema";
import { compBuildLabelSchema, compNameSchema } from "@/lib/comp-schema";
import { checkWriteRateLimit } from "@/lib/rate-limit";
import { generateSlug } from "@/lib/slug";
import { CompBuildReorderInvalidError, CompBuildRefNotFoundError, CompNotFoundError } from "./comp-errors";

/**
 * All mutations here call `requireSession()` themselves, first thing, and
 * every subsequent query filters by `userId: session.user.id`. Same
 * defense-in-depth rule as `src/actions/builds.ts` — `src/proxy.ts`'s
 * matcher is UX-only and must never be the sole authorization boundary
 * (ACM-016/ACM-017/ACM-032 security audits). Never accept a `userId`
 * argument from the caller — the only trusted actor id is the one on the
 * session.
 *
 * Content-validation note (ACM-049): unlike `builds.content`, comps store
 * no free-form user-controlled JSON blob. `comps` holds only `name`,
 * `slug` and `contentType` (plain text columns); `comp_builds` holds only
 * `position`/`count`/`label` (plain scalars) plus foreign keys to
 * `builds`/`comps`. There is nothing here that needs to go through
 * `validateBuildContentForWrite`/`parseBuildContent` — the only JSON blob
 * in the data model is `builds.content`, which is already validated on
 * every write path in `builds.ts`. Comps only ever reference a build by
 * id, they never copy or re-serialize its content.
 *
 * Size-bound note (ACM-057): `comps.name` and `comp_builds.label` are still
 * free-form text with no shape to validate, but they had no length bound
 * either — an unbounded storage-abuse vector today, and unbounded
 * untrusted text served to third parties once a comp can render publicly
 * (ACM-021). Every write path that sets either column (`createComp`,
 * `updateComp`, `addBuildToComp`, `updateCompBuild`) parses the value
 * through `compNameSchema`/`compBuildLabelSchema` (`@/lib/comp-schema`)
 * before it reaches the query — the single shared source for both limits.
 */

export type CompRow = typeof comps.$inferSelect;
export type CompBuildRow = typeof compBuilds.$inferSelect;

/**
 * Bounds+trims an optional/nullable `comp_builds.label` through
 * `compBuildLabelSchema` (ACM-057). `undefined` means "field not supplied"
 * and is passed through untouched so callers can distinguish "leave
 * unchanged" from "clear it" (`null`); `null` is passed through as-is since
 * there is nothing to bound.
 */
function normalizeCompBuildLabel(label: string | null | undefined): string | null | undefined {
  if (label === undefined || label === null) {
    return label;
  }
  return compBuildLabelSchema.parse(label);
}

/** Loads a comp scoped to the current user's ownership, or throws. */
async function loadOwnedComp(userId: string, compId: string): Promise<CompRow> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(comps)
    .where(and(eq(comps.id, compId), eq(comps.userId, userId)))
    .limit(1);

  if (!row) {
    // Deliberately the same error whether the row does not exist at all or
    // belongs to another user — never leak which case it is (IDOR).
    throw new CompNotFoundError();
  }
  return row;
}

/** Loads a single comp_builds row scoped to a comp the caller owns, or throws. */
async function loadOwnedCompBuild(userId: string, compId: string, compBuildId: string): Promise<CompBuildRow> {
  await loadOwnedComp(userId, compId);

  const db = getDb();
  const [row] = await db
    .select()
    .from(compBuilds)
    .where(and(eq(compBuilds.id, compBuildId), eq(compBuilds.compId, compId)))
    .limit(1);

  if (!row) {
    throw new CompNotFoundError();
  }
  return row;
}

/** Lists every comp owned by the current user, most recently updated first. */
export async function listMyComps(): Promise<CompRow[]> {
  const session = await requireSession();
  const db = getDb();
  return db.select().from(comps).where(eq(comps.userId, session.user.id)).orderBy(comps.updatedAt);
}

/** Lists a comp's builds ordered by position. Ownership-checked. */
export async function listCompBuilds(compId: string): Promise<CompBuildRow[]> {
  const session = await requireSession();
  await loadOwnedComp(session.user.id, compId);

  const db = getDb();
  return db.select().from(compBuilds).where(eq(compBuilds.compId, compId)).orderBy(compBuilds.position);
}

export type CreateCompInput = {
  name: string;
  contentType?: string | null;
};

/** Creates a new comp owned by the current user (ACM-019 AC#1). */
export async function createComp(input: CreateCompInput): Promise<CompRow> {
  const session = await requireSession();
  checkWriteRateLimit(session.user.id);

  const name = compNameSchema.parse(input.name);

  const db = getDb();
  const [row] = await db
    .insert(comps)
    .values({
      userId: session.user.id,
      name,
      contentType: input.contentType ?? null,
      slug: generateSlug(name),
    })
    .returning();

  return row;
}

export type UpdateCompInput = {
  id: string;
  name?: string;
  contentType?: string | null;
};

/**
 * Updates a comp's name/contentType. The update statement itself also
 * filters by `userId` so a TOCTOU between the ownership read and the write
 * can never mutate a row the caller does not own (same pattern as
 * `updateBuild`).
 */
export async function updateComp(input: UpdateCompInput): Promise<CompRow> {
  const session = await requireSession();
  checkWriteRateLimit(session.user.id);

  await loadOwnedComp(session.user.id, input.id);

  const name = input.name !== undefined ? compNameSchema.parse(input.name) : undefined;

  const db = getDb();
  const [row] = await db
    .update(comps)
    .set({
      ...(name !== undefined ? { name } : {}),
      ...(input.contentType !== undefined ? { contentType: input.contentType } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(comps.id, input.id), eq(comps.userId, session.user.id)))
    .returning();

  if (!row) {
    throw new CompNotFoundError();
  }
  return row;
}

/** Hard-deletes a comp (and its comp_builds rows, via ON DELETE CASCADE). */
export async function deleteComp(id: string): Promise<void> {
  const session = await requireSession();
  checkWriteRateLimit(session.user.id);

  await loadOwnedComp(session.user.id, id);

  const db = getDb();
  const result = await db
    .delete(comps)
    .where(and(eq(comps.id, id), eq(comps.userId, session.user.id)))
    .returning({ id: comps.id });

  if (result.length === 0) {
    throw new CompNotFoundError();
  }
}

export type AddBuildToCompInput = {
  compId: string;
  buildId: string;
  label?: string | null;
  count?: number;
};

/**
 * Attaches a build to a comp at the next available position (ACM-019
 * AC#2). Requires the caller to own the comp AND (own the build OR the
 * build be public) — from the user's own library or public search.
 *
 * ACM-016 audit (MEDIUM): `comp_builds` has independent FKs to `comps.id`
 * and `builds.id` with no DB-level constraint tying them to the same
 * user_id, so this ownership check has to happen here, in the app layer,
 * before the insert — never trust a `buildId` the caller supplies without
 * verifying it.
 */
export async function addBuildToComp(input: AddBuildToCompInput): Promise<CompBuildRow> {
  const session = await requireSession();
  checkWriteRateLimit(session.user.id);

  const comp = await loadOwnedComp(session.user.id, input.compId);

  const db = getDb();
  const [build] = await db.select().from(builds).where(eq(builds.id, input.buildId)).limit(1);

  if (!build || (!build.isPublic && build.userId !== session.user.id)) {
    // Same "not found" shape for missing / private-not-owned — do not leak
    // existence of private builds belonging to other users (mirrors
    // `forkBuild`'s IDOR guard in builds.ts).
    throw new CompBuildRefNotFoundError();
  }

  const [{ maxPosition }] = await db
    .select({ maxPosition: max(compBuilds.position) })
    .from(compBuilds)
    .where(eq(compBuilds.compId, comp.id));

  const nextPosition = maxPosition === null ? 0 : maxPosition + 1;

  const [row] = await db
    .insert(compBuilds)
    .values({
      compId: comp.id,
      buildId: build.id,
      position: nextPosition,
      count: input.count ?? 1,
      label: normalizeCompBuildLabel(input.label) ?? null,
    })
    .returning();

  return row;
}

/** Removes a build from a comp. Ownership of the comp is required. */
export async function removeBuildFromComp(compId: string, compBuildId: string): Promise<void> {
  const session = await requireSession();
  checkWriteRateLimit(session.user.id);

  await loadOwnedCompBuild(session.user.id, compId, compBuildId);

  const db = getDb();
  const result = await db
    .delete(compBuilds)
    .where(and(eq(compBuilds.id, compBuildId), eq(compBuilds.compId, compId)))
    .returning({ id: compBuilds.id });

  if (result.length === 0) {
    throw new CompNotFoundError();
  }
}

export type UpdateCompBuildInput = {
  compId: string;
  compBuildId: string;
  label?: string | null;
  count?: number;
};

/**
 * Edits a comp_builds row's `label` (AC#5) and/or `count` (AC#4) in place.
 * Ownership of the parent comp is re-checked in the WHERE clause of the
 * update statement itself, not just in the preceding read.
 */
export async function updateCompBuild(input: UpdateCompBuildInput): Promise<CompBuildRow> {
  const session = await requireSession();
  checkWriteRateLimit(session.user.id);

  await loadOwnedCompBuild(session.user.id, input.compId, input.compBuildId);

  const label = normalizeCompBuildLabel(input.label);

  const db = getDb();
  const [row] = await db
    .update(compBuilds)
    .set({
      ...(label !== undefined ? { label } : {}),
      ...(input.count !== undefined ? { count: input.count } : {}),
    })
    .where(and(eq(compBuilds.id, input.compBuildId), eq(compBuilds.compId, input.compId)))
    .returning();

  if (!row) {
    throw new CompNotFoundError();
  }
  return row;
}

/**
 * Atomically reassigns positions for every comp_builds row of `compId`
 * according to `orderedCompBuildIds` (ACM-019 AC#3). `orderedCompBuildIds`
 * must be exactly a permutation of the comp's existing comp_builds row
 * ids — anything else is refused so a partial/malformed reorder can never
 * leave duplicate or gapped positions.
 *
 * ACM-016 review (MEDIUM): the unique index on (comp_id, position) is a
 * plain `CREATE UNIQUE INDEX`, which SQLite cannot make DEFERRABLE (only
 * inline `CREATE TABLE` constraints support that). A naive sequence of
 * per-row UPDATEs swapping two positions fails immediately on the first
 * statement because the target position is still held by another row.
 * Instead this uses a two-phase staged approach inside one transaction:
 * first every row in the comp is moved to a unique *negative* position
 * (guaranteed disjoint from any existing non-negative position), then a
 * second statement assigns the final positions from `orderedCompBuildIds`.
 * Each phase is a single UPDATE, so the unique index only has to hold at
 * the end of each statement, never mid-statement across two separate
 * UPDATEs touching the same target value.
 */
export async function reorderCompBuilds(compId: string, orderedCompBuildIds: string[]): Promise<CompBuildRow[]> {
  const session = await requireSession();
  checkWriteRateLimit(session.user.id);

  const comp = await loadOwnedComp(session.user.id, compId);

  const db = getDb();
  const existing = await db.select().from(compBuilds).where(eq(compBuilds.compId, comp.id));

  const existingIds = new Set(existing.map((row) => row.id));
  const uniqueOrderedIds = new Set(orderedCompBuildIds);
  const isExactPermutation =
    orderedCompBuildIds.length === existing.length &&
    uniqueOrderedIds.size === orderedCompBuildIds.length &&
    orderedCompBuildIds.every((id) => existingIds.has(id));

  if (!isExactPermutation) {
    throw new CompBuildReorderInvalidError();
  }

  db.transaction((tx) => {
    // Phase 1: move every row in this comp to a disjoint negative position
    // so no target value from phase 2 can already be held by another row.
    tx.run(sql`UPDATE ${compBuilds} SET position = -(position + 1) WHERE ${compBuilds.compId} = ${comp.id}`);

    // Phase 2: assign the caller-provided final ordering.
    const cases = orderedCompBuildIds.map((id, index) => sql`WHEN ${id} THEN ${index}`);
    tx.run(
      sql`UPDATE ${compBuilds} SET position = CASE id ${sql.join(cases, sql` `)} END WHERE ${compBuilds.compId} = ${comp.id}`,
    );
  });

  return db.select().from(compBuilds).where(eq(compBuilds.compId, comp.id)).orderBy(compBuilds.position);
}
