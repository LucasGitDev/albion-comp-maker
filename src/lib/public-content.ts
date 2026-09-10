import "server-only";

import { and, asc, eq, exists, notExists, sql } from "drizzle-orm";
import { cache } from "react";

import { getDb } from "@/db/client";
import { builds, compBuilds, comps, users } from "@/db/schema";
import { parseBuildContent } from "@/lib/build-schema";
import type { BuildState } from "@/types/build";

/**
 * Read-only data access for the public (third-party-facing) SSR routes
 * (ACM-021, `src/app/build/[slug]` and `src/app/comp/[slug]`). Deliberately
 * separate from `src/actions/builds.ts`/`comps.ts`: those are owner-scoped
 * mutations/reads gated by `requireSession()`, this module is anonymous
 * reads gated by `is_public` instead of `userId`. Nothing here mutates.
 *
 * Every lookup here returns `null` for "not found", "exists but private",
 * AND "exists but its content fails validation" — the caller (the page)
 * turns `null` into `notFound()`. This is the same no-existence-oracle
 * property `BuildNotFoundError`/`CompNotFoundError` enforce on the owner
 * side (see `loadOwnedBuild`/`loadOwnedComp`): a third party must never be
 * able to distinguish "no such slug" from "that slug is private" from
 * "that slug's content is corrupt" by the shape of the response.
 */

export type PublicBuild = {
  id: string;
  name: string;
  role: string | null;
  slug: string;
  content: BuildState;
  /**
   * Owning user's display name (`users.name`), for attribution surfaces
   * like the ACM-022 OG image. `null` when the account has no `name` set
   * (Auth.js does not require one from every provider) — callers must
   * render an "Unknown" fallback, never assume non-null.
   */
  authorName: string | null;
};

/**
 * Loads a build by its immutable slug, but ONLY if it is `is_public` and
 * its stored `content` passes `parseBuildContent` (decision-013's tolerant
 * read). A private build, a nonexistent slug, and a public build with
 * unparseable/legacy content all resolve to `null` here — the page layer
 * cannot tell them apart, by design (see module doc above).
 *
 * Wrapped in React's `cache()` so a page component and its `generateMetadata`
 * (both invoked per-request during the same render, e.g. ACM-022's OG image
 * routes) share one DB round-trip instead of querying twice.
 */
export const getPublicBuildBySlug = cache(async (slug: string): Promise<PublicBuild | null> => {
  const db = getDb();
  const [row] = await db
    .select({ build: builds, authorName: users.name })
    .from(builds)
    .innerJoin(users, eq(builds.userId, users.id))
    .where(and(eq(builds.slug, slug), eq(builds.isPublic, true)))
    .limit(1);

  if (!row) {
    return null;
  }

  const parsed = parseBuildContent(row.build.content);
  if (!parsed.ok) {
    return null;
  }

  return {
    id: row.build.id,
    name: row.build.name,
    role: row.build.role,
    slug: row.build.slug,
    content: parsed.data,
    authorName: row.authorName,
  };
});

export type PublicCompBuildEntry = {
  compBuildId: string;
  position: number;
  count: number;
  label: string | null;
  build: PublicBuild;
};

export type PublicComp = {
  id: string;
  name: string;
  slug: string;
  contentType: string | null;
  /** Comp owner's display name — see `PublicBuild.authorName` for the null contract. */
  authorName: string | null;
  entries: PublicCompBuildEntry[];
};

/**
 * Loads a comp by its immutable slug. Reachability is the AND of two
 * independent conditions (ACM-066, decision-025):
 *
 * 1. `comps.is_public` — an explicit, dono-controlled "intent to share"
 *    flag. It only ever restricts, never widens, reachability.
 * 2. The derived rule from decision-015: the comp has at least one build
 *    AND every `comp_builds` row's referenced build is itself `is_public`
 *    with content that passes `parseBuildContent`.
 *
 * Any single private or invalid-content build anywhere in the comp makes
 * the WHOLE comp unreachable — never a partial render that silently drops
 * the offending slot, which would leak "this comp has N builds, one
 * hidden". Likewise, `is_public = false` alone is enough to return `null`
 * regardless of the state of the comp's builds.
 *
 * `entries` is ordered by `comp_builds.position` (ACM-019), never
 * insertion order.
 *
 * `builds.is_public` lives in the join's WHERE clause (not a post-fetch JS
 * filter), matching the mutation-side ownership predicates (ACM-018/019).
 * The all-or-nothing invariant itself is expressed in SQL, not JS: the comp
 * lookup's WHERE requires `EXISTS` at least one attached `comp_builds` row
 * (non-empty comp) AND `NOT EXISTS` any attached row whose build fails the
 * `is_public` test (correlated subquery-in-a-subquery — no attached build
 * may be private or missing). If the comp row is returned at all, every one
 * of its attached builds is guaranteed public, so the second query's join
 * can never return a partial row set — there is nothing left to compare.
 *
 * Wrapped in React's `cache()` so a page component and its `generateMetadata`
 * (both invoked per-request during the same render, e.g. ACM-022's OG image
 * routes) share one DB round-trip instead of querying twice.
 */
export const getPublicCompBySlug = cache(async (slug: string): Promise<PublicComp | null> => {
  const db = getDb();

  const hasAttachedBuilds = exists(
    db.select({ n: sql`1` }).from(compBuilds).where(eq(compBuilds.compId, comps.id)),
  );

  const noNonPublicAttachedBuild = notExists(
    db
      .select({ n: sql`1` })
      .from(compBuilds)
      .where(
        and(
          eq(compBuilds.compId, comps.id),
          notExists(
            db
              .select({ n: sql`1` })
              .from(builds)
              .where(and(eq(builds.id, compBuilds.buildId), eq(builds.isPublic, true))),
          ),
        ),
      ),
  );

  const [row] = await db
    .select({ comp: comps, authorName: users.name })
    .from(comps)
    .innerJoin(users, eq(comps.userId, users.id))
    .where(
      and(eq(comps.slug, slug), eq(comps.isPublic, true), hasAttachedBuilds, noNonPublicAttachedBuild),
    )
    .limit(1);
  const comp = row?.comp;

  if (!comp) {
    return null;
  }

  const rows = await db
    .select({ compBuild: compBuilds, build: builds, buildAuthorName: users.name })
    .from(compBuilds)
    .innerJoin(
      builds,
      and(eq(compBuilds.buildId, builds.id), eq(builds.isPublic, true)),
    )
    .innerJoin(users, eq(builds.userId, users.id))
    .where(eq(compBuilds.compId, comp.id))
    .orderBy(asc(compBuilds.position));

  const entries: PublicCompBuildEntry[] = [];
  for (const { compBuild, build, buildAuthorName } of rows) {
    const parsed = parseBuildContent(build.content);
    if (!parsed.ok) {
      return null;
    }

    entries.push({
      compBuildId: compBuild.id,
      position: compBuild.position,
      count: compBuild.count,
      label: compBuild.label,
      build: {
        id: build.id,
        name: build.name,
        role: build.role,
        slug: build.slug,
        content: parsed.data,
        authorName: buildAuthorName,
      },
    });
  }

  return {
    id: comp.id,
    name: comp.name,
    slug: comp.slug,
    contentType: comp.contentType,
    authorName: row.authorName,
    entries,
  };
});
