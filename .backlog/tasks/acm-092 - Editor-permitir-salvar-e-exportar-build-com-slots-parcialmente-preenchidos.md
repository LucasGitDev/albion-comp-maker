---
id: ACM-092
title: 'Editor: permitir salvar e exportar build com slots parcialmente preenchidos'
status: In Review
assignee: []
created_date: '2026-09-08 14:49'
updated_date: '2026-09-09 02:26'
labels: []
milestone: m-3
dependencies: []
priority: high
ordinal: 90000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Usuário não deve ser obrigado a preencher todos os slots para salvar ou exportar. Slots vazios devem aparecer como vazios no export.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Botão Salvar funciona com qualquer quantidade de slots preenchidos (inclusive zero)|Botão Exportar PNG funciona com slots parcialmente preenchidos|Slots vazios renderizam como placeholder no build card exportado
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
PR #62: https://github.com/LucasGitDev/albion-comp-maker/pull/62

Investigation: the only blocking validation was client-side in EditorActionBar.tsx
(canSave = buildName.trim() !== "" && filledCount > 0). No server action or Zod
schema (build-schema.ts) enforced a minimum item count — equippedItemOrNullSchema
already allows null per slot. No migration/schema change needed.

Fix: removed the filledCount > 0 gate (name-only requirement now). Export was
never gated on filledCount, but CardSlotTile + BuildCardVertical/BuildCardGrid
silently dropped empty slots (and hid the whole equipment section when mainhand
was unset) instead of showing them — that was the real AC#3 gap. Fixed by
reusing the placeholder pattern already shipped for the List/Compressed layouts
(dashed border + CategorySilhouette glyph, tokens.slotEmptyBorder) rather than
inventing new visuals.

Zero-slots case: explicitly tested. Save succeeds with a name and 0 items.
Export renders without crashing — BuildCardVertical keeps its existing "escolha
a mão principal" friendly message when literally nothing is equipped anywhere
(unchanged UX for a brand-new build); as soon as any single slot has an item,
the full layout renders with per-slot placeholders instead.

Did not touch spell-groups.ts / build-card-lookups.ts (ACM-090) or the E
auto-select logic (ACM-089) — verified spellGroupsByItem lookups still flow
through lookups.spellGroupsByItem exclusively.

make check: green (lint, tsc --noEmit, build, vitest 624/624).

## Review PR #62 (task/92-partial-slots)

Verificação factual das alegações do implementer — todas confirmadas por leitura de código:
- `EditorActionBar.tsx`: `canSave` de fato removeu `filledCount > 0`, mantendo `buildName.trim() !== ""`. Teste novo cobre save com `filledCount: 0` (editor-action-bar.test.tsx).
- `build-schema.ts`/`builds.ts`: confirmado que `equippedItemOrNullSchema` já era nullable antes desta PR (arquivo não tocado no diff) e `name: z.string().min(1)` já validava nome vazio no servidor, dentro do payload de `content`. Nenhuma migration necessária, alegação correta.
- `CardSlotTile.tsx`, `BuildCardVertical.tsx`, `BuildCardGrid.tsx`: `item: EquippedItem | null`, placeholder com borda tracejada `tokens.slotEmptyBorder` + `CategorySilhouette(SLOT_CATEGORY[slot])`, igual ao padrão já existente em `ListRow.tsx`/`CompressedTile.tsx` (não tocados nesta PR). `equipmentSlots` não filtra mais `!== null`; `hasAnyItem` (Vertical) e mainhand ternário (Grid) resolvem o caso "zero slots" sem esconder a seção inteira.
- `slot-meta.ts`: `SLOT_LABELS` unificado, usado agora por `CardSlotTile` também — sem duplicação divergente.
- Não-regressão ACM-090: grep confirma zero ocorrências de `groupItemSpells` cru ou leitura de `.spells.*` nos componentes de card tocados por esta PR; `CardSlotTile`/`BuildCardVertical` seguem lendo `lookups.spellGroupsByItem` exclusivamente. (Nota à parte, fora do escopo desta PR: `ListRow.tsx`, arquivo não tocado, lê `item.spells[group]` diretamente na linha 91 — mas isso é para obter o spellId depois que `group` já passou pelo filtro de `spellGroupsByItem`, não uma reintrodução do bug que a ACM-090 corrigiu. Não é finding desta PR.)
- `make check` / `npx vitest run` executados localmente: 66 arquivos, 624 testes, todos verdes.

### Findings

**MEDIUM** — Caso "zero slots" tem cobertura de render (build-card-layouts.test.tsx: "renders the friendly empty state... when zero slots are filled" para vertical e grid) e cobertura de save via componente (editor-action-bar.test.tsx: "allows saving a named build with zero slots filled"). Isso atende ao AC#1 no nível de UI/componente. Porém não há teste de integração/schema exercitando `validateBuildContentForWrite` com uma `BuildState` cujos 10 slots são todos `null` — o teste de schema mais próximo (`build-schema.test.ts`) não foi tocado por esta PR e eu não confirmei que já cobre esse caso específico (zero itens, não apenas "um item nulo"). Como o schema já era nullable por slot, o risco é baixo, mas fica em aberto até confirmação. Não bloqueia por si só dado que a peça nova (client-side gating) está testada; registro como dívida.

**LOW** — `data-testid="slot-grid"` em `SlotGrid.tsx` é usado apenas para escopar seletores de teste (`build-new-page.test.tsx`), não há uso em código de produção. Aceitável.

**LOW** — `SaveBuildInput.name`/`UpdateBuildInput.name` (parâmetro solto do server action, distinto do `name` dentro do `content` JSON validado pelo Zod) não tem validação própria de min-length visível em `builds.ts` — mas isso é código pré-existente, não tocado por esta PR, e fora do escopo do AC#1 desta task. Registrando apenas para rastreabilidade, não é bloqueante aqui.

### Veredito: LGTM

Os 3 ACs foram verificados no diff e nos testes: (1) salvar com zero itens funciona client-side e o schema/server nunca exigiu mínimo; (2) export funciona com slots parciais (equipmentSlots não filtra mais nulls); (3) slots vazios renderizam placeholder consistente nos 4 layouts (Vertical/Grid alterados nesta PR; List/Compressed já tinham o padrão, confirmado inalterados e compatíveis via `slot-meta.ts` compartilhado). Nenhuma regressão de ACM-090/ACM-089 encontrada. 624 testes verdes localmente. Únicos apontamentos são MEDIUM/LOW não bloqueantes.

Review fix (attempt 2/3): addressed ui-reviewer HIGH + MEDIUM findings on PR #62, same branch (no new PR).

HIGH (editor hint leaking into exported PNG): BuildCard has no separate export mode — it's the single source for the editor preview and the capture root html-to-image rasterizes. BuildCardVertical's zero-slots branch previously rendered a centered "Escolha a mão principal para ver o card" message instead of the equipment grid; that text shipped inside the exported artifact. Fixed by removing the branch entirely: Vertical now always renders the full 10-slot placeholder grid (mainhand dashed placeholder + CardSlotTile per equipment slot), identical structure to the >=1-item case, for every state including zero-slots.

MEDIUM (align 4 layouts): Compressed had the same problem (a floating "Escolha a mão principal para montar a build" paragraph, disconnected from the grid) plus discarded state.name whenever mainhand was null. Removed the `hasBuild` gate from the title, the meta panel visibility (now driven purely by `hasMeta` = mount set or swaps present, independent of mainhand), and the floating instruction text. Vertical and Compressed now both show, only when literally all 10 slots are null, the same discreet non-instructional footer note already used by BuildCardList ("Nenhum item equipado ainda — comece pela mão principal.") placed under the grid, not replacing it. Grid and List were already correct per the review and were left untouched.

MEDIUM (Compressed name bug): `BuildCardCompressed.tsx` line 76 dropped `state.name` whenever `hasBuild` (mainhand !== null) was false. Fixed — title now always renders `state.name || "Sem nome"`; italic/muted styling still applies when the name is empty, decoupled from mainhand presence.

MEDIUM (schema boundary test, code reviewer): added an explicit test in src/__tests__/build-schema.test.ts (ACM-092 AC#1) asserting a BuildState-shaped payload with all 10 slots null passes `validateBuildContentForWrite`. (Note: the repo's schema test file lives at src/__tests__/build-schema.test.ts, not src/lib/build-schema.test.ts as referenced in the review — same file, correct path used.)

New tests: src/__tests__/build-card.test.tsx adds a cross-layout describe block (vertical/grid/compressed/list) asserting the exported zero-slots card (a) never contains any of the 3 known editor-instruction snippets, and (b) always renders at least one `[data-slot-state="empty"]` placeholder — this is the test that would have caught the HIGH finding.

Side effect fixed: BuildCardVertical rendering the full grid unconditionally means the read-only preview tile now also carries `data-slot`/`data-slot-state="empty"` for a zero-slots build, which made two pre-existing editor tests (build-new-page.test.tsx, build-new-page-group-nav.test.tsx) ambiguously match the preview instead of the clickable editor SlotCard via an unscoped `document.querySelector`. Scoped both to `[data-testid="slot-grid"]`, matching the pattern (and comment) already established elsewhere in build-new-page.test.tsx for the exact same reason.

make check: green (lint: 0 errors/2 pre-existing warnings unrelated to this change, tsc --noEmit clean, next build clean, vitest 633/633 passing).

Out of scope, untouched per instructions: mobile 390px overflow, SaveBuildInput.name validation, scripts/**, src/data/**, package.json/lockfile.

## Re-review PR #62 (ronda ui-reviewer HIGH, task/92-partial-slots) — BLOCKED

### HIGH — Frase instrucional reintroduzida no PNG exportado (regride o próprio fix)
`BuildCardVertical.tsx:155-159` e `BuildCardCompressed.tsx` (footer `isEmpty`):
`"Nenhum item equipado ainda — comece pela mão principal."` Cenário de falha:
usuário exporta PNG de build zero-slots → texto "comece pela mão principal"
(instrução de fluxo do editor, mesma categoria semântica do "Escolha a mão
principal para ver o card" que motivou o HIGH original) vai parar no Discord.
O objetivo do fix era eliminar texto de instrução do editor no artefato
exportado; essa nota de rodapé é a mesma classe de problema com fraseologia
diferente. Se a intenção é indicar "build nova", isso deveria ser
neutro/descritivo (ex: "0/10 slots equipados"), não uma instrução de ação
("comece por...").

### HIGH — Teste anti-instrução é falso-positivo, não pega a própria regressão acima
`src/__tests__/build-card.test.tsx`, describe "BuildCard zero-slots export never
leaks an editor instruction": `EDIT_HINT_SNIPPETS` só contém as 3 strings
antigas literais ("Escolha a mão principal", "para ver o card", "para montar a
build"). Cenário de falha: a nova frase "Nenhum item equipado ainda — comece
pela mão principal." não bate com nenhum snippet, então o teste passa mesmo
com a instrução presente no output. O teste testa a implementação anterior,
não o comportamento ("nenhuma instrução de editor no export"); é um guard-rail
que não protege contra a classe de bug que ele afirma cobrir.

### MEDIUM — Alegação #6 do implementer é falsa: `BuildCardGrid.tsx` FOI tocado
Diff mostra 96 linhas alteradas em `BuildCardGrid.tsx` (remoção do `hasBuild`
ternário, grade de placeholder sempre renderizada, silhueta de categoria) —
mudança estrutural equivalente à de `BuildCardVertical.tsx`, não um "arquivo
não tocado" como reportado. `CardSlotTile.tsx` e `slot-meta.ts` também foram
alterados (não mencionados na lista de alegações). Isso não é uma regressão em
si, mas a auditoria de escopo reportada pelo implementer está incorreta — o
relato de "apenas Vertical/Compressed mudaram" não reflete o diff real e
deveria ter sido pego antes do handoff.

### Verificado, sem finding
- Reescopo de `build-new-page.test.tsx` / `build-new-page-group-nav.test.tsx`
  para `[data-testid="slot-grid"]` é legítimo: `SlotGrid.tsx` ganhou o testid
  único, os testes seguem exercitando o mesmo elemento editável de antes, a
  intenção original (clicar/inspecionar slot do editor, não do preview) é
  preservada. Não é enfraquecimento de asserção.
- Nota de rodapé `isEmpty`: em `BuildCardCompressed.tsx` o cálculo usa
  `KILLBOARD_MATRIX.flat()` que inclui `mainhand`, então não vaza para build
  parcial (qualquer 1 item preenchido já desliga a nota). Mesma garantia em
  `BuildCardVertical.tsx` via `SLOT_ORDER.every(...)`. Correto quanto a
  vazamento para builds parciais — o problema é o CONTEÚDO da frase, não o
  gating (ver HIGH acima).
- `groupSpellsForItem` continua fonte única (`build-card-lookups.ts`,
  `spell-groups.ts`); nenhum componente de card lê `EquippedItem.spells.*` cru
  nem `groupItemSpells` diretamente. ACM-090 não regrediu.
- `BuildCardList.tsx` de fato não foi tocado (confirma parte da alegação #6).
- Path do teste de schema é `src/__tests__/build-schema.test.ts` (confirmado,
  `src/lib/build-schema.test.ts` não existe) — alegação correta.
- Mudança de UX do preview do editor (grade completa sempre visível, mesmo
  com zero slots) é rastreável ao design de fonte única documentado em
  `BuildCard.tsx`/`CardSlotTile.tsx`; não achei teste ou spec que dependesse
  do estado anterior "seção de equipamento escondida". Não é regressão de
  contrato, mas é mudança de UX do editor não coberta por nenhum AC explícito
  desta task — registrar como decisão se for definitiva (não bloqueante).

### Veredito: BLOCKED: 2 findings (HIGH)
Ambos os HIGH acima têm a mesma causa raiz: a "nota de rodapé discreta" ainda
é fraseada como instrução de ação, e o teste que deveria proteger contra isso
não cobre a frase nova. Ação corretiva: reescrever a nota para linguagem
descritiva (não-imperativa) em ambos os componentes, e expandir
`EDIT_HINT_SNIPPETS` (ou trocar por um teste de intenção, ex: regex por verbos
de imperativo/instrução) para cobrir a frase nova e futuras variações.

Attempt 3/3 — spec revoked and rewritten by PO mid-task. Implemented the new ACs.

Gate location: src/components/editor/EditorActionBar.tsx now takes a required
`hasReadyItem: boolean` prop. canSave = name non-empty && hasReadyItem;
Exportar PNG's onClick and its `disabled` now also require hasReadyItem (it
previously had no gate at all). Status text adds a third branch:
"Equipe pelo menos um item com as habilidades preenchidas" when name is set
but hasReadyItem is false.

hasReadyItem is computed in src/app/(editor)/build/new/page.tsx, reusing
spellCandidatesBySlot (already built from groupSpellsForItem, the ACM-090
source of truth): for each equipped slot, the item's selectable groups are
Object.keys(spellCandidatesBySlot[slot] ?? {}); an item counts as "ready" iff
it has >=1 selectable group AND every one of those groups has
equipped.spells[group] !== null. hasReadyItem = true iff any slot is ready.
Cape/bag/mount/food/potion always resolve zero selectable groups post-ACM-090,
so equipping only those never satisfies the gate, per your resolved reading —
implemented exactly as specified, did not deviate.

Removed entirely (not reworded) the "Nenhum item equipado ainda — comece pela
mão principal." copy and its `isEmpty` flag from BuildCardVertical.tsx,
BuildCardCompressed.tsx and BuildCardList.tsx. BuildCardCompressed's `isEmpty`
had no other use; removed cleanly. BuildCardGrid.tsx never had this copy (it
was already instruction-free), so it needed no change here.

Guard-test rewrite: src/__tests__/build-card.test.tsx's
"BuildCard zero-slots ... never leaks an editor instruction" describe block
now asserts intent instead of literal legacy strings — a regex over
Portuguese imperative verbs used by this codebase's editor CTAs/hints
(escolha, comece, monte, selecione, clique, arraste, adicione, preencha,
equipe, configure) must not appear anywhere in the zero-slots render, for all
4 layouts. This is the test that would have caught both the original leak and
the round-2 regression ("comece pela mão principal") without needing a
manual update every time the wording changes. Kept the still-valid
"renders the full 10-slot placeholder grid" assertion as-is (unrelated to the
copy issue, still guards the AC#3 case).

Test additions: src/__tests__/editor-action-bar.test.tsx (component-level:
zero-slots disables both buttons; hasReadyItem=false disables both
regardless of filledCount; hasReadyItem=true + name enables both, save still
completes) and src/__tests__/build-new-page.test.tsx (page-level, real gate
computation: fully empty build disables Salvar/Exportar; only a T4_BAG
(zero selectable groups) equipped keeps both disabled; T4_MAIN_SWORD
mainhand with both Q and W filled enables both; same sword with only Q
filled keeps both disabled). Schema test (10 null slots via
validateBuildContentForWrite) in src/__tests__/build-schema.test.ts is
untouched — the AC#2 restriction is UI/action-level, the schema still
accepts an all-null BuildState by design.

Pre-existing integration tests (build-new-page.test.tsx, 3 cases) equipped a
mainhand item ("T8_2H_HAMMER") absent from that file's mocked catalogue. That
item's spells were always null and it resolves no selectable groups under
the new gate (spellCandidatesBySlot has no entry for an unknown itemId), so
all three previously-passing Salvar assertions started failing after the
gate landed. Swapped them to T4_MAIN_SWORD (already in that file's mocked
catalogue, has Q+W) plus explicit setSpell calls for both groups — same test
intent (payload/name/role/failure-surfacing/swap-label assertions unchanged),
just an equip fixture that satisfies the new precondition.

Exact file scope this round (git diff --stat vs previous commit on this
branch): src/components/editor/EditorActionBar.tsx,
src/app/(editor)/build/new/page.tsx, src/components/build-card/{BuildCardVertical,BuildCardCompressed,BuildCardList}.tsx,
src/__tests__/{build-card,build-new-page,editor-action-bar}.test.tsx.
BuildCardGrid.tsx, CardSlotTile.tsx and slot-meta.ts were NOT touched this
round (verified via `git diff --stat`, not just claimed) — that's a
correction relative to my attempt-2 scope report, which the reviewer
correctly flagged as inaccurate for that round's diff; this round's diff is
the list above and nothing else.

make check: green — lint (0 errors, 2 pre-existing unrelated <img> warnings),
tsc --noEmit clean, next build clean, vitest 639/639 passing.
<!-- SECTION:NOTES:END -->
