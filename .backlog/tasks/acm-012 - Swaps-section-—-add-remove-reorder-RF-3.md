---
id: ACM-012
title: Swaps section — add/remove/reorder (RF-3)
status: In Progress
assignee: []
created_date: '2026-09-07 13:32'
updated_date: '2026-09-07 20:01'
labels: []
milestone: m-2
dependencies:
  - ACM-005
  - ACM-007
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add swap entries to a build: each has a slot, item, enchant, spells, and label. Displayed below main slots.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add swap button opens item picker with slot selector
- [x] #2 Each swap shows item name, icon, spell icons
- [x] #3 Swap can be removed
- [x] #4 Swap label editable inline
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
UX spec (ACM-012) — Seção de swaps. Depende de ACM-011 (store/slot layout) e ACM-007 (ícones).

## 0. Modelo mental
Um swap é uma **substituição condicional**: "neste slot, nesta situação, use este outro item". Ele só faz sentido em relação ao item equipado. Por isso a UI é sempre `slot → item atual → item alternativo → condição`, e a seção mora **imediatamente abaixo** da grade de slots, sem colapso por padrão — se o leader tem que abrir um acordeão para lembrar que swaps existem, ele não escreve nenhum.

```ts
type Swap = {
  id: string;              // nanoid, estável para reorder/keys
  slot: Slot;
  itemId: string;
  tier: number;
  enchant: 0|1|2|3|4;
  spells: Record<"q"|"w"|"e"|"passive", string | null>;
  label: string;           // "" permitido; nunca null
};
```
`swaps: Swap[]` — a ordem do array **é** a ordem exibida e exportada. Sem campo `order`; array ordenado é a fonte da verdade e elimina a classe de bug "índice fora de sincronia".

## 1. Fluxo
1. Leader termina o build → vê a seção "Swaps" com o estado vazio.
2. Clica "Adicionar swap" → uma **linha inline** abre no fim da lista, já em modo edição, com o seletor de slot focado. Não é modal: o leader precisa enxergar o build acima enquanto define a troca.
3. Escolhe slot → o item atual daquele slot aparece à esquerda como referência (read-only). Abre o ItemPicker filtrado por esse slot (mesmo componente de ACM-008; `slot` prop já existe).
4. Escolhe item → tier/encanto/spells no mesmo padrão do SlotCard.
5. Digita o rótulo ("Bridge fight", "Contra 5+ healers"). Salva ao sair do campo (autosave, sem botão "Salvar" — a store é local).
6. Erro: escolher um slot que está vazio no build → linha mostra aviso inline âmbar "Este slot está vazio no build principal. O swap será exibido como item avulso." Não bloqueia: às vezes o swap é justamente "leve uma bolsa de fuga".

Mecanismo: **loss aversion** no remover — a remoção é imediata com undo por 6s ("Swap removido · Desfazer"), não com um `confirm()`. Diálogo de confirmação em ação barata treina o usuário a clicar OK sem ler; undo preserva a reversibilidade sem custo de atenção.

## 2. Wireframe

┌ Swaps  ·  3 ────────────────────────────────────  [ + Adicionar swap ] ┐
│                                                                        │
│ ⠿ 1 │ MÃO PRINCIPAL │ [ico] T8.1 Martelo ─→ [ico] T8.1 Machado         │
│      │ [Q][W][E][P]  │ Rótulo: Bridge fight              [↑][↓]  [🗑]  │
│ ─────┼───────────────────────────────────────────────────────────────  │
│ ⠿ 2 │ CAPA          │ [ico] T8 Martlock ─→ [ico] T8 Lymhurst           │
│      │ [Q]           │ Rótulo: Contra composição de burst   [↑][↓] [🗑]│
│ ─────┼───────────────────────────────────────────────────────────────  │
│ ⠿ 3 │ BOLSA         │ [—] vazio ─→ [ico] T7 Bolsa                      │
│      │               │ Rótulo: —  ⚠ slot vazio no build   [↑][↓]  [🗑] │
└────────────────────────────────────────────────────────────────────────┘

Linha: altura 72px, ícones `size="md"` (40px), separador 1px `--color-icon-slot-empty`.
Chip de slot: 11px/600 uppercase, muted, largura fixa 132px — colunas alinhadas verticalmente, escaneáveis.
Seta `→`: 16px, muted. É o único elemento que carrega o significado "substitui"; não trocar por ícone decorativo.
Rótulo: input sem borda que ganha borda no foco (inline edit). Placeholder: "Quando usar? ex.: fights de bridge". Placeholder é uma pergunta, não um rótulo — a pergunta é o que produz texto útil.

## 3. Reorder — decisão
**Botões ↑/↓ são o mecanismo primário. Drag fica fora do MVP.**
Justificativa: listas de swap têm 1–5 itens; a vantagem do drag só aparece por volta de 10+. Botões são acessíveis por teclado de graça, testáveis em Vitest sem simular pointer events, e não adicionam dnd-kit (~12kB) a uma tela que já vai carregar html2canvas. O handle `⠿` no wireframe é **placeholder visual reservado**: renderizar apenas quando o drag existir, senão é affordance mentindo.
Regras: `↑` desabilitado (não escondido) no primeiro; `↓` no último — botão que some faz o layout pular. Após reorder, foco permanece no botão clicado e um live region anuncia "Swap movido para posição 2 de 3".

## 4. Estados obrigatórios
| Estado | Visual |
|---|---|
| vazio | Bloco tracejado, altura 120px, centralizado: ícone de setas trocando (24px, muted) + título 14px/600 "Nenhum swap definido" + corpo 13px muted "Liste trocas obrigatórias para o grupo — ex.: 'T8 Martelo → T8 Machado em fights de bridge'." + botão primário "Adicionar swap". O exemplo é literal e do domínio; empty state genérico não ensina o formato. |
| loading | Só existe no carregamento de um build salvo: 2 linhas esqueleto de 72px. Adicionar swap é local e síncrono, não tem loading. |
| linha em edição | fundo levemente elevado, borda accent 1px, `[↑][↓]` ocultos durante edição |
| erro (slot vazio) | banda âmbar 2px à esquerda da linha + aviso inline; não bloqueia salvar |
| erro (item removido do dump) | ícone em estado `error` do ItemIcon + botão "Trocar item" |
| sucesso | sem toast ao adicionar (o item aparecendo é o feedback). Toast **apenas** no remover, com Desfazer. |
| máximo | soft cap 8 swaps: acima disso o botão fica desabilitado com "Máximo de 8 swaps — o card fica ilegível no Discord". O limite é de legibilidade do PNG, e a copy diz isso. |

## 5. Componentes
Reuso: `ItemPicker` (ACM-008, prop `slot` já existe), `ItemIcon`/`SpellIcon` (ACM-007), seletores de tier/encanto (ACM-009), chips de spell (ACM-010).
Novos, com justificativa:
- `SwapsSection` — dono do estado vazio, header com contagem e do botão de adicionar.
- `SwapRow` — layout horizontal `atual → alternativo`, que o `SlotCard` (vertical, 168px) não comporta sem virar um componente com dois modos. Dois componentes simples > um com prop `variant` que ninguém entende em 3 meses.
- `UndoToast` — só se ainda não existir sistema de toast no projeto; se existir, reusar.
Nenhum token novo: reusa `--color-tier-*` e `--color-enchant` introduzidos em ACM-011. Aviso âmbar usa `--color-warn:#c98a2b` se não existir.

## 6. Verificação manual
1. Adicionar 2 swaps, mover o segundo para cima → ordem persiste no `getState()` e no card de preview (ACM-013).
2. Remover swap → toast com Desfazer; clicar Desfazer restaura na mesma posição, não no fim.
3. Criar swap para slot vazio → aviso âmbar aparece e o swap continua salvável.

Implemented the Swaps section (RF-3) reusing the swap shape already persisted by build-schema.ts (Swap = { id, label, slots: Partial<Record<Slot, EquippedItem|null>> }, cap 20). UI restricts each swap to exactly one slot (a select per row) even though the persisted shape allows a partial record over multiple slots — kept as-is for a possible future multi-slot swap UI, no schema change was needed or made.

Store (src/store/build-store.ts): added addSwap/removeSwap/moveSwap/setSwapLabel/setSwapSlot/setSwapItem/setSwapSpell, plus an exported MAX_SWAPS = 20 mirroring buildStateSchema's swaps.max(20). addSwap is a no-op once MAX_SWAPS is reached (store-level enforcement, tested independently of the UI's disabled button per the ACM-031 lesson). setSwapLabel never persists an empty string (swapSchema.label is min(1)); new swaps default to a non-empty placeholder label so an unedited swap can still pass write validation.

Components: SwapRow.tsx (one row: slot select, current-vs-alternative item icons via ItemIcon, inline label input, up/down reorder buttons disabled at the boundary, remove button) and SwapsSection.tsx (empty state, header with count, "+ Adicionar swap" disabled at the cap). No new color tokens; reused --color-icon-* and --color-enchant. No emoji, hex-only styling (export-safety guard unaffected since this UI isn't in #capture-root yet).

Wired into the live route: src/app/(editor)/build/new/page.tsx now generalizes the single-slot ItemPicker popover to a PickerTarget union (main slot vs swap+slot) so the same SlotPickerPopover/ItemPicker (ACM-008/034) is reused for swap item selection, and derives itemNames/spellCandidatesByItemId from the loaded catalogue for swap rows (parity with SlotCard's display, ACM-007/010).

Tests: src/__tests__/build-store.test.ts gained a "swaps" describe block covering add/remove/label/slot-change/item-equip/spell-select and reorder (explicit first-down and last-up boundary cases, plus a duplicate/gap check on ids), and a store-level cap-enforcement test (25 addSwap calls -> length 20). src/__tests__/build-new-page.test.tsx gained a "Swaps section" describe block rendering the real /build/new route end-to-end: empty state, add, real ItemPicker selection into a swap slot, inline label edit, remove, and the same reorder boundary cases against the real UI buttons.

Deferred (not in the 4 hard ACs, documented per the UX spec but out of scope for this pass): undo-toast on remove (immediate removal instead), the amber "slot vazio no build" banding beyond a plain text note, and the drag handle placeholder (spec itself defers drag past MVP).

make check green (lint/tsc/build/test) on the task branch.

## Review — PR #37 (ACM-012)

Verified independently (not just read): checked out origin/task/12-swaps-section, ran `make check` (green, 300/300 tests), ran targeted probes.

### Regression risk (picker generalization) — CLEAR
- `git diff origin/main...origin/task/12-swaps-section -- src/__tests__/build-new-page.test.tsx` shows zero removed lines: the ACM-034/046/043/027 picker tests (empty-slot open, select, Escape, backdrop, locked offhand, tier/enchant reachability, Salvar) are byte-for-byte untouched, only new `describe` blocks appended. Ran that file in isolation: 16/16 pass.
- `PickerTarget` union in page.tsx is a single `useState<PickerTarget|null>`, so main-picker and swap-picker are structurally mutually exclusive — there is no code path where both can be "open" at once, and selecting for one target cannot write into the other (`handleSelect` branches on `pickerTarget.origin` before dispatching to `actions.setItem` vs `actions.setSwapItem`). No collision found.
- No finding here.

### MAX_SWAPS duplication — MEDIUM
`src/store/build-store.ts:21` hardcodes `export const MAX_SWAPS = 20`, commented as mirroring `buildStateSchema.swaps.max(20)` in `src/lib/build-schema.ts:122`. Confirmed `build-schema.ts` genuinely cannot be imported client-side (`server-only` throws when required outside the Next.js server-component transform — reproduced directly). So some duplication is real and not lazily unavoidable-by-neglect. However: **no test asserts the two numbers stay equal**. Concrete failure scenario: someone bumps `swaps.max(20)` to `.max(10)` in build-schema.ts (or vice versa) without touching build-store.ts — `make check` stays green, but the UI now lets a leader add up to 20 swaps in the editor, `addSwap` never blocks, and the 11th–20th swap is silently dropped/rejected only at Salvar time with a generic write-validation error, far from the point of user action. That is exactly the ACM-054/056 drift class cited in the review brief.
Recommendation: either (a) extract a tiny non-server-only shared constant (e.g. `src/lib/build-limits.ts`, no `server-only` import, no DB/env access) that both `build-schema.ts` and `build-store.ts` import, or (b) if that's judged overkill for one number, add a one-line cross-check test (e.g. in build-store.test.ts) that imports both and asserts `MAX_SWAPS === <value extracted from the schema>`. Neither exists today. Not blocking (doesn't violate a hard AC), but should not ship silently as debt — needs a named follow-up.

### setSwapLabel silently coerces "" to " " — LOW
`build-store.ts:216-224`: `label.length > 0 ? label : " "`. The UX spec in this task's own implementation notes says `label: string; // "" permitido; nunca null`, but the persisted `swapSchema.label` is `min(1)` (from a prior task). The implementer's workaround is to store a single space instead of true "" when the user clears the field. Concrete scenario: leader adds a swap, types a label, then deletes it entirely intending to leave it blank — the field will visually appear empty but the store holds `" "`, which round-trips through save/load and will show as an invisible-but-present character everywhere the label is rendered (e.g. future BuildCard swap display). Cosmetic today (swaps aren't rendered on the card yet) but will be confusing later. Recommend either changing the schema to `min(0)` (spec explicitly allows empty) or trimming to a real non-empty placeholder like the initial "Novo swap" default instead of a space. Not blocking.

### AC verification — PASS
- AC#1–4: add/remove/label all confirmed via both store-level and real-route end-to-end tests; independently reran them green.
- Reorder: `moveSwap` boundary cases (`up` at index 0, `down` at last index) are correct no-ops; verified test asserts no duplicate/gapped ids after a sequence of moves. Confirmed by reading the implementation, not just the test — `moveSwap` bails out (`return {}`) before any splice when `target < 0 || target >= swaps.length`.
- Store-level cap: `addSwap` checks `state.build.swaps.length >= MAX_SWAPS` and no-ops — genuinely store-level, not UI-only (per ACM-031 lesson). Confirmed by reading the reducer, not just the test description.
- Reachability: patched `page.tsx` to remove `<SwapsSection ... />` and reran `build-new-page.test.tsx` — the 5 swap tests failed immediately (`getByRole` couldn't find "+ Adicionar swap"), proving the page-level tests exercise the real wiring, not a mock. Restored the file afterward, confirmed diff clean.
- Persistence compatibility: wrote and ran an ad hoc probe test importing the real `validateBuildContentForWrite`/`parseBuildContent` from `build-schema.ts` — a build with a populated swap passes write validation, and a legacy payload with the `swaps` key deleted entirely still parses without throwing. `src/lib/build-schema.ts` and `src/types/build.ts` have a literal empty diff against origin/main (three-dot), confirming the implementer's claim that no schema/type change was needed. No regression risk to persisted builds.
- Export safety (ACM-029): confirmed `src/components/build-card/BuildCard.tsx` has zero references to swaps — the Swaps UI is not rendered inside `#capture-root` in this PR, so the hex-only export guard is not implicated. Stating explicitly as requested: swaps do not appear in the PNG export yet.
- No hardcoded hex in `SwapRow.tsx`/`SwapsSection.tsx` — all colors are Tailwind/CSS-variable tokens (`--color-icon-*`, `--color-enchant`, `border-icon-slot-empty`, etc.).

### Scope — CLEAR
Diff touches only: task doc, `src/__tests__/build-new-page.test.tsx`, `src/__tests__/build-store.test.ts`, `src/app/(editor)/build/new/page.tsx`, `src/components/editor/SwapRow.tsx`, `src/components/editor/SwapsSection.tsx`, `src/store/build-store.ts`. No `src/actions/**`, `src/db/**`, `ExportBar.tsx`, `rate-limit.ts`, `migrate.ts`, `package.json`, or lockfile touched.

### Rebase risk — noted, low
A naive two-dot `git diff origin/main origin/task/12-swaps-section` shows this branch behind main by the ACM-057 comp-schema work (branch predates that merge). The real three-dot/PR diff (verified against `gh pr diff 37`'s own stat: 7 files, 728/-17) does not touch any of the files ACM-057 changed (`src/actions/comps.ts`, `src/lib/comp-schema.ts`), so a merge/rebase should be conflict-free — but the branch should still be rebased onto current main before merge as routine hygiene, not left stale.

## Verdict: LGTM
No CRITICAL/HIGH findings. Two non-blocking debt items recorded (MAX_SWAPS duplication — MEDIUM; label "" → " " coercion — LOW) for a follow-up task; neither affects the 4 hard ACs.
<!-- SECTION:NOTES:END -->
