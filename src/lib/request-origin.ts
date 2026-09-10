import "server-only";

import { headers } from "next/headers";

/**
 * Derives the current request's origin (scheme + host) from the incoming
 * `Host`/`X-Forwarded-*` headers, for building absolute URLs inside
 * `generateMetadata` (e.g. `og:image` — ACM-022/AC#4). Next's `Metadata`
 * API has no request object; `headers()` is the supported dynamic API for
 * this inside `generateMetadata` (mirrors `getRequestLocale`'s use of
 * `cookies()` for the same reason).
 *
 * `X-Forwarded-Host`/`X-Forwarded-Proto` are only trusted the same way the
 * rest of the app already trusts `X-Forwarded-For` for the rate limiter
 * (decision-016): this app is assumed to sit behind a single trusted
 * reverse proxy that sets them, not to be reachable directly from the
 * internet.
 */
export async function getRequestOrigin(): Promise<string> {
  const store = await headers();
  const host = store.get("x-forwarded-host") ?? store.get("host") ?? "localhost:3000";
  const proto = store.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
