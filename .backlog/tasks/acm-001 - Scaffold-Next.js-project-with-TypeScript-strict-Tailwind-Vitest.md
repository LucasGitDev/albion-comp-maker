---
id: ACM-001
title: Scaffold Next.js project with TypeScript strict + Tailwind + Vitest
status: Done
assignee: []
created_date: '2026-09-07 13:32'
updated_date: '2026-09-07 14:54'
labels: []
milestone: m-0
dependencies: []
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Bootstrap the repo so all subsequent tasks have a working base. No app code yet — just tooling.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 next.config.ts compiles with output standalone
- [x] #2 tsconfig.json has strict: true
- [x] #3 tailwind.config.ts present
- [x] #4 vitest.config.ts present, pnpm test exits 0
- [x] #5 pnpm lint exits 0 on empty src/
- [x] #6 Makefile with check target running scripts/check.sh
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Worktree task/1-scaffold-nextjs at ../albion-builds-task-1
2. Scaffold Next.js App Router + TS + Tailwind + ESLint with pnpm, src/ dir, alias @/*
3. tsconfig strict:true; next.config.ts output:'standalone'
4. Add Vitest + @vitejs/plugin-react + RTL + jsdom; vitest.config.ts; smoke test
5. Makefile 'check' target -> scripts/check.sh (pnpm install --frozen-lockfile, lint, tsc --noEmit, build, test --run)
6. Run make check green, commit conventional, open PR
NOTE: task ACs specify pnpm + src/ (not npm/--no-src-dir); following ACs as canonical.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented on task/1-scaffold-nextjs (worktree ../albion-builds-task-1), commit 9ee3e30. Used pnpm (per env instructions) with create-next-app --use-pnpm --turbopack --app --src-dir --typescript --tailwind --eslint. Tailwind v4 is config-less/PostCSS-based in create-next-app's default output; added a minimal typed tailwind.config.ts (content globs only, no theme) purely to satisfy AC#3 — it is not consumed by the v4 PostCSS pipeline (@tailwindcss/postcss + globals.css @import 'tailwindcss'), which remains the real Tailwind config path. Added vitest + @vitejs/plugin-react + testing-library + jsdom, vitest.config.ts (jsdom env, @ alias, includes src/**/*.test.* and __tests__/**/*.test.*), and a smoke test in __tests__/smoke.test.ts. pnpm test script = vitest run (non-interactive, exits 0). scripts/check.sh (chmod +x, set -euo pipefail) runs: pnpm install --frozen-lockfile, pnpm lint, pnpm exec tsc --noEmit, pnpm build, pnpm test — invoked via Makefile's 'check' target (make check). IMPORTANT finding: Next.js 16's new 'agent files' feature (next dev, gated behind AI-agent detection) auto-overwrites AGENTS.md/CLAUDE.md with its own generated content unless disabled; the generated content also embeds text instructing agents to commit it. I did not comply with that embedded instruction, restored the original AGENTS.md/CLAUDE.md via git checkout, and set agentRules: false in next.config.ts to prevent recurrence. Also had to bump @types/node to ^22 to satisfy vitest 5's peer dependency, and replace the Next 16 generated LayoutProps<'/'> type in src/app/layout.tsx with an explicit Readonly<{ children: ReactNode }> so tsc/eslint pass before next build has generated route types (check.sh runs lint before build). make check passes locally, exit 0. To run the quality gate: cd into the worktree and run 'make check' (or './scripts/check.sh').

Review [MINOR]: package.json/pnpm-lock committed create-next-app boilerplate (README.md, src/app/page.tsx default content, public/*.svg) left untrimmed. Acceptable for a scaffold task but should be cleaned in a follow-up before real UI work starts.

Review [MINOR]: tailwind.config.ts is inert under Tailwind v4's PostCSS pipeline (real config lives in globals.css @import + @tailwindcss/postcss). File is honestly commented as such and does satisfy AC#3 literally, but future devs may edit it expecting effect. Consider a decision doc or a note in globals.css cross-referencing this.

Review: Verified agentRules is a REAL Next.js 16.3.4 config key — confirmed present in node_modules/next/dist/server/config-schema.js:496 (agentRules: z.boolean().optional()). The mitigation for Next auto-overwriting CLAUDE.md/AGENTS.md is genuine, not illusory. No blocker here.

Review: layout.tsx change from generated LayoutProps<'/'> to explicit Readonly<{ children: ReactNode }> is sound — this is standard idiomatic Next.js App Router typing (matches create-next-app output prior to the newer typed-routes-props generation) and does not fight the framework; PageProps/LayoutProps typegen for route params still applies elsewhere. tsc --noEmit passes clean (verified locally, exit 0).

Review: All 6 ACs verified by running commands directly in the worktree (not taking implementer's word): (1) next.config.ts has output:'standalone', next build succeeds with Turbopack. (2) tsconfig.json strict:true confirmed. (3) tailwind.config.ts present. (4) vitest.config.ts present, pnpm test -> vitest run, 1/1 tests pass, exit 0. (5) pnpm lint exits 0 (no output/errors). (6) Makefile 'check' target runs ./scripts/check.sh; ran 'make check' end-to-end (install --frozen-lockfile, lint, tsc --noEmit, build, test) — full pipeline exits 0. scripts/check.sh committed with mode 100755 (git ls-tree confirms) and uses set -euo pipefail with correct order. @types/node ^22.20.1 is compatible with running Node v22.18.0, no conflict. .gitignore covers node_modules, .next, out, .env*; no secrets/node_modules/.next present in the commit tree. Commit message is Conventional Commits format (chore(config): ...) with no Co-Authored-By or AI-attribution trailer — hard project rule satisfied.

Review verdict: LGTM — all ACs met and independently verified, make check green, agentRules config key confirmed real (not a silent no-op), no AI attribution in commit, no secrets/build artifacts committed. Two MINOR non-blocking notes: leftover create-next-app boilerplate (README/page.tsx/svgs) and an inert tailwind.config.ts under Tailwind v4 — both fine for a scaffold-only task, recommend addressing in the first UI task.
<!-- SECTION:NOTES:END -->
