---
id: ACM-024
title: Fix sync-ao-data.ts upstream URLs (ao-bin-dumps restructured)
status: Done
assignee: []
created_date: '2026-09-07 15:48'
updated_date: '2026-09-07 16:01'
labels: []
milestone: m-0
dependencies: []
priority: high
ordinal: 24000
---

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
ao-bin-dumps removeu formatted/spells.json e formatted/localization.json (404). Apenas formatted/items.json existe. Root spells.json/localization.json têm schema XML-converted diferente. Bloqueia ACM-005 AC-3/AC-4. Investigar: novo mirror, endpoint oficial Albion, ou adaptar parser ao schema raw.

Fixed spells.json + localization.json URLs (moved out of formatted/ upstream) and adapted buildLocaleIndex (TMX v1.4: tmx.body.tu[], @tuid, tuv[@xml:lang]) and buildSpellLocaleIndex (merge activespell+passivespell+togglespell). Verified via pnpm sync:ao --force: 9044 spells resolved, no fetch errors. items.json (formatted/) was independently restructured upstream (split by type, nested craftingspelllist) breaking buildItemIndex in src/lib/spell-resolver.ts — out of scope here (touches limited to scripts/sync-ao-data.ts), currently produces 0 items. Filed follow-up ACM-025 to fix item-spell resolution against the new schema. make check passes. PR: https://github.com/LucasGitDev/albion-comp-maker/pull/7

Reviewer: AC1-3 verified against real ao-bin-dumps schema (TMX v1.4 tmx.body.tu[]/@tuid/tuv[@xml:lang], activespell+passivespell+togglespell merge). PR diff scoped strictly to scripts/sync-ao-data.ts (verified via gh pr diff --name-only). CI green (make check). items.json intentionally left at formatted/ per known ACM-025 blocker, 0 items output confirmed expected. No regression in src/lib/spell-resolver.ts (untouched). LGTM.
<!-- SECTION:NOTES:END -->
