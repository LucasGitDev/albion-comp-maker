---
id: ACM-005
title: Write Phase 1 acceptance tests (4 mandatory cases)
status: In Review
assignee: []
created_date: '2026-09-07 13:32'
updated_date: '2026-09-07 16:44'
labels: []
milestone: m-0
dependencies:
  - ACM-002
  - ACM-003
  - ACM-004
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Vitest tests covering the 4 acceptance cases from PRD Section 3. Must pass before Phase 2 starts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Test 1: T8_2H_HAMMER_UNDEAD spell chain resolves correctly (artifact spells present, removed base spells absent)
- [ ] #2 Test 2: T4_MAIN_HAMMER resolves HAMMER_SHOVE slot-1, HAMMERWHIRLWIND2 slot-3, PASSIVE_STUNCHANCE passive
- [ ] #3 Test 4: no resolved spell id is absent from spells.json
- [ ] #4 pnpm test exits 0 with all 4 tests green
- [ ] #5 Per-slot spell coverage invariant holds against the committed real corpus (replaces the original 'every item has >=1 spell', which decision-005 disproved: 584 of 2036 items legitimately have @activespellslots=0 and @passivespellslots=0 — vanity gear, gathering tools, plain capes/shields, base mounts, and ALL 112 offhands)
- [ ] #6 AC-1 also asserts HAMMERTACKLE IS present on base T8_2H_HAMMER, so the 'removed spell absent' half cannot pass vacuously
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
BLOQUEADO: upstream ao-bin-dumps removeu formatted/spells.json e formatted/localization.json (404). sync-ao-data.ts não consegue gerar ao-data.json. AC-3 e AC-4 não podem rodar contra dados reais. Precisa corrigir ACM-002 (sync script) antes de retomar.

DESBLOQUEADO por ACM-025. Pipeline emite 2036 items / 9044 spells. Branch task/5-phase1-tests e PR #5 descartados: foram escritos contra schema presumido que decision-004 refutou. Reimplementar do zero a partir de main.

decision-005: testes rodam contra corpus real podado (0.54MB, 21KB gzip) importado estaticamente — sem existsSync/skipIf, arquivo ausente = falha de compilacao, nunca verde vago. AC-3 original era factualmente falso. Descoberta de produto: TODOS os 112 offhands tem zero spell slots — o editor nao deve renderizar Q/W/E para offhand. Atencao: slotGroup e string ('1','3'), nao number.

PR #11 opened. Corpus: 2036 items, 699 spells, 978KB on disk / 26KB gzip (decision-005 estimated 0.54MB/21KB; actual measured slightly higher, still small/hermetic). Verified no-vacuous-green: moved ao-corpus.json aside, pnpm test failed with Vite import-resolution error (0 tests ran in acceptance.test.ts, non-zero exit) rather than skipping; restored file, suite green again.

REVIEW (PR #11, task/5-phase1-tests) — verdict: LGTM (2 MEDIUM findings, non-blocking)

Verified genuinely non-vacuous:
- AC-1 (src/__tests__/acceptance.test.ts:50-70): the 'nothing else differs' assertion is truly bidirectional — equal-length check + every base spell found on artifact by name/slotGroup/kind implies no extras on either side (pigeonhole). Confirmed against real corpus: base has 13 spells incl. HAMMERTACKLE, artifact has same 12 + UNDEADHAND. Correct.
- Vacuity guards (module-level items.length<2000 throw, findItem() throw-on-missing, pairsChecked>5000) leave no path for the 4 describe blocks to pass while examining nothing. Checked each block individually — none can go green on an empty/near-empty corpus.
- scripts/build-test-fixture.ts: deterministic. Item order inherited from ao-data.json (stable per sync run); `spells` Record built from Set insertion order (deterministic, preserved by JSON.stringify for non-numeric string keys). No sort needed but also no risk of spurious reordering diffs.
- .github/workflows/nightly-ao.yml: fails loudly end-to-end — sync-ao-data.ts throws on fetch failure (uncaught exception -> non-zero exit, no swallowed errors), `git diff --exit-code` on the correct path, GH Actions default-aborts the job on any step failure so a drifted/stale corpus never reaches `pnpm test` silently.
- make check / scripts/check.sh / .github/workflows/check.yml confirmed byte-for-byte untouched per decision-005; package.json diff is a single added `build:fixture` script.

MEDIUM finding 1 — AC-4 uses `spell.uniquename in data.spells` (acceptance.test.ts:147). After the JSON import is parsed, `data.spells` is a plain object with the normal Object.prototype (the null-prototype used when *building* the fixture in build-test-fixture.ts:53 does not survive JSON.stringify/parse). A spell literally named `constructor`/`toString`/etc. would false-pass `in` even if absent from the registry. Not practically exploitable today (Albion spell ids are uppercase, corpus is a static committed artifact, not attacker-controlled input at test time), but it's the same class of bug ACM-025's security review already flagged for upstream-controlled keys. Recommend `Object.hasOwn(data.spells, spell.uniquename)` for consistency and to close the theoretical hole before this pattern gets copy-pasted into runtime code that reads live CDN data.

MEDIUM finding 2 — AC-3 pinned exact floors (2036 items, 1452 withSpells, per-slot exact totals+coverage) are a deliberate, documented tradeoff (decision-005: "o corpus da invariante fica congelado no dia da geração"). Agreed this is the right call for a frozen fixture. Gap: nothing in the repo (test file comment, decision, or build-test-fixture.ts) tells a future maintainer that regenerating the corpus after a nightly-drift alert requires manually recomputing and updating SLOT_FLOORS + the two totals in acceptance.test.ts — there's no script/assertion tying the two together, and the default vitest failure message on the it.each totals (acceptance.test.ts:124) gives raw actual-vs-expected numbers with no pointer to build-test-fixture.ts or an update procedure. Not a bug, but real onboarding/actionability debt for whoever handles the next drift.

No CRITICAL/HIGH findings. Not a product-epic task (data pipeline test infra) — marc-lou-review gate does not apply.

FIX ROUND (infra audit CRITICAL, overriding reviewer's LGTM claim of determinism):
- Removed `version: data.version` from PrunedCorpus / build-test-fixture.ts output. Root cause: sync-ao-data.ts stamps `version` with wall-clock date, so the committed fixture's date field changed every day, and the nightly drift check (`git diff --exit-code` on ao-corpus.json) would go red every single day regardless of real upstream drift. Proof: regenerated fixture twice in a row after removing the field -> `git diff --exit-code -- src/__tests__/fixtures/ao-corpus.json` exits 0 (byte-identical).
- AC-4: replaced `spell.uniquename in data.spells` with `Object.hasOwn(data.spells, spell.uniquename)` (MEDIUM finding from review, prototype-chain false-pass).
- Added a comment block above SLOT_FLOORS documenting that the pinned counts are a snapshot requiring manual updates on regeneration, plus a decision rule for when to bump pins vs investigate a real regression.
- nightly-ao.yml: added `timeout-minutes: 15`, `permissions: contents: read`, and actions/cache for `.cache/` (CDN download dir) keyed on run_id with restore-keys fallback. Node 22 / pnpm 10.17.0 unchanged, matching check.yml.
- Re-verified no-vacuous-green: removed ao-corpus.json, `pnpm test` exits 1 (non-zero) via Vite import failure, not a silent skip.
- `make check` exits 0 on the branch.
<!-- SECTION:NOTES:END -->
