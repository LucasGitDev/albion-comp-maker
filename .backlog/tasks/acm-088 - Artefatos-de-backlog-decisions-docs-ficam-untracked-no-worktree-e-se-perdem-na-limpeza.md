---
id: ACM-088
title: >-
  Artefatos de backlog (decisions/docs) ficam untracked no worktree e se perdem
  na limpeza
status: To Do
assignee: []
created_date: '2026-09-08 13:44'
updated_date: '2026-09-09 03:07'
labels: []
dependencies: []
priority: low
ordinal: 86000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Defeito de harness, descoberto na ACM-079 (PR #53).

O que aconteceu: o implementer criou decision-021 dentro do worktree da task, conforme o AC#2 exigia, e reportou corretamente ter feito isso. Mas o arquivo nunca foi adicionado ao commit — o PR #53 tocou apenas scripts/sync-ao-data.ts e scripts/sync-ao-data.test.ts. O arquivo ficou untracked. Ao limpar o worktree com 'git worktree remove --force' apos o merge, ele foi destruido. A decisao teve que ser reconstruida a partir dos relatorios do implementer e do reviewer.

Por que passou por todos os gates:
- make check nao olha arquivos untracked
- o reviewer leu o arquivo NO WORKTREE (onde ele existia) e o considerou entregue
- o AC 'decisao registrada' foi marcado como cumprido, e de fato estava — so nao no lugar que sobrevive ao merge

O modo de falha e traicoeiro: todo mundo ve o artefato durante o ciclo da task, e ele desaparece depois. Vale para decisions, docs, e qualquer arquivo de backlog criado no worktree.

Mitigacoes a avaliar:
- Implementer deve rodar 'git status --porcelain' antes de abrir o PR e falhar se houver untracked em .backlog/
- Orchestrator deve checar untracked ANTES de 'git worktree remove --force' (foi exatamente o --force que destruiu o arquivo)
- Reviewer deve validar artefato de decisao no DIFF do PR, nao no filesystem do worktree
- Preferir criar decisions/docs no worktree principal, ja que nao sao codigo e nao dependem da branch
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Nenhum arquivo untracked em .backlog/ pode sobreviver ao fechamento de uma task sem ser commitado ou explicitamente descartado
- [ ] #2 O reviewer valida a presenca de artefatos de decisao/doc no diff do PR, nao no filesystem do worktree
- [ ] #3 A limpeza de worktree do orchestrator inspeciona untracked antes de usar --force
- [ ] #4 A regra esta refletida no CLAUDE.md e/ou nas definicoes dos agentes implementer e reviewer
<!-- AC:END -->
