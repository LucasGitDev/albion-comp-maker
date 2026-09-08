import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Static source scan for ACM-048 AC#1: every rendered test for the item
 * picker only catches raw hex colors that actually reach the DOM for the
 * fixtures it happens to render. This scans every `.ts(x)` file under
 * `src/components/item-picker/` for a raw hex color literal (Tailwind
 * arbitrary value like `bg-[#2a2e37]` or an inline `#hex` string), so an
 * offending hex introduced in a branch no fixture exercises still fails
 * the build. This mirrors the pattern already used for `build-card/**` in
 * `src/__tests__/build-card-no-palette-classes.test.ts` (see review finding
 * HIGH-2 on PR #55 — ACM-042 previously found this exact drift only via a
 * manual grep, with no automated regression coverage).
 */
const RAW_HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/g;

/** Strips `//` and `/* *‍/` comments so example snippets in docblocks don't trip the scan. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const ITEM_PICKER_DIR = path.join(process.cwd(), "src", "components", "item-picker");

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

describe("src/components/item-picker/** source (ACM-048 AC#1)", () => {
  const files = listSourceFiles(ITEM_PICKER_DIR);

  it("found at least the expected components (sanity check the scan itself works)", () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  it.each(files.map((file) => [path.relative(ITEM_PICKER_DIR, file), file] as const))(
    "%s never contains a raw hex color literal",
    (_relative, file) => {
      const source = stripComments(readFileSync(file, "utf-8"));
      const offenders = source.match(RAW_HEX_COLOR) ?? [];
      expect(offenders).toEqual([]);
    }
  );
});
