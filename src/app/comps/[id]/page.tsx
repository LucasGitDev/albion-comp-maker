import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { CompNotFoundError } from "@/actions/comp-errors";
import { getComp, getCompPublishState } from "@/actions/comps";
import { CompShareStatus } from "@/components/comp/CompShareStatus";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Owner-only detail page for a single comp's share status (ACM-066).
 * `getCompPublishState`/`getComp` each call `requireSession()` +
 * `loadOwnedComp` themselves, so a non-owner (or unauthenticated visitor,
 * if `src/proxy.ts`'s matcher ever drifts) gets the same
 * `CompNotFoundError` as a nonexistent id — this route never distinguishes
 * those cases.
 */
export default async function CompDetailPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;

  let state: Awaited<ReturnType<typeof getCompPublishState>>;
  let slug: string;
  try {
    [state, slug] = await Promise.all([getCompPublishState(id), getComp(id).then((comp) => comp.slug)]);
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

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8 outline-none">
      <h1 className="text-xl font-semibold text-foreground">Compartilhar comp</h1>
      <CompShareStatus compId={id} slug={slug} publicOrigin={publicOrigin} initialState={state} />
    </main>
  );
}
