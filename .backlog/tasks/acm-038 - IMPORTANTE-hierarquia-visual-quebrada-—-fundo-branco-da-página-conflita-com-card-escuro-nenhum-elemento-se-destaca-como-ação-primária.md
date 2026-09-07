---
id: ACM-038
title: >-
  IMPORTANTE: hierarquia visual quebrada — fundo branco da página conflita com
  card escuro, nenhum elemento se destaca como ação primária
status: Done
assignee: []
created_date: '2026-09-07 17:36'
updated_date: '2026-09-07 18:45'
labels: []
dependencies: []
priority: high
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A página /build/new tem fundo branco (herdado do body padrão) enquanto o card de edição é dark (quase preto), criando um contraste abrupto e não intencional nas bordas do card. Não há nenhum botão ou elemento que se destaque como 'próxima ação' — o olho não sabe se deve preencher nome, escolher papel, ou clicar num slot primeiro. Nas referências (albiononlinegrind.com/builds e albiononlinebuilds.com) todo o layout usa um tema dark consistente de ponta a ponta, com uma cor de destaque (laranja/azul) reservada só para CTAs (botão 'Criar', 'Subscribe on Patreon', badges de categoria). Ação: unificar o tema (dark consistente do body ao card) e reservar uma cor de acento exclusiva para ações primárias (salvar, criar, adicionar item).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tema dark consistente: body e paginas usam o mesmo fundo escuro do card, sem faixa branca
- [ ] #2 Remover dependencia de prefers-color-scheme para o fundo — dark e o tema padrao fixo
- [ ] #3 Existe um token de cor de acento reservado a acoes primarias, distinto de --color-enchant (que marca hover/estado de slot)
- [ ] #4 Contraste texto/fundo >= 4.5:1 nos textos principais
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
REVIEW PR #21 (branch task/33-home-and-theme, commit da48112).

FINDING 1 — HIGH — AC #4 (contraste >= 4.5:1) FALHA para --color-icon-muted (#6b7280), que é usado como cor de texto em vários componentes do editor (BuildHeader.tsx labels e slot-count, SlotCard.tsx, SlotGrid.tsx, TierEnchantSelectors.tsx, ItemIcon.tsx, SpellIcon.tsx) — não foi adicionado por este PR, mas o PR declara "tema unificado" e "contraste >= 4.5:1" como atendido sem revisar esse token pré-existente contra o novo fundo.
Matemática (WCAG relative luminance, fórmula sRGB):
- icon-muted (#6b7280) sobre --background (#0a0a0a): ratio = 4.10:1 → FALHA (limiar 4.5:1 para texto normal)
- icon-muted (#6b7280) sobre --color-surface (#14171d): ratio = 3.71:1 → FALHA
Esses usos são texto pequeno (11px/12px, ex. "Nome do build", "Papel", contagem de slots), portanto não se qualificam para o limiar reduzido de 3:1 (texto grande). Cenário de falha: usuário com baixa visão em display padrão não consegue ler o label "Nome do build" ou a contagem "3/6" no editor — texto efetivamente ilegível.
Textos verificados que PASSAM: foreground (#ededed) sobre background/surface = 16.9:1 / 15.3:1; accent-foreground (#14171d) sobre accent (#e8823c) no CTA = 6.57:1; foreground com opacidade 60-80% (text-foreground/60..80 usados em page.tsx e Header.tsx) = 6.15–10.08:1, todos OK.
Ação corretiva nomeada: implementer deve escolher um tom mais claro para --color-icon-muted (ex. algo >= #8b93a1 para atingir 4.5:1 sobre #0a0a0a) ou reservar o token atual apenas para elementos não-textuais/large-text, e atualizar os usos de texto pequeno para --foreground com opacidade reduzida (que já comprovadamente passa).

FINDING 2 — LOW — prefers-color-scheme removido corretamente (AC #2 atendido); grep por `dark:` em src/ não retornou nenhuma ocorrência — sem variantes mortas ou invertidas. AC #1 e #3 (token de acento distinto de --color-enchant) atendidos e verificados no diff.

FINDING 3 — informativo, não bloqueia — PNG-export safety (decision-007/ACM-029): os novos tokens --color-accent* e --color-surface/--color-border NÃO são referenciados por nenhum arquivo em src/components/build-card (raiz de captura). O guard de testes (src/__tests__/build-card.test.tsx) roda 13/13 verde após o merge deste diff, confirmado localmente. Sem risco de vazamento de oklch()/color-mix() para o PNG.

FINDING 4 — informativo — `git diff origin/main...origin/task/33-home-and-theme` (three-dot, conteúdo real do PR) confirma escopo restrito a src/app/page.tsx, src/app/layout.tsx, src/app/globals.css, public/*.svg (deleção) e novo src/components/layout/Header.tsx. Um diff two-dot (origin/main..HEAD) mostra também uma reversão do arquivo de tarefa ACM-032, mas isso é artefato de branch desatualizado (branch cortado antes do claim de ACM-032 em main) e NÃO faz parte do commit da48112 do PR — não é um finding real, mas registre a necessidade de rebase antes do merge para evitar que uma ferramenta de merge ingênua reintroduza esse arquivo antigo.

FINDING 5 — MEDIUM — Header (sticky, com nav "Minhas comps" e CTA "Nova build") é montado no layout raiz, portanto passa a renderizar também em /build/new, empilhado acima do próprio BuildHeader do editor (que já tem campos nome/papel e contagem de slots). Resultado: duas barras de "cabeçalho" na mesma tela e um CTA "Nova build" duplicado/redundante enquanto o usuário já está criando uma build. Não quebra funcionalmente (não há AC de ACM-033/038 que proíba isso), mas é dívida de UX que a task ACM-037 (action bar do editor) provavelmente vai colidir com. Recomenda-se registrar decisão ou nota para ACM-037 sobre como reconciliar Header global vs. barra de ações do editor.

VEREDITO: BLOCKED: 1 finding (HIGH) — AC #4 de ACM-038 não está de fato atendido; a alegação de conformidade do implementer é falsa para --color-icon-muted usado como texto. Demais achados são MEDIUM/LOW/informativos e não bloqueiam sozinhos.

FALSO POSITIVO ESCLARECIDO (orchestrator): o achado 'focus ring invisivel no CTA' (outlineColor rgb(20,23,29), 1.10:1) era ARTEFATO DE MEDICAO, nao defeito. Causa: os elementos que falhavam tinham 'transition-colors'; no Tailwind v4 essa utility inclui outline-color na transition-property, entao o anel animava de currentColor ate #ffffff em ~150ms. Reviewer e orchestrator amostraram o computed style no meio da transicao. Medicao em duas amostras confirmou: imediato rgb(28,31,36) -> assentado rgb(255,255,255). O anel SEMPRE chegava a branco. Corrigido mesmo assim com focus-visible:transition-none (indicador de foco nao deve ter fade); pos-fix imediato == assentado == branco, e :focus-visible preservado no clique de mouse.
<!-- SECTION:NOTES:END -->
