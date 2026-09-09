import "server-only";

import { eq, lt } from "drizzle-orm";

import type { AppDatabase } from "@/db/client";
import { backgroundImages, builds } from "@/db/schema";
import { deleteBackgroundFile } from "@/lib/uploads";
import { extractBackgroundImageId } from "@/lib/theme-schema";

/**
 * Grace window (decision-018 follow-up, ACM-081): a `background_images` row
 * younger than this is never GC'd, even if unreferenced — a build actively
 * being edited but not yet saved must never lose its background out from
 * under the user.
 */
export const GC_GRACE_WINDOW_MS = 60 * 60 * 1000;

export type GcResult = {
  deletedCount: number;
};

/**
 * Deletes `background_images` rows (and their on-disk files) that are (a)
 * older than the grace window and (b) not referenced by any build's
 * `theme_json.background.imageId` — public or private, since a private
 * build's background must survive a sweep just as much as a public one's.
 *
 * When `userId` is given, the sweep is scoped to that user's own rows only
 * (used for the on-demand sweep in `POST /api/background`, ahead of the
 * per-user quota check). Omitted, it sweeps every user's rows (used by the
 * standalone `GET /api/background/gc` endpoint).
 *
 * There is no FK/index from `background_images` to `builds.theme_json` (it
 * is a JSON string, see `[id]/route.ts`'s `isReferencedByAPublicBuild`), so
 * this scans every build's theme once per sweep — acceptable at this
 * project's scale (decision-018).
 */
export async function gcOrphanedBackgroundImages(db: AppDatabase, userId?: string): Promise<GcResult> {
  const cutoff = new Date(Date.now() - GC_GRACE_WINDOW_MS);

  const eligibleRows = await db
    .select({ id: backgroundImages.id, fileName: backgroundImages.fileName, createdAt: backgroundImages.createdAt })
    .from(backgroundImages)
    .where(userId ? eq(backgroundImages.userId, userId) : lt(backgroundImages.createdAt, cutoff));

  const rowsPastGrace = eligibleRows.filter((row) => row.createdAt.getTime() < cutoff.getTime());
  if (rowsPastGrace.length === 0) {
    return { deletedCount: 0 };
  }

  const allBuilds = await db.select({ themeJson: builds.themeJson }).from(builds);
  const referencedIds = new Set<string>();
  for (const build of allBuilds) {
    const imageId = extractBackgroundImageId(build.themeJson);
    if (imageId) referencedIds.add(imageId);
  }

  const orphaned = rowsPastGrace.filter((row) => !referencedIds.has(row.id));

  for (const row of orphaned) {
    await deleteBackgroundFile(row.fileName);
    await db.delete(backgroundImages).where(eq(backgroundImages.id, row.id));
  }

  return { deletedCount: orphaned.length };
}
