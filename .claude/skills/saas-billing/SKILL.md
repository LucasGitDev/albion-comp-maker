---
name: saas-billing
description: Cobrança recorrente com Stripe num SaaS — planos, trial, webhooks idempotentes, estados de assinatura, limites de uso e falha de pagamento. Use ao implementar ou revisar qualquer coisa ligada a assinatura, plano ou pagamento.
---

# Billing (Stripe)

## Princípio

O Stripe é a fonte da verdade do **pagamento**; seu banco é a fonte da verdade do **acesso**. Você espelha o estado da assinatura localmente e decide acesso pelo seu registro — consultar a API do Stripe a cada request é lento e frágil.

## Modelo local

```
Subscription: tenant_id, stripe_subscription_id, stripe_customer_id,
              plan, status, current_period_end, cancel_at_period_end
```

`status`: `trialing | active | past_due | canceled | incomplete`. O gate de acesso lê **um** helper — `hasAccess(tenant)` — e nada mais. Regra de acesso espalhada pela app é dívida garantida.

## Webhooks

1. **Verifique a assinatura** do webhook com o signing secret. Sem isso, qualquer um ativa qualquer plano.
2. **Idempotência obrigatória**: tabela `processed_stripe_events(event_id)` com unique. Stripe reenvia; sem isso você cobra ou libera duas vezes.
3. Responda **200 rápido**; processe pesado em fila. Timeout vira retry infinito.
4. Eventos mínimos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`.
5. Ordem não é garantida. Ignore evento mais velho que o estado atual (compare `current_period_end` / timestamp).

## Fluxos

**Trial** — sem cartão se você quer volume, com cartão se quer qualidade. Avise 3 dias antes do fim. Fim do trial sem pagamento → downgrade, **não** apague dado.
**Upgrade** — imediato, proration na mão do Stripe.
**Downgrade** — no fim do ciclo; valide antes se o uso atual cabe no plano menor.
**Cancelamento** — `cancel_at_period_end`, acesso mantido até o fim. Cancelamento imediato só se o usuário pedir.
**`past_due`** — não corte no primeiro dia. Banner, email, e corte após a janela de retry (dunning).

## Limites de plano

Cheque o limite **na escrita**, no servidor, no momento da ação — nunca só na UI. Ao estourar: mensagem que diz o limite, o uso atual e o link de upgrade.

## Nunca

- Preço vindo do cliente. O plano é escolhido por ID no servidor.
- Liberar acesso no `success_url` do checkout (o usuário pode nunca voltar, ou forjar a volta). Libere no webhook.
- Apagar dado de quem cancelou antes de um período de retenção anunciado.
