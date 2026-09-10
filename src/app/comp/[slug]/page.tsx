import { notFound } from "next/navigation";

import { BuildCard } from "@/components/build-card/BuildCard";
import { CompExportView } from "@/components/comp/CompExportView";
import { GuestCTABanner } from "@/components/layout/GuestCTABanner";
import { getPublicCompBySlug } from "@/lib/public-content";
import { buildCardLookupsFor } from "@/lib/build-card-lookups";
import { getRequestLocale } from "@/lib/i18n/server-locale";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Public, server-rendered read of a comp by its immutable slug (ACM-021,
 * RF-9). Entries render in `comp_builds.position` order (ACM-019's explicit
 * ordering column — `getPublicCompBySlug` already sorts by it; never rely
 * on array/insertion order here).
 *
 * `getPublicCompBySlug` returns `null` for a nonexistent slug, a comp with
 * no builds, AND a comp where any single referenced build is private or
 * fails content validation (decision-015): there is no partial render that
 * would let a caller infer "there's a hidden build in here". `notFound()`
 * is the only outcome for all of those — no existence oracle.
 *
 * `comp.name` / entry `label` are user-controlled free text (length-bounded
 * by ACM-057) rendered as plain JSX text nodes below, never through
 * `dangerouslySetInnerHTML` or interpolated into a `style`/URL attribute.
 *
 * Not `/[locale]/comp/[slug]` — same i18n note as the build page.
 */
export default async function PublicCompPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { slug } = await params;
  const comp = await getPublicCompBySlug(slug);

  if (!comp) {
    notFound();
  }

  const locale = await getRequestLocale();
  // Awaited here (not rendered as `<GuestCTABanner />` JSX) — see the same
  // note in `/build/[id]/page.tsx` (ACM-117).
  const guestCta = await GuestCTABanner({ callbackPath: `/comp/${slug}` });

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-8 outline-none">
      <h1 className="text-xl font-semibold text-foreground">{comp.name}</h1>
      <CompExportView
        compName={comp.name}
        entries={comp.entries.map((entry) => ({
          compBuildId: entry.compBuildId,
          buildName: entry.label || entry.build.content.name,
        }))}
      >
        <div className="flex flex-wrap gap-6">
          {await Promise.all(
            comp.entries.map(async (entry) => {
              const lookups = await buildCardLookupsFor(entry.build.content, locale);
              return (
                <div key={entry.compBuildId} className="flex flex-col gap-2">
                  {entry.label && (
                    <span className="text-sm font-medium text-foreground/80">{entry.label}</span>
                  )}
                  <BuildCard
                    state={entry.build.content}
                    layout="grid"
                    captureId={`capture-root-${entry.compBuildId}`}
                    {...lookups}
                  />
                  {entry.count > 1 && (
                    <span className="text-xs text-foreground/60">x{entry.count}</span>
                  )}
                </div>
              );
            }),
          )}
        </div>
      </CompExportView>
      {guestCta}
    </main>
  );
}
