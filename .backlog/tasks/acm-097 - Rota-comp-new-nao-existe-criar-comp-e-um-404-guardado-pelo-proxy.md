---
id: ACM-097
title: 'Rota /comp/new nao existe: criar comp e um 404 guardado pelo proxy'
status: In Progress
assignee: []
created_date: '2026-09-09 02:41'
updated_date: '2026-09-09 02:44'
labels: []
milestone: m-6
dependencies: []
priority: high
ordinal: 95000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
src/proxy.ts trata '/comp/new' como rota autenticada (decision-016) mas o arquivo src/app/comp/new/page.tsx nao existe. Resultado: o proxy autentica o usuario e entrega 404. Nao existe nenhum caminho no produto para chamar createComp(), que ja esta implementado em src/actions/comps.ts:115.

Fluxo (1 passo, deliberadamente minimo — friction no ponto de criacao mata conversao):
1. Usuario clica 'Nova comp' -> tela unica com um campo 'Nome da comp' (placeholder 'ZvZ Terça') + botao primario 'Criar comp'.
2. Sucesso -> redirect direto para a pagina da comp criada, ja no estado vazio de builds. Nao voltar para a listagem: o usuario esta no meio de uma tarefa, devolver para a lista quebra o momentum.
3. Erro de validacao (nome vazio / acima do limite de ACM-057) -> mensagem inline sob o campo, foco no campo, sem perder o texto digitado.

Alternativa aceitavel e preferivel se couber no escopo: criar a comp inline por dialog a partir da home, sem rota dedicada — mas entao o proxy deve parar de referenciar '/comp/new' (hoje ele guarda uma rota inexistente, o que e uma inconsistencia por si so).

Wireframe:
+--------------------------------------+
|  < Minhas comps                      |
|                                      |
|  Nova comp                           |
|  Nome da comp                        |
|  [ ZvZ Terça................. ] 0/60 |
|                                      |
|  [ Criar comp ]   Cancelar           |
+--------------------------------------+

Estados: idle, submitting (botao 'Criando...', desabilitado, sem duplo submit), erro (inline), sucesso (redirect).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET /comp/new autenticado renderiza o formulario de criacao, nao 404
- [ ] #2 Submeter com nome valido chama createComp e redireciona para a pagina da comp criada
- [ ] #3 Nome vazio ou acima do limite mostra erro inline preservando o texto digitado, sem chamar a action
- [ ] #4 Duplo clique no botao primario nao cria duas comps
- [ ] #5 Se a decisao final for dialog inline, src/proxy.ts deixa de guardar '/comp/new' e o teste do proxy e atualizado
<!-- AC:END -->
