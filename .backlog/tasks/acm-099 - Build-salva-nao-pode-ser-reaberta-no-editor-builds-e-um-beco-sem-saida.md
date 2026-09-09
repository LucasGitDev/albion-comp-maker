---
id: ACM-099
title: 'Build salva nao pode ser reaberta no editor: /builds e um beco sem saida'
status: To Do
assignee: []
created_date: '2026-09-09 02:42'
labels: []
milestone: m-2
dependencies: []
priority: high
ordinal: 97000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
src/app/builds/page.tsx lista as builds do usuario em <li> sem nenhum link ou acao. Nao existe rota de edicao de build por id — so /(editor)/build/new (criar) e /build/[slug] (leitura publica, e so se isPublic). Consequencia: o usuario salva uma build e perde acesso a ela para sempre pela UI. updateBuild, duplicateBuild, deleteBuild e toggleBuildPublic existem sem nenhuma superficie.

Rota proposta: /build/[id]/edit, reusando o editor de /(editor)/build/new hidratado com o data_json carregado.

Fluxo: /builds -> clicar na linha -> editor com a build carregada -> Salvar -> volta para /builds com a linha atualizada.

Cada linha de /builds precisa de: nome, role, badge Publica/Privada, e um menu de acoes (Editar, Duplicar, Tornar publica/privada, Excluir). Excluir pede confirmacao nomeando a build ('Excluir "Tank Grovekeeper"?') — perda irreversivel exige o nome, nao um 'Tem certeza?' generico.

Estados: loading (skeleton), vazio (ja existe, manter), erro por acao (toast + retry), sucesso (lista atualizada).
Densidade: /builds e ferramenta de trabalho — linha densa, uma linha por build, nao card grande.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Clicar em uma linha de /builds abre o editor com todos os slots e spells da build ja preenchidos
- [ ] #2 Salvar no editor de uma build existente chama updateBuild e nao cria uma segunda build
- [ ] #3 Cada linha oferece Duplicar, alternar Publica/Privada e Excluir, ligados as actions correspondentes
- [ ] #4 Excluir exige confirmacao que cita o nome da build
- [ ] #5 Acessar /build/<id>/edit de uma build de outro usuario retorna not-found, sem distinguir de id inexistente
<!-- AC:END -->
