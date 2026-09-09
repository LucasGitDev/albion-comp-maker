"use client";

import { BuildEditor } from "@/components/editor/BuildEditor";

/**
 * Thin route wrapper around `BuildEditor` (ACM-099 split it out of this file
 * so `/build/[id]/edit` can reuse the exact same editor tree, seeded
 * differently — see that route and `BuildEditor`'s doc comment). The
 * comp-trail breadcrumb (ACM-100 AC#5) and every other piece of the inline
 * implementation this route used to own now live in `BuildEditor` itself.
 */
export default function NewBuildPage(): React.JSX.Element {
  return <BuildEditor mode="new" />;
}
