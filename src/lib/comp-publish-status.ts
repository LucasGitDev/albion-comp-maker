import "server-only";

import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { builds, compBuilds, comps } from "@/db/schema";
import { parseBuildContent } from "@/lib/build-schema";
import type { CompPublishBlocker, CompPublishBlockerReason, CompPublishState } from "@/types/comp-publish-status";

/**
 * Owner-scoped diagnosis of why a comp's public link may not work
 * (ACM-066, decision-025). This is DELIBERATELY separate from
 * `src/lib/public-content.ts`: that module is read by anonymous public
 * routes and must never distinguish "not found" from "private" from
 * "invalid content" in its output (no existence oracle). This module is
 * the opposite — it is only ever called from an owner-scoped action
 * (`getCompPublishState` in `src/actions/comps.ts`) that already ran
 * `requireSession()` + `loadOwnedComp` before reaching here, so revealing
 * per-build diagnosis to the comp's own owner is safe: the owner already
 * knows every build id in their own comp (they added it via
 * `addBuildToComp`).
 *
 * Never exposes a blocking build's `content`/`theme_json` — only
 * `buildName` and enough metadata to explain the block and offer the
 * right action.
 *
 * The result shape itself (`CompPublishState`/`CompPublishBlocker`) lives
 * in `@/types/comp-publish-status`, a plain module with no `server-only`
 * import, so `"use client"` components can import the type without
 * pulling this server-only implementation into their bundle (see
 * `src/__tests__/server-only-boundary.test.ts`).
 */
export type { CompPublishBlocker, CompPublishBlockerReason, CompPublishState };

/**
 * Computes `CompPublishState` for a comp already known to belong to
 * `ownerUserId` (the caller must verify ownership before calling this —
 * see `getCompPublishState` in `src/actions/comps.ts`). Recomputes the
 * derived reachability rule from decision-015 directly, the same way
 * `getPublicCompBySlug` does, so the two never drift apart.
 */
export async function getCompPublishStatus(compId: string, ownerUserId: string): Promise<CompPublishState> {
  const db = getDb();

  const [comp] = await db.select().from(comps).where(eq(comps.id, compId)).limit(1);
  if (!comp) {
    // Caller already verified ownership; this is only reachable if the
    // comp was deleted concurrently.
    return { isPublic: false, isReachable: false, hasNoBuilds: true, blockers: [] };
  }

  const rows = await db
    .select({ compBuild: compBuilds, build: builds })
    .from(compBuilds)
    .innerJoin(builds, eq(compBuilds.buildId, builds.id))
    .where(eq(compBuilds.compId, compId))
    .orderBy(asc(compBuilds.position));

  const hasNoBuilds = rows.length === 0;
  const blockers: CompPublishBlocker[] = [];

  for (const { compBuild, build } of rows) {
    let reason: CompPublishBlockerReason | null = null;

    if (!build.isPublic) {
      reason = build.userId === ownerUserId ? "private-own" : "private-foreign";
    } else {
      const parsed = parseBuildContent(build.content);
      if (!parsed.ok) {
        reason = "invalid-content";
      }
    }

    if (reason) {
      blockers.push({
        compBuildId: compBuild.id,
        position: compBuild.position,
        buildId: build.id,
        buildName: build.name,
        reason,
        ownedByMe: build.userId === ownerUserId,
      });
    }
  }

  const derivedReachable = !hasNoBuilds && blockers.length === 0;
  const isReachable = comp.isPublic && derivedReachable;

  return {
    isPublic: comp.isPublic,
    isReachable,
    hasNoBuilds,
    blockers,
  };
}
