import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { listMyBuilds } from "@/actions/builds";
import { CompNotFoundError } from "@/actions/comp-errors";
import { getComp, getCompPublishState, listCompBuildsDetailed } from "@/actions/comps";
import type { CompBuildEntry, MyBuildOption } from "@/components/comp/CompBuildsManager";
import { CompBuildsManager } from "@/components/comp/CompBuildsManager";
import { CompHeader } from "@/components/comp/CompHeader";
import { CompShareStatus } from "@/components/comp/CompShareStatus";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Owner-only detail page for a single comp: its builds (ACM-098) and its
 * public-share status (ACM-066). `getCompPublishState`/`getComp`/
 * `listCompBuildsDetailed`/`listMyBuilds` each call `requireSession()` +
 * their own ownership check, so a non-owner (or unauthenticated visitor, if
 * `src/proxy.ts`'s matcher ever drifts) gets the same `CompNotFoundError`
 * as a nonexistent id (AC#7) — this route never distinguishes those cases.
 *
 * `listMyBuilds` (not scoped to the comp) is loaded up front, not lazily on
 * dialog open, so `AddBuildDialog` never needs its own loading state — an
 * owner's build library is small enough that this is a non-issue, and it
 * keeps the "add build" flow a single client round-trip (`addBuildToComp`)
 * instead of two.
 */
export default async function CompDetailPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;

  let state: Awaited<ReturnType<typeof getCompPublishState>>;
  let name: string;
  let slug: string;
  let compBuilds: Awaited<ReturnType<typeof listCompBuildsDetailed>>;
  let myBuilds: Awaited<ReturnType<typeof listMyBuilds>>;
  try {
    [state, { name, slug }, compBuilds, myBuilds] = await Promise.all([
      getCompPublishState(id),
      getComp(id),
      listCompBuildsDetailed(id),
      listMyBuilds(),
    ]);
  } catch (error) {
    if (error instanceof CompNotFoundError) {
      notFound();
    }
    redirect("/");
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const publicOrigin = `${protocol}://${host}`;

  const entries: CompBuildEntry[] = compBuilds.map((row) => ({
    compBuildId: row.id,
    position: row.position,
    count: row.count,
    label: row.label,
    build: row.build,
  }));

  const buildOptions: MyBuildOption[] = myBuilds.map((build) => ({
    id: build.id,
    name: build.name,
    role: build.role,
    slug: build.slug,
    isPublic: build.isPublic,
  }));

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-8 outline-none">
      <CompHeader compId={id} initialName={name} />
      <CompBuildsManager compId={id} compName={name} initialEntries={entries} myBuilds={buildOptions} />
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">Compartilhar comp</h2>
        <CompShareStatus compId={id} slug={slug} publicOrigin={publicOrigin} initialState={state} />
      </div>
    </main>
  );
}
