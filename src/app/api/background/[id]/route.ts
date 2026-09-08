import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth/config";
import { getDb } from "@/db/client";
import { backgroundImages, builds } from "@/db/schema";
import { extractBackgroundImageId } from "@/lib/theme-schema";
import { UnsupportedImageError, readBackgroundFile } from "@/lib/uploads";
import { checkPublicReadRateLimit, clientKeyFromHeaders } from "@/lib/public-read-rate-limit";

/** nanoid's own alphabet, matching the id `background_images.id`/`nanoid()` produces. */
const ID_PATTERN = /^[A-Za-z0-9_-]{21}$/;
const CACHE_CONTROL = "private, max-age=31536000, immutable";

/**
 * Whether `imageId` is referenced by the `theme_json` of some `is_public`
 * build. Same no-existence-oracle spirit as `public-content.ts`: a private
 * build's background must 404 for anyone but its owner, and this check must
 * not distinguish "no such build" from "build is private" from "build
 * doesn't reference this image" — all three are just "not authorized".
 *
 * There is no FK/index from `background_images` to `builds.theme_json` (it
 * is a JSON string), so this scans public builds. Acceptable at this
 * project's scale (decision-018); a future task can add a dedicated join
 * table if `builds` grows large enough for this to matter.
 */
async function isReferencedByAPublicBuild(imageId: string): Promise<boolean> {
  const db = getDb();
  const publicBuilds = await db
    .select({ themeJson: builds.themeJson })
    .from(builds)
    .where(eq(builds.isPublic, true));

  return publicBuilds.some((row) => extractBackgroundImageId(row.themeJson) === imageId);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const session = await auth();

  if (!session?.user?.id) {
    // Public/anonymous read path — rate limited per decision-016, same as
    // the other public-read routes.
    const key = clientKeyFromHeaders(request.headers);
    if (!checkPublicReadRateLimit(key)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
  }

  const db = getDb();
  const [row] = await db.select().from(backgroundImages).where(eq(backgroundImages.id, id)).limit(1);

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = session?.user?.id === row.userId;
  if (!isOwner && !(await isReferencedByAPublicBuild(id))) {
    // Same 404 whether the row doesn't exist or exists-but-unauthorized —
    // never leak which case it is.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let fileBuffer: Buffer;
  try {
    fileBuffer = await readBackgroundFile(row.fileName);
  } catch (error) {
    if (error instanceof UnsupportedImageError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw error;
  }

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": CACHE_CONTROL,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
