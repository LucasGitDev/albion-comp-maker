---
id: ACM-075
title: 'Editor: reduzir densidade do SlotCard (ícone + nome em linha compacta)'
status: In Progress
assignee: []
created_date: '2026-09-08 00:09'
updated_date: '2026-09-08 15:01'
labels: []
milestone: m-3
dependencies:
  - ACM-039
  - ACM-074
ordinal: 75000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fatiado da ACM-039, que ficou com a cor de categoria. Esta task cobre o eixo de densidade.

Problema: o SlotCard hoje é vertical e alto — src/components/editor/SlotCard.tsx:165 (w-full md:w-[168px], flex-col, p-3), :188 ícone size-24 empilhado acima do nome em :212 (line-clamp-2), mais a fileira de tier/enchant em :217 e o SpellPicker em :238. Com 10 slots por build, uma comp de 6 papéis não cabe em uma tela. A referência (albiononlinebuilds.com) usa ícone + nome lado a lado numa linha compacta.

Restrições:
- src/components/editor/SlotGrid.tsx:63 usa grid-cols-2 no mobile e flex-col em md+ (ACM-041). O layout compacto tem que preservar o 2-up mobile e as âncoras #slot-group-<id> do SlotGroupNav.
- O SlotCard continua sendo o alvo do popover de item pick; a área clicável não pode encolher abaixo de 44x44 CSS px.
- Este card é do EDITOR. Não alterar src/components/build-card/ (layout do PNG exportado).

Depende da ACM-039 (mesmo arquivo, SlotCard.tsx) e deve ser feita depois da ACM-074, que também toca SlotCard/SpellPicker — serializar para evitar conflito.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 No SlotCard preenchido, ícone e nome do item ficam na mesma linha horizontal (ícone à esquerda, nome à direita), não mais empilhados
- [ ] #2 A altura renderizada de um SlotCard preenchido sem seletores de tier/enchant e sem abilities cai pelo menos 30% em relação ao main atual, medido e registrado nas notas da task (valor antes e depois em px)
- [ ] #3 A área clicável que abre o item picker permanece com no mínimo 44x44 CSS px
- [ ] #4 Mobile (<768px) continua em grid de 2 colunas e as âncoras id="slot-group-<id>" continuam funcionando no SlotGroupNav (clicar em um chip rola até o grupo correto)
- [ ] #5 Badges de tier e de enchant continuam visíveis e legíveis no novo tamanho de ícone, sem sobreposição ao nome do item
- [ ] #6 O nome do item longo é truncado com reticências em vez de quebrar a altura do card, e o nome completo permanece disponível via atributo title
- [ ] #7 Nenhum arquivo em src/components/build-card/ é modificado
- [ ] #8 Teste automatizado cobrindo truncamento do nome longo e presença do title com o nome completo
- [ ] #9 make check verde
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Verificação manual
1. Abrir /build/new em desktop (>=1280px) e preencher os 10 slots. Esperado: os 4 grupos cabem em uma tela sem scroll vertical, ou com scroll visivelmente menor que antes.
2. Reduzir a janela para <768px. Esperado: grid de 2 colunas preservado; clicar em cada chip do SlotGroupNav rola até o grupo certo.
3. Equipar um item de nome longo. Esperado: nome truncado em uma linha com reticências; hover mostra o nome completo; a altura do card não muda.
<!-- SECTION:NOTES:END -->
