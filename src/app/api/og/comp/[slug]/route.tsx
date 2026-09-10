import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

import { getPublicCompBySlug } from "@/lib/public-content";
import { loadOgFont } from "@/lib/og-font";
import { resolveOgIcons } from "@/lib/og-icons";

// Node.js runtime (the default — no `export const runtime = 'edge'` here).
// `getPublicCompBySlug` goes through `getDb()` (better-sqlite3, a native
// Node addon) and cannot load on the Edge runtime (decision-030).
export const dynamic = "force-dynamic";

const WIDTH = 1200;
const HEIGHT = 630;
const OG_CACHE_CONTROL = "public, s-maxage=86400, stale-while-revalidate=604800";
// Bounded so the image never overflows its 630px height regardless of how
// many builds the comp actually has — matches the "simplified layout, not
// the full preview component" scope from ACM-022's description.
const MAX_ROWS = 6;

type RouteParams = {
  params: Promise<{ slug: string }>;
};

/**
 * `getPublicCompBySlug` returns `null` for "no such slug", "not shared",
 * and "has a private/invalid build" alike (decision-015/ACM-021 no
 * existence oracle). A `null` here is always a plain 404, never an
 * `ImageResponse`.
 */
export async function GET(_request: Request, { params }: RouteParams): Promise<Response> {
  const { slug } = await params;
  const comp = await getPublicCompBySlug(slug);

  if (!comp) {
    return new NextResponse(null, { status: 404 });
  }

  const rows = comp.entries.slice(0, MAX_ROWS);
  const iconRequests = rows.flatMap((entry) => {
    const mainhandId = entry.build.content.slots.mainhand?.itemId;
    return mainhandId ? [{ key: entry.compBuildId, type: "item" as const, id: mainhandId }] : [];
  });
  const icons = await resolveOgIcons(iconRequests);
  const fontData = await loadOgFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          padding: 56,
          backgroundColor: "#0f0f12",
          color: "#f5f5f5",
          fontFamily: "Noto Sans",
        }}
      >
        <div style={{ display: "flex", fontSize: 22, color: "#a1a1aa" }}>Albion Comp Maker</div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 52, fontWeight: 700 }}>{comp.name}</div>
        <div style={{ display: "flex", marginTop: 8, fontSize: 24, color: "#a1a1aa" }}>
          by {comp.authorName ?? "Unknown"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 32, gap: 16 }}>
          {rows.map((entry) => {
            const iconSrc = icons.get(entry.compBuildId);
            return (
              <div key={entry.compBuildId} style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {iconSrc && (
                  // eslint-disable-next-line @next/next/no-img-element -- Satori requires a plain <img> with a resolved data: URI, not next/image.
                  <img src={iconSrc} width={56} height={56} alt="" />
                )}
                <div style={{ display: "flex", fontSize: 32 }}>{entry.build.name}</div>
              </div>
            );
          })}
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
