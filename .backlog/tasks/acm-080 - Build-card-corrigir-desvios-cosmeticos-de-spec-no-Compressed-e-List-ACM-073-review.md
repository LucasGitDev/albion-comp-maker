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
- [ ] #1 Estado vazio do Compressed renderiza 'Sem nome' em italico com CARD_FG_MUTED, verificado por computed style em teste
- [ ] #2 CompressedTile nao contem literal '#ffffff' inline; cor vem de token em tokens.ts
- [ ] #3 Icone de swap no BuildCardList mede 32px, alinhado ao wrapper size-8
- [ ] #4 make check verde e teste estatico de ausencia de classe de paleta continua passando
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
BLOQUEADA por sobreposicao de arquivos com a ACM-014 (PR #50, aberto). O PR #50 reescreve exatamente os arquivos-alvo desta task: CompressedTile.tsx (+7/-5), BuildCardList.tsx (+12/-9) e tokens.ts (+27/-2). Implementar agora garante conflito de merge, e os findings podem ja estar resolvidos ou deslocados pelo theme system. Serializar: so iniciar apos o merge do PR #50, e revalidar os 3 findings contra o codigo novo antes de implementar.
<!-- SECTION:NOTES:END -->
