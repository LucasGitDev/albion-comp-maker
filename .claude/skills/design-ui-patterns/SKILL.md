---
name: design-ui-patterns
description: Padrões prontos para as telas que todo SaaS tem — tabela e lista, formulário, dashboard, modal, navegação, estados vazios e feedback de ação. Use ao desenhar ou implementar qualquer tela recorrente de produto.
---

# Padrões de tela de SaaS

Não invente onde existe convenção. O usuário não quer aprender a sua tabela.

## Lista / tabela

Toolbar acima: busca, filtros, ação primária à direita. Colunas: identificador primeiro, status com badge, ação no fim. Linha inteira clicável leva ao detalhe; ações destrutivas ficam em menu, nunca soltas na linha.

Paginação sempre. Ordenação só nas colunas que fazem sentido. Filtro aplicado tem que aparecer como chip removível — filtro invisível gera ticket de "sumiu meu dado".

**Vazio de verdade** (nunca teve dado): título, uma frase do que é, botão de criar.
**Vazio de filtro** (busca sem resultado): "Nenhum resultado para X" + limpar filtros. São telas diferentes; tratar como uma é erro clássico.

## Formulário

Uma coluna. Label acima do campo, sempre visível (placeholder não é label). Agrupe em seções com título quando passa de 7 campos. Campo opcional marcado como "(opcional)" — marcar os obrigatórios com asterisco é pior, porque a maioria é obrigatória.

Erro por campo, abaixo dele, dizendo como corrigir. Validação no blur, nunca a cada tecla. Botão primário à direita embaixo; cancelar é link, não botão de peso igual.

Formulário longo salva rascunho ou avisa antes de sair.

## Modal

Só para: confirmação destrutiva, ou formulário curto (≤5 campos) sem contexto perdido. Fluxo de mais de um passo, ou que precisa do que está atrás, vira página ou painel lateral. Modal dentro de modal nunca.

Confirmação destrutiva: diga o que será apagado, com nome. "Apagar contrato *Acme 2026*?" O botão diz o verbo ("Apagar"), nunca "OK".

## Feedback de ação

Ação rápida → estado otimista + toast curto. Ação lenta → botão em pending, desabilitado, sem trocar o layout. Falhou → mensagem no contexto da ação, com retry; toast de erro que some em 3s é como não avisar.

## Dashboard

Máximo 4 números no topo, cada um com comparação ("+12% vs. mês anterior" — número sem referência não informa). Um gráfico principal, não seis. Se o usuário precisa de tudo, ele precisa de um relatório, não de um dashboard.

## Navegação

Sidebar com no máximo 7 itens de primeiro nível. Estado ativo óbvio. Breadcrumb quando a hierarquia passa de 2 níveis. Seletor de tenant/workspace sempre no topo, sempre visível — usuário que não sabe em qual workspace está cria dado no lugar errado.
