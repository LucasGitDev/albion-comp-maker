import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { BuildNotFoundError } from "@/actions/build-errors";
import { getBuild } from "@/actions/builds";
import { BuildShareStatus } from "@/components/build/BuildShareStatus";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Owner-only detail page for a single build's share/slug management
 * (ACM-067, split off ACM-021 AC#4). `getBuild` calls `requireSession()` +
 * ownership-scoped `loadOwnedBuild` itself, so a non-owner (or
 * unauthenticated visitor, if `src/proxy.ts`'s matcher ever drifts) gets
 * the same `BuildNotFoundError` as a nonexistent id — this route never
 * distinguishes those cases.
 */
export default async function BuildDetailPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;

  let build: Awaited<ReturnType<typeof getBuild>>;
  try {
    build = await getBuild(id);
  } catch (error) {
    if (error instanceof BuildNotFoundError) {
      notFound();
    }
    redirect("/");
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const publicOrigin = `${protocol}://${host}`;

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8 outline-none">
      <h1 className="text-xl font-semibold text-foreground">Compartilhar build</h1>
      <BuildShareStatus buildId={id} slug={build.slug} isPublic={build.isPublic} publicOrigin={publicOrigin} />
    </main>
  );
}
