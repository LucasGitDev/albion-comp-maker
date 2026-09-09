import { notFound, redirect } from "next/navigation";

import { getBuildForEdit } from "@/actions/builds";
import { BuildEditor } from "@/components/editor/BuildEditor";
import { parseBuildContent } from "@/lib/build-schema";
import { parseThemeJson } from "@/lib/theme-schema";
import { createEmptyBuild } from "@/types/build";
import { BuildNotFoundError } from "@/actions/build-errors";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Reopens an existing, owned build in the editor (ACM-099). `getBuildForEdit`
 * throws the same `BuildNotFoundError` whether `id` does not exist at all or
 * belongs to another user (IDOR — decision from `loadOwnedBuild`), so this
 * route 404s both cases identically (AC#5), same shape as `/build/[slug]`'s
 * `notFound()` for public reads.
 *
 * `content`/`theme` are parsed server-side with the same tolerant readers the
 * public read route uses — a row saved before a schema change must never
 * crash the editor. A build whose content fails validation still opens (the
 * name/role the leader already set is preserved) rather than 404ing, since
 * the leader owns the row and the failure is data, not access.
 */
export default async function EditBuildPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;

  let row;
  try {
    row = await getBuildForEdit(id);
  } catch (error) {
    if (error instanceof BuildNotFoundError) {
      notFound();
    }
    // `getBuildForEdit` throws a plain `Error("Unauthorized")` when there is
    // no session (`requireSession`) — mirrors `/builds`'s own fallback
    // redirect; `src/proxy.ts` is the primary (UX-only) boundary, this one
    // is the real one.
    redirect("/");
  }

  const parsedContent = parseBuildContent(row.content);
  const initialBuild = parsedContent.ok
    ? { ...parsedContent.data, name: row.name, role: row.role ?? "" }
    : { ...createEmptyBuild(), name: row.name, role: row.role ?? "" };
  const initialTheme = parseThemeJson(row.themeJson);

  return (
    <BuildEditor key={row.id} mode="edit" buildId={row.id} initialBuild={initialBuild} initialTheme={initialTheme} />
  );
}
