---
id: ACM-098
title: 'Pagina de gerenciamento da comp: listar, adicionar, reordenar e remover builds'
status: Done
assignee: []
created_date: '2026-09-09 02:42'
updated_date: '2026-09-09 13:05'
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
## Revisão visual (design-ui-review) — SHA 43471e6

Autenticação: sem provider de credenciais (Discord OAuth only, database sessions via @auth/drizzle-adapter). Rodei migrations automaticamente via src/instrumentation.ts ao subir `next dev -p 3098`, depois inseri diretamente no SQLite (`data/app.db`) um `user`, uma `session` (sessionToken usado como cookie `authjs.session-token`, domain localhost, http) e dados de teste: 1 comp com 9 builds (8 normais + 1 com nome de 80 chars) e 1 comp vazia. Sem alterar nenhum arquivo do worktree além de `.env.local`/DB de dev (removidos ao final). Testei com Playwright headless (script descartável).

### BLOQUEADOR (Alto)
1. **Nome de build longo estoura o layout e causa overflow horizontal em TODAS as viewports, incluindo 1440px e 390px.** O `span.font-medium` do nome em `CompBuildRow.tsx` não tem `break-words`/`min-w-0`/`truncate` — um nome de 80 chars sem espaços renderiza em uma única linha de ~854px, empurrando os botões de ação para fora do card e criando `document.scrollWidth` >> `clientWidth` (390: scrollWidth=1106 vs clientWidth=390; 1440: 1490 vs 1440). Isso não é hipotético: `builds.name` não tem limite de tamanho conhecido no schema. Reproduzi com screenshot em `/comps/[id]` (nome "XXXX...XXXX" 80 chars).

2. **`AddBuildDialog` não tem focus trap — Tab escapa do modal para o fundo da página.** Testado de verdade com teclado (Tab repetido): no Tab #11 o foco vazou para um checkbox fora do dialog (`Comp pública`, na seção "Compartilhar comp" atrás do overlay). O dialog é `role="dialog"` com `aria-modal="true"` mas isso é só semântico — sem trap real, um usuário de teclado/leitor de tela pode interagir com conteúdo atrás do overlay enquanto o modal "está aberto". Confirma a suspeita do prompt: modal artesanal sem lib vazou foco.

3. **Foco não retorna ao gatilho ao fechar o dialog (Escape).** Após `Escape`, `document.activeElement` não é o botão "Adicionar build" que abriu o modal (ficou vazio/body). Regressão de acessibilidade de teclado — usuário perde a posição de navegação.

### ALTO (divergência de spec / AC)
4. **AC#6 não cumprido integralmente.** A spec exige que o estado vazio explique que "o link público não funciona até ter ao menos uma build" (a comp sem builds quebra `getPublicCompBySlug`, ACM-066). O texto implementado é genérico: "A comp só pode ser exportada com pelo menos uma build." — não menciona o link público quebrado, que é exatamente o ponto crítico citado na descrição da task.

5. **Sem preview visual (`BuildCardCompressed`) como a spec pedia explicitamente** ("Componentes: reusa BuildCardCompressed para preview da entrada"). Implementado como linha de texto simples (nome + papel + label + count). Opinião de produto: para uma lista de gerenciamento (não o card final exportado), texto é aceitável para reconhecer builds pelo nome/papel — mas comps costumam ter builds com nomes parecidos (ex.: "Fire Staff Healer" vs "Holy Staff Healer"), e sem ícone do item principal o usuário perde o reconhecimento visual rápido que o resto do produto (cards, export) usa. Não é bloqueador de uso, mas é uma divergência real da spec, não uma "melhoria" do implementer — deveria ter sido negociada como decisão de escopo antes, não decidida silenciosamente na implementação.

6. **Rota diverge do spec.** Task pede `/comp/[id]/edit`; implementado em `/comps/[id]`. Convenção de nome de rota (singular/plural) e path (`/edit`) ambos diferentes. Sem decisão de arquitetura registrada justificando a mudança.

7. **Sem confirmação ao remover uma build da comp.** O botão "Remover" executa a remoção imediatamente (otimista), sem diálogo de confirmação nem "desfazer". A spec/checklist pede "confirmação e feedback" — aqui há feedback (a linha some) mas nenhuma confirmação prévia. Risco de remoção acidental em uma lista de até 20 builds.

### MÉDIO
8. **Sem `aria-live` na lista ao reordenar.** Um usuário de leitor de tela que clica em "subir"/"descer" não recebe nenhum anúncio de que a ordem mudou — só usuários que veem a tela percebem visualmente. Os botões de seta têm `aria-label` correto (ex. "Mover Main Tank Build para cima") e desabilitam corretamente no primeiro/último item (verificado), isso está certo.

9. **Sem estado de loading visível durante ações (add/remove/reorder/salvar).** `isPending` só desabilita botões (opacity-40); não há skeleton, spinner ou qualquer indicação de "processando". A spec pedia explicitamente "loading: skeleton das entradas" — não implementado (nem para carga inicial nem para ações).

### BAIXO / OK
- Reordenar: ordem persiste corretamente após reload (testado). Confirmado com Playwright: mover 2ª linha para cima e recarregar preserva a nova ordem no banco.
- Estado de erro: banner inline vermelho com "Tentar de novo" (sem lib de toast, conforme esperado neste projeto), e a ordem local é revertida corretamente para o último estado bom em caso de falha de rede simulada (verificado abortando requests POST). Isso cumpre bem o requisito "não perder o estado".
- Estado vazio: claro, com CTA e texto compreensível (só falta a menção ao link público — ver item 4).
- Contraste do banner de erro (texto vermelho sobre fundo escuro com opacidade baixa) parece adequado visualmente, não medido com ferramenta de contraste formal.

## Veredito: BLOQUEADO

Motivos de bloqueio: itens 1 (overflow em nome longo, quebra visual em qualquer viewport) e 2 (focus trap ausente, falha de acessibilidade de teclado real e verificada) são suficientes para bloquear por si só. Itens 4, 6 e 7 são divergências de spec/AC que precisam de decisão explícita (aceitar como está, ou implementar) antes de Done.

Code review (PR #69, SHA 8fc3fef): LGTM.

Verifiquei os 7 ACs contra o diff e os testes (src/__tests__/comp-builds-manager.test.tsx, comps-actions.test.ts) — cada AC tem teste nomeado cobrindo caminho feliz e erro/rollback, incluindo AC#3 com confirmação (não chama removeBuildFromComp sem confirmar) e AC#7 (IDOR: não-dono recebe o mesmo CompNotFoundError que id inexistente).

Blockers da revisão visual anterior (design-ui-review) confirmados corrigidos no diff atual:
- Overflow de nome longo: CompBuildRow.tsx agora usa min-w-0 + truncate no container e nos spans.
- Focus trap ausente: AddBuildDialog.tsx implementa trap manual (Tab/Shift+Tab cycle) + restauração de foco ao elemento que abriu o dialog no unmount/Escape.
- Sem confirmação de remoção: CompBuildRow agora tem estado isConfirmingRemove com botões Confirmar remoção/Cancelar.
- AC#6 (texto do estado vazio): agora menciona explicitamente que o link público não funciona sem builds.
- aria-live adicionado para anúncio de reordenação (span sr-only).
- Race de rollback otimista: reconciliação por compBuildId via setEntries(prev => ...), nunca overwrite do array inteiro — testado em 'reconciliation: a failed reorder swaps only the two moved entries back'.

Divergências de spec ainda presentes mas justificadas/aceitas:
- Rota /comps/[id] em vez de /comp/[id]/edit — decision-027 documenta e justifica.
- Preview via texto (nome+papel+label+count) em vez de BuildCardCompressed — decisão de produto não registrada formalmente como decision, mas é MEDIUM (dívida de reconhecimento visual em comps com nomes parecidos), não bloqueante.
- Sem skeleton de loading dedicado (isPending só desabilita botões) — MEDIUM, dívida de UX, não bloqueia AC.

reorderCompBuilds em src/actions/comps.ts usa staged two-phase update (posições negativas -> finais) dentro de uma transaction para contornar o unique index (comp_id, position) sem DEFERRABLE no SQLite — correto e testado. Ownership re-checada no WHERE de todo update/delete (defesa contra TOCTOU).

make check verde na branch (task/98-comp-management, worktree albion-builds-task-98): lint, tsc, build e 708 testes passando.

Veredito: LGTM. Findings 5 (preview sem BuildCardCompressed) e 9 (sem skeleton de loading) ficam registrados como dívida MEDIUM, não bloqueiam merge.
<!-- SECTION:NOTES:END -->
