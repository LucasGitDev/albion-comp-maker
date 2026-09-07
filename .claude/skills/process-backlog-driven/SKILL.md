---
name: process-backlog-driven
description: Contrato de uso do Backlog.md como estado compartilhado do time de agents — formato de task, status, dependências, escopo de arquivos, decisões e docs. Use ao criar, ler, atualizar ou fechar qualquer task, e sempre antes de decidir o que fazer a seguir.
---

# Backlog.md como memória do time

O backlog é o **único estado compartilhado** entre agents. Se não está no backlog, não existe.

## Antes de qualquer ação

```bash
backlog instructions overview            # sempre
backlog instructions task-creation       # antes de criar/quebrar
backlog instructions task-execution      # antes de planejar/implementar/mudar status
backlog instructions task-finalization   # antes de fechar
backlog <cmd> --help                     # comando desconhecido
```

**Nunca edite os `.md` do backlog na mão.** Só o CLI, senão metadata e histórico quebram.

## Anatomia de uma task executável

Um agent precisa executar a task **sem fazer perguntas**. Isso exige:

```md
## [TASK-014] Webhook de assinatura Stripe

status: To Do
depends: TASK-012
touches: src/billing/**, src/webhooks/stripe.controller.ts
skills: saas-billing, stack-nestjs, stack-testing

**Contexto:** por que existe, em 3 linhas. Qual problema do usuário.

**Critério de aceite:**
- [ ] webhook rejeita requisição com assinatura inválida (401)
- [ ] evento duplicado não cria segunda cobrança (idempotência por event.id)
- [ ] cancelamento move assinatura para `canceled` e mantém acesso até o fim do ciclo
- [ ] teste e2e cobre o fluxo de cancelamento

**Verificação manual:**
1. `stripe trigger customer.subscription.deleted`
2. conferir status no /billing → deve exibir "cancela em <data>"
```

## Os três campos que fazem o harness funcionar

| Campo | Para quê |
|---|---|
| `depends` | o orchestrator só pega task com dependência fechada |
| `touches` | globs que a task vai modificar — permite paralelizar sem conflito. Erre pra mais. |
| `skills` | o implementer carrega só o conhecimento necessário, sem estourar contexto |

## Status

`To Do` → `In Progress` → `In Review` → `Done`

- `In Progress` é **mutex**: só o orchestrator seta, e só quando o agent vai começar agora.
- `In Review` = PR aberto, esperando humano.
- `Done` só depois de merge **e** gate verde na master.
- Bloqueou? Volta pra `To Do` com nota explicando o bloqueio. Nunca deixe task presa em `In Progress`.

## Onde documentar (nunca crie .md solto)

| O quê | Comando |
|---|---|
| Decisão de arquitetura | `backlog decision create "título" -s accepted` |
| Guia técnico / runbook | `backlog doc create "título" -t guide` |
| Spec de feature ou API | `backlog doc create "título" -t specification` |
| Notas de implementação | `backlog task edit TASK-X --append-notes "..."` |
| Resumo final | `backlog task edit TASK-X --final-summary "..."` |

Exceção única: `decision create` e `doc create` não têm update — depois de criar, escreva o conteúdo direto no path retornado.

## Antes de perguntar qualquer coisa sobre o projeto

`backlog doc list` e `backlog decision list` são canônicos. A resposta provavelmente já está lá.
