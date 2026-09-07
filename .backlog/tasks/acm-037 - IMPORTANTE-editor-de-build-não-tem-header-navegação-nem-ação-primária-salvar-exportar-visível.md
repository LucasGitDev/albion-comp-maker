---
id: ACM-037
title: >-
  IMPORTANTE: editor de build não tem header, navegação, nem ação primária
  (salvar/exportar) visível
status: To Do
assignee: []
created_date: '2026-09-07 17:36'
updated_date: '2026-09-07 18:50'
labels: []
dependencies: []
priority: high
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Em /build/new não existe nenhum header/nav global, breadcrumb, botão de voltar, nem botão de salvar/exportar PNG — a página é só o formulário de nome+papel e a grade de slots, sem chrome nenhum. Um usuário não sabe onde está no fluxo do produto nem como finalizar a comp que está montando. Comparar com https://www.albiononlinebuilds.com/pt/comp/dragon-raid-meele-comp: header fixo com logo/nav/busca/CTA 'Criar', título da comp e tag de categoria (ex: 'PVE GROUP') logo abaixo, botão 'Compartilhar' no canto superior direito da área de conteúdo. Ação: adicionar header persistente com navegação e, na página de edição, uma barra de ação fixa (sticky) com botão primário 'Salvar' / 'Exportar PNG' sempre visível, mesmo com scroll longo.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Header global persistente com logo/marca, navegacao (Home, Builds) e CTA primario 'Criar build', presente em todas as rotas via layout
- [ ] #2 Na pagina de edicao de build existe uma action bar sticky sempre visivel durante scroll longo, com acao primaria 'Salvar' e secundaria 'Exportar PNG'
- [ ] #3 Existe caminho de volta explicito a partir do editor (breadcrumb ou botao voltar) sem depender do back do navegador
- [ ] #4 Header e action bar sao navegaveis por teclado, com foco visivel e landmarks semanticos (header/nav/main)
- [ ] #5 A action bar sticky nao aparece dentro do capture-root do export PNG (nao vaza para a imagem exportada)
- [ ] #6 make check verde e testes cobrindo a presenca do header e o disparo das acoes primarias
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
SPEC: ver doc-004 'Header global, action bar sticky e navegacao do editor'. CORRECAO DE PREMISSA: a descricao original desta task esta ERRADA — Header.tsx JA existe e JA e montado no root layout, portanto JA renderiza em /build/new. O defeito real e outro: (1) CTA 'Nova build' com destaque accent aparece enquanto o usuario ESTA criando uma build (FINDING 5 da review da ACM-038) — deve virar contextual, suprimido em /build/*, dando lugar ao slot de conta; (2) BuildHeader parece um segundo header — remover border-b e o contador de slots, virando bloco de identidade. O trabalho novo de verdade e a ACTION BAR sticky, nao o header. AC#1 ja esta majoritariamente satisfeito.
<!-- SECTION:NOTES:END -->
