---
id: decision-020
title: 'dark-purple preset keeps pre-ACM-014 hex, not doc-007 §5.1''s table'
date: '2026-09-08 02:00'
status: accepted
---
## Context

PR #50 (ACM-014) UI review (Playwright measurement) flagged that
`theme-presets.ts`'s `dark-purple` preset uses the pre-existing `tokens.ts`
constants (`CARD_SURFACE #12141a`, `CARD_SURFACE_2 #171a21`, `CARD_BORDER
#2a2e37`, `CARD_FG_MUTED #9aa1ad`) instead of doc-007 §5.1's table
(`#16121f`/`#1e1830`/`#342a4a`/`#a79bbd`), with no decision recorded — a
silent divergence between shipped code and the accepted spec.

Two ways to close that gap: (a) change the `dark-purple` token values to match
doc-007 §5.1 exactly, or (b) keep the current values and record why doc-007's
table doesn't apply to this one preset.

## Decision

Keep option (b): `dark-purple`'s `surface`/`surface2`/`border`/`fg`/`fgMuted`
stay byte-identical to the constants `tokens.ts` already had before ACM-014
(`CARD_SURFACE`/`CARD_SURFACE_2`/`CARD_BORDER`/`CARD_FG`/`CARD_FG_MUTED`).
doc-007 §5.1's hex table is treated as superseded for this one preset only —
§5.2/§5.3/§5.4 (gold/blood/ice) are unaffected and match the spec exactly
(confirmed by `theme-presets.test.ts`).

`dark-purple` is `DEFAULT_BUILD_CARD_THEME.preset` — every build ever saved
before ACM-014 renders under it implicitly. Re-pointing its hex values to
doc-007's mock table would recolor every existing card's surface, border and
muted text the moment this ships, with no user action and no way to opt out.
That is a real, silent visual regression for real saved data; doc-007's table
was written without that constraint in view (the doc predates auditing what
was already live). "The spec says so" does not outweigh "every existing
card changes color without the user asking."

The same reasoning extends to `dark-purple`'s `accent`: it intentionally does
NOT define one (see `theme-presets.ts` module doc and `tokens.ts`
`resolveAccent`), so applying the default preset never overrides
`BuildState.accent`/`ROLE_ACCENTS` for any existing build either.

## Consequences

- `theme-presets.test.ts`'s `"dark-purple is byte-identical to the
  pre-ACM-014 tokens.ts constants"` test is the enforcement mechanism — it
  must keep passing; a future change to `CARD_SURFACE`/etc. for other reasons
  will also move `dark-purple`, which is intended.
- doc-007 §5.1's hex table is documentation of the *original* intent, not the
  shipped value, for `surface`/`surface2`/`border`/`fgMuted`. A reader of
  doc-007 alone would get the wrong hex for `dark-purple` — this decision is
  the correction. `accent`/`accentFg` in §5.1 are also not implemented as
  written, for the same reason.
- If the product later wants `dark-purple` to visually match doc-007 exactly,
  that requires a deliberate migration (e.g. a one-time `theme_json` backfill
  or an explicit "refresh default theme" action), not a silent constant edit.
