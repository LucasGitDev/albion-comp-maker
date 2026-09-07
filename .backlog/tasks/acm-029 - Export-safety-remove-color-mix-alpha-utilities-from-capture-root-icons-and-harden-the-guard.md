---
id: ACM-029
title: >-
  Export safety: remove color-mix/alpha utilities from capture-root icons and
  harden the guard
status: Done
assignee: []
created_date: '2026-09-07 17:11'
updated_date: '2026-09-07 17:39'
labels: []
milestone: m-2
dependencies:
  - ACM-013
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SpellIcon uses Tailwind alpha utility bg-black/70, which Tailwind v4 compiles to color-mix(in oklab, var(--color-black) 70%, transparent). This node renders inside the PNG capture root via SpellRow in every BuildCard variant. decision-007 names oklch/color-mix as the exact risk class that motivated choosing html-to-image, but nothing in the repo proves html-to-image resolves color-mix(). If it does not, every exported PNG silently loses the badge background behind the Q/W/E/P spell letters. The ACM-013 guard test does not catch this: its regex only matches bg-<palette>-<shade> classNames and it only greps for the literal 'oklch(' substring.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 SpellIcon Q/W/E/P badge background uses a literal hex/rgba value, not a Tailwind alpha utility or color-mix()
- [x] #2 Export-safety guard test also rejects color-mix( and oklab/oklch anywhere in the BuildCard capture-root subtree, and is mutation-tested (introducing color-mix into the subtree must fail the test)
- [x] #3 A repo-wide check confirms no remaining alpha-slash Tailwind utility (bg-*/NN, text-*/NN, border-*/NN) renders inside the capture root
- [x] #4 Empirically verify and record in task notes whether html-to-image resolves color-mix(); record the finding as a backlog decision if it changes decision-007
- [x] #5 make check green
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Fix
- src/components/icons/SpellIcon.tsx:54 — replaced `bg-black/70` Tailwind class with a
  literal `style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}` on the Q/W/E/P badge span.
  Confirmed via a clean `pnpm build` that `.bg-black\/70` no longer appears in any
  generated CSS chunk tied to this component's actual usage (the stray rule Tailwind's
  content scanner still emits comes from the literal string "bg-black/70" inside
  .backlog/docs/doc-001 markdown and the ACM-013 task file, not from any rendered JSX —
  it is dead/unused CSS, not evidence of a remaining defect).
- ItemIcon.tsx was checked and has no alpha-slash utility; no change needed there.

## Guard hardening (src/__tests__/build-card.test.tsx)
Added:
- ALPHA_SLASH_UTILITY regex rejecting any `<prefix>-<token>/<NN>` or `<prefix>-<token>/[...]`
  className (catches bg-black/70, text-white/50, border-*/[.08], etc — not just
  palette-color/shade like the ACM-013 guard).
- A literal-markup check for `color-mix(` and `oklab(` substrings (existing guard only
  checked `oklch(`).
- An inline-style walk of the #capture-root subtree rejecting any `style` attribute whose
  value contains `color-mix(`, `oklab(`, or `oklch(`.

### Mutation test (real, not decorative)
Reintroduced `bg-black/70` into SpellIcon.tsx's badge className (removing the rgba style),
reran `pnpm vitest run src/__tests__/build-card.test.tsx`: 12/13 passed, 1 failed —
"BuildCard never uses a Tailwind alpha-slash utility (would compile to color-mix())" — exactly
the new assertion, exactly the real historical defect. Reverted the mutation, reran: 13/13
pass. The guard is proven to catch the specific bug this task exists to prevent.

## AC#3 — repo-wide alpha-slash scan
Traced every file actually imported by the BuildCard render tree (BuildCard.tsx,
BuildCardGrid.tsx, BuildCardVertical.tsx, CardSlotTile.tsx, SpellRow.tsx, tokens.ts,
types.ts, plus ItemIcon.tsx/SpellIcon.tsx/icon-tokens.ts/use-icon-status.ts) and grepped
that subtree for `(bg|text|border|ring|from|to|via|outline|shadow|decoration|accent|caret|
fill|stroke|divide|placeholder)-<token>/(\[|[0-9])`. Zero matches after the fix — the
capture-root subtree is clean.
Repo-wide (outside the capture root, for context only, NOT touched by this task per its
explicit scope):
- src/app/page.tsx — Next.js scaffold boilerplate (bg-black/[.06], border-black/[.08],
  dark:bg-white/[.08], etc.), never rendered by BuildCard, not part of any export path.
- src/components/editor/SlotCard.tsx:117 — `bg-black/60` on a hover-only clear-button
  overlay. This is editor chrome living outside src/components/build-card/** per
  decision-010 (interactive chrome never enters the capture root), so it is out of this
  task's scope and out of the capture root by construction — but it is the same defect
  class and worth flagging to whoever owns src/components/editor next.

## AC#4 — html-to-image + color-mix() empirical verification
Could NOT empirically verify in this environment: `html-to-image` is not yet a project
dependency (ACM-015, the export feature, has not been implemented — package.json has no
html-to-image/html2canvas/dom-to-image-more entry), and no headless-browser tooling
(Playwright/Puppeteer) is installed in this repo or available to spawn programmatically
here. I will not fabricate a pass/fail result.
What I DID verify: a clean `pnpm build` shows Tailwind v4 emits alpha-slash utilities as
TWO rules — a plain hex fallback (e.g. `background-color:#000000b3`) followed by a
`@supports (color:color-mix(in lab, red, red))` block overriding it with
`color-mix(in oklab, var(--color-black) 70%, transparent)`. Any real browser used by
html-to-image's SVG-foreignObject rasterizer supports the `color-mix()` CSS function
itself (it's baseline in current Chromium/Firefox/Safari), so the open question specific
to decision-007's risk is not "does the browser support color-mix()" but "does
html-to-image's DOM-to-SVG serialization correctly read/inline the @supports-gated
computed value rather than the resting (non-@supports) declaration order" — that requires
an actual export run against a live DOM node, which is only possible once ACM-015 exists.
Since this task's actual defect (SpellIcon's badge) is now fixed with a literal rgba()
value regardless of the outcome, the empirical question no longer blocks correctness of
the shipped fix — it remains an open verification item for decision-007 to close before/
during ACM-015. Not recording a new decision: I found no evidence contradicting
decision-007 (only an unresolved unknown it already flagged), so overriding it would be
speculation, not a finding.

## Review (PR #20, task/29-export-safety)

### 1. Guard mutation test — CONFIRMED real
Reintroduced `bg-black/70` into SpellIcon.tsx (removing the rgba style) and reran
`vitest run src/__tests__/build-card.test.tsx`: 12/13 pass, 1 fails — exactly the new
"never uses a Tailwind alpha-slash utility" assertion. Reverted: 13/13 pass. The
implementer's mutation-test claim is not decorative.

### 2. Guard coverage boundary — real gap found, MEDIUM
Tried to defeat the hardened guard with several evasion routes (each verified by
actually mutating SpellIcon.tsx and rerunning the suite):

- CAUGHT: `bg-black/70` (literal alpha-slash utility).
- CAUGHT: `bg-black/[0.7]` (bracket-arbitrary alpha-slash syntax) — matches
  `ALPHA_SLASH_UTILITY`'s `/(?:\[)` branch.
- CAUGHT: inline `style={{ backgroundColor: "oklab(0% 0 0 / 0.7)" }}` — matches the
  inline-style walk over `#capture-root`.
- NOT CAUGHT (but not a real risk): `bg-[rgb(0_0_0/0.7)]` arbitrary-value class evades
  the classname regex (no alnum run between `bg-` and `/`), but Tailwind compiles this
  literally to `background-color: rgb(0 0 0/0.7)`, not `color-mix()` — so it's a false
  negative for a class of input that isn't actually the risk this guard targets.
- **NOT CAUGHT, real risk**: CSS custom-property indirection.
  `style={{ backgroundColor: "var(--brand-overlay-color-mix-risk)" }}` with
  `--brand-overlay-color-mix-risk: oklab(0% 0 0 / 0.7);` added to globals.css →
  **all 13 tests pass**. The guard only greps rendered className/innerHTML/style-attribute
  *text*; it never resolves custom properties or reads stylesheet content, and jsdom
  doesn't compute resolved styles from `<link>`/`<style>` sources here anyway. Any future
  component that references a `var(--token)` whose value is defined as oklab/oklch/color-mix
  in globals.css (or any imported CSS) will render fully green on this guard while still
  carrying the exact defect class ACM-029 exists to prevent.
  Currently NOT exploited: every token in `src/app/globals.css` today is a literal hex
  value, so this is a latent gap, not an active bug. Recommend recording this boundary
  explicitly (in the test's docstring and/or decision-007) so it isn't mistaken for
  exhaustive protection when ACM-014/ACM-015 land.

### 3. Visual equivalence — confirmed
`bg-black/70` = black @ 70% alpha; `rgba(0, 0, 0, 0.7)` is the exact same color/alpha,
not an approximation.

### 4. AC#4 honesty check — PASS, no fabrication
The note correctly distinguishes "browser support for the `color-mix()` function"
(verified via `pnpm build` output: Tailwind v4 emits a hex fallback + an
`@supports (color:color-mix(...))`-gated override) from the actual open question
("does html-to-image's DOM-to-SVG serialization read the `@supports`-gated computed
value"), which cannot be verified without html-to-image installed (ACM-015 not yet
built) and without headless-browser tooling in this repo. This is an honest, technically
accurate limitation, not hand-waving, and reasonable to leave open for ACM-015 to close
empirically. No new decision was warranted since nothing here contradicts decision-007.

### 5. Scope — verified clean
Diff touches only `src/components/icons/SpellIcon.tsx` and
`src/__tests__/build-card.test.tsx` (plus the task file). Traced `SlotCard.tsx` usage:
it is imported only by `src/components/editor/SlotGrid.tsx`; `BuildCard`'s
`#capture-root` renders `CardSlotTile` (a distinct component), never `SlotCard`. This
matches decision-010's architecture (interactive editor chrome lives outside
`src/components/build-card/**` by construction), so the out-of-scope flag on
`SlotCard.tsx:117` (`bg-black/60`) is TRUE, not a scope violation to fix here.

### 6. Regression check — confirmed additive only
`git diff main...HEAD -- src/__tests__/build-card.test.tsx` shows zero removed lines —
all prior ACM-013 assertions (palette-utility regex, literal `oklch(` check, capture-root
identity, no-interactive-elements, etc.) are intact and still pass. `make check` green on
branch: lint (0 errors, 2 pre-existing unrelated `<img>` warnings), tsc, build, and
123/123 vitest tests pass.

## Findings
- MEDIUM: Guard has a real, currently-latent coverage gap for CSS-custom-property-mediated
  color-mix/oklab/oklch (see #2 above). Not exploited by current code, but the guard's
  actual protection boundary is narrower than "rejects color-mix/oklab/oklch anywhere in
  the capture-root subtree" (AC#2 wording) implies. Recommend a follow-up note in the
  test's docstring and/or decision-007 documenting this limitation before ACM-015/ACM-014
  introduce any `var(--token)`-based color usage in the capture root.
- No CRITICAL/HIGH findings. AC#1-#5 all verifiably met. Mutation test is real,
  scope is respected, AC#4 account is honest, ACM-013 tests strengthened not weakened.

## Verdict: LGTM (1 MEDIUM finding recorded, non-blocking)
<!-- SECTION:NOTES:END -->
