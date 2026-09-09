import { NextResponse } from "next/server";

import { auth } from "@/auth/config";
import { getDb } from "@/db/client";
import { gcOrphanedBackgroundImages } from "@/lib/gc-background-images";

/**
 * On-demand GC sweep (ACM-081, decision-018 follow-up). Requires a session
 * and is scoped to the caller's own `background_images` rows — there is no
 * admin role in this app (see `auth/config.ts`), so "owner" is the only
 * authorization this endpoint needs or grants.
 */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const result = await gcOrphanedBackgroundImages(db, session.user.id);

  return NextResponse.json(result, { status: 200 });
}
