---
id: ACM-080
title: >-
  Build card: corrigir desvios cosmeticos de spec no Compressed e List (ACM-073
  review)
status: In Review
assignee: []
created_date: '2026-09-08 01:11'
updated_date: '2026-09-08 14:50'
labels: []
dependencies: []
priority: low
ordinal: 80000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Findings de review da ACM-073, nao bloqueantes, agrupados por tocarem os mesmos arquivos.

MEDIUM - Compressed, estado vazio (doc-006 secao 2.7): spec pede 'Sem nome' em italico/muted quando mainhand === null. Medido via computed style: font-style normal e color CARD_FG em vez de CARD_FG_MUTED. O card reusa o h2 do estado preenchido, so trocando o texto.

LOW - CompressedTile.tsx:65: color '#ffffff' hardcoded; deveria vir de token conforme doc-006 secao 4.

LOW - BuildCardList.tsx:81: icone do swap em xs (24px) dentro de wrapper size-8 (32px); spec pede 32px. Sem comentario justificando o desvio.

Restricao herdada: zero classe de paleta Tailwind em src/components/build-card/** (decision-007). Cores como hex de tokens.ts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Estado vazio do Compressed renderiza 'Sem nome' em italico com CARD_FG_MUTED, verificado por computed style em teste
- [x] #2 CompressedTile nao contem literal '#ffffff' inline; cor vem de token em tokens.ts
- [x] #3 Icone de swap no BuildCardList mede 32px, alinhado ao wrapper size-8
- [x] #4 make check verde e teste estatico de ausencia de classe de paleta continua passando
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
BLOQUEADA por sobreposicao de arquivos com a ACM-014 (PR #50, aberto). O PR #50 reescreve exatamente os arquivos-alvo desta task: CompressedTile.tsx (+7/-5), BuildCardList.tsx (+12/-9) e tokens.ts (+27/-2). Implementar agora garante conflito de merge, e os findings podem ja estar resolvidos ou deslocados pelo theme system. Serializar: so iniciar apos o merge do PR #50, e revalidar os 3 findings contra o codigo novo antes de implementar.

Revalidado apos merge do PR #50 (ACM-014): os 3 findings ainda existiam, apenas deslocados pelo theme system.

1) AC#1 (MEDIUM): a string 'Sem nome' do estado vazio nao vive em CompressedTile.tsx (esse componente nao renderiza nome de build/item) — vive no h2 de BuildCardCompressed.tsx. Ajustei escopo para incluir esse arquivo (unico jeito de satisfazer o AC), documentado aqui em vez de expandir silenciosamente. Fix: h2 agora usa fontStyle italic + tokens.fgMuted quando mainhand === null, mantendo normal/tokens.fg quando ha build. Teste por computed style (getComputedStyle) em build-card-layouts.test.tsx cobre os dois estados.

2) AC#2 (LOW): '#ffffff' hardcoded no badge de enchant de CompressedTile.tsx (linha ~67 no codigo atual, pos PR#50) — movido para novo token CARD_ENCHANT_BADGE_TEXT em tokens.ts. Nao toquei BuildCardVertical.tsx/CardSlotTile.tsx, que tem o mesmo padrao mas estao fora do escopo desta task.

3) AC#3 (LOW): icone do swap em BuildCardList.tsx usava size='xs' (24px) dentro do wrapper size-8 (32px) — trocado para size='sm' (32px), com comentario justificando.

4) AC#4: make check verde (lint, tsc, build, vitest 571/571) e teste estatico de ausencia de classe de paleta (build-card-no-palette-classes.test.ts) continua passando; adicionei um teste estatico dedicado la para o literal '#ffffff' em CompressedTile.tsx.
<!-- SECTION:NOTES:END -->
