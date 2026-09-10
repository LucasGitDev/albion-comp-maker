import "server-only";

/**
 * Shared icon-resolution helper for the ACM-022 OG image routes
 * (`/api/og/build/[slug]`, `/api/og/comp/[slug]`).
 *
 * Satori (via `next/og`'s `ImageResponse`) has no network stack of its
 * own — it cannot resolve an `<img src="https://...">` the way a browser
 * does. Every icon must already be a `data:` URI (or ArrayBuffer) by the
 * time it's handed to the JSX tree. This mirrors `src/app/api/icon/route.ts`
 * (ACM-006/007)'s upstream contract — same `ID_PATTERN` allow-list, same
 * upstream base URL — but resolves to a base64 `data:` URI instead of
 * proxying bytes through a Response, and is deliberately a separate code
 * path from `/api/icon` (decision-031): Satori cannot consume a same-origin
 * proxied `<img>` URL, so a second server-side fetch is required.
 */

const ID_PATTERN = /^[A-Z0-9_@]+$/;
const RENDER_BASE_URL = "https://render.albiononline.com/v1";

// 1x1 transparent PNG data URI — same fallback bytes as
// `api/icon/route.ts`'s `fallbackResponse`, so a bad/slow upstream never
// fails the whole OG image render for one missing icon.
export const TRANSPARENT_PNG_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=";

export type OgIconType = "item" | "spell";

/**
 * Resolves one icon id to a base64 `data:` URI. Never throws — any
 * invalid id, non-OK upstream response, or network failure resolves to
 * the transparent-PNG fallback so a single bad icon cannot 500 the whole
 * OG image route.
 */
export async function resolveOgIconDataUri(type: OgIconType, id: string): Promise<string> {
  if (!ID_PATTERN.test(id)) {
    return TRANSPARENT_PNG_DATA_URI;
  }

  const upstreamUrl =
    type === "item" ? `${RENDER_BASE_URL}/item/${id}.png?quality=1` : `${RENDER_BASE_URL}/spell/${id}.png`;

  try {
    const response = await fetch(upstreamUrl);
    if (!response.ok) {
      return TRANSPARENT_PNG_DATA_URI;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch {
    return TRANSPARENT_PNG_DATA_URI;
  }
}

/**
 * Resolves a bounded set of icons in parallel. `entries` should be exactly
 * the icons a given OG image actually renders (one weapon/role icon per
 * build row) — never the full item catalogue — so this stays a small,
 * bounded fan-out per request.
 */
export async function resolveOgIcons(
  entries: readonly { key: string; type: OgIconType; id: string }[],
): Promise<Map<string, string>> {
  const resolved = await Promise.all(
    entries.map(async (entry) => [entry.key, await resolveOgIconDataUri(entry.type, entry.id)] as const),
  );
  return new Map(resolved);
}
