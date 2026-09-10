import "server-only";

import { and, asc, count, eq } from "drizzle-orm";

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
 */
export async function getPublicBuildBySlug(slug: string): Promise<PublicBuild | null> {
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
}

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
 * Because a single private build must still make the WHOLE comp
 * unreachable rather than silently dropping that one slot, we compare the
 * WHERE-filtered row count against the true attached-build count: any
 * mismatch means at least one attached build failed the `is_public` WHERE
 * and the comp is unreachable.
 */
export async function getPublicCompBySlug(slug: string): Promise<PublicComp | null> {
  const db = getDb();
  const [row] = await db
    .select({ comp: comps, authorName: users.name })
    .from(comps)
    .innerJoin(users, eq(comps.userId, users.id))
    .where(and(eq(comps.slug, slug), eq(comps.isPublic, true)))
    .limit(1);
  const comp = row?.comp;

  if (!comp) {
    return null;
  }

  const [{ totalCount }] = await db
    .select({ totalCount: count() })
    .from(compBuilds)
    .where(eq(compBuilds.compId, comp.id));

  if (totalCount === 0) {
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

  if (rows.length !== totalCount) {
    return null;
  }

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
}
