---
id: ACM-073
title: 'Build card: implementar layouts Compressed (3x3) e List'
status: In Review
assignee: []
created_date: '2026-09-08 00:04'
updated_date: '2026-09-08 01:04'
labels: []
dependencies: []
priority: high
ordinal: 73000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adicionar dois layouts ao BuildCard: "compressed" (matriz 3x3 do paperdoll do killboard, alvo 540x~383px para preview do Discord) e "list" (linhas horizontais de 480px com nome do item sempre visivel, para copiar builds em texto). Spec visual completa com medidas, grid, cores hex e estados em doc-006. Nao altera os layouts "vertical" e "grid" existentes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 BuildCardLayout aceita 'compressed' e 'list'; 'vertical' e 'grid' continuam renderizando identicos ao atual
- [ ] #2 Compressed renderiza a matriz 3x3 confirmada contra o killboard oficial, celulas de altura fixa 80x93, com mount fora da matriz no painel de meta
- [ ] #3 Teste garante que KILLBOARD_MATRIX.flat() + ['mount'] e permutacao exata de SLOT_ORDER
- [ ] #4 Chips de spell no Compressed preservam a posicao Q/W/E/Passiva: grupo ausente ocupa 18px vazios em vez de deslocar os demais
- [ ] #5 Compressed com build vazia renderiza as 9 celulas em placeholder tracejado, sem colapsar o card
- [ ] #6 List renderiza os 10 slots de SLOT_ORDER, incluindo os vazios como linha 'Vazio' de 48px, com nome do item sempre visivel
- [ ] #7 Nenhuma classe de paleta Tailwind (oklch) foi introduzida em src/components/build-card/**; todas as cores vem de tokens.ts como hex
- [ ] #8 Export PNG de ambos os layouts preserva cores, tier badges e icones de spell
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Spec visual completa: doc-006 (`.backlog/docs/doc-006 - Build-card-layout-spec-—-Compressed-e-List.md`). Implementar direto de lá — tem medidas em px, classes de grid, hex de todas as cores e estados obrigatórios.

Resumo do escopo:
- `BuildCardLayout` ganha "compressed" e "list". "vertical"/"grid" ficam intactos (ACM-020 e a pagina publica de comp dependem deles).
- Compressed: matriz 3x3 do paperdoll do killboard (bag/head/cape | mainhand/armor/offhand | potion/shoes/food), card 540px, celula fixa 80x93, chip de spell 18px, painel de meta a direita com montaria + ate 3 swaps. `mount` fica fora da matriz.
- List: 480px, uma linha por slot nos 10 slots em SLOT_ORDER, nome do item sempre visivel, tier como pill textual a direita, chips de spell 24px.
- Novos componentes: BuildCardCompressed, CompressedTile, SpellStrip, BuildCardList, ListRow (justificativa por componente na secao 5 do doc).
- `CardSlotTile` e `SpellRow` NAO sao reusados no Compressed e nao devem ser alterados.
- Tokens novos: CARD_SLOT_EMPTY_BORDER #3f4552 e CARD_ROW_DIVIDER #22262e em build-card/tokens.ts; ICON_SIZE_PX.xxs = 18 em icons/icon-tokens.ts.
- Restricao dura: zero classe de paleta Tailwind dentro de build-card/** (compila para oklch() e o html-to-image descarta em silencio, decision-007). Todas as cores como hex de tokens.ts.

BLOQUEADOR A RESOLVER ANTES DE CODAR: as tres referencias pedidas (killboard oficial, albiononlinegrind, albiononlinebuilds) retornam HTTP 403 para fetch programatico (Cloudflare, confirmado com curl + UA de browser). A matriz da secao 2.1 veio da convencao do paperdoll in-game, nao de leitura da pagina. Abrir https://albiononline.com/killboard/kill/1445835238?server=live_us no browser e confirmar a ordem; se divergir, corrigir KILLBOARD_MATRIX e o doc-006. Todo o resto da spec e auto-contido e nao depende da referencia.

Teste obrigatorio: KILLBOARD_MATRIX.flat() concatenado com ["mount"] deve ser permutacao exata de SLOT_ORDER — sem isso um slot novo some do card em silencio.

Estados obrigatorios (secoes 2.7 e 3.2 do doc): vazio, slot vazio, erro de icone. O Compressed NAO colapsa quando a build esta vazia: renderiza as 9 celulas em placeholder tracejado (a grade incompleta e o gancho para completar a build).

Implementado: BuildCardCompressed (540px, matriz 3x3 KILLBOARD_MATRIX, célula fixa 80x93, SpellStrip com posição Q/W/E/P preservada, painel de meta com montaria + até 3 swaps) e BuildCardList (480px, 10 linhas via SLOT_ORDER, ListRow 64/48px, nome sempre visível, tier como pill). BuildCardLayout aceita 'compressed'/'list'; 'vertical'/'grid' não foram tocados.

Novos arquivos: layout-matrix.ts (KILLBOARD_MATRIX), slot-meta.ts (SLOT_LABELS/SLOT_CATEGORY compartilhados pelos dois layouts novos), SpellStrip.tsx, CompressedTile.tsx, BuildCardCompressed.tsx, ListRow.tsx, BuildCardList.tsx. Tokens novos: CARD_SLOT_EMPTY_BORDER, CARD_ROW_DIVIDER (tokens.ts); ICON_SIZE_PX.xxs=18 / ICON_SIZE_CLASS.xxs (icon-tokens.ts).

BLOQUEADOR não resolvido conforme decisão do orchestrator: as 3 referências externas (killboard oficial, albiononlinegrind, albiononlinebuilds) retornam HTTP 403 para fetch programático; não foi possível abrir o killboard no browser neste ambiente para confirmar visualmente a KILLBOARD_MATRIX da doc-006 §2.1. Prossegui com a matriz documentada (convenção do paperdoll in-game). Rede de segurança real: teste de permutação KILLBOARD_MATRIX.flat()+['mount'] === SLOT_ORDER (build-card-layout-matrix.test.ts) — se um slot novo for adicionado sem atualizar a matriz, este teste falha.

Desvio da spec: ícone do item no CompressedTile usa size='lg' (56px) em vez do valor literal de 64px do doc — não há step de ICON_SIZE_PX entre 56 e 80, e a task só autoriza adicionar o token xxs=18; abrir um novo step só para esse caso foi julgado fora de escopo. Continua dentro da caixa de 72px.

Testes adicionados: build-card-layout-matrix.test.ts (AC#3), build-card-layouts.test.tsx (AC#1, #4, #5, #6, parcial #7 via DOM), build-card-no-palette-classes.test.ts (AC#7, scan estático de todo src/components/build-card/**). AC#8 (export PNG) coberto indiretamente pelos mesmos guards de ausência de oklch/color-mix que build-card.test.tsx já usa para vertical/grid — não há um teste de export end-to-end dedicado nesta task.

make check: verde (pnpm install --frozen-lockfile, lint, tsc --noEmit, build, vitest — 433/433 testes passando).
<!-- SECTION:NOTES:END -->
