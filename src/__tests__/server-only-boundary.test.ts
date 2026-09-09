import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Dedicated, fast (no bundler involved) guard for decision-013's core
 * guarantee: a Client Component must never end up depending — directly or
 * transitively — on a module that starts with `import "server-only"`
 * (currently `src/lib/build-schema.ts`, `src/lib/comp-schema.ts`,
 * `src/lib/build-card-lookups.ts`, `src/lib/public-content.ts`).
 *
 * This exists ALONGSIDE (not instead of) the `server-only` package's own
 * build-time throw, which `pnpm build` (Turbopack) already enforces — see
 * decision-013's "Enforcement" section for how that was verified. This test
 * is the fast, CI-visible, bundler-independent tripwire required by ACM-069:
 * it runs in `pnpm test`, needs no full Next.js build, and reports the exact
 * client file and the exact server-only module it reached, statically.
 */

const SRC_ROOT = path.resolve(__dirname, "..");
const SOURCE_EXTENSIONS = [".ts", ".tsx"];

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      files.push(...listSourceFiles(full));
      continue;
    }
    if (!SOURCE_EXTENSIONS.includes(path.extname(full))) continue;
    if (full.endsWith(".d.ts")) continue;
    if (full.includes(`${path.sep}__tests__${path.sep}`)) continue;
    files.push(full);
  }
  return files;
}

function isUseClientFile(content: string): boolean {
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("//")) continue;
    return line === '"use client";' || line === "'use client';" || line === '"use client"' || line === "'use client'";
  }
  return false;
}

function isServerOnlyFile(content: string): boolean {
  return /^\s*import\s+["']server-only["'];?\s*$/m.test(content);
}

/**
 * A `"use server"` directive at the top of a module (Server Actions) is
 * itself a client/server boundary: when a Client Component imports a
 * function from such a module, Next.js replaces it with a serializable
 * reference and never bundles the module's own implementation (or its
 * transitive imports) for the client. So the import graph must stop here,
 * the same way it stops at a `"use client"` boundary in the other
 * direction — otherwise every Server Action wired to a schema would read as
 * a false-positive leak.
 */
function isUseServerFile(content: string): boolean {
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("//")) continue;
    return line === '"use server";' || line === "'use server';" || line === '"use server"' || line === "'use server'";
  }
  return false;
}

const IMPORT_SPECIFIER_PATTERN =
  /(?:import|export)(?:\s+(type)\b)?([^'"]*?)from\s+["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']/g;

/**
 * `import type { ... } from "..."` (and `export type { ... } from`) are
 * fully erased at build time — TypeScript strips the whole statement, so
 * nothing crosses the client/server boundary. Likewise a named import
 * clause where every specifier carries an inline `type` modifier (e.g.
 * `import { type A, type B } from "..."`) is erased entirely, while one
 * with even a single value specifier (`import { type A, b } from "..."`)
 * still pulls a real value across and must be flagged.
 */
function isTypeOnlyImport(typeKeyword: string | undefined, clause: string): boolean {
  if (typeKeyword) return true;

  const braceMatch = clause.match(/\{([^}]*)\}/);
  const outsideBraces =
    braceMatch && braceMatch.index !== undefined
      ? clause.slice(0, braceMatch.index) + clause.slice(braceMatch.index + braceMatch[0].length)
      : clause;
  if (outsideBraces.replace(/,/g, "").trim() !== "") return false; // default or namespace import: always a value

  if (!braceMatch) return false; // no named clause and no default/namespace: malformed, treat as value to be safe

  const names = braceMatch[1]
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  if (names.length === 0) return false;
  return names.every((name) => /^type\b/.test(name));
}

function extractImportSpecifiers(content: string): string[] {
  const specifiers: string[] = [];
  for (const match of content.matchAll(IMPORT_SPECIFIER_PATTERN)) {
    const [, typeKeyword, clause, fromSpecifier, dynamicSpecifier, sideEffectSpecifier] = match;
    if (fromSpecifier) {
      if (isTypeOnlyImport(typeKeyword, clause ?? "")) continue;
      specifiers.push(fromSpecifier);
      continue;
    }
    const specifier = dynamicSpecifier ?? sideEffectSpecifier;
    if (specifier) specifiers.push(specifier);
  }
  return specifiers;
}

function resolveSpecifier(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) {
    // External package (e.g. "react", "zod", "server-only") — not part of
    // our internal src/ import graph.
    return null;
  }
  const base = specifier.startsWith("@/")
    ? path.join(SRC_ROOT, specifier.slice(2))
    : path.resolve(path.dirname(fromFile), specifier);

  const candidates = [
    base,
    ...SOURCE_EXTENSIONS.map((ext) => `${base}${ext}`),
    ...SOURCE_EXTENSIONS.map((ext) => path.join(base, `index${ext}`)),
  ];
  for (const candidate of candidates) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // not this candidate
    }
  }
  return null;
}

describe("server-only import boundary (decision-013)", () => {
  const allFiles = listSourceFiles(SRC_ROOT);
  const contentByFile = new Map<string, string>();
  for (const file of allFiles) {
    contentByFile.set(file, readFileSync(file, "utf-8"));
  }

  const clientFiles = allFiles.filter((f) => isUseClientFile(contentByFile.get(f)!));
  const serverOnlyFiles = new Set(allFiles.filter((f) => isServerOnlyFile(contentByFile.get(f)!)));

  it("found at least one server-only module to guard (sanity check)", () => {
    expect(serverOnlyFiles.size).toBeGreaterThan(0);
  });

  it("no Client Component transitively imports a server-only module", () => {
    const violations: string[] = [];

    for (const clientFile of clientFiles) {
      const visited = new Set<string>();
      const queue: string[] = [clientFile];
      let hitPath: string[] | null = null;

      while (queue.length > 0 && !hitPath) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);

        if (current !== clientFile && serverOnlyFiles.has(current)) {
          hitPath = [clientFile, current];
          break;
        }

        const content = contentByFile.get(current);
        if (!content) continue;
        // "use server" modules are a boundary in the other direction: only
        // a serializable reference crosses into the client bundle, not the
        // module body or its own imports.
        if (current !== clientFile && isUseServerFile(content)) continue;
        for (const specifier of extractImportSpecifiers(content)) {
          const resolved = resolveSpecifier(current, specifier);
          if (resolved && !visited.has(resolved)) queue.push(resolved);
        }
      }

      if (hitPath) {
        violations.push(
          `${path.relative(SRC_ROOT, hitPath[0])} -> ${path.relative(SRC_ROOT, hitPath[1])}`,
        );
      }
    }

    expect(violations, `Client Components importing server-only modules:\n${violations.join("\n")}`).toEqual([]);
  });
});
