import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Static source scan for ACM-073 AC#7: every rendered test (`build-card.
 * test.tsx`, `build-card-layouts.test.tsx`) only catches Tailwind palette
 * classes that actually reach the DOM for the fixtures it happens to render.
 * This scans every `.ts(x)` file under `src/components/build-card/` for the
 * class family directly, so an offending class introduced in a branch no
 * fixture exercises (e.g. a conditional error state) still fails the build.
 */
const PALETTE_COLOR_UTILITY = new RegExp(
  String.raw`\b(?:bg|text|border|ring|from|to|via|outline|shadow|decoration|accent|caret|fill|stroke|divide)-` +
    String.raw`(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b`,
  "g"
);

// Narrower than the alpha-slash regex `build-card.test.tsx` runs against
// rendered DOM: this one runs against raw source (including files this
// task doesn't render in a test), and a bare `[a-zA-Z0-9_-]+/\d+` would flag
// existing, already-reviewed CSS-variable-based utilities like
// `text-foreground/70` (not a Tailwind palette color — safe). Requiring an
// explicit palette color name (or black/white) before the slash keeps this
// test scoped to what AC#7 actually forbids.
const ALPHA_SLASH_UTILITY = new RegExp(
  String.raw`\b(?:bg|text|border|ring|from|to|via|outline|shadow|decoration|accent|caret|fill|stroke|divide|placeholder)-` +
    String.raw`(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white)` +
    String.raw`(?:-\d{2,3})?/(?:\d{1,3}\b|\[)`,
  "g"
);

/** Strips `//` and `/* *‍/` comments so example snippets in docblocks (e.g. "e.g. `bg-blue-500`") don't trip the scan. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const BUILD_CARD_DIR = path.join(process.cwd(), "src", "components", "build-card");

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("src/components/build-card/** source (AC#7)", () => {
  const files = listSourceFiles(BUILD_CARD_DIR);

  it("found at least the expected components (sanity check the scan itself works)", () => {
    expect(files.length).toBeGreaterThanOrEqual(10);
  });

  it.each(files.map((file) => [path.relative(BUILD_CARD_DIR, file), file] as const))(
    "%s never contains a Tailwind palette color utility class",
    (_relative, file) => {
      const source = stripComments(readFileSync(file, "utf-8"));
      const offenders = source.match(PALETTE_COLOR_UTILITY) ?? [];
      expect(offenders).toEqual([]);
    }
  );

  it.each(files.map((file) => [path.relative(BUILD_CARD_DIR, file), file] as const))(
    "%s never contains a Tailwind alpha-slash utility class",
    (_relative, file) => {
      const source = stripComments(readFileSync(file, "utf-8"));
      const offenders = source.match(ALPHA_SLASH_UTILITY) ?? [];
      expect(offenders).toEqual([]);
    }
  );
});
