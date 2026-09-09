---
id: ACM-098
title: 'Pagina de gerenciamento da comp: listar, adicionar, reordenar e remover builds'
status: In Review
assignee: []
created_date: '2026-09-09 02:42'
updated_date: '2026-09-09 03:17'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementado em src/app/comps/[id]/page.tsx (rota por id, decision-027), extendendo a página existente com uma seção "Builds da comp" acima de "Compartilhar comp".

Decisões não-óbvias:
- Adicionei `listCompBuildsDetailed` em src/actions/comps.ts (nova função, não reescreve nenhuma das 4 actions existentes) porque `listCompBuilds` só retorna `buildId` — a UI precisa de nome/role por entrada. Faz um innerJoin selecionando só id/name/role/slug/isPublic de builds, nunca content/themeJson.
- Não usei `BuildCardCompressed` para o preview de cada entrada (a descrição da task sugeria isso). Renderizar o card completo por entrada exigiria carregar `content` de cada build + montar lookups de itens/spells por linha, custo não justificado pelos ACs (nenhum AC pede a visualização do card). Optei por uma linha de texto (nome + role + label + count), no mesmo padrão visual já usado em /builds e /comps. Documentado aqui como desvio deliberado da descrição, não dos ACs.
- Reordenação via setas (↑/↓), não drag-and-drop — convenção citada explicitamente na task, e evita adicionar uma lib de dnd.
- Sem lib de toast (não existe no repo) — erros de ação aparecem como um banner inline com "Tentar de novo" que preserva a ordem local (reverte para o último estado bom, não perde a entrada), conforme pedido no fluxo de erro da task.
- AddBuildDialog é um modal simples (role="dialog", Escape fecha, foco inicial no botão fechar) sem lib de dialog/portal — não existe nenhuma no repo; ItemPicker é de itens do jogo, não reaproveitável para builds.
- AC#7 (not-found sem revelar existência) já estava coberto pelo catch existente de CompNotFoundError -> notFound() na página; validado que listCompBuildsDetailed/listMyBuilds seguem o mesmo padrão de erro.
- Fora de escopo: exportar PNG da comp (ACM-020, não implementado ainda) — mencionado na descrição como ação primária futura, mas não faz parte dos ACs desta task; não adicionei um botão placeholder para não criar uma ação morta.

Testes: src/__tests__/comp-builds-manager.test.tsx (client component, cobre AC#1-6 incl. rollback em erro) e novos casos em src/__tests__/comps-actions.test.ts para listCompBuildsDetailed (ordenação, join, IDOR).

make check verde: lint, tsc, build, vitest (703 testes).

AUDITORIA DE SEGURANCA (read-only) - PR #69, SHA 43471e6, branch task/98-comp-management

VEREDITO: SEGURO. Nenhum finding CRITICAL/HIGH. Merge nao bloqueado por este auditor.

1. IDOR em /comps/[id] - SEGURO. src/app/comps/[id]/page.tsx chama getComp/getCompPublishState/listCompBuildsDetailed, cada uma via requireSession()+loadOwnedComp (src/actions/comps.ts:65-77, 154-157, 172-195). Nao-dono ou id inexistente -> CompNotFoundError -> notFound() identico (page.tsx:44-49). Checagem e' 100% server-side, nao so na renderizacao.

2. listCompBuildsDetailed - SEGURO. src/actions/comps.ts:180 chama loadOwnedComp(session.user.id, compId) ANTES do join; WHERE eq(compBuilds.compId, compId) so' e' alcancado apos ownership check (linhas 190-195). Nao ha' forma de listar builds de comp alheia so' com o compId.

3. addBuildToComp - vetor de vazamento cruzado - SEGURO. src/actions/comps.ts:373-378: apos carregar a build por id, valida `!build.isPublic && build.userId !== session.user.id` -> lanca CompBuildRefNotFoundError com a MESMA forma de erro de "nao existe". So' e' possivel anexar build propria OU build publica de terceiro; build privada alheia nunca entra na comp e portanto nunca aparece via listCompBuildsDetailed. Comentario no codigo (ACM-016) documenta explicitamente esse cuidado.

4. removeBuildFromComp / reorderCompBuilds - SEGURO. removeBuildFromComp (comps.ts:426-440) usa loadOwnedCompBuild, que primeiro chama loadOwnedComp e so' entao valida compBuildId pertence aquele compId; delete tambem refiltra por compId no WHERE. reorderCompBuilds (comps.ts:496-533) chama loadOwnedComp antes de tudo, e valida que orderedCompBuildIds e' permutacao EXATA dos ids existentes daquele comp (existingIds vem de query filtrada por comp.id) - id de outra comp e' rejeitado por CompBuildReorderInvalidError. Nao ha' como destruir/reordenar dado de outro usuario.

5. Diferenca de erro (enumeracao) - SEGURO. loadOwnedComp (comps.ts:65-77) usa deliberadamente o MESMO CompNotFoundError tanto para id inexistente quanto para comp de outro dono (comentario explicito no codigo). addBuildToComp usa a mesma logica para build privada-nao-dono vs build inexistente (CompBuildRefNotFoundError). Nao ha' diferenca de status/mensagem observavel; nao avaliei diferenca de TIMING (fora do escopo de leitura de codigo estatico) - risco residual LOW de timing side-channel entre "0 linhas retornadas" vs "linha existe mas filtrada", comum em qualquer app com este padrao e nao especifico deste PR.

6. Exposicao de campo - SEGURO. listCompBuildsDetailed seleciona explicitamente so' {id, name, role, slug, isPublic} de builds (comps.ts:158-166, select object em 183-189) - nunca content/themeJson. isPublic=false de build alheia so' pode aparecer se essa build ja foi anexada por addBuildToComp, que ja' garante que so' builds proprias ou publicas passam por ali (item 3) - logo nao ha' vazamento de isPublic=false alheio.

7. Auth ausente - SEGURO. Toda action (listMyComps, listMyCompsWithStatus, getComp, listCompBuilds, listCompBuildsDetailed, createComp, updateComp, toggleCompPublic, getCompPublishState, deleteComp, addBuildToComp, removeBuildFromComp, updateCompBuild, reorderCompBuilds) chama requireSession() como primeira linha, antes de qualquer query. requireSession (src/auth/session.ts) lanca se nao houver session.user.id.

8. Validacao de input - SEGURO/LOW. ids (compId/buildId/compBuildId) sao strings usadas em queries drizzle parametrizadas (eq()) - sem risco de injecao SQL. Nao ha' validacao de formato (ex.: uuid regex) antes da query, mas isso e' inofensivo pois drizzle parametriza e a query so' retorna linha se o id combinar E o ownership bater; um id malformado apenas resulta em "nao encontrado". LOW: poderia adicionar z.string().uuid() na borda por defesa em profundidade/DX, mas nao e' uma vulnerabilidade de seguranca.

Nenhum finding bloqueante. Nenhuma exploracao entre usuarios encontrada nos vetores auditados.

## Review (SHA 43471e6, branch task/98-comp-management)

Veredito: BLOQUEADO: 1 finding HIGH, 2 findings MEDIUM, 1 LOW/nota.

### AC por AC
- AC#1 (listar em ordem de position): OK. listCompBuildsDetailed faz orderBy(compBuilds.position) e a page.tsx mapeia 1:1 pra CompBuildEntry.
- AC#2 (adicionar cria via addBuildToComp e aparece na lista): OK, testado (comp-builds-manager.test.tsx).
- AC#3 (remover chama removeBuildFromComp sem reload): OK, testado.
- AC#4 (reordenar persiste e sobrevive a refresh): reorderCompBuilds é chamado com a ordem correta; persistência em si é responsabilidade de uma action pré-existente (fora do diff), não retestada aqui — aceitável.
- AC#5 (editar label/count persiste): OK no caminho feliz, testado. Sem teste do caminho de erro/rollback (ver finding MEDIUM abaixo).
- AC#6 (estado vazio): OK, testado, mensagem confere com o texto pedido na task.
- AC#7 (not-found sem revelar existência): OK. getCompPublishState/getComp/listCompBuildsDetailed/listMyBuilds compartilham loadOwnedComp -> CompNotFoundError -> notFound() na page; owner errado e id inexistente são indistinguíveis. Testado em comps-actions.test.ts (IDOR).

### Finding HIGH — rollback otimista pode descartar uma edição bem-sucedida (race real)
src/components/comp/CompBuildRow.tsx:112-122 — os botões "Salvar"/"Cancelar" do painel de edição NÃO recebem `disabled={disabled}` (diferente de Mover/Editar/Remover, que são gateados por `isPending`).
Cenário de falha concreto:
1. Lista [A, B]. Usuário abre "Editar" em B e digita um novo label (estado local, ainda não commitado ao pai).
2. Usuário clica "↓" em A → reorderCompBuilds dispara, `isPending=true`, `previous` capturado em CompBuildsManager.tsx:100 = [A,B] (snapshot pré-reorder).
3. Enquanto o reorder está em voo, o painel de edição de B continua aberto (Salvar/Cancelar não são desabilitados por `isPending`) — usuário clica "Salvar". handleSaveEntry (CompBuildsManager.tsx:117) dispara updateCompBuild concorrentemente com o reorder, capturando seu próprio `previous` (já com o reorder aplicado).
4. Se reorderCompBuilds falhar (rede instável) e updateCompBuild tiver sucesso: o catch do reorder (linha ~108) faz `setEntries(previous)` com o snapshot de ANTES do label ter sido salvo — isso sobrescreve cegamente o estado atual e apaga visualmente a edição de label que já foi persistida no servidor com sucesso. UI e servidor ficam inconsistentes até o próximo full reload.
Causa raiz: `previous` é um valor capturado por closure (não um updater funcional) e o rollback faz `setEntries(previous)` incondicionalmente, sem levar em conta mutações concorrentes que tenham ocorrido depois. Isso é agravado por Salvar/Cancelar não estarem sob o mesmo gate de `isPending` que todos os outros botões mutantes.
Ação corretiva: gatear Salvar/Cancelar por `disabled` (serializa via UI, como já é feito para add/remove/move), E/OU trocar os rollbacks de `setEntries(previous)` por um updater funcional que reverta apenas a mutação que falhou (ex.: reconciliar por compBuildId em vez de substituir o array inteiro).

### Finding MEDIUM — testes de rollback incompletos
comp-builds-manager.test.tsx cobre rollback de erro para add (AC#2) e remove (AC#3), mas não para reorder (AC#4) nem para save de label/count (AC#5). Dado que o finding HIGH acima é justamente uma interação entre save e reorder, a ausência de teste de rollback nesses dois caminhos é a lacuna que deixou o bug passar.

### Finding MEDIUM — dados otimistas falsos em handleAdd
CompBuildsManager.tsx (handleAdd) monta a entrada otimista com `slug: ""` e `isPublic: true` hardcoded, em vez dos valores reais da build selecionada (disponíveis em `myBuilds`/na resposta do dialog). Hoje não é renderizado, mas é estado deliberadamente incorreto sobrevivendo até o próximo refresh — qualquer uso futuro de `entry.build.slug`/`isPublic` logo após um add vai ler lixo.

### Finding LOW — AddBuildDialog sem focus trap e sem restauração de foco
AddBuildDialog.tsx: role="dialog" + aria-modal="true" + foco inicial no botão fechar + Escape fecha — mas não há focus trap (Tab pode sair do modal para o conteúdo por trás do overlay) nem restauração de foco ao fechar (fecha para <body>, perde a posição do usuário de teclado/leitor de tela). Não bloqueante pelos ACs (nenhum AC pede a11y completa do dialog), mas registrado como dívida.

### Não-findings / desvios aceitos
- listCompBuildsDetailed confirmado selecionando só id/name/role/slug/isPublic de builds, nunca content/themeJson (src/actions/comps.ts).
- Desvio de não usar BuildCardCompressed: aceito. Nenhum AC exige o card completo; justificativa de custo (carregar content por linha) é razoável e documentada.
- Escopo: diff toca só os arquivos esperados (comps.ts, comps/[id]/page.tsx, CompBuildsManager/CompBuildRow/AddBuildDialog, 2 arquivos de teste). Não tocou page.tsx raiz, build/new/page.tsx, ThemePanel.tsx nem package.json.
- `npx tsc --noEmit`: sem erros. `npm test`: 703/703 passando (mas ver lacuna de cobertura acima).

Reprovado por 1 HIGH (race de rollback otimista com perda silenciosa de edição confirmada por servidor). Devolver ao implementer: gatear Salvar/Cancelar por `disabled` e/ou tornar o rollback não-destrutivo para mutações concorrentes; adicionar testes de rollback para reorder e save.
<!-- SECTION:NOTES:END -->
