---
name: process-definition-of-done
description: O gate de qualidade — a sequência exata que uma task precisa passar para ser considerada pronta, incluindo make check, verificação manual, escopo e atualização do backlog. Use antes de abrir PR ou marcar qualquer task como concluída.
---

# Definition of Done

Uma task é Done quando **tudo** abaixo passa, **nesta ordem**:

1. **Escopo respeitado** — nenhum arquivo fora de `touches` alterado sem nota explicando.
2. **Gate verde no branch** — `make check` sai 0. Sem exceção, sem `|| true`, sem skip.
3. **Verificação manual feita** — todo AC com superfície de usuário tem 1–3 passos manuais na task, e você os executou. Não "deve funcionar": executou.
4. **Decisões registradas** — abordagem não-óbvia vira nota de implementação ou ADR.
5. **Backlog atualizado** — `--append-notes` com o que foi feito e o que ficou de fora; ACs marcados.
6. **PR aberto**, status `In Review`. Merge é decisão humana.
7. **Pós-merge**: `make check` verde na master → `--status Done` → `git branch -d task/<id>-slug`.

## O gate

```bash
make check   # → scripts/check.sh
```

Roda: install limpo → lint → `tsc --noEmit` → build → testes.

## Anti-padrões que invalidam o Done

- `--no-verify`, teste comentado, assert afrouxado, `@ts-ignore` novo, `any` para calar o compilador.
- "Passa local mas falha no CI" — então não passa.
- AC marcado sem ter sido verificado. Isso é a única forma de mentir no harness, e envenena todo o resto.
- Refatoração carona que ninguém pediu — vira ruído no diff e esconde o bug de verdade.

## Se travar

Máximo 3 tentativas no mesmo erro. Depois: task volta pra `To Do`, nota descrevendo o bloqueio (o que tentou, o que aconteceu, o que falta saber), reporta ao orchestrator. Não fique girando — agent em loop queima contexto e não entrega.
