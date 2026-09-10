import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

import { getPublicBuildBySlug } from "@/lib/public-content";
import { loadOgFont } from "@/lib/og-font";
import { resolveOgIcons } from "@/lib/og-icons";

// Node.js runtime (the default — no `export const runtime = 'edge'` here).
// `getPublicBuildBySlug` goes through `getDb()` (better-sqlite3, a native
// Node addon) and cannot load on the Edge runtime (decision-031).
export const dynamic = "force-dynamic";

const WIDTH = 1200;
const HEIGHT = 630;
const OG_CACHE_CONTROL = "public, s-maxage=86400, stale-while-revalidate=604800";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

/**
 * `getPublicBuildBySlug` returns `null` for "no such slug", "private
 * build", and "content fails validation" alike (no existence oracle,
 * ACM-021). This route must preserve that: a `null` here is always a
 * plain 404, never an `ImageResponse`, so third parties cannot use this
 * endpoint's status code to distinguish those three cases either.
 */
export async function GET(_request: Request, { params }: RouteParams): Promise<Response> {
  const { slug } = await params;
  const build = await getPublicBuildBySlug(slug);

  if (!build) {
    return new NextResponse(null, { status: 404 });
  }

  const mainhandId = build.content.slots.mainhand?.itemId ?? null;
  const icons = await resolveOgIcons(
    mainhandId ? [{ key: "mainhand", type: "item", id: mainhandId }] : [],
  );
  const iconSrc = mainhandId ? icons.get("mainhand") : undefined;
  const fontData = await loadOgFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 64,
          backgroundColor: "#0f0f12",
          color: "#f5f5f5",
          fontFamily: "Noto Sans",
        }}
      >
        <div style={{ display: "flex", fontSize: 24, color: "#a1a1aa" }}>Albion Comp Maker</div>
        <div style={{ display: "flex", marginTop: 24, alignItems: "center", gap: 32 }}>
          {iconSrc && (
            // eslint-disable-next-line @next/next/no-img-element -- Satori requires a plain <img> with a resolved data: URI, not next/image.
            <img src={iconSrc} width={128} height={128} alt="" />
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 56, fontWeight: 700 }}>{build.name}</div>
            {build.role && <div style={{ display: "flex", fontSize: 28, color: "#a1a1aa" }}>{build.role}</div>}
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 24, color: "#a1a1aa" }}>
          by {build.authorName ?? "Unknown"}
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [{ name: "Noto Sans", data: fontData, weight: 400, style: "normal" }],
      headers: { "Cache-Control": OG_CACHE_CONTROL },
    },
  );
}
