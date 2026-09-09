"use server";

import { and, eq, max, sql, sum } from "drizzle-orm";
import { z } from "zod";

import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { builds, compBuilds, comps } from "@/db/schema";
import { getCompPublishStatus } from "@/lib/comp-publish-status";
import { compBuildLabelSchema, compNameSchema } from "@/lib/comp-schema";
import { checkWriteRateLimit, RateLimitError } from "@/lib/rate-limit";
import type { CompPublishState } from "@/types/comp-publish-status";
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

export type CompListItem = {
  comp: CompRow;
  buildCount: number;
  privateBuildCount: number;
  /**
   * Coarse reachability for the `/comps` list badge (ACM-066): the SQL
   * aggregate rule from decision-015 (has builds, none private) AND'd with
   * `comp.is_public`. Does NOT run `parseBuildContent` on every build's
   * content (that's a per-row JS check, not expressible as a cheap
   * aggregate) — a comp with invalid-content builds can read `true` here
   * and still 404 publicly. The detail page's `getCompPublishState` is the
   * source of truth; this is a best-effort summary for the list view only.
   */
  isReachable: boolean;
};

/**
 * Lists every comp owned by the current user with a share-status summary
 * for the `/comps` list badge (ACM-066). Uses a single aggregated query
 * (one row per comp, `LEFT JOIN` + `GROUP BY`) instead of N+1 queries per
 * comp — the per-blocker detail only exists on `/comps/[id]`
 * (`getCompPublishState`).
 */
export async function listMyCompsWithStatus(): Promise<CompListItem[]> {
  const session = await requireSession();
  const db = getDb();

  const rows = await db
    .select({
      comp: comps,
      buildCount: sql<number>`COUNT(${compBuilds.id})`,
      privateBuildCount: sum(sql`CASE WHEN ${builds.isPublic} = 0 THEN 1 ELSE 0 END`),
    })
    .from(comps)
    .leftJoin(compBuilds, eq(compBuilds.compId, comps.id))
    .leftJoin(builds, eq(builds.id, compBuilds.buildId))
    .where(eq(comps.userId, session.user.id))
    .groupBy(comps.id)
    .orderBy(comps.updatedAt);

  return rows.map((row) => {
    const buildCount = Number(row.buildCount);
    const privateBuildCount = Number(row.privateBuildCount ?? 0);
    return {
      comp: row.comp,
      buildCount,
      privateBuildCount,
      isReachable: row.comp.isPublic && buildCount > 0 && privateBuildCount === 0,
    };
  });
}

/** Loads a single comp owned by the current user (e.g. for its slug/name). */
export async function getComp(id: string): Promise<CompRow> {
  const session = await requireSession();
  return loadOwnedComp(session.user.id, id);
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

export type CreateCompActionResult = { ok: true; compId: string } | { ok: false; error: string };

/**
 * Serializable wrapper around `createComp` for the `/comp/new` form
 * (ACM-097). `createComp` throws on every failure path (`RateLimitError`,
 * `compNameSchema` via `z.ZodError`), which is fine for existing callers
 * that only ever call it from other Server Actions/tests, but a Client
 * Component driving a form needs a plain, serializable value to render an
 * inline error under the field instead of an unhandled rejection.
 *
 * Returns only `{ compId }`, not the full `CompRow` — the caller
 * (`NewCompForm`) only needs the id to navigate, and there is no reason to
 * serialize `Date`/other fields the UI never reads across the Server
 * Action boundary.
 *
 * Deliberately does NOT call `redirect()` here (decision-027): `redirect()`
 * works by throwing `NEXT_REDIRECT`, which the `catch` below would swallow
 * as a generic failure. Navigation on success is done client-side by the
 * caller via `router.push` instead.
 */
export async function createCompAction(input: { name: string }): Promise<CreateCompActionResult> {
  try {
    const row = await createComp(input);
    return { ok: true, compId: row.id };
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { ok: false, error: "Você criou comps demais em pouco tempo. Tente de novo em instantes." };
    }
    if (error instanceof z.ZodError) {
      return { ok: false, error: error.issues[0]?.message ?? "Nome inválido." };
    }
    return { ok: false, error: "Não foi possível criar a comp." };
  }
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

/**
 * Flips `isPublic` on an owned comp (ACM-066, decision-025). Mirrors
 * `toggleBuildPublic` in `src/actions/builds.ts`: the update statement
 * itself also filters by `userId` so a TOCTOU between the ownership read
 * and the write can never flip a comp the caller does not own.
 *
 * This flag is an AND-gate on top of the derived rule from decision-015 —
 * flipping it to `true` here does NOT by itself make any build readable
 * publicly; `getPublicCompBySlug` still requires every referenced build to
 * be `is_public` with valid content.
 */
export async function toggleCompPublic(id: string): Promise<CompRow> {
  const session = await requireSession();
  checkWriteRateLimit(session.user.id);

  const current = await loadOwnedComp(session.user.id, id);

  const db = getDb();
  const [row] = await db
    .update(comps)
    .set({ isPublic: !current.isPublic, updatedAt: new Date() })
    .where(and(eq(comps.id, id), eq(comps.userId, session.user.id)))
    .returning();

  if (!row) {
    throw new CompNotFoundError();
  }
  return row;
}

/**
 * Owner-scoped diagnosis of the comp's public-share status (ACM-066,
 * decision-025). `requireSession()` + `loadOwnedComp` run BEFORE any of
 * the per-build detail in `getCompPublishStatus` is read — a non-owner
 * gets the same `CompNotFoundError` as an unowned/nonexistent id, never a
 * partial or distinguishable response (IDOR).
 */
export async function getCompPublishState(compId: string): Promise<CompPublishState> {
  const session = await requireSession();
  await loadOwnedComp(session.user.id, compId);

  return getCompPublishStatus(compId, session.user.id);
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
