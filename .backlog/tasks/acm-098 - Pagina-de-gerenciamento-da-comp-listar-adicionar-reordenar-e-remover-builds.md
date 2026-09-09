---
id: ACM-098
title: 'Pagina de gerenciamento da comp: listar, adicionar, reordenar e remover builds'
status: To Do
assignee: []
created_date: '2026-09-09 02:42'
labels: []
milestone: m-6
dependencies: []
priority: high
ordinal: 96000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Existe /comp/[slug] (leitura publica anonima) e nada mais. O dono da comp nao tem NENHUMA tela onde veja as builds dela ou as gerencie. As actions ja existem e estao 100% sem UI: listCompBuilds, addBuildToComp, removeBuildFromComp, updateCompBuild (label/count), reorderCompBuilds, updateComp, deleteComp.

Rota proposta: /comp/[id]/edit (por id, nao por slug — o slug e imutavel e publico; a tela de dono nao deve depender de a comp ser publica).

Fluxo:
1. Abrir comp -> ver builds na ordem de comp_builds.position.
2. 'Adicionar build' -> picker com as builds do usuario (reusa listMyBuilds) + opcao 'Criar nova build' que leva ao editor e volta.
3. Cada entrada: label opcional ('Tank principal'), count (x2), remover, reordenar (setas antes de drag — convencao acessivel e barata).
4. Acao primaria da tela: 'Exportar PNG da comp' (ACM-020). Adicionar build e secundaria: e meio, nao fim.

Estados obrigatorios:
- loading: skeleton das entradas
- vazio: 'Nenhuma build nesta comp' + 'A comp so pode ser exportada com pelo menos uma build.' + CTA 'Adicionar build'. Este estado vazio e critico porque getPublicCompBySlug retorna null para comp sem builds — o link publico esta morto e o dono nao sabe (ver ACM-066)
- erro por acao: toast com 'Tentar de novo', sem perder a ordem local
- sucesso: entrada aparece na lista sem full reload

Componentes: reusa BuildCardCompressed para preview da entrada; novos CompBuildRow e AddBuildDialog (justificativa: nao existe nenhum picker de build — ItemPicker e de itens do jogo).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Dono acessa a comp e ve todas as entradas de listCompBuilds na ordem de position
- [ ] #2 Adicionar uma build existente cria a entrada via addBuildToComp e ela aparece na lista
- [ ] #3 Remover uma entrada chama removeBuildFromComp e a lista reflete sem reload
- [ ] #4 Reordenar persiste via reorderCompBuilds e a ordem sobrevive a um refresh
- [ ] #5 Editar label e count de uma entrada persiste via updateCompBuild
- [ ] #6 Comp sem builds mostra estado vazio explicando que o link publico nao funciona ate ter ao menos uma build
- [ ] #7 Usuario que nao e dono recebe not-found na rota de edicao, sem revelar existencia da comp
<!-- AC:END -->
