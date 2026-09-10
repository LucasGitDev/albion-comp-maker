import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BuildCard } from "@/components/build-card/BuildCard";
import { GuestCTABanner } from "@/components/layout/GuestCTABanner";
import { getPublicBuildBySlug } from "@/lib/public-content";
import { buildCardLookupsFor } from "@/lib/build-card-lookups";
import { getRequestLocale } from "@/lib/i18n/server-locale";
import { getRequestOrigin } from "@/lib/request-origin";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * `og:image` points at the ACM-022 Satori route, not this page's own
 * render — Discord's unfurl bot cannot execute the client bundle, so the
 * OG image is a separate, purpose-built PNG. Only set on the success path:
 * `getPublicBuildBySlug` returning `null` here means the page itself calls
 * `notFound()` below, so there is nothing to advertise.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const build = await getPublicBuildBySlug(id);

  if (!build) {
    return {};
  }

  const origin = await getRequestOrigin();
  const title = build.name;
  const description = `Build by ${build.authorName ?? "Unknown"} — Albion Comp Maker`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`${origin}/api/og/build/${build.slug}`],
    },
  };
}

/**
 * Public, server-rendered read of a single build by its immutable slug
 * (ACM-021, RF-9). No client JS is required to see the card: `BuildCard`
 * is a pure, prop-driven component (ACM-013) and every lookup it needs is
 * resolved server-side before this returns.
 *
 * `getPublicBuildBySlug` collapses "no such slug", "slug belongs to a
 * private build", and "slug's content fails validation" into the same
 * `null` — this route must not (and does not) try to tell those apart.
 * `notFound()` renders Next's standard 404, never a distinguishable
 * response (decision-013 / ACM-021 security requirement: no existence
 * oracle for third parties).
 *
 * Not `/[locale]/build/[slug]` — no locale-scoped routes (ACM-023 rejected
 * that approach); the cookie-based toggle from ACM-093 resolves names for
 * this route without one.
 */
export default async function PublicBuildPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const build = await getPublicBuildBySlug(id);

  if (!build) {
    notFound();
  }

  const locale = await getRequestLocale();
  const lookups = await buildCardLookupsFor(build.content, locale);
  // Awaited here (not rendered as `<GuestCTABanner />` JSX) because this
  // page is exercised in tests via plain `react-dom`, which — unlike
  // Next.js's RSC runtime — cannot render an async component nested inside
  // another element (ACM-117).
  const guestCta = await GuestCTABanner({ callbackPath: `/build/${id}` });

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-6 p-8 outline-none">
      <BuildCard state={build.content} layout="vertical" {...lookups} />
      {guestCta}
    </main>
  );
}
