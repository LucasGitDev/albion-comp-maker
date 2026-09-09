---
id: ACM-099
title: 'Build salva nao pode ser reaberta no editor: /builds e um beco sem saida'
status: In Progress
assignee: []
created_date: '2026-09-09 02:42'
updated_date: '2026-09-09 14:18'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Review PR #81: BLOCKED (1 finding).

HIGH — src/components/editor/BuildEditor.tsx:89-94 (mode "new") + src/store/build-store.ts (module-level singleton store) — Zustand store leaks state across client-side navigation from an edit session into a "new" build.

Cenário de falha: usuário abre /build/A/edit (efeito em BuildEditor chama actions.hydrate(initialBuild) e popula o store singleton com o conteúdo da build A) → sem reload de página, navega via <Link> client-side para /build/new (ex.: "Criar nova build" em src/components/comp/AddBuildDialog.tsx:122-126, ou botão "+"/"Nova build" em Header.tsx após sair de /build/A/edit para "/", ou botão Voltar/Avançar do navegador) → NewBuildPage monta <BuildEditor mode="new" /> (src/app/(editor)/build/new/page.tsx), que NUNCA chama actions.reset() nem hydrate() no mount — só "edit" hidrata (linha 90 do BuildEditor: `if (props.mode === "edit") { actions.hydrate(...) }`). O store é singleton de módulo (`create<BuildStore>(...)` em build-store.ts), então ele sobrevive ao unmount/remount de componentes React. Resultado: o formulário "novo" abre pré-preenchido com nome/slots/swaps da build A. Usuário pode salvar acreditando estar criando algo do zero e criar uma cópia não intencional da build A (ou pior, editar visualmente parecendo "vazio" mas na verdade reaproveitando spells/tier antigos sem perceber). Isso é exatamente o cenário que o AC "hydrate() no Zustand store não cria race conditions/vazamento entre navegações" pede para descartar, e a ação de reset já existe (`actions.reset()`) mas está sem uso em nenhum dos dois modos do BuildEditor.

Correção sugerida: BuildEditor mode "new" deve chamar actions.reset() no mesmo useEffect de mount (espelhando o que "edit" faz com hydrate), ou a store deve ser resetada centralmente por rota (ex.: via key no componente pai ou reset no unmount do editor).

Outros pontos verificados, sem finding:
- IDOR (AC#5): getBuildForEdit -> loadOwnedBuild filtra por (id, userId) e lança o mesmo BuildNotFoundError para inexistente e para build de outro dono; updateBuild também re-filtra por userId no próprio UPDATE (TOCTOU coberto). OK.
- updateBuild vs saveBuild (AC#2): BuildEditor.handleSave despacha corretamente por mode. OK.
- Ações da linha em /builds (AC#3) e diálogo de exclusão citando o nome da build (AC#4): implementados em BuildsListManager.tsx e DeleteBuildDialog.tsx, com confirmação real (dialog com nome, não apenas um clique). OK.
- Regressão /build/new isolada (sem visita prévia a /edit): funciona, pois o store nasce vazio (createEmptyBuild()) na primeira carga da sessão.

Dívida (não bloqueante): PR não adiciona nenhum teste novo (0 arquivos de teste tocados) para getBuildForEdit/IDOR, a rota /build/[id]/edit, BuildsListManager ou DeleteBuildDialog — os únicos testes que cobrem esse fluxo crítico de segurança e UX ainda não existem.

Veredito: BLOCKED: 1 finding (HIGH).
<!-- SECTION:NOTES:END -->
