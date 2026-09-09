import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Regression guard for ACM-096: `src/app/loading.tsx` at the App Router
 * root is a Suspense boundary for the ENTIRE `src/app` subtree, not just
 * `/`. It previously leaked the home page's 3-card comp skeleton into every
 * other route's navigation (`/build/new`, `/builds`, `/comps`, ...). The
 * home page must scope its loading fallback to a `<Suspense>` boundary
 * inside `src/app/page.tsx` instead (see `CompListSkeleton`).
 */
describe("app router loading boundaries", () => {
  it("does not define a root-level src/app/loading.tsx", () => {
    const appDir = join(process.cwd(), "src/app");
    expect(existsSync(join(appDir, "loading.tsx"))).toBe(false);
    expect(readdirSync(appDir)).not.toContain("loading.tsx");
  });
});
