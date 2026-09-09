"use client";

import { BuildEditor } from "@/components/editor/BuildEditor";

/**
 * Thin route wrapper around `BuildEditor` (ACM-099 split it out of this file
 * so `/build/[id]/edit` can reuse the exact same editor tree, seeded
 * differently — see that route and `BuildEditor`'s doc comment).
 */
export default function NewBuildPage(): React.JSX.Element {
  return <BuildEditor mode="new" />;
}
