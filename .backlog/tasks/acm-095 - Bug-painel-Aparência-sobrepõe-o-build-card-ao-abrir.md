---
id: ACM-095
title: 'Bug: painel Aparência sobrepõe o build card ao abrir'
status: In Progress
assignee: []
created_date: '2026-09-09 02:31'
updated_date: '2026-09-09 03:12'
labels: []
milestone: m-3
dependencies: []
priority: high
ordinal: 93000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Clicar em 'Aparência' abre um painel lateral que sobrepõe o build card em vez de empurrar o layout. O card fica cortado/oculto. Deve ser um drawer fixo à direita que reduz o espaço do editor, ou um modal separado.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Painel de aparência não oculta o build card|Layout do editor ajusta para acomodar o painel aberto|Fechar o painel restaura o layout original|Funciona em desktop (min 1024px)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
REVISÃO VISUAL (design-ui-review) — SHA auditado 2333335efe6bd51140479fdbe05e997ffbdc1d6d — VEREDITO: BLOQUEADO

Testado via Playwright headless em /build/new, larguras 1024/1280/1440/1920, painel Aparência aberto/fechado. Screenshots em /private/tmp/claude-501/.../scratchpad/screens/.

[CRÍTICO] O fix (overflow-x-auto na coluna de preview) NÃO resolve o bug original, apenas troca "sobreposto" por "cortado com scroll invisível". Em TODAS as larguras testadas (1024, 1280, 1440, 1920px), com o painel aberto o BuildCard (960px fixos) fica visualmente CORTADO nas laterais (ex.: colunas "ENTO"/"IAS" à esquerda e "all" à direita ficam parcialmente fora da área visível) e a coluna de preview mede scrollWidth(852) > clientWidth(744) — ou seja, exige scroll horizontal para ver o card inteiro. Não há nenhuma indicação visual de scrollbar/affordance de scroll na screenshot, então o usuário não percebe que há conteúdo cortado disponível via scroll. AC1 ("painel não oculta o card") não é satisfeito de fato — o card continua parcialmente inacessível/invisível sem ação extra do usuário.

[CRÍTICO] clientWidth da coluna de preview com painel aberto é IDÊNTICO (744px) em 1024, 1280, 1440 E 1920px de viewport. Isso prova que o layout não "ajusta para acomodar o painel" (AC2) de forma responsiva — é um valor fixo que ignora o espaço disponível. Em 1920px sobram >1600px para a coluna de preview (1920 - 320 do aside), mas mesmo assim o card de 960px é cortado igual ao caso de 1024px. Isso é um bug de layout, não uma limitação de espaço em telas pequenas.

[MÉDIO] O próprio painel <aside> de Aparência também aparenta ficar cortado à direita em 1024px (textos "até 4 MB", "#3f8f4a", "nomes ocultos" cortados na borda direita da viewport) — o painel não teria sido dimensionado para caber junto ao mínimo declarado de 1024px.

[OK] AC3 (fechar o painel restaura o layout original) — CONFIRMADO. rootRect do BuildCard volta a 960px de largura e à posição x original em todas as larguras testadas após fechar o painel.

[OK] Bug original de overlap direto (aside sobrepondo BuildCard) não ocorre mais no sentido de que o scroller clipa o conteúdo em vez de desenhar por cima — mas isso não é equivalente a "não ocultar", ver finding crítico acima.

Tabela de larguras (painel aberto), coluna preview clientWidth vs scrollWidth vs card cabe sem scroll:
| Largura viewport | clientWidth col. preview | scrollWidth | Cabe sem scroll? |
|---|---|---|---|
| 1024px | 744 | 852 | NÃO |
| 1280px | 744 | 852 | NÃO |
| 1440px | 744 | 852 | NÃO |
| 1920px | 744 | 852 | NÃO |

Painel fechado, em todas as larguras: clientWidth = 960 = scrollWidth (card cabe perfeitamente, sem scroll) — confirma que a regressão só existe com o painel aberto.

Recomendação (não implementar, apenas registro): a coluna de preview precisa usar flex/grid responsivo real com base no espaço remanescente (viewport - largura do aside), não um valor fixo; e/ou reduzir a escala do BuildCard (transform: scale) quando o espaço disponível for menor que 960px, com indicação visual clara de scroll caso o scroll continue sendo necessário.
<!-- SECTION:NOTES:END -->
