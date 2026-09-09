import "server-only";

import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { builds, compBuilds, comps } from "@/db/schema";
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
  const [row] = await db.select().from(builds).where(eq(builds.slug, slug)).limit(1);

  if (!row || !row.isPublic) {
    return null;
  }

  const parsed = parseBuildContent(row.content);
  if (!parsed.ok) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    slug: row.slug,
    content: parsed.data,
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
 */
export async function getPublicCompBySlug(slug: string): Promise<PublicComp | null> {
  const db = getDb();
  const [comp] = await db.select().from(comps).where(eq(comps.slug, slug)).limit(1);

  if (!comp || !comp.isPublic) {
    return null;
  }

  const rows = await db
    .select({ compBuild: compBuilds, build: builds })
    .from(compBuilds)
    .innerJoin(builds, eq(compBuilds.buildId, builds.id))
    .where(eq(compBuilds.compId, comp.id))
    .orderBy(asc(compBuilds.position));

  if (rows.length === 0) {
    return null;
  }

  const entries: PublicCompBuildEntry[] = [];
  for (const { compBuild, build } of rows) {
    if (!build.isPublic) {
      return null;
    }

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
      },
    });
  }

  return {
    id: comp.id,
    name: comp.name,
    slug: comp.slug,
    contentType: comp.contentType,
    entries,
  };
}
