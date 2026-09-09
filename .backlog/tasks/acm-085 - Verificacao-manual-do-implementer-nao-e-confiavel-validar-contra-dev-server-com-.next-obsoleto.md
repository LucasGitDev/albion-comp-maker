---
id: ACM-085
title: >-
  Verificacao manual do implementer nao e confiavel: validar contra dev server
  com .next obsoleto
status: To Do
assignee: []
created_date: '2026-09-08 13:40'
updated_date: '2026-09-09 03:07'
labels: []
dependencies: []
priority: low
ordinal: 83000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Descoberto pelo ui-reviewer na ACM-039 (PR #51), e e um defeito do HARNESS, nao daquela task.

O que aconteceu: o implementer registrou nas notas da task que os 3 passos de verificacao manual passaram ('OK'), tendo validado via curl contra um dev server ja em execucao. Esse server servia um .next obsoleto: o HTML baixado NAO continha nenhum data-slot-category nem qualquer cor de categoria. Ou seja, a feature nao estava na pagina que ele inspecionou, e mesmo assim ele reportou sucesso. So apos matar o processo e rodar 'rm -rf .next && npm run dev' a mudanca apareceu.

Neste caso o codigo estava correto e o ui-reviewer confirmou tudo depois do restart limpo. O problema e que a verificacao manual produziu um VERDE FALSO. Se o codigo estivesse errado, o resultado reportado teria sido exatamente o mesmo. Uma verificacao que retorna 'OK' independentemente do estado do codigo tem valor informativo zero, e pior: cria confianca infundada.

Isso e sistemico. O CLAUDE.md exige verificacao manual para toda task com superficie de UI (Definition of Done item 3) e confia no auto-relato do implementer. Precisa de um procedimento que nao possa passar por acidente.

Mitigacoes a avaliar:
- Passo obrigatorio de build limpo antes de qualquer verificacao manual (matar dev server, rm -rf .next)
- A verificacao deve exigir uma assercao POSITIVA especifica da mudanca (ex.: grep pelo marcador novo no HTML) e falhar explicitamente se ausente, em vez de inspecao visual narrada
- Preferir teste automatizado renderizando o componente ao inves de curl contra dev server
- Manter ui-reviewer obrigatorio em task de UI: foi o unico controle que pegou isso
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Existe procedimento documentado de verificacao manual que comeca por build limpo (dev server morto + .next removido)
- [ ] #2 A verificacao manual exige assercao positiva do marcador especifico da mudanca; ausencia do marcador reprova explicitamente
- [ ] #3 O procedimento esta refletido no CLAUDE.md e/ou na definicao do agente implementer, nao apenas nesta task
- [ ] #4 ui-reviewer permanece obrigatorio para tasks com superficie de UI
<!-- AC:END -->
