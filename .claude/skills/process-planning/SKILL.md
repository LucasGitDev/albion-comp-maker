---
name: process-planning
description: Como transformar uma task em plano de implementação verificável antes de escrever código, e quando registrar uma decisão de arquitetura (ADR). Use antes de implementar qualquer task não-trivial.
---

# Planejar antes de codar

Plano bom = sequência de passos onde **cada passo termina num estado verificável**.

## Formato

```md
1. Criar migration `subscriptions` (id, tenant_id, stripe_id, status, current_period_end)
   → verifica: `npm run db:migrate && npm run db:status` limpo
2. `BillingModule` com service + controller, DTOs validados
   → verifica: `tsc --noEmit` limpo, teste de unidade do service passa
3. Endpoint POST /webhooks/stripe com verificação de assinatura
   → verifica: teste rejeita assinatura inválida
4. Idempotência por event.id (tabela processed_events)
   → verifica: teste envia o mesmo evento 2x, cria 1 registro
5. Tela /billing consumindo o contrato
   → verifica manual: cancelar no dashboard Stripe reflete na tela
```

Se um passo não tem "verifica", ele não é um passo — é uma esperança.

## Regras

- 3 a 8 passos. Menos que 3, a task era trivial (pule o plano). Mais que 8, a task devia ser quebrada.
- Passo 1 sempre toca a camada mais profunda (dado/contrato). Tela por último.
- Declare `touches` no plano: os globs que a task vai modificar. Erre pra mais — isso protege o paralelismo.
- Diga o que **não** vai fazer nesta task, se for tentador.

## Quando escrever um ADR

Escreva se a decisão é **cara de reverter**: modelo de tenancy, escolha de ORM/DB, estratégia de auth, formato de contrato público, fila vs cron. Não escreva para escolha de nome de variável ou lib trivial.

```md
# ADR-00X — <decisão>
**Contexto.** O que forçou a escolha.
**Opções.** A, B, C — com trade-off real de cada uma.
**Decisão.** A escolhida e por quê.
**Consequências.** O que fica mais fácil, o que fica mais difícil, o que fica travado.
```

Decisão reversível e barata: decida rápido, siga, registre em uma linha na nota da task. Gastar 40 minutos numa decisão de 5 minutos é o mesmo erro que o inverso.
