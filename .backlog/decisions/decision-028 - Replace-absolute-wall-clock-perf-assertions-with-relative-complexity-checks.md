---
id: decision-028
title: Replace absolute wall-clock perf assertions with relative complexity checks
date: '2026-09-09 03:15'
status: accepted
---
## Context

`src/__tests__/item-index.test.ts` had two performance tests asserting
absolute wall-clock budgets (`expect(elapsed).toBeLessThan(50)`) for
`buildItemIndex` and `searchItems` over a synthesized 2036-item catalogue.
These are part of `make check`, which is the Definition of Done gate and the
signal the `guard-done` hook relies on.

Under CPU contention (several worktrees running `make check` in parallel, or a
loaded shared CI runner) these measurements ballooned to 123ms and 209ms with
no code regression — the machine was busy, not the algorithm slow. A gate that
turns red because of unrelated machine load trains the team to ignore red,
which defeats the purpose of having a gate at all (ACM-083).

Three options were considered:
(a) move the assertions to a separate on-demand benchmark project (e.g.
    `vitest --project bench`), excluded from `make check`.
(b) replace the absolute budget with a relative/complexity assertion measured
    in the same test run, so contention affects both sides of the comparison
    equally.
(c) keep the absolute budget but with a looser number.

(c) was rejected outright: it only postpones the same failure to a busier day.

## Decision

Chose (b). Each performance test now builds two catalogues in the same test
run — one at 1x, one at 4x the real slot histogram — and measures the
operation (`buildItemIndex` / `searchItems`) on both, taking the minimum of 5
repeats per size to smooth out one-off scheduler hiccups. The assertion is:

```
largeElapsed < smallElapsed * COMPLEXITY_SLACK   // COMPLEXITY_SLACK = 10
```

Linear or n·log(n) growth from a 4x input increase would produce a ratio in
the 4-6x range; a slack of 10x gives ample room for measurement noise and CPU
contention (which inflates *both* measurements roughly proportionally, since
they happen back-to-back in the same process under the same load) while still
failing hard if someone introduces an accidental O(n^2) pass — a 4x input
would then cost ~16x, which blows the 10x budget regardless of machine load.

This keeps the performance coverage as an assertion inside `make check`
(nothing was deleted or moved out-of-band) while removing the absolute
millisecond number that made the gate flaky.

Empirical validation: ran the test file 5 consecutive times with 3 concurrent
`yes > /dev/null` processes competing for CPU on the same machine. All 5 runs
passed (11/11 tests) with no flakes.

## Consequences

- The performance tests no longer encode a specific millisecond budget; they
  encode an algorithmic-complexity expectation instead, which is what we
  actually care about protecting.
- `COMPLEXITY_SLACK = 10` is intentionally generous. If a future refactor
  makes the index provably sub-linear (unlikely, given the string-matching
  work involved), the slack could be tightened, but there is no pressure to
  do so.
- If this style of test proves unstable in practice on some future CI
  environment, fall back to option (a): move it to a dedicated
  `vitest --project bench` target run on demand, not as part of `make check`.

